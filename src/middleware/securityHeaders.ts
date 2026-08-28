import { Request, Response, NextFunction } from 'express';

/**
 * OWASP Top 10 — Additional security headers
 * A05: Security Misconfiguration — Defense in depth
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent caching of sensitive API responses
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');

  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');

  // Permissions-Policy — restrict browser features
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

  // Prevent MIME type sniffing (redundant with helmet but explicit)
  res.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking (redundant with helmet but explicit)
  res.set('X-Frame-Options', 'DENY');

  // XSS protection for older browsers
  res.set('X-XSS-Protection', '1; mode=block');

  next();
}
