import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { Email } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Clock, MoreVertical, Sparkles } from "lucide-react";
import { SnoozeDialog } from "./SnoozeDialog";

interface KanbanCardProps {
  email: Email;
  index: number;
  onSnooze: (emailId: string, date: Date) => void;
  onOpenMail: (emailId: string) => void;
}

export function KanbanCard({ email, index, onSnooze, onOpenMail }: KanbanCardProps) {
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);

  return (
    <>
      <SnoozeDialog
        isOpen={isSnoozeOpen}
        onClose={() => setIsSnoozeOpen(false)}
        onSnooze={(date) => onSnooze(email.id, date)}
      />
      <Draggable draggableId={email.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={cn(
              "bg-card text-card-foreground rounded-lg border shadow-sm p-4 mb-3 select-none transition-shadow",
              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-md"
            )}
            style={provided.draggableProps.style}
          >
            {/* Header: Sender & Actions */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold", email.avatarColor || "bg-gray-500")}>
                  {email.sender.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold leading-none">{email.sender}</span>
                  <span className="text-xs text-muted-foreground">{email.timestamp}</span>
                </div>
              </div>
              <button className="text-muted-foreground hover:text-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Subject */}
            <h4 className="font-medium text-sm mb-2 line-clamp-1">{email.subject}</h4>

            {/* AI Summary Section */}
            <div className="bg-muted/50 rounded-md p-3 mb-3 border border-border/50">
              <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-primary">
                <Sparkles className="w-3 h-3" />
                <span>AI Summary</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {email.preview}
              </p>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={() => setIsSnoozeOpen(true)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="w-3 h-3" />
                <span>Snooze</span>
              </button>
              <button 
                onClick={() => onOpenMail(email.id)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Open Mail
              </button>
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
}
