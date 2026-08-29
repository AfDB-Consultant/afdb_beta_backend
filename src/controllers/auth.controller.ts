import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { tokenService } from '../services/token.service';
import { mfaService } from '../services/mfa.service';
import { activityEmitter } from '../services/activityEmitter.service';
import { AuthRequest, JwtPayload } from '../types';
import { logger } from '../config/logger';

export class AuthController {
  private getClientInfo(req: Request) {
    return {
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    };
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const user = await authService.validateCredentials(email, password);

    if (!user) {
      // Check if account is locked
      const attemptedUser = await authService.findByEmail(email);

      // Emit failed login for known users immediately (before any early returns)
      if (attemptedUser) {
        activityEmitter.emit({
          action: 'auth.login_failed', userId: attemptedUser._id.toString(),
          userName: `${attemptedUser.firstName} ${attemptedUser.lastName}`, userEmail: attemptedUser.email,
          severity: 'warning', status: 'failure',
          ...this.getClientInfo(req),
        });
      }

      if (attemptedUser) {
        const lockInfo = authService.getLockoutInfo(attemptedUser);
        if (lockInfo.isLocked) {
          const minutesLeft = Math.ceil(((lockInfo.lockUntil?.getTime() || 0) - Date.now()) / 60000);
          activityEmitter.emit({
            action: 'auth.account_locked', userId: attemptedUser._id.toString(),
            userName: `${attemptedUser.firstName} ${attemptedUser.lastName}`, userEmail: attemptedUser.email,
            severity: 'critical', status: 'failure', details: { minutesRemaining: minutesLeft },
            ...this.getClientInfo(req),
          });
          res.status(423).json({
            success: false,
            message: `Account locked. Try again in ${minutesLeft} minutes.`,
            data: { locked: true, lockUntil: lockInfo.lockUntil },
          });
          return;
        }
        if (lockInfo.remainingAttempts <= 2) {
          res.status(200).json({
            success: false,
            message: 'Invalid credentials',
            data: { remainingAttempts: lockInfo.remainingAttempts },
          });
          return;
        }
      }
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // Always require email OTP verification after successful credentials
    res.json({ success: true, message: 'OTP verification required', data: { mfaRequired: true, userId: user._id } });
  }

  async verifyMfa(req: Request, res: Response): Promise<void> {
    const { userId, token, backupCode } = req.body;

    let isValid = false;

    if (backupCode) {
      isValid = await mfaService.verifyBackupCode(userId, backupCode);
    } else if (token) {
      isValid = await mfaService.verify(userId, token);
    }

    if (!isValid) {
      activityEmitter.emit({
        action: 'auth.mfa_failed', userId, userName: 'Unknown',
        severity: 'warning', status: 'failure',
        details: { method: backupCode ? 'backup_code' : 'totp' },
        ...this.getClientInfo(req),
      });
      res.status(401).json({ success: false, message: 'Invalid MFA token' });
      return;
    }

    const user = await authService.findById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken();

    await tokenService.storeRefreshToken(user._id.toString(), refreshToken);
    await authService.updateLastLogin(user._id.toString());

    const remainingBackupCodes = await mfaService.getRemainingBackupCodes(userId);

    activityEmitter.emit({
      action: 'auth.mfa_verified', userId: user._id.toString(),
      userName: `${user.firstName} ${user.lastName}`, userEmail: user.email,
      severity: 'info', status: 'success',
      details: { remainingBackupCodes },
      ...this.getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'MFA verified',
      data: {
        accessToken,
        refreshToken,
        remainingBackupCodes,
        user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
  }

  async signup(req: Request, res: Response): Promise<void> {
    const { email, password, firstName, lastName } = req.body;

    // Input validation
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, message: 'Invalid email format' });
      return;
    }

    // Password strength validation
    const strength = authService.validatePasswordStrength(password);
    if (!strength.valid) {
      res.status(400).json({ success: false, message: strength.errors.join('. ') });
      return;
    }

    // Check existing user
    const existing = await authService.findByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const user = await authService.createUser({ email, password, firstName, lastName });

    activityEmitter.emit({
      action: 'auth.signup', userId: user._id.toString(),
      userName: `${firstName} ${lastName}`, userEmail: email,
      severity: 'info', status: 'success',
      ...this.getClientInfo(req),
    });

    const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user._id.toString(), refreshToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
  }

  async changePassword(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, message: 'Current and new password are required' });
      return;
    }
    const result = await authService.changePassword(req.user._id.toString(), currentPassword, newPassword);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }
    // Revoke all existing tokens after password change
    await tokenService.revokeAllUserTokens(req.user._id.toString());

    activityEmitter.emit({
      action: 'auth.password_changed', userId: req.user._id.toString(),
      userName: `${req.user.firstName} ${req.user.lastName}`, userEmail: req.user.email,
      severity: 'info', status: 'success',
      ...this.getClientInfo(req),
    });

    res.json({ success: true, message: result.message });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    const userId = await tokenService.validateRefreshToken(refreshToken);

    if (!userId) {
      res.status(401).json({ success: false, message: 'Invalid refresh token' });
      return;
    }

    const user = await authService.findById(userId);
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    await tokenService.revokeRefreshToken(refreshToken);
    const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
    const newAccessToken = tokenService.generateAccessToken(payload);
    const newRefreshToken = tokenService.generateRefreshToken();
    await tokenService.storeRefreshToken(user._id.toString(), newRefreshToken);

    activityEmitter.emit({
      action: 'auth.token_refresh', userId: user._id.toString(),
      userName: `${user.firstName} ${user.lastName}`, userEmail: user.email,
      severity: 'info', status: 'success',
      ...this.getClientInfo(req),
    });

    res.json({ success: true, message: 'Token refreshed', data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    if (req.user) {
      activityEmitter.emit({
        action: 'auth.logout', userId: req.user._id,
        userName: `${req.user.firstName} ${req.user.lastName}`, userEmail: req.user.email,
        severity: 'info', status: 'success',
        ...this.getClientInfo(req as unknown as Request),
      });
      await tokenService.revokeAllUserTokens(req.user._id.toString());
    }
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    const remainingBackupCodes = await mfaService.getRemainingBackupCodes(req.user._id.toString());
    res.json({
      success: true,
      data: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        mfaEnabled: req.user.mfaEnabled,
        remainingBackupCodes,
        ssoProvider: req.user.ssoProvider,
      },
    });
  }
}

export const authController = new AuthController();
