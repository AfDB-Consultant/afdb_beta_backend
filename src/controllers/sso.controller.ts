import { Request, Response } from 'express';
import { ssoService } from '../services/sso.service';
import { authService } from '../services/auth.service';
import { tokenService } from '../services/token.service';
import { activityEmitter } from '../services/activityEmitter.service';
import { logger } from '../config/logger';
import { JwtPayload } from '../types';
import { User } from '../models/user.model';

export class SsoController {
  private getClientInfo(req: Request) {
    return {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
  }
  async handoff(req: Request, res: Response): Promise<void> {
    const { token, timestamp, userId, email, redirectUrl } = req.body;

    const isValid = await ssoService.verifyWithIdp(token, timestamp);
    if (!isValid) {
      res.status(401).json({ success: false, message: 'SSO token validation failed' });
      return;
    }

    let user = await authService.findByEmail(email);
    if (!user) {
      logger.info(`SSO: auto-provisioning user for ${email}`);
      user = await authService.createUser({
        email,
        password: crypto.randomUUID(),
        firstName: email.split('@')[0],
        lastName: 'SSO User',
        role: 'viewer',
      });
    }

    const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user._id.toString(), refreshToken);

    res.json({
      success: true,
      message: 'SSO handoff successful',
      data: { accessToken, refreshToken, redirectUrl: redirectUrl || '/dashboard' },
    });
  }

  async generateHandoff(req: Request, res: Response): Promise<void> {
    const { userId, email, redirectUrl } = req.body;
    const { token, timestamp } = ssoService.generateHandoffToken({ userId, email, redirectUrl });
    res.json({ success: true, data: { token, timestamp } });
  }

  async getProviders(_req: Request, res: Response): Promise<void> {
    const providers = ssoService.getAvailableProviders();
    res.json({ success: true, data: { providers } });
  }

  async initiateOAuth(req: Request, res: Response): Promise<void> {
    const { providerId } = req.params;
    const provider = ssoService.getProvider(providerId);

    if (!provider) {
      res.status(404).json({ success: false, message: 'SSO provider not found' });
      return;
    }

    const state = ssoService.generateState();
    // Store state in a simple in-memory map (in production, use Redis)
    stateStore.set(state, { providerId, createdAt: Date.now() });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of stateStore.entries()) {
      if (Date.now() - value.createdAt > 10 * 60 * 1000) {
        stateStore.delete(key);
      }
    }

    const authUrl = ssoService.buildAuthorizationUrl(provider, state);
    res.json({ success: true, data: { authorizationUrl: authUrl, state } });
  }

  async handleCallback(req: Request, res: Response): Promise<void> {
    const { providerId } = req.params;
    const { code, state } = req.query;

    if (!code || !state) {
      res.status(400).json({ success: false, message: 'Missing code or state parameter' });
      return;
    }

    const stateData = stateStore.get(state as string);
    if (!stateData || stateData.providerId !== providerId) {
      res.status(403).json({ success: false, message: 'Invalid state parameter' });
      return;
    }
    stateStore.delete(state as string);

    const provider = ssoService.getProvider(providerId);
    if (!provider) {
      res.status(404).json({ success: false, message: 'SSO provider not found' });
      return;
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
          code: code as string,
          redirect_uri: provider.redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        logger.error('SSO token exchange failed', await tokenResponse.text());
        res.status(401).json({ success: false, message: 'Failed to exchange authorization code' });
        return;
      }

      const tokenData = await tokenResponse.json() as { access_token: string; token_type: string };

      // Get user info
      const userInfoResponse = await fetch(provider.userInfoUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResponse.ok) {
        res.status(401).json({ success: false, message: 'Failed to get user info from provider' });
        return;
      }

      const userInfo = await userInfoResponse.json() as Record<string, unknown>;
      const email = String(userInfo.email || '');
      const firstName = String(userInfo.given_name || (userInfo.name as string)?.split(' ')[0] || email.split('@')[0]);
      const lastName = String(userInfo.family_name || (userInfo.name as string)?.split(' ').slice(1).join(' ') || 'SSO User');

      // Find or create user
      let user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        logger.info(`SSO: auto-provisioning user for ${email} via ${providerId}`);
        user = await User.create({
          email: email.toLowerCase(),
          passwordHash: await (await import('bcryptjs')).hash(crypto.randomUUID(), 12),
          firstName,
          lastName,
          role: 'viewer',
          ssoProvider: providerId,
          ssoId: String(userInfo.id || userInfo.sub || ''),
          isActive: true,
        });
      } else if (!user.ssoProvider) {
        // Link SSO to existing account
        user.ssoProvider = providerId;
        user.ssoId = String(userInfo.id || userInfo.sub || '');
        await user.save();
      }

      // Generate tokens
      const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken();
      await tokenService.storeRefreshToken(user._id.toString(), refreshToken);

      activityEmitter.emit({
        action: 'auth.sso_login', userId: user._id.toString(),
        userName: `${user.firstName} ${user.lastName}`, userEmail: user.email,
        severity: 'info', status: 'success',
        details: { provider: providerId },
        ...this.getClientInfo(req),
      });

      // Redirect to frontend with tokens
      const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/sso/callback?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`;
      res.redirect(frontendUrl);
    } catch (error) {
      logger.error('SSO callback error:', error);
      activityEmitter.emit({
        action: 'auth.sso_failed', userId: 'unknown', userName: 'Unknown',
        severity: 'warning', status: 'failure',
        details: { provider: providerId, error: error instanceof Error ? error.message : String(error) },
        ...this.getClientInfo(req),
      });
      res.status(500).json({ success: false, message: 'SSO authentication failed' });
    }
  }
}

// In-memory state store (use Redis in production)
const stateStore = new Map<string, { providerId: string; createdAt: number }>();

export const ssoController = new SsoController();
