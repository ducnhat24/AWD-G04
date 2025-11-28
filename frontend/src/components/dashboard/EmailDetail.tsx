import type { Email } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Reply, Trash2, MoreVertical, Star, Archive, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailDetailProps {
  email: Email | null;
}

export function EmailDetail({ email }: EmailDetailProps) {
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
          <Button variant="ghost" size="icon" title="Archive">
            <Archive className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Delete">
            <Trash2 className="size-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button variant="ghost" size="icon" title="Reply">
            <Reply className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon">
             <Star className={cn("size-4", email.isStarred ? "fill-yellow-400 text-yellow-400" : "")} />
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