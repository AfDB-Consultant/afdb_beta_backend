import { Response, NextFunction } from 'express';
import { tokenService } from '../services/token.service';
import { authService } from '../services/auth.service';
import { AuthRequest, IUser } from '../types';
import { logger } from '../config/logger';

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = tokenService.verifyAccessToken(token);
    const user = await authService.findById(payload.userId);

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User not found or inactive' });
      return;
    }

    req.user = user as unknown as IUser;
    next();
  } catch (error) {
    logger.warn('Token verification failed:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
