import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GmailIntegrationService } from './services/gmail-integration.service';
import { MailSyncService } from './services/mail-sync.service';
import { MailSearchService } from './services/mail-search.service';
import { MailRepository } from './mail.repository';

/**
 * MailService - Orchestrator
 * Điều phối các services nhỏ hơn:
 * - GmailIntegrationService: Gọi Gmail API
 * - MailSyncService: Đồng bộ DB
 * - MailSearchService: Tìm kiếm/Filter
 *
 * Service này cung cấp API tầng cao cho Controller
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    private mailRepository: MailRepository,
    private configService: ConfigService,
    private gmailIntegrationService: GmailIntegrationService,
    private mailSyncService: MailSyncService,
    private mailSearchService: MailSearchService,
  ) {
    this.logger.log(
      'GEMINI_API_KEY=' + this.configService.get<string>('GEMINI_API_KEY'),
    );
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
  }

  // ==================== MAILBOXES ====================

  async getMailboxes(userId: string) {
    return this.gmailIntegrationService.getMailboxes(userId);
  }

  // ==================== GET EMAILS ====================

  async getEmails(
    userId: string,
    labelId: string = 'INBOX',
    limit: number = 20,
    pageToken?: string,
    search?: string,
  ) {
    // 1. NẾU CÓ SEARCH -> TÌM TRONG DB (Fuzzy Search)
    if (search && search.trim().length > 0) {
      const searchResults = await this.mailSearchService.searchEmailsFuzzy(
        userId,
        search,
        labelId,
        limit,
      );
      return {
        emails: searchResults,
        nextPageToken: null,
      };
    }

    // 2. 👇 THAY ĐỔI Ở ĐÂY: Đọc từ Database (MailRepository) thay vì gọi Gmail API
    // Điều này giúp:
    // - Tránh lỗi 401 với User Demo
    // - Tốc độ siêu nhanh (vì đọc local DB)
    // - Đúng kiến trúc "Offline-first"

    return this.mailRepository.getEmails(userId, labelId, limit, pageToken);
  }

  // ==================== SYNC ====================

  async syncEmailsForUser(userId: string) {
    return this.mailSyncService.syncEmailsForUser(userId);
  }

  // ==================== SEARCH ====================

  async searchEmailsFuzzy(
    userId: string,
    query: string,
    labelId?: string,
    limit: number = 20,
  ) {
    return this.mailSearchService.searchEmailsFuzzy(
      userId,
      query,
      labelId,
      limit,
    );
  }

  // ==================== EMAIL DETAIL & ACTIONS ====================

  async getEmailDetail(userId: string, messageId: string) {
    // 👇 CŨ: Gọi Gmail API (Lỗi 401 với user fake)
    // return this.gmailIntegrationService.getEmailDetail(userId, messageId);

    // 👇 MỚI: Đọc từ Database (Nhanh & Không lỗi)
    const email = await this.mailRepository.findOneByMessageId(messageId);

    if (email) {
      // Map dữ liệu từ DB sang format mà Frontend cần
      return {
        id: email.messageId,
        threadId: email.threadId,
        labelIds: email.labelIds,
        snippet: email.snippet,
        subject: email.subject,
        sender: email.from,
        to: 'me', // Mock tạm
        date: email.date,
        body: email.body || '<p>No content</p>', // Trả về HTML body đã lưu
        attachments: [], // Tạm thời mock rỗng, sau này lưu attachment vào DB sau
      };
    }

    // Fallback: Nếu không thấy trong DB (trường hợp user thật chưa sync),
    // thì mới gọi Google API (nhưng với user fake thì sẽ throw lỗi ở đây cũng đc)
    return this.gmailIntegrationService.getEmailDetail(userId, messageId);
  }

  async getAttachment(userId: string, messageId: string, attachmentId: string) {
    return this.gmailIntegrationService.getAttachment(
      userId,
      messageId,
      attachmentId,
    );
  }

  async sendEmail(userId: string, to: string, subject: string, body: string) {
    return this.gmailIntegrationService.sendEmail(userId, to, subject, body);
  }

  async modifyEmail(
    userId: string,
    messageId: string,
    addLabels: string[],
    removeLabels: string[],
  ) {
    // 1. Gọi Gmail API (Để thay đổi thực tế trên Gmail)
    await this.gmailIntegrationService.modifyEmail(
      userId,
      messageId,
      addLabels,
      removeLabels,
    );

    // 2. [MỚI] Cập nhật ngay lập tức vào Database local
    // Để khi Frontend fetch lại, nó sẽ thấy dữ liệu mới nhất
    await this.mailRepository.updateLabels(messageId, addLabels, removeLabels);

    return { success: true };
  }

  async replyEmail(userId: string, originalMessageId: string, body: string) {
    return this.gmailIntegrationService.replyEmail(
      userId,
      originalMessageId,
      body,
    );
  }

  async forwardEmail(
    userId: string,
    originalMessageId: string,
    to: string,
    body: string,
  ) {
    return this.gmailIntegrationService.forwardEmail(
      userId,
      originalMessageId,
      to,
      body,
      this.getEmailDetail.bind(this) as (
        uid: string,
        mid: string,
      ) => Promise<any>,
    );
  }

  // ==================== AI SUMMARIZATION ====================

  async summarizeEmail(userId: string, messageId: string): Promise<string> {
    // Kiểm tra cache
    const existingSummary =
      await this.mailRepository.findSummaryByMessageId(messageId);
    if (existingSummary) {
      return existingSummary.summary;
    }

    // Lấy nội dung email
    const emailDetail = await this.getEmailDetail(userId, messageId);

    // Làm sạch HTML
    const cleanText = this.stripHtml(emailDetail.body);

    if (!cleanText || cleanText.length < 50) {
      return 'Nội dung quá ngắn để tóm tắt.';
    }

    // Gọi AI để tóm tắt
    let summaryText = 'Không thể tóm tắt.';
    try {
      if (!this.model) throw new Error('Gemini API Key missing');

      const prompt = `
        Bạn là một trợ lý AI giúp quản lý email. Hãy tóm tắt email sau đây bằng Tiếng Việt.
        Yêu cầu:
        - Tóm tắt cực kỳ ngắn gọn (tối đa 2 câu).
        - Tập trung vào hành động cần làm hoặc thông tin chính.
        - Giọng văn chuyên nghiệp.
        
        Nội dung email:
        ${cleanText.substring(0, 8000)} 
        `;
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      summaryText = response.text();
    } catch (error) {
      this.logger.error(
        `Error summarizing email: ${error.message}`,
        error.stack,
      );
      summaryText = 'Lỗi khi gọi AI tóm tắt. Vui lòng thử lại sau.';
    }

    // Lưu cache
    await this.mailRepository.createSummary(
      messageId,
      summaryText,
      cleanText.substring(0, 100),
    );

    return summaryText;
  }

  async getBasicEmailsDetails(userId: string, messageIds: string[]) {
    return this.gmailIntegrationService.getBasicEmailsDetails(
      userId,
      messageIds,
    );
  }

  async searchSemantic(userId: string, query: string) {
    return this.mailSearchService.searchSemantic(userId, query);
  }

  async getSuggestions(userId: string, query: string) {
    return this.mailSearchService.getSuggestions(userId, query);
  }

  async watchMailbox(userId: string) {
    return this.gmailIntegrationService.watchMailbox(userId);
  }

  async handleRealtimeSync(emailAddress: string) {
    return this.mailSyncService.handleRealtimeSync(emailAddress);
  }

  // ==================== PRIVATE HELPERS ====================

  private stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
