import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { LinkedAccountRepository } from '../../user/repositories/linked-account.repository';

/**
 * GmailIntegrationService
 * Chịu trách nhiệm gọi Google Gmail API
 * - Xác thực OAuth2
 * - Lấy danh sách mailboxes/labels
 * - Lấy chi tiết emails
 * - Gửi/Trả lời/Forward emails
 * - Modify labels (đánh dấu đã đọc, starred, trash...)
 * - Lấy attachments
 */
@Injectable()
export class GmailIntegrationService {
  private readonly logger = new Logger(GmailIntegrationService.name);

  constructor(
    private linkedAccountRepository: LinkedAccountRepository,
    private configService: ConfigService,
  ) {}

  /**
   * Lấy OAuth2Client đã xác thực cho user
   * Tự động refresh token khi hết hạn
   */
  async getAuthenticatedClient(userId: string) {
    const linkedAccount =
      await this.linkedAccountRepository.findByUserIdAndProvider(
        userId,
        'google',
      );

    if (!linkedAccount) {
      throw new NotFoundException('Google account not linked');
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      this.configService.get('GOOGLE_REDIRECT_URI'),
    );

    oauth2Client.setCredentials({
      access_token: linkedAccount.accessToken,
      refresh_token: linkedAccount.refreshToken,
    });

    // Auto-refresh tokens
    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token || tokens.refresh_token) {
        const id = (linkedAccount as any)._id as string;
        await this.linkedAccountRepository.updateTokens(
          id,
          tokens.access_token || linkedAccount.accessToken,
          tokens.refresh_token || linkedAccount.refreshToken,
        );
        this.logger.log('Tokens updated automatically');
      }
    });

    return oauth2Client;
  }

  /**
   * Lấy danh sách mailboxes (labels)
   * Tự động tạo label TODO và DONE nếu chưa có
   */
  async getMailboxes(userId: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      let response = await gmail.users.labels.list({
        userId: 'me',
      });

      let labels = response.data.labels || [];
      const labelNames = labels.map((l) => l.name);

      const requiredLabels = ['TODO', 'DONE', 'SNOOZED'];
      let hasNewLabels = false;

      for (const reqLabel of requiredLabels) {
        if (!labelNames.includes(reqLabel)) {
          await this.createLabel(gmail, reqLabel);
          hasNewLabels = true;
        }
      }

      // Refresh labels if new ones were created
      if (hasNewLabels) {
        response = await gmail.users.labels.list({ userId: 'me' });
        labels = response.data.labels || [];
      }

      if (hasNewLabels) {
        const retryResponse = await gmail.users.labels.list({ userId: 'me' });
        labels = retryResponse.data.labels || [];
      }

      return labels.map((label) => ({
        id: label.id,
        name: label.name,
        type: label.type,
        unread: label.messagesUnread,
      }));
    } catch (error) {
      this.logger.error('Gmail API Error:', error);
      throw new UnauthorizedException('Failed to fetch mailboxes');
    }
  }

  /**
   * Lấy danh sách emails từ Gmail API
   * Hỗ trợ phân trang với pageToken
   */
  async fetchEmails(
    userId: string,
    labelId: string = 'INBOX',
    limit: number = 20,
    pageToken?: string,
  ) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        labelIds: [labelId],
        maxResults: limit,
        pageToken: pageToken,
      });

      const messages = listResponse.data.messages || [];
      const nextToken = listResponse.data.nextPageToken;

      if (messages.length === 0) {
        return {
          emails: [],
          nextPageToken: null,
        };
      }

      const detailsPromise = messages.map(async (msg) => {
        if (!msg.id) return null;
        try {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
          });

          const headers = detail.data.payload?.headers || [];
          const subject =
            headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
          const from =
            headers.find((h) => h.name === 'From')?.value || 'Unknown';
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
            attachments: this.getAttachments(detail.data.payload),
          };
        } catch {
          return null;
        }
      });

      const emails = (await Promise.all(detailsPromise)).filter(
        (item) => item !== null,
      );

      return {
        emails,
        nextPageToken: nextToken || null,
      };
    } catch (error) {
      this.logger.error('Error fetching emails:', error);
      throw new UnauthorizedException('Failed to fetch emails');
    }
  }

  /**
   * Lấy chi tiết một email từ Gmail API
   */
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

      const subject =
        headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
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
      this.logger.error('Error fetching email detail:', error);
      throw new UnauthorizedException('Failed to fetch email detail');
    }
  }

  /**
   * Lấy file đính kèm
   */
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

      const buffer = Buffer.from(data, 'base64url');

      return {
        buffer,
        size: response.data.size,
      };
    } catch (error) {
      this.logger.error('Error fetching attachment:', error);
      throw new UnauthorizedException('Failed to fetch attachment');
    }
  }

  /**
   * Gửi email mới
   */
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
      this.logger.error('Error sending email:', error);
      throw new UnauthorizedException('Failed to send email');
    }
  }

  /**
   * Modify email labels (đánh dấu đã đọc, starred, trash...)
   */
  async modifyEmail(
    userId: string,
    messageId: string,
    addLabels: string[],
    removeLabels: string[],
  ) {
    if (
      (!addLabels || addLabels.length === 0) &&
      (!removeLabels || removeLabels.length === 0)
    ) {
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

  /**
   * Trả lời email
   */
  async replyEmail(userId: string, originalMessageId: string, body: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const originalMsg = await gmail.users.messages.get({
        userId: 'me',
        id: originalMessageId,
        format: 'metadata',
        metadataHeaders: ['Subject', 'Message-ID', 'References', 'From'],
      });

      const headers = originalMsg.data.payload?.headers || [];
      const subjectObj = headers.find((h) => h.name === 'Subject');
      const msgIdObj = headers.find((h) => h.name === 'Message-ID');
      const fromObj = headers.find((h) => h.name === 'From');

      let subject = subjectObj?.value || '';
      if (!subject.toLowerCase().startsWith('re:')) {
        subject = `Re: ${subject}`;
      }

      const references =
        headers.find((h) => h.name === 'References')?.value || '';
      const inReplyTo = msgIdObj?.value || '';
      const newReferences = references
        ? `${references} ${inReplyTo}`
        : inReplyTo;

      const fromValue = fromObj?.value || '';
      const to = this.extractEmail(String(fromValue));

      const rawMessage = this.createRawMessage(to, subject, body, {
        'In-Reply-To': inReplyTo,
        References: newReferences,
      });

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
          threadId: originalMsg.data.threadId,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error replying email:', error);
      throw new UnauthorizedException('Failed to reply email');
    }
  }

  /**
   * Forward email
   */
  async forwardEmail(
    userId: string,
    originalMessageId: string,
    to: string,
    body: string,
    getEmailDetailFn: (userId: string, messageId: string) => Promise<any>,
  ) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
      const originalMsg = await getEmailDetailFn(userId, originalMessageId);

      let subject = originalMsg.subject || '';
      if (!subject.toLowerCase().startsWith('fwd:')) {
        subject = `Fwd: ${subject}`;
      }

      const forwardedHeader = `
        <br><br>
        ---------- Forwarded message ---------<br>
        From: <strong>${originalMsg.sender}</strong><br>
        Date: ${originalMsg.date}<br>
        Subject: ${originalMsg.subject}<br>
        To: ${originalMsg.to}<br>
        <br>
      `;
      const fullBody: string = `${body}${forwardedHeader}${String(originalMsg.body)}`;

      const rawMessage = this.createRawMessage(to, subject, fullBody);

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error forwarding email:', error);
      throw new UnauthorizedException('Failed to forward email');
    }
  }

  /**
   * Fetch emails từ Gmail với query string (dùng cho sync)
   */
  async fetchEmailsWithQuery(
    userId: string,
    query: string,
    maxResults: number = 50,
  ) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) return [];

    const detailsPromise = messages.map(async (msg) => {
      if (!msg.id) return null;
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full', // Để lấy được payload body
        });

        const headers = detail.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
        const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
        const dateStr = headers.find((h) => h.name === 'Date')?.value || '';
        const date = new Date(dateStr);
        const labelIds = detail.data.labelIds || [];
        let bodyText = this.getBody(detail.data.payload, 'text/plain');
        if (!bodyText) {
          // Nếu chỉ có HTML, lấy HTML rồi strip tag (hoặc để nguyên tùy model)
          const bodyHtml = this.getBody(detail.data.payload, 'text/html') || '';
          // Simple strip tags regex
          bodyText = bodyHtml.replace(/<[^>]*>?/gm, ' ');
        }

        // Fallback nếu không lấy được gì thì dùng snippet
        const finalContent = bodyText ? bodyText : detail.data.snippet;

        return {
          messageId: msg.id,
          threadId: msg.threadId,
          subject,
          from,
          snippet: detail.data.snippet,
          bodyContent: finalContent,
          date,
          isRead: !labelIds.includes('UNREAD'),
          labelIds: labelIds,
        };
      } catch {
        return null;
      }
    });

    const results = await Promise.all(detailsPromise);
    return results.filter((item) => item !== null);
  }

  /**
   * Lấy basic details của nhiều emails (dùng trong search)
   */
  async getBasicEmailsDetails(userId: string, messageIds: string[]) {
    if (!messageIds.length) return [];

    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const detailsPromise = messageIds.map(async (id) => {
      try {
        const detail = await gmail.users.messages.get({
          userId: 'me',
          id: id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const headers = detail.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name === 'Subject')?.value || '(No Subject)';
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
      } catch {
        this.logger.warn(`Email ${id} not found on Gmail (might be deleted)`);
        return null;
      }
    });

    const results = await Promise.all(detailsPromise);
    return results.filter((item) => item !== null);
  }

  async watchMailbox(userId: string) {
    const auth = await this.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });

    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'], // Chỉ canh me Inbox
        topicName: 'projects/myawdapp/topics/gmail-watch', //
      },
    });

    console.log(
      `👀 Start watching for User ${userId}. History ID: ${res.data.historyId}`,
    );
    return res.data;
  }

  // ==================== PRIVATE HELPER METHODS ====================

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
        this.logger.error(`Failed to create label ${name}`, error);
      }
      return null;
    }
  }

  private getBody(payload: any, mimeType: string): string | null {
    if (payload.mimeType === mimeType && payload.body?.data) {
      return this.decodeBase64(payload.body.data as string);
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        const result = this.getBody(part, mimeType);
        if (result) return result;
      }
    }
    return null;
  }

  private decodeBase64(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const buff = Buffer.from(base64, 'base64');
    return buff.toString('utf-8');
  }

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

  private createRawMessage(
    to: string,
    subject: string,
    body: string,
    extraHeaders: Record<string, string> = {},
  ): string {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const messageParts = [
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
    ];

    Object.keys(extraHeaders).forEach((key) => {
      messageParts.push(`${key}: ${extraHeaders[key]}`);
    });

    messageParts.push('');
    messageParts.push(Buffer.from(body).toString('base64'));

    const message = messageParts.join('\n');

    return Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private extractEmail(text: string): string {
    const match = text.match(/<([^>]+)>/);
    return match ? match[1] : text;
  }
}
