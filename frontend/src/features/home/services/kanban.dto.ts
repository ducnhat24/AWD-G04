import type { KanbanColumnConfig } from "../types/kanban.type";

export type GetKanbanConfigResponseDto = {
  columns: KanbanColumnConfig[];
};

export type UpdateKanbanConfigRequestDto = {
  columns: KanbanColumnConfig[];
};
