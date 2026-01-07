// src/features/home/pages/Home.tsx
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";

// Components
import { EmailList } from "@/features/home/components/EmailList";
import { EmailDetail } from "@/features/home/components/EmailDetail";
import { KanbanBoard } from "@/features/home/components/KanbanBoard";
import { KanbanCard } from "@/features/home/components/KanbanCard";
import { DashboardModals } from "@/features/home/components/DashboardModals";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { LoadingOverlay } from "@/components/common/LoadingOverlay";

// Contexts & Hooks
import { KanbanProvider } from "@/contexts/KanbanContext";
import { useKanbanConfig } from "../hooks/useKanban";
import { useEmailLogic } from "../hooks/useEmailLogic";
import { useDashboardModals } from "../hooks/useDashboardModals"; // Hook mới
import { FOLDER_IDS, STORAGE_KEYS, VIEW_MODES } from "@/constants/app.constant"; // Constants mới

export default function HomePage() {
  // --- 1. Dashboard State ---
  // State cục bộ vẫn giữ ở đây vì nó điều khiển logic view chính
  const [selectedFolder, setSelectedFolder] = useState<string>(
    FOLDER_IDS.INBOX
  );
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<"list" | "kanban">(
    () =>
      (localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as "list" | "kanban") ||
      VIEW_MODES.LIST
  );

  // Search State
  const [searchInput, setSearchInput] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState<
    "all" | "unread" | "has_attachment"
  >("all");

  // --- Modal State Management (Refactored) ---
  const modals = useDashboardModals();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  // --- 2. Custom Hooks & Business Logic ---

  // Lấy cấu hình cột Kanban
  const { columns, isKanbanConfigLoading } = useKanbanConfig();

  // Logic Email chính
  const {
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
  } = useEmailLogic({
    selectedFolder,
    selectedEmailId,
    viewMode,
    searchQuery: activeSearchQuery,
    kanbanColumns: columns || [],
  });

  // --- 3. Handlers ---

  const handleSearch = (overrideQuery?: string) => {
    const queryToUse =
      typeof overrideQuery === "string" ? overrideQuery : searchInput;

    if (queryToUse.trim()) {
      setActiveSearchQuery(queryToUse);
      setSearchFilter("all");

      if (typeof overrideQuery === "string" && overrideQuery !== searchInput) {
        setSearchInput(overrideQuery);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearchQuery("");
    setSearchFilter("all");
  };

  const handleSnooze = (emailId: string, date: Date, sourceFolder?: string) => {
    const folder = sourceFolder || modals.snoozeSourceFolder;
    snoozeEmail(emailId, date, folder);
    modals.closeSnooze(); // Sử dụng hook
  };

  const handleOpenMail = (emailId: string) => {
    setSelectedEmailId(emailId);
    modals.setIsKanbanDetailOpen(true); // Sử dụng hook
  };

  const handleMoveEmail = (
    emailId: string,
    sourceFolder: string,
    destinationFolder: string
  ) => {
    console.log("handleMoveEmail called with:", {
      emailId,
      sourceFolder,
      destinationFolder,
    });
    if (destinationFolder.toUpperCase() === FOLDER_IDS.SNOOZED) {
      modals.openSnooze(emailId, sourceFolder);
      return;
    }
    moveEmail(emailId, destinationFolder, sourceFolder);
  };

  const handleSelectEmail = (id: string) => {
    setSelectedEmailId(id);
    const email = emails.find((e) => e.id === id);
    if (email && !email.isRead) {
      executeEmailAction("markAsRead", { id, email });
    }
  };

  const handleEmailAction = (
    action: "toggleRead" | "delete" | "star" | "reply" | "forward"
  ) => {
    if (!selectedEmailId || !selectedEmail) return;

    if (action === "reply") {
      modals.openCompose("reply", selectedEmail);
      return;
    }

    if (action === "forward") {
      modals.openCompose("forward", selectedEmail);
      return;
    }

    executeEmailAction(action, { id: selectedEmailId, email: selectedEmail });

    if (action === "delete") {
      modals.setIsKanbanDetailOpen(false);
      setSelectedEmailId(null);
    }
  };

  // --- 4. Render ---

  return (
    <>
      <LoadingOverlay visible={isSnoozing || isModifyingEmail} />

      <DashboardLayout
        folders={folders}
        selectedFolder={selectedFolder}
        onSelectFolder={(id) => {
          setSelectedFolder(id);
          setSelectedEmailId(null);
        }}
        // Refactored: Gọi openCompose từ hook
        onCompose={() => modals.openCompose("compose")}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
      >
        {/* === SEARCH RESULTS VIEW === */}
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
                onSnooze={(id, date) => {
                  if (date) handleSnooze(id, date);
                  else modals.openSnooze(id);
                }}
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
                        draggableId={`${email.id}::search_results`}
                        key={email.id}
                        email={email}
                        index={index}
                        columnId="search_results"
                        isDraggable={false}
                      />
                    ))}
                  {searchResults.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-8">
                      No results found.
                    </div>
                  )}
                </div>
              </KanbanProvider>
            )}
          </div>
        ) : viewMode === VIEW_MODES.KANBAN ? (
          /* === KANBAN VIEW === */
          <div className="flex-1 p-4 overflow-hidden bg-muted/10">
            {isKanbanConfigLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading Board Configuration...
              </div>
            ) : (
              <KanbanProvider
                onMoveEmail={handleMoveEmail}
                onSnooze={(id, date) => {
                  if (date) {
                    handleSnooze(id, date);
                  } else {
                    modals.openSnooze(id);
                  }
                }}
                onOpenMail={handleOpenMail}
              >
                <KanbanBoard columns={columns || []} />
              </KanbanProvider>
            )}
          </div>
        ) : (
          /* === LIST VIEW (Split Pane) === */
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
                    className="text-sm font-medium text-primary px-2 py-1"
                  >
                    &larr; Back to list
                  </button>
                </div>
              )}
              {isLoadingDetail ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading detail...
                </div>
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

      {/* === MODALS (Refactored) === */}
      <DashboardModals
        isComposeOpen={modals.isComposeOpen}
        composeMode={modals.composeMode}
        composeOriginalEmail={modals.composeOriginalEmail}
        onCloseCompose={modals.closeCompose}
        isSnoozeOpen={modals.isSnoozeOpen}
        onCloseSnooze={modals.closeSnooze}
        onSnooze={(date) => {
          if (modals.snoozeTargetId) {
            handleSnooze(modals.snoozeTargetId, date);
          }
        }}
        isKanbanDetailOpen={modals.isKanbanDetailOpen}
        onCloseKanbanDetail={() => {
          modals.setIsKanbanDetailOpen(false);
          setSelectedEmailId(null);
        }}
        selectedEmail={selectedEmail}
        isLoadingDetail={isLoadingDetail}
        onEmailAction={handleEmailAction}
      />
    </>
  );
}
