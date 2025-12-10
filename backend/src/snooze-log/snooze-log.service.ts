import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SnoozeLog, SnoozeLogDocument } from './entities/snooze-log.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SnoozeLogService {
  private readonly logger = new Logger(SnoozeLogService.name);

  constructor(
    @InjectModel(SnoozeLog.name) private snoozeLogModel: Model<SnoozeLogDocument>,
    private readonly mailService: MailService,
  ) { }

  async snoozeEmail(userId: string, messageId: string, wakeUpTime: Date) {
    await this.mailService.modifyEmail(userId, messageId, [], ['INBOX']);

    const newLog = new this.snoozeLogModel({
      userId,
      messageId,
      wakeUpTime,
      status: 'ACTIVE',
    });
    return newLog.save();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const now = new Date();

    // find all snooze logs that are due
    const dueEmails = await this.snoozeLogModel.find({
      status: 'ACTIVE',
      wakeUpTime: { $lte: now },
    });

    if (dueEmails.length > 0) {
      this.logger.debug(`Found ${dueEmails.length} emails to wake up.`);
    }

    for (const log of dueEmails) {
      try {
        await this.mailService.modifyEmail(log.userId, log.messageId, ['INBOX'], []);

        log.status = 'PROCESSED';
        await log.save();

        this.logger.log(`Woke up email ${log.messageId} for user ${log.userId}`);
      } catch (error) {
        this.logger.error(`Failed to wake up email ${log.messageId}`, error);
        // Có thể thêm logic retry hoặc đánh dấu ERROR tùy bạn
      }
    }
  }
}