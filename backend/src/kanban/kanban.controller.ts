import {
  Controller,
  Get,
  Body,
  Put,
  UseGuards,
  Request,
  Post,
  Delete,
  Patch,
  Param,
} from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { UpdateKanbanConfigDto } from './dto/update-kanban.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateKanbanConfigDto } from './dto/create-kanban.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

interface AuthRequest {
  user: {
    userId: string;
    email: string;
  };
}

@Controller('kanban/config')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @UseGuards(JwtAuthGuard) // Nhớ thêm Guard để lấy user từ request
  @Get()
  async getConfig(@Request() req: AuthRequest) {
    return this.kanbanService.getConfig(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateConfig(
    @Request() req: AuthRequest,
    @Body() updateDto: UpdateKanbanConfigDto,
  ) {
    return this.kanbanService.updateConfig(req.user.userId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createConfig(
    @Request() req: AuthRequest,
    @Body() createDto: CreateKanbanConfigDto,
  ) {
    return this.kanbanService.createConfig(req.user.userId, createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteConfig(@Request() req: AuthRequest) {
    return this.kanbanService.deleteConfig(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('column/:columnId')
  async updateColumn(
    @Request() req: AuthRequest,
    @Param('columnId') columnId: string,
    @Body() updateDto: UpdateColumnDto,
  ) {
    return this.kanbanService.updateColumn(
      req.user.userId,
      columnId,
      updateDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('column/:columnId')
  async deleteColumn(
    @Request() req: AuthRequest,
    @Param('columnId') columnId: string,
  ) {
    return this.kanbanService.deleteColumn(req.user.userId, columnId);
  }
}
