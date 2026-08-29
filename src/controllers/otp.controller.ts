import { Request, Response } from 'express';
import emailService from '../services/email.service';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { authService } from '../services/auth.service';
import { tokenService } from '../services/token.service';
import { JwtPayload } from '../types';

class OtpController {
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * POST /auth/send-otp
   * Send OTP for 2FA setup (authenticated user)
   */
  async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?._id;
      const userEmail = (req as any).user?.email;
      const userName = (req as any).user?.fullName;

      if (!userEmail) {
        res.status(400).json({ success: false, message: 'User email not found' });
        return;
      }

      const otp = this.generateOtp();
      await redis.set(`2fa_otp:${userId}`, otp, 'EX', 600);

      const sent = await emailService.sendOtp(userEmail, otp, userName, '2fa');
      if (!sent) {
        res.status(500).json({ success: false, message: 'Failed to send OTP email' });
        return;
      }

      res.json({ success: true, message: 'Verification code sent to your email', data: { email: userEmail } });
    } catch (error) {
      logger.error('Error sending OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/verify-otp
   * Verify OTP for 2FA setup
   */
  async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.userId || (req as any).user?._id;
      const { code } = req.body;

      if (!code || code.length !== 6) {
        res.status(400).json({ success: false, message: 'Please enter a valid 6-digit code' });
        return;
      }

      const storedOtp = await redis.get(`2fa_otp:${userId}`);
      if (!storedOtp) {
        res.status(400).json({ success: false, message: 'Code expired. Request a new one.' });
        return;
      }
      if (storedOtp !== code) {
        res.status(401).json({ success: false, message: 'Invalid verification code' });
        return;
      }

      await redis.del(`2fa_otp:${userId}`);
      res.json({ success: true, message: 'Two-factor authentication enabled successfully' });
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/send-login-otp
   * Send OTP for login when 2FA is enabled
   */
  async sendLoginOtp(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;
      if (!userId) {
        res.status(400).json({ success: false, message: 'User ID required' });
        return;
      }

      const user = await authService.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const otp = this.generateOtp();
      await redis.set(`login_otp:${userId}`, otp, 'EX', 600);

      const sent = await emailService.sendOtp(user.email, otp, `${user.firstName} ${user.lastName}`, 'login');
      if (!sent) {
        res.status(500).json({ success: false, message: 'Failed to send login OTP' });
        return;
      }

      logger.info(`Login OTP sent to ${user.email}`);
      res.json({ success: true, message: 'Verification code sent to your email', data: { email: user.email } });
    } catch (error) {
      logger.error('Error sending login OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/verify-login-otp
   * Verify login OTP and issue tokens
   */
  async verifyLoginOtp(req: Request, res: Response): Promise<void> {
    try {
      const { userId, code } = req.body;
      if (!userId || !code || code.length !== 6) {
        res.status(400).json({ success: false, message: 'User ID and valid code required' });
        return;
      }

      const storedOtp = await redis.get(`login_otp:${userId}`);
      if (!storedOtp) {
        res.status(400).json({ success: false, message: 'Code expired. Please login again.' });
        return;
      }
      if (storedOtp !== code) {
        res.status(401).json({ success: false, message: 'Invalid verification code' });
        return;
      }

      await redis.del(`login_otp:${userId}`);

      const user = await authService.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken();
      await tokenService.storeRefreshToken(user._id.toString(), refreshToken);
      await authService.updateLastLogin(user._id.toString());

      logger.info(`Login OTP verified for ${user.email}`);
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          refreshToken,
          user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        },
      });
    } catch (error) {
      logger.error('Error verifying login OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/send-register-otp
   * Send OTP for email verification during registration
   */
  async sendRegisterOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email required' });
        return;
      }

      const existing = await authService.findByEmail(email);
      if (existing) {
        res.status(409).json({ success: false, message: 'Email already registered' });
        return;
      }

      const otp = this.generateOtp();
      await redis.set(`register_otp:${email}`, otp, 'EX', 600);

      const sent = await emailService.sendOtp(email, otp, undefined, 'register');
      if (!sent) {
        res.status(500).json({ success: false, message: 'Failed to send verification email' });
        return;
      }

      logger.info(`Register OTP sent to ${email}`);
      res.json({ success: true, message: 'Verification code sent to your email' });
    } catch (error) {
      logger.error('Error sending register OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/verify-register-otp
   * Verify registration OTP and create account
   */
  async verifyRegisterOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, firstName, lastName, password } = req.body;
      if (!email || !code || code.length !== 6 || !firstName || !lastName || !password) {
        res.status(400).json({ success: false, message: 'All fields and valid code required' });
        return;
      }

      const storedOtp = await redis.get(`register_otp:${email}`);
      if (!storedOtp) {
        res.status(400).json({ success: false, message: 'Code expired. Please request a new one.' });
        return;
      }
      if (storedOtp !== code) {
        res.status(401).json({ success: false, message: 'Invalid verification code' });
        return;
      }

      await redis.del(`register_otp:${email}`);

      const user = await authService.createUser({ email, password, firstName, lastName });

      const payload: JwtPayload = { userId: user._id.toString(), email: user.email, role: user.role };
      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken();
      await tokenService.storeRefreshToken(user._id.toString(), refreshToken);

      logger.info(`Registration completed for ${email}`);
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: {
          accessToken,
          refreshToken,
          user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        },
      });
    } catch (error) {
      logger.error('Error verifying register OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/send-reset-otp
   * Send OTP for password reset
   */
  async sendResetOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ success: false, message: 'Email required' });
        return;
      }

      const user = await authService.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists — still return success to prevent enumeration
        res.json({ success: true, message: 'If the email is registered, a verification code has been sent.' });
        return;
      }

      const otp = this.generateOtp();
      await redis.set(`reset_otp:${email}`, otp, 'EX', 600);

      const sent = await emailService.sendOtp(email, otp, `${user.firstName} ${user.lastName}`, 'reset');
      if (!sent) {
        res.status(500).json({ success: false, message: 'Failed to send reset email' });
        return;
      }

      logger.info(`Password reset OTP sent to ${email}`);
      res.json({ success: true, message: 'Verification code sent to your email' });
    } catch (error) {
      logger.error('Error sending reset OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  /**
   * POST /auth/verify-reset-otp
   * Verify reset OTP and reset password
   */
  async verifyResetOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || code.length !== 6 || !newPassword) {
        res.status(400).json({ success: false, message: 'Email, valid code, and new password required' });
        return;
      }

      const storedOtp = await redis.get(`reset_otp:${email}`);
      if (!storedOtp) {
        res.status(400).json({ success: false, message: 'Code expired. Please request a new one.' });
        return;
      }
      if (storedOtp !== code) {
        res.status(401).json({ success: false, message: 'Invalid verification code' });
        return;
      }

      await redis.del(`reset_otp:${email}`);

      const user = await authService.findByEmail(email);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }

      await authService.changePassword(user._id.toString(), '', newPassword);
      await tokenService.revokeAllUserTokens(user._id.toString());

      logger.info(`Password reset completed for ${email}`);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      logger.error('Error verifying reset OTP:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const otpController = new OtpController();
