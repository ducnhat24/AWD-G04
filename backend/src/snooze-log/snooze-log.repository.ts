import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SnoozeLog, SnoozeLogDocument } from './entities/snooze-log.entity';

@Injectable()
export class SnoozeLogRepository {
    constructor(
        @InjectModel(SnoozeLog.name)
        private readonly snoozeLogModel: Model<SnoozeLogDocument>,
    ) { }

    async createSnoozeLog(userId: string, messageId: string, wakeUpTime: Date) {
        const log = new this.snoozeLogModel({
            userId,
            messageId,
            wakeUpTime,
            status: 'ACTIVE',
        });
        return log.save();
    }

    async findActiveByUserPaginated(
        userId: string,
        page: number,
        limit: number,
    ): Promise<{ logs: any[]; total: number }> {
        const skip = (page - 1) * limit;

        const [logs, total] = await Promise.all([
            this.snoozeLogModel
                .find({ userId, status: 'ACTIVE' })
                .sort({ wakeUpTime: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            this.snoozeLogModel.countDocuments({ userId, status: 'ACTIVE' }),
        ]);

        return { logs, total };
    }

    async findDueActive(now: Date): Promise<any[]> {
        const logs = await this.snoozeLogModel
            .find({ status: 'ACTIVE', wakeUpTime: { $lte: now } })
            .lean()
            .exec();

        return logs;
    }

    async markProcessed(id: Types.ObjectId | string) {
        return this.snoozeLogModel.findByIdAndUpdate(
            id,
            { $set: { status: 'PROCESSED' } },
            { new: true },
        );
    }
}
