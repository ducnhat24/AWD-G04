import { toast } from "sonner";
import type { KanbanColumnConfig } from "../types/kanban.type";
import {
  useEmailDetailQuery,
  useEmailListQuery,
  useMailboxesQuery,
  useSearchEmailsQuery,
} from "@/features/emails/services/email.query";
import {
  useModifyEmailMutation,
  useSnoozeEmailMutation,
} from "@/features/emails/services/email.mutation";
import type { Email } from "@/features/emails/types/email.type";
import { useQueryClient } from "@tanstack/react-query";
import { KANBAN_KEYS } from "../services/kanban.query";

interface UseEmailLogicProps {
  selectedFolder: string;
  selectedEmailId: string | null;
  viewMode: "list" | "kanban";
  searchQuery: string;
  kanbanColumns?: KanbanColumnConfig[];
}

export const useEmailLogic = ({
  selectedFolder,
  selectedEmailId,
  viewMode,
  searchQuery,
  kanbanColumns = [],
}: UseEmailLogicProps) => {
  const queryClient = useQueryClient();
  // 1. Queries
  const {
    data: emailsInfiniteData,
    isLoading: isLoadingList,
    fetchNextPage: fetchNextList,
    hasNextPage: hasNextList,
    isFetchingNextPage: isFetchingNextList,
    isFetching, // Để biết có đang chạy ngầm không
    refetch, // Hàm để force reload
    isError,
  } = useEmailListQuery(selectedFolder, searchQuery, viewMode === "list");

  const emails = emailsInfiniteData?.pages.flatMap((page) => page.emails) || [];

  const { data: folders = [] } = useMailboxesQuery();

  const { data: selectedEmail = null, isLoading: isLoadingDetail } =
    useEmailDetailQuery(selectedEmailId);

  const {
    data: searchResults = [],
    isLoading: isLoadingSearch,
    error: searchError,
  } = useSearchEmailsQuery(searchQuery);

  // 2. Mutations
  const { mutateAsync: modifyEmailMutation, isPending: isModifyingEmail } =
    useModifyEmailMutation(selectedFolder, kanbanColumns, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [KANBAN_KEYS.DETAIL] });
      }
    });

  const { mutateAsync: snoozeEmailMutateAsync, isPending: isSnoozing } =
    useSnoozeEmailMutation();

  // 3. Logic nghiệp vụ (Move, Action...)
  const moveEmail = async (
    emailId: string,
    destinationColId: string,
    sourceColId?: string
  ) => {
    // Sử dụng Set để tự động loại bỏ trùng lặp ngay từ đầu
    const addLabels = new Set<string>();
    const removeLabels = new Set<string>();

    const destCol = kanbanColumns.find((c) => c.id === destinationColId);
    const sourceCol = kanbanColumns.find((c) => c.id === sourceColId);

    if (!destCol) return;

    // --- XỬ LÝ ADD LABELS ---
    if (
      destCol.gmailLabelId !== "INBOX" &&
      destCol.gmailLabelId !== "SNOOZED"
    ) {
      addLabels.add(destCol.gmailLabelId);
    } else if (destCol.gmailLabelId === "INBOX") {
      addLabels.add("INBOX");
    }

    // --- XỬ LÝ REMOVE LABELS ---
    if (sourceCol) {
      if (sourceCol.gmailLabelId === "INBOX") {
        removeLabels.add("INBOX");
      } else if (sourceCol.gmailLabelId !== "SNOOZED") {
        removeLabels.add(sourceCol.gmailLabelId);
      }
    }

    // Logic cũ của bạn: Nếu đích KHÔNG phải INBOX thì xóa INBOX khỏi email (Archive)
    if (destCol.gmailLabelId !== "INBOX") {
      removeLabels.add("INBOX");
    }

    // [QUAN TRỌNG] Không được xóa label mà mình vừa định thêm vào (trường hợp kéo thả trong cùng 1 loại label nhưng khác cột logic - hiếm nhưng có thể xảy ra)
    addLabels.forEach(label => removeLabels.delete(label));

    await modifyEmailMutation({
      id: emailId,
      addLabels: Array.from(addLabels),    // Convert Set về Array
      removeLabels: Array.from(removeLabels), // Convert Set về Array
      meta: { destinationFolder: destinationColId, sourceFolder: sourceColId },
    });
  };

  const snoozeEmail = async (
    emailId: string,
    date: Date,
    sourceFolder?: string
  ) => {
    await snoozeEmailMutateAsync({ id: emailId, date, sourceFolder });
  };

  const executeEmailAction = async (
    action: "toggleRead" | "delete" | "star" | "markAsRead",
    payload: { id: string; email?: Email | null }
  ) => {
    const { id, email } = payload;
    const addLabels = new Set<string>();
    const removeLabels = new Set<string>();
    let successMessage = "";

    switch (action) {
      case "toggleRead":
        if (email?.isRead) {
          addLabels.add("UNREAD");
          successMessage = "Marked as unread";
        } else {
          removeLabels.add("UNREAD");
          successMessage = "Marked as read";
        }
        break;
      case "markAsRead":
        removeLabels.add("UNREAD");
        break;
      case "delete":
        addLabels.add("TRASH");
        successMessage = "Moved to trash";

        if (email?.labelIds) {
          email.labelIds.forEach((label) => {
            // Giữ lại UNREAD và STARRED
            if (label !== "UNREAD" && label !== "STARRED") {
              removeLabels.add(label);
            }
          });
        } else {
          // Fallback
          if (selectedFolder !== "TRASH" && selectedFolder !== "ALL") {
            removeLabels.add(selectedFolder);
          }
          removeLabels.add("INBOX");
        }
        break;
      case "star":
        if (email?.isStarred) {
          removeLabels.add("STARRED");
          successMessage = "Removed from starred";
        } else {
          addLabels.add("STARRED");
          successMessage = "Marked as starred";
        }
        break;
    }

    addLabels.forEach(label => removeLabels.delete(label));

    await modifyEmailMutation(
      { id, addLabels: Array.from(addLabels), removeLabels: Array.from(removeLabels) },
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
    isSnoozing,
    isModifyingEmail,
    isFetchingNextList,
    folders,
    selectedEmail,
    isLoadingList,
    isLoadingDetail,
    moveEmail,
    snoozeEmail,
    executeEmailAction,
    searchResults,
    isFetching,
    refetchList: refetch, // Đổi tên cho rõ nghĩa
    isListError: isError,
    isLoadingSearch,
    searchError,
  };
};
