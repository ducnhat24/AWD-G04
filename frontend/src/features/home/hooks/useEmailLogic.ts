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
  // 1. Queries
  const {
    data: emailsInfiniteData,
    isLoading: isLoadingList,
    fetchNextPage: fetchNextList,
    hasNextPage: hasNextList,
    isFetchingNextPage: isFetchingNextList,
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
    useModifyEmailMutation(selectedFolder, kanbanColumns);

  const { mutateAsync: snoozeEmailMutateAsync, isPending: isSnoozing } =
    useSnoozeEmailMutation();

  // 3. Logic nghiệp vụ (Move, Action...)
  const moveEmail = async (
    emailId: string,
    destinationColId: string,
    sourceColId?: string
  ) => {
    const addLabels: string[] = [];
    const removeLabels: string[] = [];

    const destCol = kanbanColumns.find((c) => c.id === destinationColId);
    const sourceCol = kanbanColumns.find((c) => c.id === sourceColId);

    if (!destCol) return;

    if (
      destCol.gmailLabelId !== "INBOX" &&
      destCol.gmailLabelId !== "SNOOZED"
    ) {
      addLabels.push(destCol.gmailLabelId);
    } else if (destCol.gmailLabelId === "INBOX") {
      addLabels.push("INBOX");
    }

    if (sourceCol) {
      if (sourceCol.gmailLabelId === "INBOX") {
        removeLabels.push("INBOX");
      } else if (sourceCol.gmailLabelId !== "SNOOZED") {
        removeLabels.push(sourceCol.gmailLabelId);
      }
    }

    if (destCol.gmailLabelId !== "INBOX") {
      removeLabels.push("INBOX");
    }

    await modifyEmailMutation({
      id: emailId,
      addLabels,
      removeLabels,
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

    await modifyEmailMutation(
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
    isLoadingSearch,
    searchError,
  };
};
