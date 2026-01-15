import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GmailIntegrationService } from './gmail-integration.service';
import { MailRepository } from '../mail.repository';
import { LinkedAccountRepository } from '../../user/repositories/linked-account.repository';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserService } from '../../user/user.service'; // Import service user
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
  private genAI: GoogleGenerativeAI;
  private embeddingModel: any;

  constructor(
    private mailRepository: MailRepository,
    private gmailIntegrationService: GmailIntegrationService,
    private linkedAccountRepository: LinkedAccountRepository,
    private configService: ConfigService,
    private userService: UserService,
  ) {
    // Khởi tạo Gemini
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.embeddingModel = this.genAI.getGenerativeModel({
        model: 'text-embedding-004',
      });
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) return [];
    try {
      // Clean text nhẹ
      const cleanText = text.replace(/\s+/g, ' ').trim().substring(0, 9000); // Giới hạn token
      if (!cleanText) return [];

      const result = await this.embeddingModel.embedContent(cleanText);
      return result.embedding.values;
    } catch (error) {
      this.logger.error(`Embedding error: ${error.message}`);
      return [];
    }
  }
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
        20, // Mỗi lần sync lấy tối đa 50 mail
      );

      if (emails.length === 0) {
        this.logger.log(`[Sync] No new emails for User ${userId}`);
        return;
      }

      // --- XỬ LÝ SONG SONG TẠO EMBEDDING ---
      const operations = await Promise.all(
        emails.map(async (email) => {
          // Kết hợp Subject + From + Snippet để tạo context cho vector
          // Lưu ý: Sync hiện tại chỉ lấy snippet, nếu muốn Body full phải fetch thêm (sẽ chậm)

          const cleanBody = (email.bodyContent || '').substring(0, 8000);

          const contentToEmbed = `Subject: ${email.subject}. From: ${email.from}. Content: ${cleanBody}`;

          const embedding = await this.generateEmbedding(contentToEmbed);

          return {
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
                  embedding: embedding, // Lưu vector vào DB
                },
              },
              upsert: true,
            },
          };
        }),
      );

      if (operations.length > 0) {
        await this.mailRepository.bulkUpsertEmails(operations);
        this.logger.log(
          `[Sync] Saved & Embedded ${operations.length} emails for User ${userId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[Sync Error] User ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }

  async handleRealtimeSync(email: string) {
    this.logger.log(`Webhook received for: ${email}`);

    const user = await this.userService.findByEmail(email);

    if (!user) {
      this.logger.warn(`User not found for email: ${email}`);
      return;
    }

    // 2. Logic Sync (Rush Strategy)
    this.logger.log(`Triggering sync for user ID: ${String(user._id)}`);

    await this.syncEmailsForUser(String(user._id));

    // 3. (Optional) Nếu có Socket thì bắn ở đây
    // this.mailGateway.notifyUser(user._id, 'NEW_EMAIL');
  }

  /**
   * Cron job tự động sync emails cho tất cả users
   * Chạy mỗi 10 phút
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCronSync() {
    this.logger.log('>>> Starting Cron Job: Sync Emails...');

    try {
      const linkedAccounts =
        await this.linkedAccountRepository.findAllByProvider('google');

      // Chạy vòng lặp sync cho từng user
      for (const acc of linkedAccounts) {
        await this.syncEmailsForUser(String(acc.user));
      }

      this.logger.log('>>> Cron Job Finished.');
    } catch (error) {
      this.logger.error('Cron job error:', error);
    }
  }
}
