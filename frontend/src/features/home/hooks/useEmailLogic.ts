import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmails,
  fetchMailboxes,
  fetchEmailDetail,
  modifyEmail,
  searchEmails,
} from "@/services/email.service";
import { snoozeEmail as apiSnoozeEmail } from "@/services/snooze.service";
import type { Email } from "@/data/mockData";
import type { KanbanColumnConfig } from "../types/kanban.type";

interface UseEmailLogicProps {
  selectedFolder: string;
  selectedEmailId: string | null;
  viewMode: "list" | "kanban";
  searchQuery: string;
  kanbanColumns?: KanbanColumnConfig[]; // Nhận cấu hình cột để xử lý logic Move
}

export const useEmailLogic = ({
  selectedFolder,
  selectedEmailId,
  viewMode,
  searchQuery,
  kanbanColumns = [],
}: UseEmailLogicProps) => {
  const queryClient = useQueryClient();
  const limit = 10;

  // 1. Fetch List Emails (Chỉ fetch khi ở chế độ List để tiết kiệm tài nguyên)
  const {
    data: emailsInfiniteData,
    isLoading: isLoadingList,
    fetchNextPage: fetchNextList,
    hasNextPage: hasNextList,
    isFetchingNextPage: isFetchingNextList,
  } = useInfiniteQuery({
    queryKey: ["emails", selectedFolder, searchQuery],
    queryFn: ({ pageParam = 1 }) =>
      fetchEmails(
        selectedFolder,
        pageParam as string | number,
        limit,
        searchQuery
      ),
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    initialPageParam: 1 as string | number,
    refetchOnWindowFocus: false,
    enabled: viewMode === "list", // Quan trọng: Tắt khi ở Kanban mode
    refetchInterval: 60000,
  });

  const emails = emailsInfiniteData?.pages.flatMap((page) => page.emails) || [];

  const { data: folders = [] } = useQuery({
    queryKey: ["mailboxes"],
    queryFn: fetchMailboxes,
    refetchOnWindowFocus: false,
  });

  // 2. Fetch Selected Email Detail
  const { data: selectedEmail = null, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["email", selectedEmailId],
    queryFn: () => fetchEmailDetail(selectedEmailId!),
    enabled: !!selectedEmailId,
    refetchOnWindowFocus: false,
  });

  // 3. Search Emails (Global Search)
  const {
    data: searchResults = [],
    isLoading: isLoadingSearch,
    error: searchError,
  } = useQuery({
    queryKey: ["search", searchQuery],
    queryFn: () => searchEmails(searchQuery),
    enabled: !!searchQuery,
    refetchOnWindowFocus: false,
  });

  // 4. Mutations
  const modifyEmailMutation = useMutation({
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
      // Optimistic Update cho List View
      await queryClient.cancelQueries({ queryKey: ["emails", selectedFolder] });
      const previousEmails = queryClient.getQueryData([
        "emails",
        selectedFolder,
      ]);

      queryClient.setQueryData(
        ["emails", selectedFolder],
        (old: InfiniteData<{ emails: Email[] }> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              emails: page.emails.map((email) => {
                if (email.id === id) {
                  // Giả lập update trạng thái read/star
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

      // Optimistic Update cho Kanban View (Nâng cao)
      // Tìm key của cột nguồn và đích để cập nhật cache ngay lập tức
      let previousSource: any;
      let previousDest: any;
      let sourceKey: any[] | undefined;
      let destKey: any[] | undefined;

      if (meta?.destinationFolder && meta?.sourceFolder) {
        const srcCol = kanbanColumns.find((c) => c.id === meta.sourceFolder);
        const destCol = kanbanColumns.find(
          (c) => c.id === meta.destinationFolder
        );

        // Key phải khớp với useKanbanColumnData: ["kanban", col.id, col.gmailLabelId]
        if (srcCol) sourceKey = ["kanban", srcCol.id, srcCol.gmailLabelId];
        if (destCol) destKey = ["kanban", destCol.id, destCol.gmailLabelId];

        if (sourceKey && destKey) {
          await queryClient.cancelQueries({ queryKey: sourceKey });
          await queryClient.cancelQueries({ queryKey: destKey });

          previousSource = queryClient.getQueryData(sourceKey);
          previousDest = queryClient.getQueryData(destKey);

          // Logic: Xóa khỏi nguồn, thêm vào đích (Client side simulation)
          // (Để code ngắn gọn, phần implementation chi tiết có thể bỏ qua
          // và dựa vào onSettled invalidateQueries, nhưng đây là placeholder cho logic đó)
        }
      }

      return {
        previousEmails,
        previousSource,
        previousDest,
        sourceKey,
        destKey,
      };
    },

    onError: (_err, _newTodo, context) => {
      toast.error("Failed to update email");
      if (context?.previousEmails) {
        queryClient.setQueryData(
          ["emails", selectedFolder],
          context.previousEmails
        );
      }
      if (context?.sourceKey && context.previousSource) {
        queryClient.setQueryData(context.sourceKey, context.previousSource);
      }
      if (context?.destKey && context.previousDest) {
        queryClient.setQueryData(context.destKey, context.previousDest);
      }
    },

    onSettled: () => {
      // Invalidate toàn bộ để đảm bảo dữ liệu đồng bộ với server
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
      if (selectedEmailId) {
        queryClient.invalidateQueries({ queryKey: ["email", selectedEmailId] });
      }
    },
  });

  const snoozeEmailMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: Date }) =>
      apiSnoozeEmail(id, date.toISOString()),
    onSuccess: (data) => {
      console.log("Snooze success:", data);
      toast.success("Email snoozed");
      queryClient.invalidateQueries({ queryKey: ["kanban"] });
    },
    onError: () => {
      toast.error("Failed to snooze email");
    },
  });

  // 5. Helper Functions

  /**
   * Di chuyển email giữa các cột Kanban
   * Sử dụng kanbanColumns để xác định Gmail Label ID tương ứng
   */
  const moveEmail = (
    emailId: string,
    destinationColId: string,
    sourceColId?: string
  ) => {
    const addLabels: string[] = [];
    const removeLabels: string[] = [];

    // Tìm config của cột dựa trên ID (ví dụ: 'todo' -> config có label 'STARRED')
    const destCol = kanbanColumns.find((c) => c.id === destinationColId);
    const sourceCol = kanbanColumns.find((c) => c.id === sourceColId);

    if (!destCol) {
      console.warn("Destination column not found:", destinationColId);
      return;
    }

    // Logic 1: Add Label của cột đích
    // Nếu đích là SNOOZED, logic sẽ xử lý riêng (thường qua UI snooze dialog)
    // Nếu đích là INBOX, thêm label INBOX.
    // Nếu đích là Custom/Starred, thêm label đó.
    if (
      destCol.gmailLabelId !== "INBOX" &&
      destCol.gmailLabelId !== "SNOOZED"
    ) {
      addLabels.push(destCol.gmailLabelId);
    } else if (destCol.gmailLabelId === "INBOX") {
      addLabels.push("INBOX");
    }

    // Logic 2: Remove Label của cột nguồn
    if (sourceCol) {
      if (sourceCol.gmailLabelId === "INBOX") {
        removeLabels.push("INBOX");
      } else if (sourceCol.gmailLabelId !== "SNOOZED") {
        // Chỉ remove nếu không phải là Snoozed (Snoozed tự động mất khi hết giờ hoặc unsnooze)
        removeLabels.push(sourceCol.gmailLabelId);
      }
    }

    // Logic 3: Auto Archive (Optional)
    // Nếu di chuyển sang cột không phải Inbox (ví dụ Done/Todo), thường ta muốn bỏ khỏi Inbox
    if (destCol.gmailLabelId !== "INBOX") {
      removeLabels.push("INBOX");
    }

    modifyEmailMutation.mutate({
      id: emailId,
      addLabels,
      removeLabels,
      meta: { destinationFolder: destinationColId, sourceFolder: sourceColId },
    });
  };

  const snoozeEmail = (emailId: string, date: Date, sourceFolder?: string) => {
    snoozeEmailMutation.mutate({ id: emailId, date });

    // Nếu muốn UI cập nhật ngay (remove khỏi cột nguồn), có thể gọi thêm modifyEmail
    // Tuy nhiên, backend snooze thường sẽ tự xử lý việc ẩn mail đi
  };

  const handleEmailAction = (
    action: "toggleRead" | "delete" | "star" | "markAsRead",
    payload: { id: string; email?: Email | null }
  ) => {
    const { id, email } = payload;
    const addLabels: string[] = [];
    const removeLabels: string[] = [];
    let successMessage = "";

    switch (action) {
      case "toggleRead":
        if (email?.isRead) {
          addLabels.push("UNREAD");
          successMessage = "Marked as unread";
        } else {
          removeLabels.push("UNREAD");
          successMessage = "Marked as read";
        }
        break;
      case "markAsRead":
        removeLabels.push("UNREAD");
        break;
      case "delete":
        addLabels.push("TRASH");
        removeLabels.push("INBOX");
        successMessage = "Moved to trash";
        break;
      case "star":
        if (email?.isStarred) {
          removeLabels.push("STARRED");
          successMessage = "Removed from starred";
        } else {
          addLabels.push("STARRED");
          successMessage = "Marked as starred";
        }
        break;
    }

    modifyEmailMutation.mutate(
      { id, addLabels, removeLabels },
      {
        onSuccess: () => {
          if (successMessage) toast.success(successMessage);
        },
      }
    );
  };

  return {
    emails,
    fetchNextList,
    hasNextList,
    isFetchingNextList,
    folders,
    // Không trả về kanbanData nữa, KanbanBoard sẽ tự xử lý
    selectedEmail,
    isLoadingList,
    isLoadingDetail,
    moveEmail,
    snoozeEmail,
    executeEmailAction: handleEmailAction,
    searchResults,
    isLoadingSearch,
    searchError,
  };
};
