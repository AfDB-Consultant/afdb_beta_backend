import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/index';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import routes from './routes/index';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: config.cors.origins, credentials: true }));

// Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Rate limiting
app.use('/api/v1', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'afdb-beta-backend', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1', routes);

// Swagger docs
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AfDB Beta Backend API',
      version: '1.0.0',
      description: 'Authentication Gateway — MFA, JWT, SSO-IDP Federation',
    },
    servers: [{ url: `http://localhost:${config.port}/api/v1` }],
  },
  apis: ['./src/routes/*.ts'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Error handling
app.use(errorHandler);

async function start(): Promise<void> {
  await connectDatabase();
  app.listen(config.port, () => {
    logger.info(`🔐 AfDB Beta Backend running on port ${config.port}`);
    logger.info(`📚 API docs: http://localhost:${config.port}/api-docs`);
  });
}

start();

export default app;
