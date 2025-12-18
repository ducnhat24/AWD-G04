import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { SnoozeLogRepository } from './snooze-log.repository';

@Injectable()
export class SnoozeLogService {
  private readonly logger = new Logger(SnoozeLogService.name);

  constructor(
    private readonly snoozeLogRepository: SnoozeLogRepository,
    private readonly mailService: MailService,
  ) { }

  async snoozeEmail(userId: string, messageId: string, wakeUpTime: Date) {
    await this.mailService.modifyEmail(userId, messageId, [], ['INBOX']);
    return this.snoozeLogRepository.createSnoozeLog(userId, messageId, wakeUpTime);
  }

  async getSnoozedEmails(userId: string, page: number, limit: number) {
    const { logs, total } = await this.snoozeLogRepository.findActiveByUserPaginated(
      userId,
      page,
      limit,
    );

    if (!logs.length) {
      return {
        data: [],
        meta: { total, page, limit, totalPages: 0 },
      };
    }

    const messageIds = logs.map(log => log.messageId);

    const emailDetails = await this.mailService.getBasicEmailsDetails(userId, messageIds);

    const result = emailDetails.map(email => {
      const log = logs.find(l => l.messageId === email.id);
      return {
        ...email,
        snoozeInfo: {
          wakeUpTime: log ? log.wakeUpTime : null,
          snoozeId: log ? log._id : null,
        }
      };
    });

    return {
      data: result,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();

    // find all snooze logs that are due
    const dueEmails = await this.snoozeLogRepository.findDueActive(now);

    if (dueEmails.length > 0) {
      this.logger.debug(`Found ${dueEmails.length} emails to wake up.`);
    }

    for (const log of dueEmails) {
      try {
        await this.mailService.modifyEmail(log.userId, log.messageId, ['INBOX'], []);
        await this.snoozeLogRepository.markProcessed(log._id);

        this.logger.log(`Woke up email ${log.messageId} for user ${log.userId}`);
      } catch (error) {
        this.logger.error(`Failed to wake up email ${log.messageId}`, error);
        // Có thể thêm logic retry hoặc đánh dấu ERROR tùy bạn
      }
    }
  }
}