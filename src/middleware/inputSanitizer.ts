import { Request, Response, NextFunction } from 'express';

/**
 * OWASP Top 10 — A03: Injection prevention
 * Sanitizes user input to prevent NoSQL injection and XSS
 */

// Patterns that indicate potential injection attacks
const NOSCQL_PATTERNS = [
  /\$gt/i, /\$gte/i, /\$lt/i, /\$lte/i, /\$ne/i, /\$in/i,
  /\$or/i, /\$and/i, /\$regex/i, /\$where/i, /\$exists/i,
  /\$elemMatch/i, /\$push/i, /\$pull/i, /\$addToSet/i,
];

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
];

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Trim whitespace
    let sanitized = value.trim();
    // Limit string length
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }
    return sanitized;
  }
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return value.map(item => sanitizeValue(item));
    }
    return sanitizeObject(value as Record<string, unknown>);
  }
  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize keys to prevent key-based injection
    const sanitizedKey = key.replace(/[$.]/g, '_');
    sanitized[sanitizedKey] = sanitizeValue(value);
  }
  return sanitized;
}

function checkInjection(value: unknown, path: string): string | null {
  if (typeof value === 'string') {
    for (const pattern of NOSCQL_PATTERNS) {
      if (pattern.test(value)) {
        return `Potential NoSQL injection detected in ${path}`;
      }
    }
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(value)) {
        return `Potential XSS injection detected in ${path}`;
      }
    }
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Detect MongoDB operator keys (NoSQL injection via object keys)
      if (key.startsWith('$')) {
        return `Potential NoSQL injection detected in ${path}: operator key "${key}"`;
      }
      const result = checkInjection(val, `${path}.${key}`);
      if (result) return result;
    }
  }
  return null;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction): void {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    // Check for injection attempts
    for (const [key, value] of Object.entries(req.body)) {
      const injection = checkInjection(value, `body.${key}`);
      if (injection) {
        res.status(400).json({ success: false, message: 'Invalid input detected' });
        return;
      }
    }
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      const injection = checkInjection(value, `query.${key}`);
      if (injection) {
        res.status(400).json({ success: false, message: 'Invalid input detected' });
        return;
      }
    }
  }

  next();
}
