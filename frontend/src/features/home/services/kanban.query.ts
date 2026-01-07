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
      // Simulate API call delay
      const res = await getKanbanConfig();
      return res.columns;
    },
  });
};

export const useKanbanColumnData = (column: KanbanColumnConfig) => {
  const limit = 10;

  return useInfiniteQuery({
    // Query Key bao gồm columnId để định danh duy nhất
    queryKey: [KANBAN_KEYS.DETAIL, column.id, column.gmailLabelId],

    queryFn: async ({ pageParam = 1 }) => {
      // Logic riêng cho cột Snoozed (nếu backend xử lý riêng)
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
    refetchOnWindowFocus: false,
  });
};
