import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmailMetadataDocument = HydratedDocument<EmailMetadata>;

@Schema({ timestamps: true })
export class EmailMetadata {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop()
  threadId: string;

  @Prop({ text: true })
  subject: string;

  @Prop()
  snippet: string;

  @Prop({ text: true })
  from: string;

  @Prop({ index: true })
  date: Date;

  @Prop({ default: false })
  isRead: boolean;

  // --- THÊM TRƯỜNG NÀY ---
  @Prop({ type: [String], index: true })
  labelIds: string[]; // Ví dụ: ['INBOX', 'IMPORTANT', 'UNREAD']

  // --- THÊM MỚI: Vector Embedding ---
  // Lưu vector 768 chiều (text-embedding-004)
  @Prop({
    type: [Number],
    select: false // Không load mặc định để nhẹ query thường; index vector tạo trên Atlas
  })
  embedding: number[];
}

export const EmailMetadataSchema = SchemaFactory.createForClass(EmailMetadata);
// Index text
EmailMetadataSchema.index({ subject: 'text', from: 'text', snippet: 'text' });
