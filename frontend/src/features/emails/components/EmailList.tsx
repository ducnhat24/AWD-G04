import { useEffect, useRef } from "react";
import { Loader2, WifiOff, RefreshCw } from "lucide-react";
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

  // 1. [LOGIC SENSOR]
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Chỉ load khi: Thấy đáy + Còn trang + Không đang load + Không lỗi
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isFetching &&
          !isError // [QUAN TRỌNG] Nếu đang lỗi thì đừng auto call nữa, đợi user bấm Retry hoặc Online lại
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
  }, [hasMore, isLoadingMore, onLoadMore, isFetching, isError]);

  // 2. [FIX QUAN TRỌNG] Logic khi có mạng lại
  useEffect(() => {
    const handleOnline = () => {
      console.log("Network back in EmailList. Force refreshing...");

      // Khi có mạng, gọi hàm Retry (Invalidate Queries) ngay lập tức
      // Để nó tính toán lại hasNextPage chuẩn xác thay vì dùng hasMore cũ kỹ
      if (onRetry) {
        onRetry();
      } else if (hasMore) {
        // Fallback nếu không có hàm onRetry
        onLoadMore();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onRetry, hasMore, onLoadMore]);

  // UI Error State (Mất mạng và danh sách rỗng)
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
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 && !isFetching ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No emails found.
          </div>
        ) : (
          <div className="flex flex-col pb-4">
            {emails.map((email) => (
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
            {/* Vẫn render div này kể cả khi !hasMore để layout ổn định, nhưng observer sẽ chặn logic */}
            <div ref={observerTarget} className="h-4 w-full shrink-0" />

            {/* [FIX UI] Nút thử lại ở cuối danh sách (nếu tải trang tiếp theo bị lỗi) */}
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

            {/* [FIX UI] Chỉ hiện "Đã hiển thị tất cả" nếu KHÔNG CÓ LỖI */}
            {!hasMore && !isError && emails.length > 0 && !isFetching && (
              <div className="p-4 text-center text-xs text-muted-foreground border-t mt-2">
                Đã hiển thị tất cả email
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
