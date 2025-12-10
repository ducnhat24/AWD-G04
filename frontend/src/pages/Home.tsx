// src/pages/Home.tsx
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { EmailList } from "@/components/dashboard/EmailList";
import { EmailDetail } from "@/components/dashboard/EmailDetail";
import { EmailDetailDialog } from "@/components/dashboard/EmailDetailDialog";
import { ComposeEmail } from "@/components/dashboard/ComposeEmail";
import { SnoozeDialog } from "@/components/dashboard/SnoozeDialog";
import { useAuth } from "@/contexts/AuthContext";
import { type Email } from "@/data/mockData";
import { KanbanBoard } from "@/components/dashboard/KanbanBoard";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { useEmailLogic } from "@/hooks/useEmailLogic";

export default function HomePage() {
  const { logout } = useAuth();

  // Dashboard State
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<"compose" | "reply" | "forward">("compose");
  const [composeOriginalEmail, setComposeOriginalEmail] = useState<Email | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => (localStorage.getItem("viewMode") as "list" | "kanban") || "list");
  const [isKanbanDetailOpen, setIsKanbanDetailOpen] = useState(false);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  // Custom Hook for Business Logic
  const {
    emails,
    folders,
    kanbanEmails,
    selectedEmail,
    isLoadingList,
    isLoadingKanban,
    isLoadingDetail,
    moveEmail,
    snoozeEmail,
    executeEmailAction,
  } = useEmailLogic({
    selectedFolder,
    selectedEmailId,
    viewMode,
  });

  // UI Handlers
  const handleSnooze = (emailId: string, date: Date) => {
    snoozeEmail(emailId, date);
    setIsSnoozeOpen(false);
    setSnoozeTargetId(null);
  };

  const handleOpenMail = (emailId: string) => {
    setSelectedEmailId(emailId);
    setIsKanbanDetailOpen(true);

    const email = kanbanEmails.find((e: any) => e.id === emailId);
    if (email && !email.isRead) {
      executeEmailAction("markAsRead", { id: emailId, email });
    }
  };

  const handleMoveEmail = (emailId: string, _sourceFolder: string, destinationFolder: string) => {
    if (destinationFolder === "snoozed") {
      setSnoozeTargetId(emailId);
      setIsSnoozeOpen(true);
      return;
    }
    moveEmail(emailId, destinationFolder);
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    const email = emails.find((e: any) => e.id === id);
    if (email && !email.isRead) {
      executeEmailAction("markAsRead", { id, email });
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

    executeEmailAction(action, { id: selectedEmailId, email: selectedEmail });

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
          folders={folders}
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
                  onSnooze={(id) => {
                    setSnoozeTargetId(id);
                    setIsSnoozeOpen(true);
                  }}
                  onOpenMail={handleOpenMail}
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
                {isLoadingList ? (
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

      {/* Dialogs */}
      <SnoozeDialog
        isOpen={isSnoozeOpen}
        onClose={() => {
          setIsSnoozeOpen(false);
          setSnoozeTargetId(null);
        }}
        onSnooze={(date) => {
          if (snoozeTargetId) {
            handleSnooze(snoozeTargetId, date);
          }
        }}
      />

      {/* KANBAN EMAIL DETAIL MODAL */}
      <EmailDetailDialog
        isOpen={isKanbanDetailOpen}
        onClose={() => {
          setIsKanbanDetailOpen(false);
          setSelectedEmailId(null);
        }}
        email={selectedEmail}
        isLoading={isLoadingDetail}
        onAction={handleEmailAction}
      />
    </div>
  );
}
