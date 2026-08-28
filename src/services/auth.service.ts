import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../models/user.model';
import { logger } from '../config/logger';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

// OWASP password policy: min 8 chars, uppercase, lowercase, digit, special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]).{8,}$/;

export class AuthService {
  async findByEmail(email: string): Promise<UserDocument | null> {
    if (typeof email !== 'string') return null;
    return User.findOne({ email: email.toLowerCase(), isActive: true });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return User.findById(id);
  }

  async validateCredentials(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    // Check account lockout
    if (user.lockUntil && user.lockUntil > new Date()) {
      logger.warn(`Login attempt on locked account: ${email}`);
      return null;
    }

    // If lock expired, reset attempts
    if (user.loginAttempts > 0 && user.lockUntil && user.lockUntil <= new Date()) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      // Increment login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        logger.warn(`Account locked due to ${user.loginAttempts} failed attempts: ${email}`);
      }
      await user.save();
      return null;
    }

    // Successful login — reset attempts
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
    }

    return user;
  }

  validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
    if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
    if (!/\d/.test(password)) errors.push('At least one digit');
    if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password)) errors.push('At least one special character');
    return { valid: errors.length === 0, errors };
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'admin' | 'staff' | 'viewer';
  }): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await User.create({
      ...data,
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role || 'viewer',
      passwordChangedAt: new Date(),
    });
    logger.info(`User created: ${user.email}`);
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: 'User not found' };

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) return { success: false, message: 'Current password is incorrect' };

    const strength = this.validatePasswordStrength(newPassword);
    if (!strength.valid) return { success: false, message: strength.errors.join(', ') };

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordChangedAt = new Date();
    await user.save();
    logger.info(`Password changed for user: ${userId}`);
    return { success: true, message: 'Password changed successfully' };
  }

  getLockoutInfo(user: UserDocument): { isLocked: boolean; lockUntil?: Date; remainingAttempts: number } {
    const isLocked = !!(user.lockUntil && user.lockUntil > new Date());
    const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - (user.loginAttempts || 0));
    return { isLocked, lockUntil: user.lockUntil, remainingAttempts };
  }
}

export const authService = new AuthService();
