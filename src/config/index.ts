import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27018/afdb_beta',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '30m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },
  sso: {
    sharedSecret: process.env.SSO_SHARED_SECRET || 'dev-shared-secret',
    tokenExpiryMinutes: parseInt(process.env.SSO_TOKEN_EXPIRY_MINUTES || '5', 10),
    // Google OAuth2
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/v1/sso/callback/google',
    // Microsoft / Azure AD
    microsoftClientId: process.env.MICROSOFT_CLIENT_ID || '',
    microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    microsoftTenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    microsoftRedirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:4000/api/v1/sso/callback/microsoft',
  },
  core: {
    apiUrl: process.env.CORE_API_URL || 'http://localhost:4001/api/v1',
    apiKey: process.env.CORE_API_KEY || 'dev-api-key',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,null').split(','),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'no-reply@atradezone.ca',
  },
};
