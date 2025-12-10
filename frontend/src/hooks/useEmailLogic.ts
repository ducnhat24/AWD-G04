import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmails,
  fetchMailboxes,
  fetchEmailDetail,
  modifyEmail,
  snoozeEmail as apiSnoozeEmail,
} from "@/services/apiService";
import { type Email } from "@/data/mockData";

interface UseEmailLogicProps {
  selectedFolder: string;
  selectedEmailId: string | null;
  viewMode: "list" | "kanban";
}

export const useEmailLogic = ({
  selectedFolder,
  selectedEmailId,
  viewMode,
}: UseEmailLogicProps) => {
  const queryClient = useQueryClient();

  // 1. Fetch Emails
  const { data: emails = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["emails", selectedFolder],
    queryFn: () => fetchEmails(selectedFolder),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: folders = [] } = useQuery<{ id: string; label: string; icon: string }[]>({
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

  // 3. Fetch Kanban Emails
  const { data: kanbanEmails = [], isLoading: isLoadingKanban } = useQuery({
    queryKey: ["kanban-emails"],
    queryFn: async () => {
      const [inbox, starred, archive] = await Promise.all([
        fetchEmails("INBOX").catch(() => []),
        fetchEmails("STARRED").catch(() => []),
        fetchEmails("YELLOW_STAR").catch(() => []),
      ]);

      const safeInbox = Array.isArray(inbox) ? inbox.map((e: any) => ({ ...e, folder: 'inbox' })) : [];
      const safeStarred = Array.isArray(starred) ? starred.map((e: any) => ({ ...e, folder: 'todo' })) : [];
      const safeArchive = Array.isArray(archive) ? archive.map((e: any) => ({ ...e, folder: 'done' })) : [];

      const emailMap = new Map<string, Email>();

      [...safeArchive, ...safeInbox, ...safeStarred].forEach((email) => {
        if (email.snoozeUntil) {
          const snoozeDate = new Date(email.snoozeUntil);
          if (snoozeDate > new Date()) {
            email.folder = 'snoozed';
          } else {
            if (email.folder !== 'todo') {
               email.folder = 'inbox';
            }
          }
        }
        emailMap.set(email.id, email);
      });

      return Array.from(emailMap.values());
    },
    enabled: viewMode === "kanban",
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
    }) => modifyEmail(id, addLabels, removeLabels),
    onMutate: async ({ id, addLabels, removeLabels }) => {
      await queryClient.cancelQueries({ queryKey: ["emails", selectedFolder] });
      await queryClient.cancelQueries({ queryKey: ["kanban-emails"] });

      const previousEmails = queryClient.getQueryData(["emails", selectedFolder]);
      const previousEmailDetail = queryClient.getQueryData(["email", id]);
      const previousKanbanEmails = queryClient.getQueryData(["kanban-emails"]);

      if (previousEmailDetail) {
        await queryClient.cancelQueries({ queryKey: ["email", id] });
      }

      queryClient.setQueryData(["emails", selectedFolder], (old: any[]) => {
        if (!old) return [];
        return old.map((email) => {
          if (email.id === id) {
            let isRead = email.isRead;
            let isStarred = email.isStarred;

            if (addLabels.includes("UNREAD")) isRead = false;
            if (removeLabels.includes("UNREAD")) isRead = true;
            if (addLabels.includes("STARRED")) isStarred = true;
            if (removeLabels.includes("STARRED")) isStarred = false;

            return { ...email, isRead, isStarred };
          }
          return email;
        });
      });

      if (previousEmailDetail) {
        queryClient.setQueryData(["email", id], (old: any) => {
          if (!old) return old;
          let isRead = old.isRead;
          let isStarred = old.isStarred;

          if (addLabels.includes("UNREAD")) isRead = false;
          if (removeLabels.includes("UNREAD")) isRead = true;
          if (addLabels.includes("STARRED")) isStarred = true;
          if (removeLabels.includes("STARRED")) isStarred = false;

          return { ...old, isRead, isStarred };
        });
      }

      if (previousKanbanEmails) {
        queryClient.setQueryData(["kanban-emails"], (old: any[]) => {
          if (!old) return [];
          return old.map((email) => {
            if (email.id === id) {
              let newFolder = email.folder;
              if (addLabels.includes("STARRED")) newFolder = "todo";
              else if (addLabels.includes("INBOX") && removeLabels.includes("STARRED")) newFolder = "inbox";
              else if (removeLabels.includes("INBOX") && removeLabels.includes("STARRED")) newFolder = "done";
              
              let isRead = email.isRead;
              let isStarred = email.isStarred;

              if (addLabels.includes("UNREAD")) isRead = false;
              if (removeLabels.includes("UNREAD")) isRead = true;

              if (addLabels.includes("STARRED")) isStarred = true;
              if (removeLabels.includes("STARRED")) isStarred = false;

              return { ...email, folder: newFolder, isRead, isStarred };
            }
            return email;
          });
        });
      }

      return { previousEmails, previousEmailDetail, previousKanbanEmails };
    },
    onError: (_err, newTodo, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(["emails", selectedFolder], context.previousEmails);
      }
      if (context?.previousEmailDetail) {
        queryClient.setQueryData(["email", newTodo.id], context.previousEmailDetail);
      }
      if (context?.previousKanbanEmails) {
        queryClient.setQueryData(["kanban-emails"], context.previousKanbanEmails);
      }
      toast.error("Failed to update email");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["emails", selectedFolder] });
    },
  });

  const snoozeEmailMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: Date }) =>
      apiSnoozeEmail(id, date.toISOString()),
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: ["kanban-emails"] });
      const previousKanbanEmails = queryClient.getQueryData(["kanban-emails"]);

      queryClient.setQueryData(["kanban-emails"], (old: Email[] | undefined) => {
        if (!old) return [];
        return old.map((email) => {
          if (email.id === id) {
            return { ...email, folder: "snoozed", snoozeUntil: date.toISOString() };
          }
          return email;
        });
      });

      return { previousKanbanEmails };
    },
    onError: (_err, _newTodo, context) => {
      queryClient.setQueryData(["kanban-emails"], context?.previousKanbanEmails);
      toast.error("Failed to snooze email");
    },
    onSuccess: (data) => {
      console.log("Snooze success:", data.status, data.wakeUpTime);
      toast.success("Email snoozed");
    },
  });

  // 5. Helper Functions

  const moveEmail = (emailId: string, destinationFolder: string) => {
    const addLabels: string[] = [];
    const removeLabels: string[] = [];

    if (destinationFolder === "todo") {
      addLabels.push("STARRED");
    } else if (destinationFolder === "inbox") {
      addLabels.push("INBOX");
      removeLabels.push("STARRED");
    } else if (destinationFolder === "done") {
      removeLabels.push("INBOX");
      removeLabels.push("STARRED");
    }

    modifyEmailMutation.mutate({
      id: emailId,
      addLabels,
      removeLabels,
    });
  };

  const snoozeEmail = (emailId: string, date: Date) => {
    snoozeEmailMutation.mutate({ id: emailId, date });
  };



  // Redefining executeEmailAction to be more robust
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
      {
        id,
        addLabels,
        removeLabels,
      },
      {
        onSuccess: () => {
          if (successMessage) toast.success(successMessage);
        },
      }
    );
  };

  return {
    emails,
    folders,
    kanbanEmails,
    selectedEmail,
    isLoadingList,
    isLoadingKanban,
    isLoadingDetail,
    moveEmail,
    snoozeEmail,
    executeEmailAction: handleEmailAction,
  };
};
