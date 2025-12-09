import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import type { Email } from "@/data/mockData";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  emails: Email[];
  onMoveEmail: (emailId: string, sourceFolder: string, destinationFolder: string) => void;
}

export function KanbanBoard({ emails, onMoveEmail }: KanbanBoardProps) {
  // Filter emails into columns
  // We normalize folder names to lowercase to match IDs
  const inboxEmails = emails.filter(e => e.folder.toLowerCase() === 'inbox');
  const todoEmails = emails.filter(e => e.folder.toLowerCase() === 'todo');
  const doneEmails = emails.filter(e => e.folder.toLowerCase() === 'done');

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
        <KanbanColumn
          id="inbox"
          title="Inbox"
          emails={inboxEmails}
          count={inboxEmails.length}
          color="bg-red-500"
        />
        <KanbanColumn
          id="todo"
          title="To Do"
          emails={todoEmails}
          count={todoEmails.length}
          color="bg-yellow-500"
        />
        <KanbanColumn
          id="done"
          title="Done"
          emails={doneEmails}
          count={doneEmails.length}
          color="bg-green-500"
        />
      </div>
    </DragDropContext>
  );
}
