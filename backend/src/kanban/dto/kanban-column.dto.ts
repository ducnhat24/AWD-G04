import { IsNumber, IsString, IsOptional } from "class-validator";

export class KanbanColumnDto {
    // Thêm trường ID vào đây
    @IsOptional() // Cho phép null/undefined (Backend sẽ tự dùng uuidv4() nếu thiếu)
    @IsString()
    id?: string;

    @IsString()
    title: string;

    @IsString()
    gmailLabelId: string;

    @IsString()
    color: string;

    @IsNumber()
    order: number;
}