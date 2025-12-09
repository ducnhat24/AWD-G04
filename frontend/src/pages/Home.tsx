// src/pages/Home.tsx
import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { EmailList } from "@/components/dashboard/EmailList";
import { EmailDetail } from "@/components/dashboard/EmailDetail";
import { ComposeEmail } from "@/components/dashboard/ComposeEmail";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchEmails,
  fetchMailboxes,
  fetchEmailDetail,
  modifyEmail,
  snoozeEmail,
} from "@/services/apiService";
import { type Email } from "@/data/mockData";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

export default function HomePage() {
  const { logout } = useAuth();

  // Dashboard State
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose");
  const [composeOriginalEmail, setComposeOriginalEmail] = useState<Email | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // 1. Fetch Emails bằng React Query (Thay vì filter tĩnh)
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", selectedFolder], // Key thay đổi thì fetch lại
    queryFn: () => fetchEmails(selectedFolder),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: folders = [] } = useQuery<{ id: string; label: string; icon: string }[]>({
    queryKey: ["mailboxes"],
    queryFn: fetchMailboxes,
    refetchOnWindowFocus: false,
  });

  // 2. Tìm email đang chọn trong danh sách đã fetch
  const { data: selectedEmail = null, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["email", selectedEmailId],
    queryFn: () => fetchEmailDetail(selectedEmailId!),
    enabled: !!selectedEmailId, // Chỉ gọi API khi có ID được chọn
    refetchOnWindowFocus: false,
  });

  const { data: kanbanEmails = [], isLoading: isLoadingKanban } = useQuery({
    queryKey: ["kanban-emails"],
    queryFn: async () => {
      const [inbox, starred, archive] = await Promise.all([
        fetchEmails("INBOX").catch(() => []),
        fetchEmails("STARRED").catch(() => []),
        fetchEmails("ARCHIVE").catch(() => []),
      ]);

      const safeInbox = Array.isArray(inbox) ? inbox.map(e => ({ ...e, folder: 'inbox' })) : [];
      const safeStarred = Array.isArray(starred) ? starred.map(e => ({ ...e, folder: 'todo' })) : [];
      const safeArchive = Array.isArray(archive) ? archive.map(e => ({ ...e, folder: 'done' })) : [];

      // Merge and deduplicate. Priority: Todo (Starred) > Inbox > Done (Archive)
      // We use a Map to store emails by ID.
      // We insert in reverse priority order so higher priority overwrites.
      const emailMap = new Map<string, Email>();

      [...safeArchive, ...safeInbox, ...safeStarred].forEach((email) => {
        // Check snooze status
        if (email.snoozeUntil) {
          const snoozeDate = new Date(email.snoozeUntil);
          if (snoozeDate > new Date()) {
            // Future snooze: Hide it
            return;
          } else {
            // Expired snooze: Restore to Inbox (or keep current folder if it's already fetched)
            // For simplicity, if it was snoozed and expired, we treat it as Inbox unless it's starred
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
  });

  const queryClient = useQueryClient();

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
      await queryClient.cancelQueries({ queryKey: ["email", id] });
      await queryClient.cancelQueries({ queryKey: ["kanban-emails"] });

      const previousEmails = queryClient.getQueryData(["emails", selectedFolder]);
      const previousEmailDetail = queryClient.getQueryData(["email", id]);
      const previousKanbanEmails = queryClient.getQueryData(["kanban-emails"]);

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
              // Optimistic update for Kanban
              let newFolder = email.folder;
              if (addLabels.includes("STARRED")) newFolder = "todo";
              else if (addLabels.includes("INBOX") && removeLabels.includes("STARRED")) newFolder = "inbox";
              else if (removeLabels.includes("INBOX") && removeLabels.includes("STARRED")) newFolder = "done";
              
              return { ...email, folder: newFolder };
            }
            return email;
          });
        });
      }

      return { previousEmails, previousEmailDetail, previousKanbanEmails };
    },
    onError: (err, newTodo, context) => {
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
      // queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  const snoozeEmailMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: Date }) =>
      snoozeEmail(id, date.toISOString()),
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: ["kanban-emails"] });
      const previousKanbanEmails = queryClient.getQueryData(["kanban-emails"]);

      queryClient.setQueryData(["kanban-emails"], (old: Email[] | undefined) => {
        if (!old) return [];
        // Optimistic update: Remove the email from the list
        return old.filter((email) => email.id !== id);
      });

      return { previousKanbanEmails };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(["kanban-emails"], context?.previousKanbanEmails);
      toast.error("Failed to snooze email");
    },
    onSuccess: () => {
      toast.success("Email snoozed");
    },
  });

  const handleSnooze = (emailId: string, date: Date) => {
    snoozeEmailMutation.mutate({ id: emailId, date });
  };



  const handleMoveEmail = (emailId: string, _sourceFolder: string, destinationFolder: string) => {
    const addLabels: string[] = [];
    const removeLabels: string[] = [];

    // Logic based on Destination Column
    if (destinationFolder === "todo") {
      // To Do -> Starred
      addLabels.push("STARRED");
    } else if (destinationFolder === "inbox") {
      // Inbox -> Add INBOX, Remove STARRED (if it was starred)
      addLabels.push("INBOX");
      removeLabels.push("STARRED");
    } else if (destinationFolder === "done") {
      // Done -> Archive (Remove INBOX), Remove STARRED
      removeLabels.push("INBOX");
      removeLabels.push("STARRED");
    }

    modifyEmailMutation.mutate({
      id: emailId,
      addLabels,
      removeLabels,
    });
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    const email = emails.find((e: any) => e.id === id);
    if (email && !email.isRead) {
      modifyEmailMutation.mutate({
        id,
        addLabels: [],
        removeLabels: ["UNREAD"],
      });
    }
  };

  const handleEmailAction = (
    action: "toggleRead" | "delete" | "star" | "reply" | "forward"
  ) => {
    if (!selectedEmailId || !selectedEmail) return;

    if (action === "reply") {
      setComposeMode("reply");
      setComposeOriginalEmail(selectedEmail);
      setIsComposeOpen(true);
      return;
    }

    if (action === "forward") {
      setComposeMode("forward");
      setComposeOriginalEmail(selectedEmail);
      setIsComposeOpen(true);
      return;
    }

    const addLabels: string[] = [];
    const removeLabels: string[] = [];
    let successMessage = "Action completed";

    switch (action) {
      case "toggleRead":
        if (selectedEmail.isRead) {
          addLabels.push("UNREAD");
          successMessage = "Marked as unread";
        } else {
          removeLabels.push("UNREAD");
          successMessage = "Marked as read";
        }
        break;
      case "delete":
        addLabels.push("TRASH");
        successMessage = "Moved to trash";
        break;
      case "star":
        if (selectedEmail.isStarred) {
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
        id: selectedEmailId,
        addLabels,
        removeLabels,
      },
      {
        onSuccess: () => {
          toast.success(successMessage);
        },
      }
    );

    if (action === "delete") {
      setSelectedEmailId(null);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* COLUMN 1: SIDEBAR */}
      <aside
        className={cn(
          "hidden md:flex w-64 flex-col shrink-0 border-r transition-all duration-300 ease-in-out",
          viewMode === "kanban" && "hidden md:hidden"
        )}
      >
        <Sidebar
          folders={folders} // <--- Truyền data API vào đây
          selectedFolder={selectedFolder}
          onSelectFolder={(id) => {
            setSelectedFolder(id);
            setSelectedEmailId(null);
          }}
          onCompose={() => {
            setComposeMode("compose");
            setComposeOriginalEmail(null);
            setIsComposeOpen(true);
          }}
        />
        <div className="p-4 border-t bg-muted/20">
          <button
            onClick={logout}
            className="text-sm font-medium text-red-600 hover:underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar with Toggle */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background shrink-0">
          <h2 className="font-semibold text-lg">
            {viewMode === "list"
              ? folders.find((f) => f.id === selectedFolder)?.label || "Inbox"
              : "Kanban Board"}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg p-1 bg-muted/20">
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  viewMode === "list"
                    ? "bg-background shadow-sm font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-3 py-1 text-sm rounded-md transition-colors",
                  viewMode === "kanban"
                    ? "bg-background shadow-sm font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Kanban
              </button>
            </div>

            {viewMode === "kanban" && (
              <button
                onClick={logout}
                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {viewMode === "kanban" ? (
            <div className="flex-1 p-4 overflow-hidden bg-muted/10">
              {isLoadingKanban ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading Kanban...
                </div>
              ) : (
                <KanbanBoard
                  emails={kanbanEmails}
                  onMoveEmail={handleMoveEmail}
                  onSnooze={handleSnooze}
                />
              )}
            </div>
          ) : (
            <>
              {/* COLUMN 2: EMAIL LIST */}
              <div
                className={`flex-1 md:flex md:w-[400px] md:flex-none flex-col border-r bg-background
                 ${selectedEmailId ? "hidden md:flex" : "flex"} 
              `}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Loading emails...
                  </div>
                ) : (
                  <EmailList
                    emails={emails}
                    selectedEmailId={selectedEmailId}
                    onSelectEmail={handleSelectEmail}
                  />
                )}
              </div>

              {/* COLUMN 3: EMAIL DETAIL */}
              <main
                className={`flex-1 flex-col bg-background
                  ${!selectedEmailId ? "hidden md:flex" : "flex"}
              `}
              >
                {selectedEmailId && (
                  <div className="md:hidden p-2 border-b flex items-center">
                    <button
                      onClick={() => setSelectedEmailId(null)}
                      className="text-sm font-medium text-blue-600 px-2 py-1"
                    >
                      &larr; Back to list
                    </button>
                  </div>
                )}
                {isLoadingDetail ? (
                  <div className="p-8 text-center">Loading detail...</div>
                ) : (
                  <EmailDetail
                    email={selectedEmail}
                    onAction={handleEmailAction}
                  />
                )}
              </main>
            </>
          )}
        </div>
      </div>

      {/* COMPOSE EMAIL MODAL */}
      {isComposeOpen && (
        <ComposeEmail 
          onClose={() => setIsComposeOpen(false)} 
          mode={composeMode}
          originalEmail={composeOriginalEmail}
        />
      )}
    </div>
  );
}
