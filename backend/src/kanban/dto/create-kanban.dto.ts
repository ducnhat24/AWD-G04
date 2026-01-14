import { IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { KanbanColumnDto } from './kanban-column.dto'; // Import class cột từ file cũ

export class CreateKanbanConfigDto {
  @IsOptional() // Cho phép không gửi (sẽ dùng default)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KanbanColumnDto)
  columns?: KanbanColumnDto[];
}
