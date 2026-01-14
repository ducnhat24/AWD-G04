// src/kanban/dto/update-column.dto.ts
import { PartialType } from '@nestjs/mapped-types'; // Hoặc @nestjs/swagger
import { KanbanColumnDto } from './kanban-column.dto';

// PartialType giúp tất cả các trường trở thành Optional
export class UpdateColumnDto extends PartialType(KanbanColumnDto) {}
