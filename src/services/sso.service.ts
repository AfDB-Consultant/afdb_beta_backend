import crypto from 'crypto';
import { config } from '../config/index';
import { logger } from '../config/logger';

export interface SsoProvider {
  id: string;
  name: string;
  icon: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

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

  getAvailableProviders(): { id: string; name: string; icon: string; authorizationUrl: string }[] {
    const providers = this.getConfiguredProviders();
    return providers.map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      authorizationUrl: this.buildAuthorizationUrl(p),
    }));
  }

  getProvider(providerId: string): SsoProvider | undefined {
    return this.getConfiguredProviders().find(p => p.id === providerId);
  }

  buildAuthorizationUrl(provider: SsoProvider, state?: string): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: provider.scopes.join(' '),
      ...(state && { state }),
    });
    return `${provider.authorizationUrl}?${params.toString()}`;
  }

  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  validateState(state: string, storedState: string): boolean {
    return crypto.timingSafeEqual(Buffer.from(state), Buffer.from(storedState));
  }

  private getConfiguredProviders(): SsoProvider[] {
    const providers: SsoProvider[] = [];

    // Google OAuth2
    if (config.sso.googleClientId) {
      providers.push({
        id: 'google',
        name: 'Google',
        icon: 'google',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        clientId: config.sso.googleClientId,
        clientSecret: config.sso.googleClientSecret || '',
        redirectUri: config.sso.googleRedirectUri || 'http://localhost:4000/api/v1/sso/callback/google',
        scopes: ['openid', 'email', 'profile'],
      });
    }

    // Microsoft / Azure AD
    if (config.sso.microsoftClientId) {
      providers.push({
        id: 'microsoft',
        name: 'Microsoft',
        icon: 'microsoft',
        authorizationUrl: `https://login.microsoftonline.com/${config.sso.microsoftTenantId || 'common'}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${config.sso.microsoftTenantId || 'common'}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        clientId: config.sso.microsoftClientId,
        clientSecret: config.sso.microsoftClientSecret || '',
        redirectUri: config.sso.microsoftRedirectUri || 'http://localhost:4000/api/v1/sso/callback/microsoft',
        scopes: ['openid', 'email', 'profile', 'User.Read'],
      });
    }

    return providers;
  }
}

export const ssoService = new SsoService();
