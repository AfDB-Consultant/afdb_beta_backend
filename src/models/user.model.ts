import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'staff' | 'viewer';
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: { codeHash: string; used: boolean }[];
  ssoProvider?: string;
  ssoId?: string;
  isActive: boolean;
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'staff', 'viewer'], default: 'viewer' },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String },
    mfaBackupCodes: [{
      codeHash: { type: String, required: true },
      used: { type: Boolean, default: false },
    }],
    ssoProvider: { type: String },
    ssoId: { type: String },
    isActive: { type: Boolean, default: true },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

// Virtual: check if account is locked
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

export const User = mongoose.model<UserDocument>('User', userSchema);
