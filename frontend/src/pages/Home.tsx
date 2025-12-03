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
} from "@/services/apiService";
import { type Email } from "@/data/mockData";

export default function HomePage() {
  const { logout } = useAuth();

  // Dashboard State
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose");
  const [composeOriginalEmail, setComposeOriginalEmail] = useState<Email | null>(null);

  // 1. Fetch Emails bằng React Query (Thay vì filter tĩnh)
  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["emails", selectedFolder], // Key thay đổi thì fetch lại
    queryFn: () => fetchEmails(selectedFolder),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: folders = [] } = useQuery({
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

      const previousEmails = queryClient.getQueryData(["emails", selectedFolder]);
      const previousEmailDetail = queryClient.getQueryData(["email", id]);

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

      return { previousEmails, previousEmailDetail };
    },
    onError: (_err, _newTodo, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(
          ["emails", selectedFolder],
          context.previousEmails
        );
      }
      if (context?.previousEmailDetail) {
        queryClient.setQueryData(
          ["email", _newTodo.id],
          context.previousEmailDetail
        );
      }
      toast.error("Failed to perform action");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["email"] });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

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
      <aside className="hidden md:flex w-64 flex-col shrink-0 border-r">
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
          <EmailDetail email={selectedEmail} onAction={handleEmailAction} />
        )}
      </main>

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
