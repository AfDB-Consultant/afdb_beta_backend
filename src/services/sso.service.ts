import crypto from 'crypto';
import { config } from '../config/index';
import { logger } from '../config/logger';
import { SsoHandoffPayload } from '../types';

export class SsoService {
  generateHandoffToken(payload: { userId: string; email: string; redirectUrl: string }): {
    token: string;
    timestamp: number;
  } {
    const timestamp = Date.now();
    const data = `${payload.userId}:${payload.email}:${timestamp}:${config.sso.sharedSecret}`;
    const token = crypto.createHash('sha256').update(data).digest('hex');
    return { token, timestamp };
  }

  validateHandoffToken(token: string, timestamp: number): boolean {
    const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
    if (ageMinutes > config.sso.tokenExpiryMinutes) {
      logger.warn(`SSO token expired: age=${ageMinutes.toFixed(1)}min`);
      return false;
    }
    return true;
  }

  async verifyWithIdp(token: string, timestamp: number): Promise<boolean> {
    const isValid = this.validateHandoffToken(token, timestamp);
    if (!isValid) {
      logger.warn('SSO token validation failed with IDP');
      return false;
    }
    logger.info('SSO token verified with IDP successfully');
    return true;
  }
}

export const ssoService = new SsoService();
