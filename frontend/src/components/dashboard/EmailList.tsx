import type { Email } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmailListProps {
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
}

export function EmailList({ emails, selectedEmailId, onSelectEmail }: EmailListProps) {
  return (
    <div className="flex flex-col h-full border-r">
      {/* Search Header */}
      <div className="p-4 border-b flex items-center gap-2">
        <div className="relative w-full">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search" className="pl-8" />
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No emails found.
          </div>
        ) : (
          <div className="flex flex-col">
            {emails.map((email) => (
              <button
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={cn(
                  "flex flex-col items-start gap-2 p-4 text-left border-b transition-colors hover:bg-muted/50",
                  selectedEmailId === email.id ? "bg-muted" : "bg-background",
                  !email.isRead && "font-semibold" // Bold if unread
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {email.folder.toLowerCase() === "sent" && email.recipient
                        ? `To: ${email.recipient}`
                        : email.sender}
                    </span>
                    {!email.isRead && (
                      <span className="flex size-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {email.timestamp}
                  </span>
                </div>
                <div className="text-sm font-medium leading-none">
                  {email.subject}
                </div>
                <div className="line-clamp-2 text-xs text-muted-foreground">
                  {email.preview}
                </div>
                <div className="flex items-center gap-2 mt-1">
                   {email.isStarred && (
                       <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Important</span>
                   )}
                   <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 capitalize">{email.folder}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}