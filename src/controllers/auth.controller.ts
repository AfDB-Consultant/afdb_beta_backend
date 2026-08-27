import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { tokenService } from '../services/token.service';
import { mfaService } from '../services/mfa.service';
import { AuthRequest, JwtPayload } from '../types';
import { logger } from '../config/logger';

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const user = await authService.validateCredentials(email, password);

    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    if (user.mfaEnabled) {
      res.json({ success: true, message: 'MFA required', data: { mfaRequired: true, userId: user._id } });
      return;
    }

    const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
    const accessToken = tokenService.generateAccessToken(payload);
    const refreshToken = tokenService.generateRefreshToken();

    await tokenService.storeRefreshToken(user._id.toString(), refreshToken);
    await authService.updateLastLogin(user._id.toString());

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
  }

  async verifyMfa(req: Request, res: Response): Promise<void> {
    const { userId, token } = req.body;
    const isValid = await mfaService.verify(userId, token);

    if (!isValid) {
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

    res.json({
      success: true,
      message: 'MFA verified',
      data: {
        accessToken,
        refreshToken,
        user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      },
    });
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

    res.json({ success: true, message: 'Token refreshed', data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    if (req.user) {
      await tokenService.revokeAllUserTokens(req.user._id.toString());
    }
    res.json({ success: true, message: 'Logged out successfully' });
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user) { res.status(401).json({ success: false, message: 'Not authenticated' }); return; }
    res.json({
      success: true,
      data: {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        mfaEnabled: req.user.mfaEnabled,
      },
    });
  }
}

export const authController = new AuthController();
