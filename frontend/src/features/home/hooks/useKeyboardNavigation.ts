import { useEffect, useCallback } from "react";
import type { Email } from "@/features/emails/types/email.type";

interface UseKeyboardNavigationProps {
  emails: Email[];
  selectedEmailId: string | null;
  setSelectedEmailId: (id: string | null) => void;
  onDelete: (id: string) => void;
  onMarkAsRead: (id: string) => void; // Tùy chọn: Đánh dấu đã đọc bằng phím tắt
  disabled?: boolean;
}

export const useKeyboardNavigation = ({
  emails,
  selectedEmailId,
  setSelectedEmailId,
  onDelete,
  disabled = false,
}: UseKeyboardNavigationProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Nếu đang bị disable hoặc danh sách rỗng thì không làm gì cả
      if (disabled || emails.length === 0) return;

      // Bỏ qua nếu người dùng đang gõ trong ô input hoặc textarea
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const currentIndex = emails.findIndex((e) => e.id === selectedEmailId);

      switch (e.key) {
        // Phím Xuống hoặc 'j' (kiểu Vim)
        case "ArrowDown":
        case "j":
          e.preventDefault(); // Ngăn trang web tự cuộn
          const nextIndex =
            currentIndex === -1 || currentIndex === emails.length - 1
              ? 0 // Nếu đang ở cuối hoặc chưa chọn gì -> Về đầu
              : currentIndex + 1;
          setSelectedEmailId(emails[nextIndex].id);
          break;

        // Phím Lên hoặc 'k' (kiểu Vim)
        case "ArrowUp":
        case "k":
          e.preventDefault();
          const prevIndex =
            currentIndex <= 0
              ? emails.length - 1 // Nếu đang ở đầu -> Nhảy xuống cuối
              : currentIndex - 1;
          setSelectedEmailId(emails[prevIndex].id);
          break;

        // Phím Delete hoặc Backspace để xóa
        case "Delete":
        case "Backspace":
          if (selectedEmailId) {
            e.preventDefault();
            onDelete(selectedEmailId);

            // Tự động chọn email tiếp theo sau khi xóa
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

        // Phím Esc để bỏ chọn
        case "Escape":
          if (selectedEmailId) {
            e.preventDefault();
            setSelectedEmailId(null);
          }
          break;
      }
    },
    [emails, selectedEmailId, setSelectedEmailId, onDelete, disabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
