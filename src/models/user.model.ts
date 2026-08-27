import mongoose, { Schema, Document } from 'mongoose';

export interface UserDocument extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'staff' | 'viewer';
  mfaEnabled: boolean;
  mfaSecret?: string;
  isActive: boolean;
  lastLogin?: Date;
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
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
export const User = mongoose.model<UserDocument>('User', userSchema);
