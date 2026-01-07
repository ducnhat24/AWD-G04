// src/data/mockData.ts

import type { KanbanColumnConfig } from "@/features/home/types/kanban.type";

export const INITIAL_KANBAN_CONFIG: KanbanColumnConfig[] = [
  {
    id: "inbox",
    title: "Inbox",
    gmailLabelId: "INBOX",
    color: "bg-blue-500",
    order: 0,
  },
  {
    id: "todo",
    title: "To Do",
    gmailLabelId: "Label_1",
    color: "bg-yellow-500",
    order: 1,
  },
  {
    id: "snoozed",
    title: "Snoozed",
    gmailLabelId: "SNOOZED",
    color: "bg-purple-500",
    order: 2,
  },
  {
    id: "done",
    title: "Done",
    gmailLabelId: "Label_2",
    color: "bg-green-500",
    order: 3,
  },
  {
    id: "trash",
    title: "Trash",
    gmailLabelId: "TRASH",
    color: "bg-red-500",
    order: 4,
  },
];
