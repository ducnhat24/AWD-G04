// src/features/home/components/KanbanColumnContainer.tsx
import { KanbanColumn } from "./KanbanColumn";
import { useMemo } from "react";
import type { Email } from "@/data/mockData";
import { useKanbanColumnData } from "../services/kanban.query";
import type { KanbanColumnConfig } from "../types/kanban.type";

interface Props {
  config: KanbanColumnConfig;
  filterUnread: boolean;
  filterHasAttachments: boolean;
  sortBy: "newest" | "oldest";
}

export function KanbanColumnContainer({
  config,
  filterUnread,
  filterHasAttachments,
  sortBy,
}: Props) {
  // 1. Lấy thêm isRefetching
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isRefetching, // <--- THÊM BIẾN NÀY
  } = useKanbanColumnData(config);

  // 2. Xử lý data (Giữ nguyên)
  const processedEmails = useMemo(() => {
    if (!data) return [];

    const allEmails = data.pages.flatMap((page) => page.emails) as Email[];
    let processed = [...allEmails];

    // Filter
    if (filterUnread) processed = processed.filter((e) => !e.isRead);
    if (filterHasAttachments)
      processed = processed.filter((e) => {
        return e.attachments && e.attachments.length > 0;
      });

    // Sort
    processed.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return processed;
  }, [data, filterUnread, filterHasAttachments, sortBy]);

  // // Loading lần đầu (Giữ nguyên)
  // if (isLoading) {
  //   return (
  //     <div className="w-[300px] h-full flex items-center justify-center bg-muted/10 rounded-lg">
  //       Loading...
  //     </div>
  //   );
  // }

  return (
    <KanbanColumn
      id={config.id}
      title={config.title}
      emails={processedEmails}
      count={processedEmails.length}
      color={config.color || "bg-gray-500"}
      onLoadMore={fetchNextPage}
      hasMore={!filterUnread && !filterHasAttachments && hasNextPage}
      isLoadingMore={isFetchingNextPage}
      isRefetching={isRefetching || isLoading} // <--- TRUYỀN XUỐNG DƯỚI
    />
  );
}
