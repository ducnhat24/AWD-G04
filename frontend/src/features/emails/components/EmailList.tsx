import { useEffect, useRef, useState } from "react";
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
  isFetching?: boolean; // [THÊM] Prop này để biết Query có đang chạy ngầm không
  isError?: boolean; // [THÊM] Để hiển thị nút Retry
  onRetry?: () => void; // [THÊM] Hàm retry
}

export function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  onLoadMore,
  hasMore,
  isLoadingMore,
  isFetching = false, // Mặc định false nếu không truyền
  isError = false,
  onRetry,
}: EmailListProps) {
  const user = useAuthStore((state) => state.user);
  const observerTarget = useRef<HTMLDivElement>(null);
  const [observerKey, setObserverKey] = useState(0);

  // [LOGIC SENSOR]
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Điều kiện load: Thấy đáy + Còn trang + Không đang load trang mới + Không đang fetch ngầm
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isFetching
        ) {
          console.log("Observer Triggered: Loading more...");
          onLoadMore();
        }
      },
      { threshold: 0.1 } // Nhạy hơn chút (10% hiện ra là gọi luôn)
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore, isFetching]); // [QUAN TRỌNG] Thêm isFetching vào dependency

  useEffect(() => {
    const handleOnline = () => {
      console.log("Online again → reset observer");
      setObserverKey((k) => k + 1);
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

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
            {" "}
            {/* Thêm padding bottom */}
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                onClick={onSelectEmail}
                currentUserEmail={user?.email}
              />
            ))}
            {/* Loading Indicator (Cuối trang) */}
            {(isLoadingMore || isFetching) && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* Infinite Scroll Trigger (Luôn render nhưng ẩn đi nếu đang load để tránh gọi kép) */}
            {!isLoadingMore && !isFetching && hasMore && !isError && (
              <div
                ref={observerTarget}
                key={observerKey}
                className="h-4 w-full shrink-0"
              />
            )}
            {/* End of list message */}
            {!hasMore && emails.length > 0 && (
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
