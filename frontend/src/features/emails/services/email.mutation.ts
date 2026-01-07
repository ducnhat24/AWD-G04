import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { modifyEmail } from "@/features/emails/services/email.api";
import { snoozeEmail as apiSnoozeEmail } from "@/features/emails/services/snooze.service";
// Giả sử bạn đã có file này từ phần Kanban trước đó
import type { Email } from "@/data/mockData";
import type { KanbanColumnConfig } from "@/features/home/types/kanban.type";
import { EMAIL_KEYS } from "./email.query";
import { KANBAN_KEYS } from "@/features/home/services/kanban.query";

// Hook Modify Email (Move, Star, Read, Delete...)
export const useModifyEmailMutation = (
  selectedFolder: string,
  kanbanColumns: KanbanColumnConfig[] = []
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      addLabels,
      removeLabels,
    }: {
      id: string;
      addLabels: string[];
      removeLabels: string[];
      meta?: { destinationFolder: string; sourceFolder?: string };
    }) => modifyEmail(id, addLabels, removeLabels),

    onMutate: async ({ id, addLabels, removeLabels, meta }) => {
      // --- 1. Optimistic Update cho List View ---
      const listKey = [...EMAIL_KEYS.LIST, selectedFolder];
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousEmails = queryClient.getQueryData(listKey);

      queryClient.setQueryData(
        listKey,
        (old: InfiniteData<{ emails: Email[] }> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              emails: page.emails.map((email) => {
                if (email.id === id) {
                  // Giả lập update state
                  const isRead = addLabels.includes("UNREAD")
                    ? false
                    : removeLabels.includes("UNREAD")
                    ? true
                    : email.isRead;
                  const isStarred = addLabels.includes("STARRED")
                    ? true
                    : removeLabels.includes("STARRED")
                    ? false
                    : email.isStarred;
                  return { ...email, isRead, isStarred };
                }
                return email;
              }),
            })),
          };
        }
      );

      // --- 2. Optimistic Update cho Kanban View ---
      let previousSource: any;
      let previousDest: any;
      let sourceKey: any[] | undefined;
      let destKey: any[] | undefined;

      if (meta?.destinationFolder && meta?.sourceFolder) {
        const srcCol = kanbanColumns.find((c) => c.id === meta.sourceFolder);
        const destCol = kanbanColumns.find(
          (c) => c.id === meta.destinationFolder
        );

        // Key phải khớp với logic bên kanban.query.ts
        if (srcCol)
          sourceKey = [...KANBAN_KEYS.DETAIL, srcCol.id, srcCol.gmailLabelId];
        if (destCol)
          destKey = [...KANBAN_KEYS.DETAIL, destCol.id, destCol.gmailLabelId];

        if (sourceKey && destKey) {
          await queryClient.cancelQueries({ queryKey: sourceKey });
          await queryClient.cancelQueries({ queryKey: destKey });

          previousSource = queryClient.getQueryData(sourceKey);
          previousDest = queryClient.getQueryData(destKey);

          // Logic client-side update cho Kanban (nếu muốn mượt hơn) có thể thêm ở đây
        }
      }

      return {
        previousEmails,
        previousSource,
        previousDest,
        sourceKey,
        destKey,
        listKey,
      };
    },

    onError: (_err, _vars, context) => {
      toast.error("Thao tác thất bại");
      // Rollback data
      if (context?.previousEmails) {
        queryClient.setQueryData(context.listKey, context.previousEmails);
      }
      if (context?.sourceKey && context.previousSource) {
        queryClient.setQueryData(context.sourceKey, context.previousSource);
      }
      if (context?.destKey && context.previousDest) {
        queryClient.setQueryData(context.destKey, context.previousDest);
      }
    },

    onSettled: (data, error, vars) => {
      console.log("Mutation settled:", { data, error, vars });
      // Invalidate để fetch lại dữ liệu mới nhất từ server
      queryClient.invalidateQueries({ queryKey: EMAIL_KEYS.LIST });
      queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.DETAIL] });

      if (vars.id) {
        queryClient.invalidateQueries({
          queryKey: [...EMAIL_KEYS.DETAIL, vars.id],
        });
      }
    },
  });
};

// Hook Snooze Email
export const useSnoozeEmailMutation = (
  kanbanColumns: KanbanColumnConfig[] = []
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      date,
    }: {
      id: string;
      date: Date;
      sourceFolder?: string;
    }) => apiSnoozeEmail(id, date.toISOString()),

    onMutate: async ({ id, sourceFolder }) => {
      // Optimistic Update: Xóa ngay khỏi cột hiện tại nếu biết sourceFolder
      let previousSource: any;
      let sourceKey: any[] | undefined;

      if (sourceFolder) {
        // Tìm config cột dựa trên ID
        const srcCol = kanbanColumns.find((c) => c.id === sourceFolder);

        if (srcCol) {
          // Key phải khớp với useKanbanColumnData
          sourceKey = [...KANBAN_KEYS.DETAIL, srcCol.id, srcCol.gmailLabelId];

          await queryClient.cancelQueries({ queryKey: sourceKey });
          previousSource = queryClient.getQueryData(sourceKey);

          // Xóa email khỏi cache cột nguồn
          queryClient.setQueryData(sourceKey, (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                emails: page.emails.filter((e: Email) => e.id !== id),
              })),
            };
          });
        }
      }

      return { previousSource, sourceKey };
    },

    onSuccess: () => {
      toast.success("Đã hoãn email");
      // Invalidate để fetch lại dữ liệu mới nhất (bao gồm cột Snoozed)
      queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.DETAIL] });
      queryClient.invalidateQueries({ queryKey: EMAIL_KEYS.LIST });
    },

    onError: (_err, _vars, context) => {
      toast.error("Không thể hoãn email");
      // Rollback nếu lỗi
      if (context?.sourceKey && context.previousSource) {
        queryClient.setQueryData(context.sourceKey, context.previousSource);
      }
    },
  });
};
