import { Droppable } from "@hello-pangea/dnd";
import type { Email } from "@/data/mockData";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

interface KanbanColumnProps {
  id: string;
  title: string;
  emails: Email[];
  count: number;
  color?: string;
  onSnooze: (emailId: string, date: Date) => void;
  onOpenMail: (emailId: string) => void;
}

export function KanbanColumn({ id, title, emails, count, color = "bg-gray-500", onSnooze, onOpenMail }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[300px] w-full bg-muted/10 rounded-xl border border-border/50">
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50 bg-background/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className={cn("w-1 h-4 rounded-full", color)} />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground/80">{title}</h3>
          <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <button className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 p-3 overflow-y-auto transition-colors min-h-[150px]",
              snapshot.isDraggingOver ? "bg-muted/20" : ""
            )}
          >
            {emails.map((email, index) => (
              <KanbanCard 
                key={email.id} 
                email={email} 
                index={index} 
                onSnooze={onSnooze}
                onOpenMail={onOpenMail}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
