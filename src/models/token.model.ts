import mongoose, { Schema, Document } from 'mongoose';

export interface TokenDocument extends Document {
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  expiresAt: Date;
  isRevoked: boolean;
}

const tokenSchema = new Schema<TokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refreshToken: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ userId: 1 });
export const Token = mongoose.model<TokenDocument>('Token', tokenSchema);
