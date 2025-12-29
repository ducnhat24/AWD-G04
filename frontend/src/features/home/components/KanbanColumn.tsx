// src/features/home/components/KanbanColumn.tsx
import { useEffect, useRef, useState } from "react";
import { Droppable } from "@hello-pangea/dnd";
import type { Email } from "@/data/mockData";
import { KanbanCard } from "./KanbanCard";
import { cn } from "@/lib/utils";
import { Loader2, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { KanbanColumnConfig } from "../types/kanban.type";
import { UpdateColumnDialog } from "./UpdateColumnDialog";

interface KanbanColumnProps {
  config: KanbanColumnConfig;
  emails: Email[];
  count: number;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  isRefetching?: boolean; // <--- THÊM PROP MỚI
  onDeleteColumn: (columnId: string) => void;
}

export function KanbanColumn({
  config,
  emails,
  count,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isRefetching, // <--- Destructure
  onDeleteColumn,
}: KanbanColumnProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  useEffect(() => {
    // Logic Infinite Scroll (Giữ nguyên)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="flex flex-col h-full flex-1 min-w-[250px] bg-muted/10 rounded-xl border border-border/50">
      {/* Column Header */}
      <div className="p-4 flex items-center justify-between border-b border-border/50 bg-background/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10 h-[60px]">
        <div className="flex items-center gap-2">
          <div
            className={cn("w-1 h-4 rounded-full")}
            style={{
              backgroundColor: config.color,
            }}
          />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground/80">
            {config.title}
          </h3>
          <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>

        <div className="flex gap-2">
          {isRefetching && (
            <div className="flex items-center gap-2 animate-in fade-in duration-300">
              <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                Syncing...
              </span>
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}

          <Button
            disabled={isRefetching}
            className="cursor-pointer"
            onClick={() => onDeleteColumn(config.id)}
            variant="destructive"
          >
            <Trash size={16} />
          </Button>

          <Button
            disabled={isRefetching}
            className="cursor-pointer"
            onClick={() => setIsUpdateModalOpen(true)}
            variant="outline"
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Droppable Area (Giữ nguyên) */}
      <Droppable droppableId={config.id}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 p-3 overflow-y-auto transition-colors min-h-[150px]",
              snapshot.isDraggingOver ? "bg-muted/20" : "",
              // Thêm chút opacity cho nội dung cũ khi đang refetch (Option - có thể bỏ nếu ko thích)
              isRefetching ? "opacity-70 grayscale-[0.3]" : ""
            )}
          >
            {emails.map((email, index) => (
              <KanbanCard
                key={email.id}
                email={email}
                index={index}
                columnId={config.id}
              />
            ))}
            {provided.placeholder}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-4 w-full" />

            {/* Loading more ở đáy (Giữ nguyên) */}
            {isLoadingMore && (
              <div className="flex justify-center p-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </Droppable>

      {isUpdateModalOpen && (
        <UpdateColumnDialog
          config={config}
          onOpenChange={setIsUpdateModalOpen}
        />
      )}
    </div>
  );
}
