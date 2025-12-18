import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GmailIntegrationService } from './gmail-integration.service';
import { MailRepository } from '../mail.repository';

/**
 * MailSyncService
 * Chịu trách nhiệm đồng bộ emails từ Gmail API vào Database
 * - Sync emails cho user
 * - Cron job tự động sync định kỳ
 * - Bulk write vào DB
 */
@Injectable()
export class MailSyncService {
    private readonly logger = new Logger(MailSyncService.name);

    constructor(
        private mailRepository: MailRepository,
        private gmailIntegrationService: GmailIntegrationService,
    ) { }

    /**
     * Sync emails cho một user
     * - Lấy email mới nhất trong DB
     * - Chỉ fetch emails mới từ Gmail
     * - Bulk write vào DB (upsert)
     */
    async syncEmailsForUser(userId: string) {
        try {
            // 1. Tìm ngày của email mới nhất đang có trong DB
            const lastEmail = await this.mailRepository.findLatestEmail(userId);

            let gmailQuery = '';
            if (lastEmail) {
                // Nếu đã có mail, chỉ lấy mail SAU ngày đó (tránh trùng lặp)
                const timestamp = Math.floor(lastEmail.date.getTime() / 1000) + 1;
                gmailQuery = `after:${timestamp}`;
            } else {
                // Initial sync - có thể giới hạn nếu muốn
                // gmailQuery = 'newer_than:30d';
            }

            this.logger.log(`[Sync] User ${userId} - Query: ${gmailQuery || 'ALL'}`);

            // 2. Gọi Gmail API để lấy emails
            const emails = await this.gmailIntegrationService.fetchEmailsWithQuery(
                userId,
                gmailQuery,
                50, // Mỗi lần sync lấy tối đa 50 mail
            );

            if (emails.length === 0) {
                this.logger.log(`[Sync] No new emails for User ${userId}`);
                return;
            }

            // 3. Chuẩn bị bulk write operations
            const operations = emails.map((email) => ({
                updateOne: {
                    filter: { messageId: email.messageId },
                    update: {
                        $set: {
                            userId,
                            messageId: email.messageId,
                            threadId: email.threadId,
                            subject: email.subject,
                            from: email.from,
                            snippet: email.snippet,
                            date: email.date,
                            isRead: email.isRead,
                            labelIds: email.labelIds,
                        },
                    },
                    upsert: true,
                },
            }));

            // 4. Lưu xuống DB (Bulk Write cho nhanh)
            if (operations.length > 0) {
                await this.mailRepository.bulkUpsertEmails(operations);
                this.logger.log(
                    `[Sync] Saved ${operations.length} new emails for User ${userId}`,
                );
            }
        } catch (error) {
            this.logger.error(`[Sync Error] User ${userId}: ${error.message}`, error.stack);
        }
    }

    /**
     * Cron job tự động sync emails cho tất cả users
     * Chạy mỗi 10 phút
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async handleCronSync() {
        this.logger.log('>>> Starting Cron Job: Sync Emails...');

        try {
            const linkedAccounts = await this.mailRepository.findAllLinkedAccounts('google');

            // Chạy vòng lặp sync cho từng user
            for (const acc of linkedAccounts) {
                await this.syncEmailsForUser(acc.user.toString());
            }

            this.logger.log('>>> Cron Job Finished.');
        } catch (error) {
            this.logger.error('Cron job error:', error);
        }
    }
}
