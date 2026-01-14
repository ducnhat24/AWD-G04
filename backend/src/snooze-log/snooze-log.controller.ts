import { Controller, Post, Body, UseGuards, Req, Get, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { SnoozeLogService } from './snooze-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthRequest {
  user: {
    _id: string;
    email: string;
  };
}

@Controller('snooze')
@UseGuards(JwtAuthGuard)
export class SnoozeLogController {
  constructor(private readonly snoozeLogService: SnoozeLogService) { }

  @Post()
  async snooze(
    @Req() req: AuthRequest,
    @Body('messageId') messageId: string,
    @Body('wakeUpTime') wakeUpTime: string,
  ) {
    const date = new Date(wakeUpTime);

    return this.snoozeLogService.snoozeEmail(req.user._id, messageId, date);
  }

  @Get()
  async getSnoozedList(
    @Req() req: AuthRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.snoozeLogService.getSnoozedEmails(req.user._id, page, limit);
  }
}