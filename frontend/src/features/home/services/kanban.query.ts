import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getKanbanConfig } from "./kanban.api";
import { fetchSnoozedEmails } from "@/features/emails/services/snooze.service";
import { fetchEmails } from "@/features/emails/services/email.api";
import type { KanbanColumnConfig } from "../types/kanban.type";

export const KANBAN_KEYS = {
  CONFIG: "kanban_config",
  DETAIL: "kanban_detail",
};

export const useGetKanbanConfigQuery = () => {
  return useQuery({
    queryKey: [KANBAN_KEYS.CONFIG],
    queryFn: async () => {
      const res = await getKanbanConfig();
      return res.columns;
    },
    // [THÊM] Cache config khi offline
    networkMode: "offlineFirst",
    staleTime: 1000 * 60 * 60, // Config ít thay đổi, để cache lâu chút
  });
};

export const useKanbanColumnData = (column: KanbanColumnConfig) => {
  const limit = 10;

  return useInfiniteQuery({
    // Query Key bao gồm columnId để định danh duy nhất
    queryKey: [KANBAN_KEYS.DETAIL, column.id, column.gmailLabelId],

    queryFn: async ({ pageParam = 1 }) => {
      // Logic riêng cho cột Snoozed
      if (column.gmailLabelId === "SNOOZED") {
        console.log("Fetching snoozed emails, pageParam:", pageParam);
        return fetchSnoozedEmails(pageParam as number, limit);
      }

      return fetchEmails(
        column.gmailLabelId,
        pageParam as string | number,
        limit
      );
    },
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    initialPageParam: 1 as string | number,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,

    // [THÊM QUAN TRỌNG] Hỗ trợ Offline
    networkMode: "offlineFirst", // Ưu tiên cache, không báo lỗi ngay khi mất mạng
    refetchOnReconnect: true, // Tự động fetch lại khi có mạng
    staleTime: 0,          // Luôn coi dữ liệu là cũ để kích hoạt fetch
    refetchOnMount: true,  // [QUAN TRỌNG] Bắt buộc gọi API lại ngay khi chuyển Tab sang Kanban
  });
};
