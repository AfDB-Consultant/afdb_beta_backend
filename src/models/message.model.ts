import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Document {
  from_id: string;
  to_id: string;
  body: string;
  attachment?: string;
  seen: boolean;
  created_at: Date;
  updated_at: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    from_id: { type: String, required: true, index: true },
    to_id: { type: String, required: true, index: true },
    body: { type: String, required: true, maxlength: 2000 },
    attachment: { type: String },
    seen: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Compound index for efficient conversation queries
messageSchema.index({ from_id: 1, to_id: 1, created_at: -1 });

export const Message = mongoose.model<MessageDocument>('Message', messageSchema);
