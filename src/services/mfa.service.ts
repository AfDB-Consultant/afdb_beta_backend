import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { User } from '../models/user.model';
import { logger } from '../config/logger';

export class MfaService {
  async generateSecret(userId: string, email: string): Promise<{ secret: string; qrCode: string }> {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'AfDB Beta Portal', secret);
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    await User.findByIdAndUpdate(userId, { mfaSecret: secret });
    logger.info(`MFA secret generated for user: ${userId}`);
    return { secret, qrCode };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user?.mfaSecret) return false;
    return authenticator.verify({ token, secret: user.mfaSecret });
  }

  async enable(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { mfaEnabled: true });
    logger.info(`MFA enabled for user: ${userId}`);
  }

  async disable(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { mfaEnabled: false, mfaSecret: undefined });
    logger.info(`MFA disabled for user: ${userId}`);
  }
}

export const mfaService = new MfaService();
