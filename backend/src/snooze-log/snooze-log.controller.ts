import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SnoozeLogService } from './snooze-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('snooze')
@UseGuards(JwtAuthGuard)
export class SnoozeLogController {
  constructor(private readonly snoozeLogService: SnoozeLogService) { }

  @Post()
  async snooze(
    @Req() req,
    @Body('messageId') messageId: string,
    @Body('wakeUpTime') wakeUpTime: string,
  ) {
    const date = new Date(wakeUpTime);

    return this.snoozeLogService.snoozeEmail(req.user._id, messageId, date);
  }
}