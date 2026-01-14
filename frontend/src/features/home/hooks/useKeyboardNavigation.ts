import { useEffect, useCallback } from "react";
import type { Email } from "@/features/emails/types/email.type";

interface UseKeyboardNavigationProps {
  emails: Email[];
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
  onDelete: (id: string) => void;
  // [THÊM] Các props để xử lý Infinite Scroll bằng phím
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetching?: boolean;

  disabled?: boolean;
}

export const useKeyboardNavigation = ({
  emails,
  selectedEmailId,
  setSelectedEmailId,
  onDelete,
  // [THÊM] Default values
  onLoadMore,
  hasMore = false,
  isFetching = false,

  disabled = false,
}: UseKeyboardNavigationProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled || emails.length === 0) return;

      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);

      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();

          // Logic mới: Xử lý khi ở cuối danh sách
          if (currentIndex === emails.length - 1) {
            // Nếu còn dữ liệu và chưa đang tải -> Gọi load more
            if (hasMore && onLoadMore && !isFetching) {
              console.log("Keyboard: Reached bottom, loading more...");
              onLoadMore();
              // Return luôn để KHÔNG quay về đầu, giữ nguyên vị trí ở cuối
              // Khi data mới về, người dùng bấm xuống lần nữa sẽ qua item mới
              return;
            }

            // Nếu hết dữ liệu thật sự -> Quay về đầu
            if (!hasMore) {
              setSelectedEmailId(emails[0].id);
            }
            // Nếu đang fetching thì đứng yên đợi
          } else {
            // Trường hợp bình thường -> Chọn item tiếp theo
            const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;
            setSelectedEmailId(emails[nextIndex].id);
          }
          break;

        case "ArrowUp":
        case "k":
          e.preventDefault();
          const prevIndex =
            currentIndex <= 0 ? emails.length - 1 : currentIndex - 1;
          setSelectedEmailId(emails[prevIndex].id);
          break;

        case "Delete":
        case "Backspace":
          if (selectedEmailId) {
            e.preventDefault();
            onDelete(selectedEmailId);
            const nextAfterDelete =
              currentIndex < emails.length - 1
                ? emails[currentIndex + 1]
                : emails[currentIndex - 1];

            if (nextAfterDelete) {
              setSelectedEmailId(nextAfterDelete.id);
            } else {
              setSelectedEmailId(null);
            }
          }
          break;

        case "Escape":
          if (selectedEmailId) {
            e.preventDefault();
            setSelectedEmailId(null);
          }
          break;
      }
    },
    [
      emails,
      selectedEmailId,
      setSelectedEmailId,
      onDelete,
      disabled,
      onLoadMore,
      hasMore,
      isFetching,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
