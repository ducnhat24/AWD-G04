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

interface KanbanBoardProps {
  emails: Email[];
  onMoveEmail: (emailId: string, sourceFolder: string, destinationFolder: string) => void;
  onSnooze: (emailId: string, date: Date) => void;
  onOpenMail: (emailId: string) => void;
}

export function KanbanBoard({ emails, onMoveEmail, onSnooze, onOpenMail }: KanbanBoardProps) {
  // Filter emails into columns using useMemo for performance
  const columnsData = useMemo(() => ({
    inbox: emails.filter(e => e.folder === 'inbox'),
    todo: emails.filter(e => e.folder === 'todo'),
    snoozed: emails.filter(e => e.folder === 'snoozed'),
    done: emails.filter(e => e.folder === 'done'),
  }), [emails]);

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
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            emails={columnsData[col.id as keyof typeof columnsData]}
            count={columnsData[col.id as keyof typeof columnsData].length}
            color={col.color}
            onSnooze={onSnooze}
            onOpenMail={onOpenMail}
          />
        ))}
      </div>
    </DragDropContext>
  );
}
