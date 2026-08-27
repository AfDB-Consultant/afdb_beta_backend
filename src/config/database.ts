import mongoose from 'mongoose';
import { config } from './index';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
