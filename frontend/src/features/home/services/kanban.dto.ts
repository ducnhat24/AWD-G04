import type { KanbanColumnConfig } from "../types/kanban.type";

export type GetKanbanConfigResponseDto = {
  columns: KanbanColumnConfig[];
};

export type UpdateKanbanConfigRequestDto = {
  columns: KanbanColumnConfig[];
};

export type CreateKanbanConfigRequestDto = {
  title: string;
  gmailLabelId: string;
  color: string;
  order: number;
};

export type DeleteKanbanConfigRequestDto = {
  columnId: string;
};
