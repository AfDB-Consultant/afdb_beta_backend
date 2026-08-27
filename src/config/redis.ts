import Redis from 'ioredis';
import { config } from './index';
import { logger } from './logger';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  retryStrategy: (times) => Math.min(times * 200, 5000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error:', err));
