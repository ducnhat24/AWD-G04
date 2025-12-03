import type { Email, Attachment } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Reply, Trash2, MoreVertical, Star, Mail, MailOpen, Inbox, Paperclip, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchAttachment } from "@/services/apiService";
import { toast } from "sonner";

interface EmailDetailProps {
  email: Email | null;
  onAction: (action: "toggleRead" | "delete" | "star" | "reply") => void;
}

export function EmailDetail({ email, onAction }: EmailDetailProps) {
  const handleDownloadAttachment = async (attachment: Attachment) => {
    if (!email) return;
    if (!attachment.id) {
      toast.error("Cannot download: Attachment ID is missing");
      return;
    }
    try {
      const blob = await fetchAttachment(email.id, attachment.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Downloaded ${attachment.filename}`);
    } catch (error) {
      console.error("Failed to download attachment", error);
      toast.error("Failed to download attachment");
    }
  };

  if (!email) {
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

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
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
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAction("star")}
          >
            <Star
              className={cn(
                "size-4",
                email.isStarred ? "fill-yellow-400 text-yellow-400" : ""
              )}
            />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar Placeholder */}
            <div className={`flex items-center justify-center size-10 rounded-full text-white font-bold ${email.avatarColor || 'bg-gray-500'}`}>
                {email.sender[0]}
            </div>
            <div className="grid gap-1">
              <div className="font-semibold">{email.sender}</div>
              <div className="line-clamp-1 text-xs text-muted-foreground">
                {email.senderEmail}
              </div>
              <div className="line-clamp-1 text-xs text-muted-foreground">
                 To: <span className="text-foreground">Me</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {email.timestamp}
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">{email.subject}</h1>
        
        {/* Email Body */}
        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: email.body }} />
        </div>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="size-4" />
              Attachments ({email.attachments.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {email.attachments.map((att) => (
                <div key={att.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-background p-2 rounded border">
                      <Paperclip className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={att.filename}>{att.filename}</p>
                      <p className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(1)} KB</p>
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
        
        {/* Reply Area Mockup */}
        <div className="mt-8 pt-6 border-t">
           <div className="text-sm text-muted-foreground mb-2">
             Click here to <span className="text-blue-500 cursor-pointer font-medium hover:underline">Reply</span> or <span className="text-blue-500 cursor-pointer font-medium hover:underline">Forward</span>
           </div>
        </div>
      </div>
    </div>
  );
}