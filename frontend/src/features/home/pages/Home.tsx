// src/pages/Home.tsx
import { useState, useEffect } from "react";
import { EmailList } from "@/features/home/components/EmailList";
import { EmailDetail } from "@/features/home/components/EmailDetail";
import { type Email } from "@/data/mockData";
import { KanbanBoard } from "@/features/home/components/KanbanBoard";
import { KanbanCard } from "@/features/home/components/KanbanCard";
import { ArrowLeft } from "lucide-react";
import { useEmailLogic } from "@/features/home/hooks/useEmailLogic";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { DashboardModals } from "@/features/home/components/DashboardModals";
import { KanbanProvider } from "@/contexts/KanbanContext";

export default function HomePage() {
  // Dashboard State
  const [selectedFolder, setSelectedFolder] = useState<string>("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<
    "compose" | "reply" | "forward"
  >("compose");
  const [composeOriginalEmail, setComposeOriginalEmail] =
    useState<Email | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">(
    () => (localStorage.getItem("viewMode") as "list" | "kanban") || "list"
  );
  const [isKanbanDetailOpen, setIsKanbanDetailOpen] = useState(false);
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);
  const [snoozeSourceFolder, setSnoozeSourceFolder] = useState<
    string | undefined
  >(undefined);

  // Search State
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<
    "all" | "unread" | "has_attachment"
  >("all");

  useEffect(() => {
    localStorage.setItem("viewMode", viewMode);
  }, [viewMode]);

  // Custom Hook for Business Logic
  const {
    emails,
    fetchNextList,
    hasNextList,
    isFetchingNextList,
    folders,
    kanbanData,
    selectedEmail,
    isLoadingList,
    isLoadingKanban,
    isLoadingDetail,
    moveEmail,
    snoozeEmail,
    executeEmailAction,
    searchResults,
    isLoadingSearch,
    searchError,
  } = useEmailLogic({
    selectedFolder,
    selectedEmailId,
    viewMode,
    searchQuery: activeSearchQuery,
  });

  const handleSearch = () => {
    if (searchInput.trim()) {
      setActiveSearchQuery(searchInput);
      setSearchFilter("all");
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearchQuery("");
    setSearchFilter("all");
  };

  // UI Handlers
  const handleSnooze = (emailId: string, date: Date, sourceFolder?: string) => {
    const folder = sourceFolder || snoozeSourceFolder;
    snoozeEmail(emailId, date, folder);
    setIsSnoozeOpen(false);
    setSnoozeTargetId(null);
    setSnoozeSourceFolder(undefined);
  };

  const handleOpenMail = (emailId: string) => {
    setSelectedEmailId(emailId);
    setIsKanbanDetailOpen(true);

    const allKanbanEmails = [
      ...kanbanData.inbox.emails,
      ...kanbanData.todo.emails,
      ...kanbanData.done.emails,
      ...kanbanData.snoozed.emails,
    ];
    const email = allKanbanEmails.find((e: any) => e.id === emailId);
    if (email && !email.isRead) {
      executeEmailAction("markAsRead", { id: emailId, email });
    }
  };

  const handleMoveEmail = (
    emailId: string,
    sourceFolder: string,
    destinationFolder: string
  ) => {
    if (destinationFolder === "snoozed") {
      setSnoozeTargetId(emailId);
      setSnoozeSourceFolder(sourceFolder);
      setIsSnoozeOpen(true);
      return;
    }
    moveEmail(emailId, destinationFolder, sourceFolder);
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
      setIsKanbanDetailOpen(false);
      setSelectedEmailId(null);
    }
  };

  return (
    <>
      <DashboardLayout
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
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
      >
        {/* Content */}
        {activeSearchQuery ? (
          <div className="flex-1 p-4 overflow-y-auto bg-muted/10">
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={handleClearSearch}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Board
                </Button>
                <h2 className="text-lg font-semibold">
                  Search Results for "{activeSearchQuery}"
                </h2>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-muted-foreground">Filter:</span>
                <Button
                  variant={searchFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={searchFilter === "unread" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSearchFilter("unread")}
                >
                  Unread
                </Button>
                <Button
                  variant={
                    searchFilter === "has_attachment" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setSearchFilter("has_attachment")}
                >
                  Has Attachment
                </Button>
              </div>
            </div>

            {isLoadingSearch ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Searching...
              </div>
            ) : searchError ? (
              <div className="flex items-center justify-center h-64 text-red-500">
                Error searching emails.
              </div>
            ) : (
              <KanbanProvider
                onMoveEmail={handleMoveEmail}
                onSnooze={handleSnooze}
                onOpenMail={handleOpenMail}
              >
                <div className="flex flex-col gap-4 max-w-3xl mx-auto">
                  {searchResults
                    .filter((email) => {
                      if (searchFilter === "unread") return !email.isRead;
                      if (searchFilter === "has_attachment")
                        return (
                          email.attachments && email.attachments.length > 0
                        );
                      return true;
                    })
                    .map((email, index) => (
                      <KanbanCard
                        key={email.id}
                        email={email}
                        index={index}
                        isDraggable={false}
                      />
                    ))}
                  {searchResults.filter((email) => {
                    if (searchFilter === "unread") return !email.isRead;
                    if (searchFilter === "has_attachment")
                      return email.attachments && email.attachments.length > 0;
                    return true;
                  }).length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-8">
                      No results found.
                    </div>
                  )}
                </div>
              </KanbanProvider>
            )}
          </div>
        ) : viewMode === "kanban" ? (
          <div className="flex-1 p-4 overflow-hidden bg-muted/10">
            {isLoadingKanban ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading Kanban...
              </div>
            ) : (
              <KanbanProvider
                onMoveEmail={handleMoveEmail}
                onSnooze={(id, date) => {
                  if (date) {
                    handleSnooze(id, date);
                  } else {
                    setSnoozeTargetId(id);
                    setIsSnoozeOpen(true);
                  }
                }}
                onOpenMail={handleOpenMail}
              >
                <KanbanBoard kanbanData={kanbanData} />
              </KanbanProvider>
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
                  onLoadMore={fetchNextList}
                  hasMore={hasNextList}
                  isLoadingMore={isFetchingNextList}
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
      </DashboardLayout>

      <DashboardModals
        isComposeOpen={isComposeOpen}
        composeMode={composeMode}
        composeOriginalEmail={composeOriginalEmail}
        onCloseCompose={() => setIsComposeOpen(false)}
        isSnoozeOpen={isSnoozeOpen}
        onCloseSnooze={() => {
          setIsSnoozeOpen(false);
          setSnoozeTargetId(null);
        }}
        onSnooze={(date) => {
          if (snoozeTargetId) {
            handleSnooze(snoozeTargetId, date);
          }
        }}
        isKanbanDetailOpen={isKanbanDetailOpen}
        onCloseKanbanDetail={() => {
          setIsKanbanDetailOpen(false);
          setSelectedEmailId(null);
        }}
        selectedEmail={selectedEmail}
        isLoadingDetail={isLoadingDetail}
        onEmailAction={handleEmailAction}
      />
    </>
  );
}
