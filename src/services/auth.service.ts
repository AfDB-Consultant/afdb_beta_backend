import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../models/user.model';
import { logger } from '../config/logger';

export class AuthService {
  async findByEmail(email: string): Promise<UserDocument | null> {
    return User.findOne({ email: email.toLowerCase(), isActive: true });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return User.findById(id);
  }

  async validateCredentials(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
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
    });
    logger.info(`User created: ${user.email}`);
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }
}

export const authService = new AuthService();
