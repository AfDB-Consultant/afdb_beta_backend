import { Request, Response } from 'express';
import { ssoService } from '../services/sso.service';
import { authService } from '../services/auth.service';
import { tokenService } from '../services/token.service';
import { logger } from '../config/logger';
import { JwtPayload } from '../types';

export class SsoController {
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
}

export const ssoController = new SsoController();
