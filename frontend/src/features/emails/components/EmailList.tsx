import { useEffect, useRef, useState, useMemo } from "react";
import { Loader2, WifiOff, RefreshCw, ArrowUpDown } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import type { Email } from "@/features/emails/types/email.type";
import { EmailListItem } from "./EmailListItem";
import { Button } from "@/components/ui/button";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isFetching = false,
  isError = false,
  onRetry,
}: EmailListProps) {
  const user = useAuthStore((state) => state.user);
  const observerTarget = useRef<HTMLDivElement>(null);

  // --- 1. Sorting & Filtering State ---
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterHasAttachments, setFilterHasAttachments] = useState(false);

  // --- 2. Data Processing (Memoized) ---
  const processedEmails = useMemo(() => {
    let processed = [...emails];

    // Filter
    if (filterUnread) {
      processed = processed.filter((e) => !e.isRead);
    }
    if (filterHasAttachments) {
      processed = processed.filter(
        (e) => e.attachments && e.attachments.length > 0
      );
    }

    // Sort
    processed.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });

    return processed;
  }, [emails, filterUnread, filterHasAttachments, sortBy]);

  // Handle logic for Infinite Scroll with Filters
  // Similar to Kanban: Disable auto-load-more when filters are active to avoid mixed states
  const isFiltering = filterUnread || filterHasAttachments;
  const effectiveHasMore = !isFiltering && hasMore;

  // --- 3. [LOGIC SENSOR] ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Only load when: Seen bottom + Has more (and not filtering) + Not loading + Not fetching + Not error
        if (
          entries[0].isIntersecting &&
          effectiveHasMore &&
          !isLoadingMore &&
          !isFetching &&
          !isError // [IMPORTANT] If error, don't auto call, wait for Retry
        ) {
          console.log("Observer Triggered: Loading more...");
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [effectiveHasMore, isLoadingMore, onLoadMore, isFetching, isError]);

  // 4. [FIX IMPORTANT] Logic when network is back
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network back in EmailList. Force refreshing...");

      // When online, call Retry (Invalidate Queries) immediately
      if (onRetry) {
        onRetry();
      } else if (hasMore) {
        onLoadMore();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onRetry, hasMore, onLoadMore]);

  // UI Error State (Offline and Empty List)
  if (isError && emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 border-r">
        <div className="bg-red-100 p-4 rounded-full dark:bg-red-900/30">
          <WifiOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Mất kết nối</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Không tải được danh sách email.
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Thử lại
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* --- Toolbar: Sort & Filter --- */}
      <div className="flex flex-col gap-3 p-4 border-b bg-muted/10 shrink-0">
        <div className="flex justify-between">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterUnread}
                onChange={(e) => setFilterUnread(e.target.checked)}
                className="rounded border-gray-300 w-3.5 h-3.5 text-primary focus:ring-primary"
              />
              Unread
            </label>
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterHasAttachments}
                onChange={(e) => setFilterHasAttachments(e.target.checked)}
                className="rounded border-gray-300 w-3.5 h-3.5 text-primary focus:ring-primary"
              />
              Attachments
            </label>
          </div>

          <div className="flex items-center gap-1 bg-background border rounded-md px-2 py-1 shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="bg-transparent text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Email List --- */}
      <div className="flex-1 overflow-y-auto">
        {processedEmails.length === 0 && !isFetching ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            {emails.length > 0
              ? "No emails match your filters."
              : "No emails found."}
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {processedEmails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                onClick={onSelectEmail}
                currentUserEmail={user?.email}
              />
            ))}

            {/* Loading Indicator */}
            {(isLoadingMore || isFetching) && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-4 w-full shrink-0" />

            {/* [FIX UI] Retry Button */}
            {isError && emails.length > 0 && (
              <div className="p-4 flex justify-center border-t mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tải thêm thất bại - Thử lại
                </Button>
              </div>
            )}

            {/* [FIX UI] "All Loaded" Message */}
            {!effectiveHasMore &&
              !isError &&
              processedEmails.length > 0 &&
              !isFetching && (
                <div className="p-4 text-center text-xs text-muted-foreground border-t mt-2">
                  {isFiltering
                    ? "Filtered results shown"
                    : "Đã hiển thị tất cả email"}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
