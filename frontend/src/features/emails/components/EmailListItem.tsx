import { memo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Email } from "@/features/emails/types/email.type";

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  currentUserEmail?: string;
  onClick: (id: string) => void;
}

export const EmailListItem = memo(function EmailListItem({
  email,
  isSelected,
  currentUserEmail,
  onClick,
}: EmailListItemProps) {
  // Logic hiển thị tên người gửi/nhận đã được tách ra khỏi JSX cho gọn
  const isSentFolder = email.folder.toLowerCase() === "sent";
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // Giúp danh sách không bị nhảy loạn xạ
      });
    }
  }, [isSelected]);

  const getDisplayName = () => {
    if (isSentFolder && email.recipient) {
      const isMe =
        currentUserEmail &&
        (email.recipientEmail === currentUserEmail ||
          email.recipient === currentUserEmail);
      return `To: ${isMe ? "Me" : email.recipient}`;
    }

    const isMe =
      currentUserEmail &&
      (email.senderEmail === currentUserEmail ||
        email.sender === currentUserEmail);
    return isMe ? "Me" : email.sender;
  };

  return (
    <button
      ref={itemRef}
      onClick={() => onClick(email.id)}
      className={cn(
        "flex flex-col items-start gap-2 p-4 text-left border-b transition-colors hover:bg-muted/50 w-full",
        isSelected ? "bg-muted" : "bg-background",
        !email.isRead && "font-semibold"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-[180px]">
            {getDisplayName()}
          </span>
          {!email.isRead && (
            <span className="flex size-2 rounded-full bg-blue-600 shrink-0" />
          )}
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
          {email.timestamp}
        </span>
      </div>

      <div className="text-sm font-medium leading-none truncate w-full">
        {email.subject}
      </div>

      <div className="line-clamp-2 text-xs text-muted-foreground w-full">
        {email.preview}
      </div>

      <div className="flex items-center gap-2 mt-1">
        {email.isStarred && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
            Important
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize font-medium">
          {email.folder}
        </span>
      </div>
    </button>
  );
});
