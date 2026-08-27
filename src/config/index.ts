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
  },
  core: {
    apiUrl: process.env.CORE_API_URL || 'http://localhost:4001/api/v1',
    apiKey: process.env.CORE_API_KEY || 'dev-api-key',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },
};
