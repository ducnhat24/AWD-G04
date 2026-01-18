import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import cái này
import { KanbanService } from './kanban.service';
import { KanbanController } from './kanban.controller';
import {
  KanbanConfig,
  KanbanConfigSchema,
} from './entities/kanban-config.entity'; // Import Entity
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    // BẮT BUỘC: Đăng ký Schema để NestJS tạo Model và Inject được vào Service
    MongooseModule.forFeature([
      { name: KanbanConfig.name, schema: KanbanConfigSchema },
    ]),
    MailModule,
  ],
  controllers: [KanbanController],
  providers: [KanbanService],
  exports: [KanbanService], // Export nếu module khác cần dùng service này
})
export class KanbanModule { }
