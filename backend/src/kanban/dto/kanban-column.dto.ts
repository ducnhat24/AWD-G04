import { IsNumber, IsString } from "class-validator";

export class KanbanColumnDto {
    @IsString()
    id: string;

    @IsString()
    title: string;

    @IsString()
    gmailLabelId: string;

    @IsString()
    color: string;

    @IsNumber()
    order: number;
}
