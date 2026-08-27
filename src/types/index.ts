import { Request } from 'express';

export interface IUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'staff' | 'viewer';
  mfaEnabled: boolean;
  mfaSecret?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IToken {
  _id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface SsoHandoffPayload {
  token: string;
  timestamp: number;
  userId: string;
  email: string;
  redirectUrl: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}
