import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import type { Email } from "@/features/emails/types/email.type";
import { EmailListItem } from "./EmailListItem"; // Import component mới

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function EmailList({
  emails,
  selectedEmailId,
  onSelectEmail,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: EmailListProps) {
  const user = useAuthStore((state) => state.user);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
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
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="flex flex-col h-full border-r bg-background">
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No emails found.
          </div>
        ) : (
          <div className="flex flex-col">
            {emails.map((email) => (
              <EmailListItem
                key={email.id}
                email={email}
                isSelected={selectedEmailId === email.id}
                onClick={onSelectEmail}
                currentUserEmail={user?.email}
              />
            ))}

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="h-4 w-full shrink-0" />

            {isLoadingMore && (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
