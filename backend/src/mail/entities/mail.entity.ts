import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MailDocument = HydratedDocument<Mail>;

@Schema({ timestamps: true })
export class Mail {
    // 1. Compound Index cho truy vấn phổ biến nhất: 
    // "Lấy mail của user A, sắp xếp theo ngày giảm dần" -> Scan cực nhanh
    @Prop({ required: true, index: true })
    userId: string;

    @Prop()
    subject: string;

    @Prop()
    snippet: string;

    @Prop()
    body: string;

    @Prop()
    from: string;

    @Prop()
    date: Date;

    @Prop({ default: false })
    isRead: boolean;

    // 2. Vector Embedding
    // Model text-embedding-004 của Google trả về 768 dimensions
    @Prop({
        type: [Number],
        select: false // Best Practice: Mặc định KHÔNG select field này khi query list để nhẹ băng thông
    })
    embedding: number[];
}

// 3. Định nghĩa Index
export const MailSchema = SchemaFactory.createForClass(Mail);

// Compound Index cho việc lấy list mail phân trang (Pagination)
MailSchema.index({ userId: 1, date: -1 });

// Text Index cho Full-text search truyền thống (Fallback)
MailSchema.index({ subject: 'text', snippet: 'text', from: 'text' });