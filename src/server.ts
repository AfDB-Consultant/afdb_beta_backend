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
import { securityHeaders } from './middleware/securityHeaders';
import { inputSanitizer } from './middleware/inputSanitizer';

const app = express();

// === OWASP Top 10 Compliance ===

// A01: Broken Access Control — Helmet sets security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },           // A05: Clickjacking protection
  hsts: { maxAge: 31536000, includeSubDomains: true }, // A02: HSTS
  ieNoOpen: true,
  noSniff: true,                              // A05: MIME sniffing protection
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// Additional security headers
app.use(securityHeaders);

// A01: CORS — restrict origins
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
}));

// A02: Cryptographic Failures — Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// A03: Injection — Input sanitization (must run AFTER body parser)
app.use(inputSanitizer);

// A07: Identification and Authentication — Logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// A04: Insecure Design — Rate limiting
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
      description: 'Authentication Gateway — MFA, JWT, SSO-IDP Federation, OWASP Compliant',
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
    logger.info(`AfDB Beta Backend running on port ${config.port}`);
    logger.info(`API docs: http://localhost:${config.port}/api-docs`);
    logger.info(`OWASP Top 10 security measures active`);
  });
}

start();

export default app;
