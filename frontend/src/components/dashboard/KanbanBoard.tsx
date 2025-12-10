import { useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Email } from "@/data/mockData";
import { KanbanColumn } from "./KanbanColumn";

const COLUMNS = [
  { id: 'inbox', title: 'Inbox', color: 'bg-red-500' },
  { id: 'todo', title: 'To Do', color: 'bg-yellow-500' },
  { id: 'snoozed', title: 'Snoozed', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
] as const;

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
  onMoveEmail: (emailId: string, sourceFolder: string, destinationFolder: string) => void;
  onSnooze: (emailId: string, date: Date) => void;
  onOpenMail: (emailId: string) => void;
}

export function KanbanBoard({ kanbanData, onMoveEmail, onSnooze, onOpenMail }: KanbanBoardProps) {
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

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-6 p-6 overflow-x-auto bg-background/50">
        {COLUMNS.map((col) => {
          const columnData = kanbanData[col.id as keyof typeof kanbanData];
          return (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              emails={columnData.emails}
              count={columnData.emails.length}
              color={col.color}
              onSnooze={onSnooze}
              onOpenMail={onOpenMail}
              onLoadMore={columnData.fetchNextPage}
              hasMore={columnData.hasNextPage}
              isLoadingMore={columnData.isFetchingNextPage}
            />
          );
        })}
      </div>
    </DragDropContext>
  );
}
