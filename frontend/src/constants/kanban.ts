// src/constants/kanban.ts

/**
 * Kanban column configuration
 * Defines the order, IDs, titles, and colors for each Kanban column
 */
export const KANBAN_COLUMNS = [
    {
        id: 'inbox' as const,
        title: 'Inbox',
        color: 'bg-red-500'
    },
    {
        id: 'todo' as const,
        title: 'To Do',
        color: 'bg-yellow-500'
    },
    {
        id: 'snoozed' as const,
        title: 'Snoozed',
        color: 'bg-purple-500'
    },
    {
        id: 'done' as const,
        title: 'Done',
        color: 'bg-green-500'
    },
] as const;

/**
 * Type helper for Kanban column IDs
 */
export type KanbanColumnId = typeof KANBAN_COLUMNS[number]['id'];

/**
 * Type helper for Kanban column configuration
 */
export type KanbanColumn = typeof KANBAN_COLUMNS[number];

/**
 * Map of column IDs to their display titles
 */
export const KANBAN_COLUMN_TITLES: Record<KanbanColumnId, string> = {
    inbox: 'Inbox',
    todo: 'To Do',
    snoozed: 'Snoozed',
    done: 'Done',
} as const;

/**
 * Map of column IDs to their Tailwind color classes
 */
export const KANBAN_COLUMN_COLORS: Record<KanbanColumnId, string> = {
    inbox: 'bg-red-500',
    todo: 'bg-yellow-500',
    snoozed: 'bg-purple-500',
    done: 'bg-green-500',
} as const;
