import { KanbanColumnDto } from './kanban-column.dto';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateKanbanConfigDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => KanbanColumnDto)
    columns: KanbanColumnDto[];
}