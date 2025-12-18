import { useState, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { ArrowUpDown, Filter } from "lucide-react";
import type { Email } from "@/data/mockData";
import { KanbanColumn } from "./KanbanColumn";
import { KANBAN_COLUMNS } from "@/constants/kanban";
import { useKanban } from "@/contexts/KanbanContext";

interface KanbanData {
  emails: Email[];
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

interface KanbanBoardProps {
  kanbanData: {
    inbox: KanbanData;
    todo: KanbanData;
    done: KanbanData;
    snoozed: KanbanData;
  };
}

export function KanbanBoard({ kanbanData }: KanbanBoardProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterHasAttachments, setFilterHasAttachments] = useState(false);
  const { onMoveEmail } = useKanban();

  const isFiltering = filterUnread || filterHasAttachments;

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onMoveEmail(draggableId, source.droppableId, destination.droppableId);
  };

  const processedColumns = useMemo(() => {
    const processEmails = (emails: Email[]) => {
      let processed = [...emails];

      // Filter Unread
      if (filterUnread) {
        processed = processed.filter((e) => !e.isRead);
      }

      // Filter Has Attachments
      if (filterHasAttachments) {
        processed = processed.filter((e) => e.attachments && e.attachments.length > 0);
      }

      // Sort
      processed.sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });

      return processed;
    };

    return KANBAN_COLUMNS.reduce((acc, col) => {
      acc[col.id] = processEmails(kanbanData[col.id as keyof typeof kanbanData].emails);
      return acc;
    }, {} as Record<string, Email[]>);
  }, [kanbanData, sortBy, filterUnread, filterHasAttachments]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          >
            <option value="newest">Date: Newest</option>
            <option value="oldest">Date: Oldest</option>
          </select>
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterUnread}
                onChange={(e) => setFilterUnread(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              Unread Only
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterHasAttachments}
              onChange={(e) => setFilterHasAttachments(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Has Attachments
          </label>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-6 p-6 overflow-x-auto bg-background/50 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const columnData = kanbanData[col.id as keyof typeof kanbanData];
            const processedEmails = processedColumns[col.id];

            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                emails={processedEmails}
                count={processedEmails.length}
                color={col.color}
                onLoadMore={columnData.fetchNextPage}
                hasMore={!isFiltering && columnData.hasNextPage}
                isLoadingMore={columnData.isFetchingNextPage}
              />
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
