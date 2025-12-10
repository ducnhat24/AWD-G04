import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { google } from 'googleapis'; // Import thư viện google
import { LinkedAccount, LinkedAccountDocument } from '../auth/linked-account.schema';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import SDK
import { EmailSummary, EmailSummaryDocument } from './entities/email-summary.schema';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;
  constructor(
    @InjectModel(LinkedAccount.name) private linkedAccountModel: Model<LinkedAccountDocument>,
    @InjectModel(EmailSummary.name) private emailSummaryModel: Model<EmailSummaryDocument>,
    private configService: ConfigService,
  ) {
    this.logger.log('GEMINI_API_KEY=' + this.configService.get<string>('GEMINI_API_KEY'));
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  // return OAuth2Client
  private async getAuthenticatedClient(userId: string) {
    // Lấy LinkedAccount từ DB theo userId và provider 'google' để lấy google access_token và refresh_token 
    const userObjectId = new Types.ObjectId(userId);

    const linkedAccount = await this.linkedAccountModel.findOne({
      user: userObjectId,
      provider: 'google',
    });

    if (!linkedAccount) {
      throw new NotFoundException('Google account not linked');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    // Googleapis sẽ tự động dùng refresh_token để lấy access_token mới khi cần
    oauth2Client.setCredentials({
      access_token: linkedAccount.accessToken,
      refresh_token: linkedAccount.refreshToken,
    });

    // Lắng nghe sự kiện 'tokens' để cập nhật access_token và refresh_token mới vào DB
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        linkedAccount.accessToken = tokens.access_token;
      }
      if (tokens.refresh_token) {
        linkedAccount.refreshToken = tokens.refresh_token;
      }
      await linkedAccount.save();
      console.log('>>> Tokens updated automatically by Googleapis!');
    });

    return oauth2Client;
  }

  async getMailboxes(userId: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const response = await gmail.users.labels.list({
        userId: 'me',
      });

      let labels = response.data.labels || [];
      const labelNames = labels.map(l => l.name);

      const requiredLabels = ['TODO', 'DONE'];

      let hasNewLabels = false;

      for (const reqLabel of requiredLabels) {
        if (!labelNames.includes(reqLabel)) {
          // Nếu chưa có -> Gọi tạo ngay lập tức
          await this.createLabel(gmail, reqLabel);
          hasNewLabels = true;
        }
      }

      if (hasNewLabels) {
        const retryResponse = await gmail.users.labels.list({ userId: 'me' });
        labels = retryResponse.data.labels || [];
      }

      return labels.map(label => ({
        id: label.id,
        name: label.name,
        type: label.type,
        unread: label.messagesUnread
      }));

    } catch (error) {
      console.error('Gmail API Error:', error);
      throw new UnauthorizedException('Failed to fetch mailboxes');
    }
  }

  async getEmails(userId: string, labelId: string = 'INBOX', limit: number = 20, pageToken?: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        maxResults: limit,     // Số lượng mail mỗi lần tải
        pageToken: pageToken,  // Mã trang tiếp theo (nếu null là trang đầu)
      });

      const messages = listResponse.data.messages || [];
      const nextToken = listResponse.data.nextPageToken; // Lưu lại cái này để trả về

      if (messages.length === 0) {
        return {
          emails: [],
          nextPageToken: null
        };
      }

      const detailsPromise = messages.map(async (msg) => {
        if (!msg.id) return null;
        try {
          // Chỉ lấy metadata cần thiết để hiện Card cho nhẹ
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });

          const headers = detail.data.payload?.headers || [];
          const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
          const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
          const date = headers.find((h) => h.name === 'Date')?.value || '';
          const labelIds = detail.data.labelIds || [];

          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: detail.data.snippet,
            subject,
            sender: from,
            date,
            isRead: !labelIds.includes('UNREAD'),
            isStarred: labelIds.includes('STARRED'),
          };
        } catch (err) {
          return null;
        }
      });

      const emails = (await Promise.all(detailsPromise)).filter((item) => item !== null);

      return {
        emails,
        nextPageToken: nextToken || null
      };

    } catch (error) {
      console.error('Error fetching emails:', error);
      throw new UnauthorizedException('Failed to fetch emails');
    }
  }

  // Lấy chi tiết nội dung 1 Email 
  async getEmailDetail(userId: string, messageId: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const payload = response.data.payload;

      if (!payload) {
        throw new NotFoundException('Email content empty');
      }

      const headers = payload.headers || [];

      const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
      const to = headers.find((h) => h.name === 'To')?.value || '';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      let bodyHtml = this.getBody(payload, 'text/html');
      if (!bodyHtml) {
        const bodyText = this.getBody(payload, 'text/plain') || '';
        bodyHtml = bodyText.replace(/\n/g, '<br>');
      }
      const attachments = this.getAttachments(payload);

      return {
        id: response.data.id,
        threadId: response.data.threadId,
        labelIds: response.data.labelIds,
        snippet: response.data.snippet,
        subject,
        sender: from,
        to,
        date,
        body: bodyHtml,
        attachments,
      };

    } catch (error) {
      console.error('Error fetching email detail:', error);
      throw new UnauthorizedException('Failed to fetch email detail');
    }
  }

  // Lấy dữ liệu file đính kèm
  async getAttachment(userId: string, messageId: string, attachmentId: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId,
      });

      const data = response.data.data;
      if (!data) {
        throw new NotFoundException('Attachment data not found');
      }

      // Convert Base64Url -> Buffer để trả về file
      const buffer = Buffer.from(data, 'base64url');

      return {
        buffer,
        size: response.data.size,
      };

    } catch (error) {
      console.error('Error fetching attachment:', error);
      throw new UnauthorizedException('Failed to fetch attachment');
    }
  }

  // Gửi Email (Compose / Reply)
  async sendEmail(userId: string, to: string, subject: string, body: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const rawMessage = this.createRawMessage(to, subject, body);

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new UnauthorizedException('Failed to send email');
    }
  }
  // Thao tác Modify: Đánh dấu đã đọc, Xóa (Trash), Gắn sao
  async modifyEmail(userId: string, messageId: string, addLabels: string[], removeLabels: string[]) {
    if ((!addLabels || addLabels.length === 0) && (!removeLabels || removeLabels.length === 0)) {
      return { success: true, message: 'No changes applied (lists are empty)' };
    }
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: addLabels,
        removeLabelIds: removeLabels,
      },
    });

    return { success: true };
  }

  // Trả lời Email (Reply)
  async replyEmail(userId: string, originalMessageId: string, body: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      // Lấy thông tin email gốc để biết Thread ID và Message ID
      const originalMsg = await gmail.users.messages.get({
        userId: 'me',
        id: originalMessageId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'Message-ID', 'References', 'From'],
      });

      const headers = originalMsg.data.payload?.headers || [];
      const subjectObj = headers.find(h => h.name === 'Subject');
      const msgIdObj = headers.find(h => h.name === 'Message-ID');
      const fromObj = headers.find(h => h.name === 'From');

      // Xử lý Subject (Thêm Re: nếu chưa có)
      let subject = subjectObj?.value || '';
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }

      // Xử lý Header Threading 
      const references = headers.find(h => h.name === 'References')?.value || '';
      const inReplyTo = msgIdObj?.value || '';
      const newReferences = references ? `${references} ${inReplyTo}` : inReplyTo;

      const fromValue = fromObj?.value || '';

      // Helper nhỏ để lấy email sạch
      // Logic: Tìm chuỗi nằm trong dấu < >. Nếu không có thì lấy nguyên chuỗi.
      const extractEmail = (text: string) => {
        const match = text.match(/<([^>]+)>/);
        return match ? match[1] : text;
      };

      // Lúc này 'to' sẽ chỉ là "ducnhat@gmail.com" thay vì cả cụm dài
      const to = extractEmail(fromValue);

      // Tạo Raw Message 
      const rawMessage = this.createRawMessage(to, subject, body, {
        'In-Reply-To': inReplyTo,
        'References': newReferences
      });

      // Gửi đi kèm threadId để Gmail gộp nhóm
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
          threadId: originalMsg.data.threadId,
        },
      });

      return response.data;

    } catch (error) {
      console.error('Error replying email:', error);
      throw new UnauthorizedException('Failed to reply email');
    }
  }

  async forwardEmail(userId: string, originalMessageId: string, to: string, body: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      // Lấy thông tin email gốc
      const originalMsg = await this.getEmailDetail(userId, originalMessageId);

      // Xử lý Subject (Thêm Fwd: nếu chưa có)
      let subject = originalMsg.subject || '';
      if (!subject.toLowerCase().startsWith('fwd:')) {
        subject = `Fwd: ${subject}`;
      }

      // Tạo nội dung trích dẫn (Quoted content)
      // Format chuẩn thường thấy trong Gmail
      const forwardedHeader = `
        <br><br>
        ---------- Forwarded message ---------<br>
        From: <strong>${originalMsg.sender}</strong><br>
        Date: ${originalMsg.date}<br>
        Subject: ${originalMsg.subject}<br>
        To: ${originalMsg.to}<br>
        <br>
      `;
      // Ghép nội dung mới user nhập + header forward + nội dung cũ
      const fullBody = `${body}${forwardedHeader}${originalMsg.body}`;

      // Tạo Raw Message
      // Lưu ý: Forward là gửi cho người mới (to), không phải người gửi cũ
      const rawMessage = this.createRawMessage(to, subject, fullBody);

      // Gửi đi
      // Forward thường không cần gộp threadId, nhưng nếu muốn gộp thì thêm: threadId: originalMsg.threadId
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
          // threadId: originalMsg.threadId, // Bỏ comment nếu muốn forward nằm chung thread cũ
        },
      });

      return response.data;

    } catch (error) {
      console.error('Error forwarding email:', error);
      throw new UnauthorizedException('Failed to forward email');
    }
  }

  async summarizeEmail(userId: string, messageId: string): Promise<string> {
    //  Kiểm tra trong Cache xem đã từng summarize nội dung này chưa
    const existingSummary = await this.emailSummaryModel.findOne({ messageId });
    if (existingSummary) {
      return existingSummary.summary;
    }

    // Nếu chưa, lấy nội dung chi tiết email
    // Hàm getEmailDetail của bạn đã trả về body HTML
    const emailDetail = await this.getEmailDetail(userId, messageId);

    // Làm sạch thẻ HTML để lấy plain text
    const cleanText = this.stripHtml(emailDetail.body);

    if (!cleanText || cleanText.length < 50) {
      return "Nội dung quá ngắn để tóm tắt.";
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
      this.logger.error(`Error summarizing email: ${error.message}`, error.stack);
      summaryText = 'Lỗi khi gọi AI tóm tắt. Vui lòng thử lại sau.';
    }

    // Lưu kết quả vào DB để lần sau dùng lại
    await this.emailSummaryModel.create({
      messageId,
      summary: summaryText,
      originalContentShort: cleanText.substring(0, 100)
    });

    return summaryText;
  }

  async getBasicEmailsDetails(userId: string, messageIds: string[]) {
    if (!messageIds.length) return [];

    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    // Dùng Promise.all để gọi song song, tối ưu tốc độ
    const detailsPromise = messageIds.map(async (id) => {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: id,
          format: 'metadata', // Chỉ lấy header, không lấy body -> Nhẹ & Nhanh
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        const subject = headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
        const date = headers.find((h) => h.name === 'Date')?.value || '';

        return {
          id: detail.data.id,
          threadId: detail.data.threadId,
          snippet: detail.data.snippet,
          subject,
          sender: from,
          date,
        };
      } catch (error) {
        // Trường hợp email đã bị xóa vĩnh viễn trên Gmail
        console.warn(`Email ${id} not found on Gmail (might be deleted)`);
        return null;
      }
    });

    const results = await Promise.all(detailsPromise);
    // Lọc bỏ các email null (đã bị xóa)
    return results.filter(item => item !== null);
  }

  private async createLabel(gmail: any, name: string) {
    try {
      const res = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
        },
      });
      return res.data;
    } catch (error) {
      if (error.code !== 409) {
        console.error(`Failed to create label ${name}`, error);
      }
      return null;
    }
  }

  private getBody(payload: any, mimeType: string): string | null {
    if (payload.mimeType === mimeType && payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const result = this.getBody(part, mimeType);
        if (result) return result;
      }
    }
    return null;
  }

  // Hàm decode Base64Url của Google sang UTF-8 String
  private decodeBase64(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const buff = Buffer.from(base64, 'base64');
    return buff.toString('utf-8');
  }

  // Đệ quy tìm tất cả file đính kèm trong email
  private getAttachments(payload: any): any[] {
    let attachments: any[] = [];

    if (payload.filename && payload.body?.attachmentId) {
      attachments.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body.size,
        attachmentId: payload.body.attachmentId,
      });
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        attachments = [...attachments, ...this.getAttachments(part)];
      }
    }

    return attachments;
  }

  private createRawMessage(to: string, subject: string, body: string, extraHeaders: Record<string, string> = {}): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    let messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
    ];

    // Add extra headers (In-Reply-To, References)
    Object.keys(extraHeaders).forEach(key => {
      messageParts.push(`${key}: ${extraHeaders[key]}`);
    });

    messageParts.push(''); // Dòng trống ngăn cách Header và Body
    messageParts.push(Buffer.from(body).toString('base64'));

    const message = messageParts.join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}