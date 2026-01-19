// backend/src/mail/mail.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, AnyBulkWriteOperation } from 'mongoose';
import {
  EmailMetadata,
  EmailMetadataDocument,
} from './entities/email-metadata.schema';
import {
  EmailSummary,
  EmailSummaryDocument,
} from './entities/email-summary.schema';

@Injectable()
export class MailRepository {
  constructor(
    @InjectModel(EmailMetadata.name)
    private readonly emailMetadataModel: Model<EmailMetadataDocument>,
    @InjectModel(EmailSummary.name)
    private readonly emailSummaryModel: Model<EmailSummaryDocument>,
  ) {}

  // ==================== EMAIL METADATA ====================

  /**
   * Tìm email mới nhất của user (Dùng cho sync)
   */
  async findLatestEmail(userId: string): Promise<EmailMetadataDocument | null> {
    return this.emailMetadataModel
      .findOne({ userId })
      .sort({ date: -1 })
      .exec();
  }

  /**
   * Lưu hàng loạt email (Bulk upsert)
   */
  async bulkUpsertEmails(
    operations: AnyBulkWriteOperation<EmailMetadataDocument>[],
  ) {
    if (operations.length === 0) return;
    return this.emailMetadataModel.bulkWrite(operations);
  }

  /**
   * Lấy tất cả email của user với limit
   */
  async findAllByUserId(userId: string, limit: number = 1000): Promise<any[]> {
    return this.emailMetadataModel
      .find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Filter emails theo nhiều tiêu chí
   */
  async filterEmails(
    userId: string,
    filters: {
      labelId?: string;
      isRead?: boolean;
      isStarred?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    },
    limit: number = 20,
  ): Promise<EmailMetadataDocument[]> {
    const query: FilterQuery<EmailMetadataDocument> = { userId };

    if (filters.labelId) {
      query.labelIds = filters.labelId;
    }

    if (filters.isRead !== undefined) {
      query.isRead = filters.isRead;
    }

    if (filters.isStarred !== undefined) {
      query.labelIds = filters.isStarred ? 'STARRED' : { $ne: 'STARRED' };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        query.date.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        query.date.$lte = filters.dateTo;
      }
    }

    return this.emailMetadataModel
      .find(query)
      .sort({ date: -1 })
      .limit(limit)
      .lean()
      .exec() as Promise<EmailMetadataDocument[]>;
  }

  // ==================== EMAIL SUMMARY ====================

  /**
   * Tìm summary đã cache
   */
  async findSummaryByMessageId(
    messageId: string,
  ): Promise<EmailSummaryDocument | null> {
    return this.emailSummaryModel.findOne({ messageId }).exec();
  }

  /**
   * Tạo summary mới
   */
  async createSummary(
    messageId: string,
    summary: string,
    originalContentShort: string,
  ) {
    return this.emailSummaryModel.create({
      messageId,
      summary,
      originalContentShort,
    });
  }

  async getEmails(
    userId: string,
    labelId: string,
    limit: number,
    pageToken?: string,
  ) {
    const query: any = { userId };

    if (labelId && labelId !== 'ALL') {
      query.labelIds = { $in: [labelId] };
    }

    // --- 1. XỬ LÝ PHÂN TRANG (PAGINATION) ---
    // Gmail API dùng token ngẫu nhiên, nhưng với Local DB ta dùng "Offset" (số lượng bản ghi đã bỏ qua)
    // Nếu không có pageToken (trang đầu), skip = 0.
    const skip = pageToken ? parseInt(pageToken) : 0;

    const sort = { date: -1 };

    const emails = await this.emailMetadataModel
      .find(query)
      .sort(sort as any)
      .skip(skip) // <--- Bỏ qua các email đã lấy ở trang trước
      .limit(limit) // <--- Lấy số lượng email theo limit (ví dụ 20)
      .exec();

    // --- 2. TÍNH TOÁN NEXT PAGE TOKEN ---
    // Nếu số lượng email lấy được < limit, nghĩa là đã đến trang cuối cùng -> nextToken = null
    // Ngược lại, token cho trang sau sẽ là vị trí hiện tại + số lượng vừa lấy
    const nextToken = emails.length < limit ? null : (skip + limit).toString();

    return {
      emails: emails.map((e) => ({
        id: e.messageId,
        threadId: e.threadId,
        labelIds: e.labelIds || [],
        snippet: e.snippet,
        subject: e.subject || '(No Subject)',
        sender: e.from,
        date: e.date ? e.date.toISOString() : new Date().toISOString(),
        isRead: e.isRead,
        isStarred: e.labelIds?.includes('STARRED') || false,
        attachments: [],
      })),
      nextPageToken: nextToken, // <--- QUAN TRỌNG: Trả về token để Frontend biết còn trang sau
      resultSizeEstimate: emails.length,
    };
  }

  async findOneByMessageId(messageId: string) {
    return this.emailMetadataModel.findOne({ messageId }).exec();
  }

  async updateLabels(
    messageId: string,
    addLabels: string[],
    removeLabels: string[],
  ) {
    // 1. Xóa các label cần xóa
    if (removeLabels.length > 0) {
      await this.emailMetadataModel.updateOne(
        { messageId },
        { $pull: { labelIds: { $in: removeLabels } } },
      );
    }

    // 2. Thêm các label mới (dùng $addToSet để tránh trùng)
    if (addLabels.length > 0) {
      await this.emailMetadataModel.updateOne(
        { messageId },
        { $addToSet: { labelIds: { $each: addLabels } } },
      );
    }
  }
}
