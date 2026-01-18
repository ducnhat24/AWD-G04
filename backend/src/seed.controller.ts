// src/seed.controller.ts
import { Controller, Post, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './user/entities/user.entity';
import {
  KanbanConfig,
  KanbanConfigDocument,
} from './kanban/entities/kanban-config.entity';
import {
  LinkedAccount,
  LinkedAccountDocument,
} from './user/entities/linked-account.entity';
import {
  EmailMetadata,
  EmailMetadataDocument,
} from './mail/entities/email-metadata.schema';

@Controller('seed')
export class SeedController {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(KanbanConfig.name)
    private kanbanModel: Model<KanbanConfigDocument>,
    @InjectModel(LinkedAccount.name)
    private linkedAccountModel: Model<LinkedAccountDocument>,
    @InjectModel(EmailMetadata.name)
    private emailModel: Model<EmailMetadataDocument>,
  ) {}

  @Post()
  async seedData(@Res() res: Response) {
    try {
      // ==========================================
      // 1. DỌN DẸP SẠCH SẼ (CLEANUP)
      // ==========================================

      console.log('🧹 Cleaning up old data...');

      // Danh sách các ID giả sẽ dùng
      const mockIds = [
        'mock_1',
        'mock_2',
        'mock_3',
        'mock_4',
        'mock_5',
        'mock_6',
      ];

      // 👇 FIX LỖI DUPLICATE KEY: Xóa đích danh các messageId giả này (bất kể của user nào)
      await this.emailModel.deleteMany({ messageId: { $in: mockIds } });

      // Xóa User Demo cũ
      await this.userModel.deleteMany({ email: 'demo@awd.com' });

      // Xóa Linked Account giả cũ
      await this.linkedAccountModel.deleteMany({
        providerId: 'fake_google_id_123',
      });

      // ==========================================
      // 2. TẠO DỮ LIỆU MỚI (INSERT)
      // ==========================================

      // A. Tạo User
      const salt = await bcrypt.genSalt();
      const hashedPassword = await bcrypt.hash('123456', salt);
      const user = await this.userModel.create({
        email: 'demo@awd.com',
        password: hashedPassword,
        name: 'Nhật Demo',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        createdAt: new Date(),
      });
      const userId = user._id;

      // Xóa Kanban cũ (nếu có sót lại theo userId này - dù hiếm khi trùng)
      await this.kanbanModel.deleteMany({ userId });

      // B. Tạo Fake Linked Account
      await this.linkedAccountModel.create({
        user: userId,
        provider: 'google',
        providerId: 'fake_google_id_123',
        accessToken: 'fake_access_token',
        refreshToken: 'fake_refresh_token',
      });

      // C. Tạo Kanban Config
      await this.kanbanModel.create({
        userId,
        columns: [
          {
            id: 'col_inbox',
            title: 'Inbox',
            gmailLabelId: 'INBOX',
            color: '#3b82f6',
            order: 0,
          },
          {
            id: 'col_todo',
            title: 'Cần làm gấp',
            gmailLabelId: 'TODO',
            color: '#eab308',
            order: 1,
          },
          {
            id: 'col_doing',
            title: 'Đang xử lý',
            gmailLabelId: 'DOING',
            color: '#a855f7',
            order: 2,
          },
          {
            id: 'col_done',
            title: 'Hoàn thành',
            gmailLabelId: 'DONE',
            color: '#22c55e',
            order: 3,
          },
          {
            id: 'col_sent',
            title: 'Đã gửi',
            gmailLabelId: 'SENT',
            color: '#64748b',
            order: 4,
          },
        ],
      });

      // D. Tạo Email Mẫu
      const now = new Date();
      const mockEmails = [
        {
          userId,
          messageId: 'mock_1',
          threadId: 'thread_1',
          subject: '🔥 Thông báo bảo vệ đồ án tốt nghiệp',
          from: 'PĐT Trường <pdt@uni.edu.vn>',
          snippet: 'Chào các em, lịch bảo vệ đồ án đã có...',
          body: '<h3>Chào các em,</h3><p>Lịch bảo vệ chính thức là <strong>15/01/2026</strong>. Các nhóm nộp slide trước 2 ngày nhé.</p>',
          date: new Date(now.getTime() - 1000 * 60 * 30),
          isRead: false,
          labelIds: ['INBOX', 'IMPORTANT'],
        },
        {
          userId,
          messageId: 'mock_2',
          threadId: 'thread_2',
          subject: '[Urgent] Fix bug login Google gấp!',
          from: 'Leader <leader@startup.com>',
          snippet:
            'Nhật ơi, cái login Google đang lỗi 500 trên production, check ngay nhé.',
          body: '<p>Khách hàng đang phàn nàn quá trời. <strong>Check log server ngay!</strong></p>',
          date: new Date(now.getTime() - 1000 * 60 * 60 * 2),
          isRead: false,
          labelIds: ['INBOX', 'TODO'],
        },
        {
          userId,
          messageId: 'mock_3',
          threadId: 'thread_3',
          subject: 'Gửi báo cáo tài chính Q4',
          from: 'Boss <ceo@company.com>',
          snippet: 'Nhớ gửi báo cáo trước 5h chiều nay nhé.',
          body: '<p>Số liệu doanh thu nhớ double check với kế toán.</p>',
          date: new Date(now.getTime() - 1000 * 60 * 60 * 24),
          isRead: true,
          labelIds: ['TODO'],
        },
        {
          userId,
          messageId: 'mock_4',
          threadId: 'thread_4',
          subject: 'Re: Yêu cầu tích hợp cổng thanh toán',
          from: 'Partner <dev@payment.com>',
          snippet: 'Chúng tôi đã mở API key cho bên bạn, vui lòng test thử.',
          body: '<p>API Key: <code>sk_live_123456789</code></p>',
          date: new Date(now.getTime() - 1000 * 60 * 60 * 5),
          isRead: true,
          labelIds: ['DOING'],
        },
        {
          userId,
          messageId: 'mock_5',
          threadId: 'thread_5',
          subject: 'Hóa đơn tiền Server tháng 12',
          from: 'AWS Billing <no-reply@aws.amazon.com>',
          snippet: 'Hóa đơn của bạn đã được thanh toán thành công.',
          body: '<h1>Payment Receipt</h1><p>Total: $50.00</p>',
          date: new Date(now.getTime() - 1000 * 60 * 60 * 48),
          isRead: true,
          labelIds: ['DONE'],
        },
        {
          userId,
          messageId: 'mock_6',
          threadId: 'thread_6',
          subject: 'Xin nghỉ phép ngày mai',
          from: 'Nhật Demo <demo@awd.com>',
          snippet: 'Chào sếp, mai em xin nghỉ đi khám bệnh.',
          body: '<p>Em sẽ online check mail nếu có việc gấp.</p>',
          date: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
          isRead: true,
          labelIds: ['SENT'],
        },
      ];

      await this.emailModel.insertMany(mockEmails);

      return res.status(201).json({
        message: '🌱 Seed data successfully (No more duplicates)!',
        user: { email: 'demo@awd.com', password: '123456' },
        stats: {
          kanban: 1,
          emails: mockEmails.length,
          linkedAccount: 1,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }
}
