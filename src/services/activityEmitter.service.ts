import { config } from '../config/index';
import { logger } from '../config/logger';

interface ActivityEvent {
  action: string;
  entityType?: string;
  entityId?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'critical';
  source?: 'beta' | 'core';
  status?: 'success' | 'failure';
}

export class ActivityEmitterService {
  /**
   * Emit an activity event to Core backend for diagnostic monitoring.
   * Fire-and-forget: errors are caught and logged, never thrown.
   */
  async emit(event: ActivityEvent): Promise<void> {
    try {
      const payload = {
        action: event.action,
        entityType: event.entityType || 'auth',
        entityId: event.entityId || '',
        userId: event.userId,
        userName: event.userName,
        userEmail: event.userEmail || '',
        details: event.details || {},
        ipAddress: event.ipAddress || '',
        userAgent: event.userAgent || '',
        severity: event.severity || 'info',
        source: event.source || 'beta',
        status: event.status || 'success',
      };

      // Fire-and-forget HTTP POST to Core backend
      fetch(`${config.core.apiUrl}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.core.apiKey,
        },
        body: JSON.stringify(payload),
      }).catch((err) => {
        logger.warn(`Activity emitter: failed to deliver "${event.action}" for user ${event.userId}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      logger.warn('Activity emitter: unexpected error', {
        error: err instanceof Error ? err.message : String(err),
        action: event.action,
        userId: event.userId,
      });
    }
  }
}

export const activityEmitter = new ActivityEmitterService();
