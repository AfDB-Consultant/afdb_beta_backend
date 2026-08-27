import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Token } from '../models/token.model';
import { config } from '../config/index';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { JwtPayload } from '../types';

export class TokenService {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiry,
    });
  }

  generateRefreshToken(): string {
    return uuidv4();
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await Token.create({ userId, refreshToken, expiresAt });
  }

  async validateRefreshToken(token: string): Promise<string | null> {
    const stored = await Token.findOne({ refreshToken: token, isRevoked: false });
    if (!stored) return null;
    if (stored.expiresAt < new Date()) {
      await Token.findByIdAndUpdate(stored._id, { isRevoked: true });
      return null;
    }
    return stored.userId.toString();
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await Token.updateMany({ refreshToken: token }, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await Token.updateMany({ userId }, { isRevoked: true });
    await redis.del(`user_permissions:${userId}`);
    logger.info(`All tokens revoked for user: ${userId}`);
  }

  async cacheUserPermissions(userId: string, permissions: string[]): Promise<void> {
    await redis.set(
      `user_permissions:${userId}`,
      JSON.stringify(permissions),
      'EX',
      1800
    );
  }

  async getCachedPermissions(userId: string): Promise<string[] | null> {
    const cached = await redis.get(`user_permissions:${userId}`);
    return cached ? JSON.parse(cached) : null;
  }
}

export const tokenService = new TokenService();
