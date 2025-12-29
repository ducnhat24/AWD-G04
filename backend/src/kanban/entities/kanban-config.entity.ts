import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KanbanConfigDocument = HydratedDocument<KanbanConfig>;

@Schema({ _id: false }) // Sub-document không cần _id riêng nếu không muốn
export class KanbanColumn {
    @Prop({ required: true })
    id: string; // Ví dụ: 'col_todo', 'col_inbox'

    @Prop({ required: true })
    title: string; // Ví dụ: 'Cần làm', 'Inbox'

    @Prop({ required: true })
    gmailLabelId: string; // ID thật của Gmail Label (VD: 'Label_8', 'INBOX')

    @Prop({ default: '#e2e8f0' }) // Mặc định màu xám nhẹ
    color: string; // Hex code (VD: '#ff0000')

    @Prop({ default: 0 })
    order: number;
}

@Schema({ timestamps: true })
export class KanbanConfig {
    @Prop({ required: true, unique: true, index: true })
    userId: string;

    @Prop({ type: [SchemaFactory.createForClass(KanbanColumn)], default: [] })
    columns: KanbanColumn[];
}

export const KanbanConfigSchema = SchemaFactory.createForClass(KanbanConfig);