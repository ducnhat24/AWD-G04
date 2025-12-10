import { useState, useRef, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import type { Email } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Clock, GripVertical, Sparkles, Maximize2 } from "lucide-react";
import { SnoozeDialog } from "./SnoozeDialog";
import { useQuery } from "@tanstack/react-query";
import { fetchEmailSummary } from "@/services/apiService";

interface KanbanCardProps {
  email: Email;
  index: number;
  onSnooze: (emailId: string, date: Date) => void;
  onOpenMail: (emailId: string) => void;
}

export function KanbanCard({ email, index, onSnooze, onOpenMail }: KanbanCardProps) {
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (summaryRef.current) {
      observer.observe(summaryRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["summary", email.id],
    queryFn: () => fetchEmailSummary(email.id),
    enabled: isVisible,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

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
            onClick={() => onOpenMail(email.id)}
            className={cn(
              "bg-card text-card-foreground rounded-lg border shadow-sm p-4 mb-3 select-none transition-shadow cursor-pointer",
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
                  <span className={cn("text-sm leading-none", !email.isRead ? "font-bold" : "font-normal")}>{email.sender}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{email.timestamp}</span>
                    {!email.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unread" />
                    )}
                  </div>
                </div>
              </div>
              <div 
                className="cursor-grab text-muted-foreground/50 hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="w-4 h-4" />
              </div>
            </div>

            {/* Subject */}
            <h4 className={cn("text-sm mb-2 line-clamp-1", !email.isRead ? "font-bold" : "font-normal")}>{email.subject}</h4>

            {/* AI Summary Section */}
            <div 
              ref={summaryRef}
              className="bg-muted/50 rounded-md p-3 mb-3 border border-border/50"
            >
              <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-primary">
                <Sparkles className="w-3 h-3" />
                <span>AI Summary</span>
              </div>
              {isSummaryLoading ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3 animate-spin" />
                    <span>Generating summary...</span>
                  </div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-full" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {summary || email.preview}
                </p>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSnoozeOpen(true);
                }}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Clock className="w-3 h-3" />
                <span>Snooze</span>
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenMail(email.id);
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <span>Open Mail</span>
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
}
