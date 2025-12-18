// backend/src/mail/mail.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailMetadata, EmailMetadataDocument } from './entities/email-metadata.schema';
import { EmailSummary, EmailSummaryDocument } from './entities/email-summary.schema';
import { LinkedAccount, LinkedAccountDocument } from '../auth/linked-account.schema';
import { Types } from 'mongoose';

@Injectable()
export class MailRepository {
    constructor(
        @InjectModel(EmailMetadata.name)
        private readonly emailMetadataModel: Model<EmailMetadataDocument>,
        @InjectModel(EmailSummary.name)
        private readonly emailSummaryModel: Model<EmailSummaryDocument>,
        @InjectModel(LinkedAccount.name)
        private readonly linkedAccountModel: Model<LinkedAccountDocument>,
    ) { }

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
    async bulkUpsertEmails(operations: any[]) {
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
    ): Promise<any[]> {
        const query: any = { userId };

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
                query.date.$gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                query.date.$lte = filters.dateTo;
            }
        }

        return this.emailMetadataModel
            .find(query)
            .sort({ date: -1 })
            .limit(limit)
            .lean()
            .exec();
    }

    // ==================== EMAIL SUMMARY ====================

    /**
     * Tìm summary đã cache
     */
    async findSummaryByMessageId(messageId: string): Promise<EmailSummaryDocument | null> {
        return this.emailSummaryModel.findOne({ messageId }).exec();
    }

    /**
     * Tạo summary mới
     */
    async createSummary(messageId: string, summary: string, originalContentShort: string) {
        return this.emailSummaryModel.create({
            messageId,
            summary,
            originalContentShort,
        });
    }

    // ==================== LINKED ACCOUNT ====================

    /**
     * Tìm linked account của user theo provider
     */
    async findLinkedAccount(userId: string, provider: string = 'google'): Promise<LinkedAccountDocument | null> {
        const userObjectId = new Types.ObjectId(userId);
        return this.linkedAccountModel.findOne({
            user: userObjectId,
            provider: provider,
        }).exec();
    }

    /**
     * Lấy tất cả linked accounts theo provider
     */
    async findAllLinkedAccounts(provider: string = 'google'): Promise<LinkedAccountDocument[]> {
        return this.linkedAccountModel.find({ provider }).exec();
    }

    /**
     * Cập nhật tokens cho linked account
     */
    async updateLinkedAccountTokens(
        accountId: Types.ObjectId,
        accessToken?: string,
        refreshToken?: string,
    ) {
        const updateData: any = {};
        if (accessToken) updateData.accessToken = accessToken;
        if (refreshToken) updateData.refreshToken = refreshToken;

        return this.linkedAccountModel.findByIdAndUpdate(
            accountId,
            { $set: updateData },
            { new: true },
        ).exec();
    }
}