import { Button } from "@/components/ui/button";
import {
  Reply,
  Trash2,
  Star,
  Mail,
  MailOpen,
  Inbox,
  Paperclip,
  Download,
  Forward,
  WifiOff,
  X,
  ExternalLink, // Import ExternalLink icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAttachment } from "@/features/emails/services/email.api";
import { toast } from "sonner";
import { SafeHTML } from "@/components/ui/SafeHTML";
import { useAuthStore } from "@/stores/auth.store";
import type { Attachment } from "@/features/emails/types/email.type";
import { useEmailDetailQuery } from "../services/email.query";

interface EmailDetailProps {
  emailId: string | null;
  onClose: () => void;
  onAction: (
    action: "toggleRead" | "delete" | "star" | "reply" | "forward"
  ) => void;
}

export function EmailDetail({ emailId, onClose, onAction }: EmailDetailProps) {
  const user = useAuthStore((state) => state.user);

  // 1. Hook to fetch data
  const { data: email, isLoading, isError } = useEmailDetailQuery(emailId);

  const handleDownloadAttachment = async (attachment: Attachment) => {
    if (!email) return;
    if (!attachment.id) {
      toast.error("Cannot download: Attachment ID is missing");
      return;
    }
    try {
      const blob = await fetchAttachment(email.id, attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloaded ${attachment.filename}`);
    } catch (error) {
      console.error("Failed to download attachment", error);
      toast.error("Failed to download attachment. Check your connection.");
    }
  };

  // --- CASE 1: No Email Selected ---
  if (!emailId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Inbox className="size-8" />
        </div>
        <h3 className="text-lg font-semibold">Select an email to view</h3>
        <p>Choose an item from the list to see details.</p>
      </div>
    );
  }

  // --- CASE 2: Loading ---
  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <p>Loading email content...</p>
      </div>
    );
  }

  // --- CASE 3: Error (Offline & No Cache) ---
  if (isError || !email) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={onClose}
        >
          <X className="size-5" />
        </Button>

        <div className="bg-red-100 p-4 rounded-full dark:bg-red-900/30">
          <WifiOff className="w-10 h-10 text-red-500" />
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Connection Failed
        </h3>

        <p className="text-gray-500 max-w-xs dark:text-gray-400">
          Email details not available offline. Please connect to the internet to
          view this email.
        </p>

        <Button onClick={onClose} variant="outline" className="mt-4">
          Back to list
        </Button>
      </div>
    );
  }

  // --- CASE 4: Success ---
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={email.isRead ? "Mark as unread" : "Mark as read"}
            onClick={() => onAction("toggleRead")}
          >
            {email.isRead ? (
              <Mail className="size-4" />
            ) : (
              <MailOpen className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Delete"
            onClick={() => onAction("delete")}
          >
            <Trash2 className="size-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            variant="ghost"
            size="icon"
            title="Reply"
            onClick={() => onAction("reply")}
          >
            <Reply className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Forward"
            onClick={() => onAction("forward")}
          >
            <Forward className="size-4" />
          </Button>
          {/* New: Open in Gmail Button */}
          <Button
            variant="ghost"
            size="icon"
            title="Open in Gmail"
            onClick={() =>
              window.open(
                `https://mail.google.com/mail/u/0/#all/${email.id}`,
                "_blank"
              )
            }
          >
            <ExternalLink className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onAction("star")}>
            <Star
              className={cn(
                "size-4",
                email.isStarred ? "fill-yellow-400 text-yellow-400" : ""
              )}
            />
          </Button>
        </div>
      </div>

      {/* Content Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex items-center justify-center size-10 rounded-full text-white font-bold shrink-0 ${
                email.avatarColor || "bg-gray-500"
              }`}
            >
              {email.sender[0]?.toUpperCase()}
            </div>
            <div className="grid gap-1">
              <div className="font-semibold">{email.sender}</div>
              <div className="line-clamp-1 text-xs text-muted-foreground break-all">
                {email.senderEmail}
              </div>
              <div className="line-clamp-1 text-xs text-muted-foreground">
                To:{" "}
                <span className="text-foreground">
                  {user &&
                  (email.recipientEmail === user.email ||
                    email.recipient === user.email)
                    ? "Me"
                    : email.recipient || email.recipientEmail || "Me"}
                </span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">
            {email.timestamp}
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4 break-words">{email.subject}</h1>

        <SafeHTML
          html={email.body}
          className="text-sm text-foreground max-w-none prose dark:prose-invert"
        />

        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="size-4" />
              Attachments ({email.attachments.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-background p-2 rounded border">
                      <Paperclip className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        title={att.filename}
                      >
                        {att.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(att.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleDownloadAttachment(att)}
                    title="Download"
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-background">
        <div className="text-sm text-muted-foreground">
          Click here to{" "}
          <span
            className="text-blue-500 cursor-pointer font-medium hover:underline"
            onClick={() => onAction("reply")}
          >
            Reply
          </span>{" "}
          or{" "}
          <span
            className="text-blue-500 cursor-pointer font-medium hover:underline"
            onClick={() => onAction("forward")}
          >
            Forward
          </span>
        </div>
      </div>
    </div>
  );
}
