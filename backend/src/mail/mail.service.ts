import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { google } from 'googleapis'; // Import thư viện google
import { LinkedAccount, LinkedAccountDocument } from '../auth/linked-account.schema';

@Injectable()
export class MailService {
  constructor(
    @InjectModel(LinkedAccount.name) private linkedAccountModel: Model<LinkedAccountDocument>,
    private configService: ConfigService,
  ) { }

  // return OAuth2Client
  private async getAuthenticatedClient(userId: string) {
    // Lấy LinkedAccount từ DB theo userId và provider 'google' để lấy google access_token và refresh_token 
    const linkedAccount = await this.linkedAccountModel.findOne({
      user: userId,
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

  // Hàm lấy danh sách Labels (Mailboxes)
  async getMailboxes(userId: string) {
    const auth = await this.getAuthenticatedClient(userId);

    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const response = await gmail.users.labels.list({
        userId: 'me', // 'me' nghĩa là user của cái token đó
      });

      return response.data.labels?.map(label => ({
        id: label.id,
        name: label.name,
        type: label.type,
        unread: label.messagesUnread
      })) || [];

    } catch (error) {
      console.error('Gmail API Error:', error);
      throw new UnauthorizedException('Failed to fetch mailboxes');
    }
  }

  // Lấy danh sách Email trong 1 Label
  async getEmails(userId: string, labelId: string = 'INBOX', maxResults: number = 20) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      // Lấy danh sách ID các email
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        maxResults: maxResults,
      });

      const messages = listResponse.data.messages || [];
      if (messages.length === 0) return [];

      // Lấy chi tiết từng mail
      const detailsPromise = messages.map(async (msg) => {
        if (!msg.id) return null;

        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          });

          const payload = detail.data.payload;
          const headers = payload?.headers || [];

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
          console.warn(`Cannot fetch email ${msg.id}:`, err.message);
          return null;
        }
      });

      // Chờ tất cả chạy xong và lọc bỏ những cái bị null
      const details = await Promise.all(detailsPromise);
      return details.filter((item) => item !== null);

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
}