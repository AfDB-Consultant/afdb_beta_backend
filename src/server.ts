import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config/index';
import { connectDatabase } from './config/database';
import { logger } from './config/logger';
import routes from './routes/index';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/securityHeaders';
import { inputSanitizer } from './middleware/inputSanitizer';
import { User } from './models/user.model';

const app = express();

// === OWASP Top 10 Compliance ===

// A01: Broken Access Control — Helmet sets security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
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
  const uptimeSeconds = process.uptime();
  const uptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${Math.floor(uptimeSeconds % 60)}s`;
  const memUsage = process.memoryUsage();
  const healthData = {
    status: 'ok',
    service: 'afdb-beta-backend',
    timestamp: new Date().toISOString(),
    uptime,
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
  };

  // If client accepts HTML, render a UI page
  if (_req.headers.accept?.includes('text/html')) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Health Check - AfDB Beta Backend</title>
  <style>
    :root {
      --bg: #f8fafc; --card-bg: #fff; --card-border: #e5e7eb; --metric-bg: #f3f4f6; --metric-border: #e5e7eb;
      --text: #111827; --text-secondary: #6b7280; --text-muted: #9ca3af;
    }
    [data-theme="dark"] {
      --bg: #0a0a0a; --card-bg: rgb(15,15,15); --card-border: rgb(30,30,30); --metric-bg: rgb(20,20,20); --metric-border: rgb(30,30,30);
      --text: #e5e7eb; --text-secondary: #9ca3af; --text-muted: #6b7280;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; transition: background 0.3s, color 0.3s; }
    .container { max-width: 480px; width: 100%; }
    .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 32px; transition: background 0.3s, border-color 0.3s; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .status-dot { width: 12px; height: 12px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .title { font-size: 20px; font-weight: 600; color: var(--text); }
    .subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 2px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); border-radius: 20px; font-size: 13px; font-weight: 500; color: #22c55e; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .metric { background: var(--metric-bg); border: 1px solid var(--metric-border); border-radius: 10px; padding: 14px; transition: background 0.3s, border-color 0.3s; }
    .metric-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .metric-value { font-size: 15px; font-weight: 500; color: var(--text); }
    .full-width { grid-column: 1 / -1; }
    .divider { height: 1px; background: var(--card-border); margin: 16px 0; }
    .footer { text-align: center; margin-top: 16px; font-size: 12px; color: var(--text-muted); }
    .footer a { color: #009A44; text-decoration: none; }
    .theme-toggle {
      position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 100;
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; border-radius: 50px;
      background: rgba(255,255,255,0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(229,231,235,0.6);
      box-shadow: 0 4px 20px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05);
      cursor: pointer; font-size: 12px; font-weight: 500; color: #1e3a5f;
      transition: all 0.3s; user-select: none;
    }
    .theme-toggle:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.14); transform: translateX(-50%) translateY(-2px); }
    .theme-toggle svg { width: 18px; height: 18px; transition: transform 0.4s; }
    .theme-toggle .icon-sun { display: none; }
    .theme-toggle .icon-moon { display: block; }
    [data-theme="dark"] .theme-toggle { background: rgba(19,22,29,0.9); border-color: rgba(45,51,66,0.8); color: #D1D5DB; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    [data-theme="dark"] .theme-toggle:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.4); transform: translateX(-50%) translateY(-2px); }
    [data-theme="dark"] .theme-toggle .icon-sun { display: block; }
    [data-theme="dark"] .theme-toggle .icon-moon { display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="status-dot"></div>
        <div>
          <div class="title">AfDB Beta Backend</div>
          <div class="subtitle">Authentication Gateway</div>
        </div>
      </div>
      <div class="status-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        All Systems Operational
      </div>
      <div class="grid">
        <div class="metric">
          <div class="metric-label">Uptime</div>
          <div class="metric-value">${healthData.uptime}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Environment</div>
          <div class="metric-value">${healthData.environment}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Heap Used</div>
          <div class="metric-value">${healthData.memory.heapUsed}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Heap Total</div>
          <div class="metric-value">${healthData.memory.heapTotal}</div>
        </div>
        <div class="metric full-width">
          <div class="metric-label">Node.js Version</div>
          <div class="metric-value">${healthData.nodeVersion}</div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="metric full-width" style="margin-bottom:0">
        <div class="metric-label">Timestamp</div>
        <div class="metric-value" style="font-size:13px; font-family: monospace;">${healthData.timestamp}</div>
      </div>
    </div>
    <div class="footer">
      <a href="/api-docs">API Documentation</a> &middot; <a href="/api/v1">API v1</a>
    </div>
  </div>
  <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
    <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
    <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
    <span class="toggle-label">Dark</span>
  </button>
  <script>
    (function() {
      var toggle = document.getElementById('themeToggle');
      var label = toggle.querySelector('.toggle-label');
      var root = document.documentElement;
      var saved = localStorage.getItem('health-theme');
      if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.setAttribute('data-theme', 'dark');
        label.textContent = 'Light';
      }
      toggle.addEventListener('click', function() {
        var isDark = root.getAttribute('data-theme') === 'dark';
        if (isDark) { root.removeAttribute('data-theme'); localStorage.setItem('health-theme', 'light'); label.textContent = 'Dark'; }
        else { root.setAttribute('data-theme', 'dark'); localStorage.setItem('health-theme', 'dark'); label.textContent = 'Light'; }
      });
    })();
  </script>
</body>
</html>`;
    return res.send(html);
  }

  // Otherwise return JSON
  res.json(healthData);
});

// API routes
app.use('/api/v1', routes);

// API Spec (OpenAPI JSON)
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AfDB Beta Backend API',
      version: '1.0.0',
      description: 'Authentication Gateway — MFA, JWT, SSO-IDP Federation, OWASP Compliant',
    },
    servers: [{ url: `http://localhost:${config.port}/api/v1` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, 'routes', '*.ts')],
});

// Allow cross-origin resources for API docs (Scalar CDN)
app.use('/api-docs', (_req, res, next) => {
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Content-Security-Policy');
  next();
});
app.use('/api-docs.json', (_req, res, next) => {
  res.removeHeader('Cross-Origin-Embedder-Policy');
  res.removeHeader('Cross-Origin-Opener-Policy');
  res.removeHeader('Cross-Origin-Resource-Policy');
  res.removeHeader('Content-Security-Policy');
  next();
});

// Serve OpenAPI spec as JSON (consumed by Scalar)
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

// Scalar — modern API documentation
app.get('/api-docs', (_req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>AfDB Beta Backend — API Documentation</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <div id="scalar-container"></div>
  <script id="api-reference" data-url="/api-docs.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.25.68"></script>
</body>
</html>`);
});

// Error handling
app.use(errorHandler);

// ── Auto-seed demo accounts on startup ──
async function seedDemoUsers(): Promise<void> {
  const demoUsers = [
    { firstName: 'Admin', lastName: 'User', email: 'afdbadmin@yopmail.com', password: 'Admin@123', role: 'admin' },
    { firstName: 'Viewer', lastName: 'User', email: 'afdbaviewer@yopmail.com', password: 'Viewer@123', role: 'viewer' },
    { firstName: 'Manager', lastName: 'User', email: 'afdbmanager@yopmail.com', password: 'Manager@123', role: 'staff' },
  ];

  for (const u of demoUsers) {
    const existing = await User.findOne({ email: u.email });
    const passwordHash = await bcrypt.hash(u.password, 12);

    if (!existing) {
      await User.create({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true,
        mfaEnabled: false,
        loginAttempts: 0,
      });
      logger.info(`Seeded demo user: ${u.email} (${u.role})`);
    } else {
      // Always reset password and ensure correct role for demo users
      existing.passwordHash = passwordHash;
      existing.role = u.role as 'admin' | 'viewer' | 'staff';
      existing.isActive = true;
      existing.loginAttempts = 0;
      existing.lockUntil = undefined;
      await existing.save();
      logger.info(`Reset demo user credentials: ${u.email} (${u.role})`);
    }
  }
}

async function start(): Promise<void> {
  await connectDatabase();
  await seedDemoUsers();
  app.listen(config.port, () => {
    logger.info(`AfDB Beta Backend running on port ${config.port}`);
    logger.info(`API docs: http://localhost:${config.port}/api-docs`);
    logger.info(`OWASP Top 10 security measures active`);
  });
}

start();

export default app;
