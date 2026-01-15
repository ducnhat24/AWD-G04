export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  recipient?: string;
  recipientEmail?: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  folder: string; // e.g., "inbox", "sent", "trash"
  avatarColor?: string;
  attachments?: Attachment[];
  snoozeUntil?: string; // ISO Date string
  labelIds?: string[];
}
