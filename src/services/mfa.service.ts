import { generateSecret, generate, verify, generateURI } from 'otplib';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { User } from '../models/user.model';
import { logger } from '../config/logger';

export class MfaService {
  async generateSecret(userId: string, email: string): Promise<{ secret: string; qrCode: string }> {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ secret, label: email, issuer: 'AfDB Secure Portal' });
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    await User.findByIdAndUpdate(userId, { mfaSecret: secret });
    logger.info(`MFA secret generated for user: ${userId}`);
    return { secret, qrCode };
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user?.mfaSecret) return false;
    const result = await verify({ token, secret: user.mfaSecret });
    return result.valid;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user || !user.mfaBackupCodes) return false;

    for (const backupCode of user.mfaBackupCodes) {
      if (backupCode.used) continue;
      const isValid = await bcrypt.compare(code, backupCode.codeHash);
      if (isValid) {
        backupCode.used = true;
        await user.save();
        logger.info(`MFA backup code used for user: ${userId}`);
        return true;
      }
    }
    return false;
  }

  async generateBackupCodes(userId: string): Promise<string[]> {
    const codes: string[] = [];
    const codeHashes: { codeHash: string; used: boolean }[] = [];

    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
      const codeHash = await bcrypt.hash(code, 10);
      codeHashes.push({ codeHash, used: false });
    }

    await User.findByIdAndUpdate(userId, { mfaBackupCodes: codeHashes });
    logger.info(`MFA backup codes generated for user: ${userId}`);
    return codes;
  }

  async enable(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { mfaEnabled: true });
    logger.info(`MFA enabled for user: ${userId}`);
  }

  async disable(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      mfaSecret: undefined,
      mfaBackupCodes: [],
    });
    logger.info(`MFA disabled for user: ${userId}`);
  }

  async getRemainingBackupCodes(userId: string): Promise<number> {
    const user = await User.findById(userId);
    if (!user?.mfaBackupCodes) return 0;
    return user.mfaBackupCodes.filter(c => !c.used).length;
  }

  async generateCurrentToken(secret: string): Promise<string> {
    return generate({ secret });
  }
}

export const mfaService = new MfaService();
