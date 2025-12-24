import { Controller, Get, Body, Put, UseGuards, Request, Post, Delete } from '@nestjs/common';
import { KanbanService } from './kanban.service';
import { UpdateKanbanConfigDto } from './dto/update-kanban.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateKanbanConfigDto } from './dto/create-kanban.dto';


@Controller('kanban/config')
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) { }

  @UseGuards(JwtAuthGuard) // Nhớ thêm Guard để lấy user từ request
  @Get()
  async getConfig(@Request() req) {
    return this.kanbanService.getConfig(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateConfig(@Request() req, @Body() updateDto: UpdateKanbanConfigDto) {
    return this.kanbanService.updateConfig(req.user.userId, updateDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createConfig(@Request() req, @Body() createDto: CreateKanbanConfigDto) {
    return this.kanbanService.createConfig(req.user.userId, createDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteConfig(@Request() req) {
    return this.kanbanService.deleteConfig(req.user.userId);
  }

}