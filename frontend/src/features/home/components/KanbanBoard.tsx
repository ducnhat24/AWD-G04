import { useState, useEffect } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { ArrowUpDown } from "lucide-react";
import { useKanban } from "@/contexts/KanbanContext";
import { KanbanColumnContainer } from "./KanbanColumnContainer";
import type { KanbanColumnConfig } from "../types/kanban.type";
import { useKanbanDelete } from "../hooks/useKanbanDelete";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";

// [THÊM] Import QueryClient
import { useQueryClient } from "@tanstack/react-query";
import { KANBAN_KEYS } from "../services/kanban.query";
import { toast } from "sonner";

interface KanbanBoardProps {
  columns: KanbanColumnConfig[];
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterHasAttachments, setFilterHasAttachments] = useState(false);
  const { onMoveEmail } = useKanban();

  const { isDeletingColumn, handlers } = useKanbanDelete();

  // [THÊM] Setup QueryClient để reload khi có mạng
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => {
      console.log("🔌 Kanban: Network back! Refreshing board...");
      toast.success("Đã kết nối lại. Đang cập nhật bảng...");

      // Invalidate toàn bộ dữ liệu chi tiết của các cột (kanban_detail)
      // Không cần invalidate config vì config ít khi thay đổi
      queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.DETAIL] });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [queryClient]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // draggableId có thể là "emailId" hoặc "emailId::columnId" tùy cách bạn render Card
    // Cần đảm bảo lấy đúng ID
    const emailId = draggableId.split("::")[0];

    onMoveEmail(emailId, source.droppableId, destination.droppableId);
  };

  return (
    <div className="flex flex-col h-full">
      <LoadingOverlay visible={isDeletingColumn} />
      {/* --- Toolbar --- */}
      <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          >
            <option value="newest">Date: Newest</option>
            <option value="oldest">Date: Oldest</option>
          </select>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterUnread}
              onChange={(e) => setFilterUnread(e.target.checked)}
              className="rounded border-gray-300"
            />
            Unread Only
          </label>
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterHasAttachments}
              onChange={(e) => setFilterHasAttachments(e.target.checked)}
              className="rounded border-gray-300"
            />
            Has Attachments
          </label>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-full gap-6 p-6 overflow-x-auto bg-background/50 items-start">
          {columns.map((col) => (
            <KanbanColumnContainer
              key={col.id}
              config={col}
              filterUnread={filterUnread}
              filterHasAttachments={filterHasAttachments}
              onDeleteColumn={handlers.onDeleteColumn}
              sortBy={sortBy}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
