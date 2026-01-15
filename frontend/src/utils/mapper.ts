// src/utils/mapper.ts

import type { Email } from "@/features/emails/types/email.type";

/**
 * Parse email header in format "Name <email>" or just "email"
 */
const parseSender = (fromHeader: string) => {
  const match = fromHeader.match(/(.*)<(.*)>/);
  if (match) {
    return {
      sender: match[1].trim().replace(/"/g, ""),
      senderEmail: match[2].trim(),
    };
  }
  return { sender: fromHeader, senderEmail: fromHeader };
};

/**
 * Transform backend email data to frontend Email type
 */
export const transformEmail = (
  backendEmail: Record<string, unknown>,
  folderId: string = "INBOX"
): Email => {
  const { sender, senderEmail } = parseSender((backendEmail.sender as string) || "");
  const { sender: recipient, senderEmail: recipientEmail } = parseSender(
    (backendEmail.to as string) || ""
  );

  let isRead = backendEmail.isRead as boolean;
  let isStarred = backendEmail.isStarred as boolean;

  if (backendEmail.labelIds && Array.isArray(backendEmail.labelIds)) {
    isRead = !(backendEmail.labelIds as string[]).includes("UNREAD");
    isStarred = (backendEmail.labelIds as string[]).includes("STARRED");
  }

  return {
    id: (backendEmail.id as string) || "",
    sender,
    senderEmail,
    recipient,
    recipientEmail,
    subject: (backendEmail.subject as string) || "(No Subject)",
    preview: (backendEmail.snippet as string) || "",
    body: (backendEmail.body as string) || "",
    timestamp: (backendEmail.date as string) || "",
    isRead: isRead ?? true,
    isStarred: isStarred ?? false,
    folder: folderId,
    avatarColor: "bg-blue-500",
    labelIds: (backendEmail.labelIds as string[]) || [],
    attachments:
      ((backendEmail.attachments as unknown[] | undefined) || []).map((att) => {
        const attachment = att as Record<string, unknown>;
        return {
          id: (attachment.id || attachment._id || (attachment.body as Record<string, unknown>)?.attachmentId || attachment.attachmentId) as string,
          filename: (attachment.filename as string) || "",
          mimeType: (attachment.mimeType as string) || "",
          size: ((attachment.size || (attachment.body as Record<string, unknown>)?.size) as number) || 0,
        };
      }),
  };
};

/**
 * Transform backend mailbox data to frontend mailbox type
 */
export const transformMailbox = (backendMailbox: Record<string, unknown>) => {
  let icon = "inbox";
  const lowerId = (backendMailbox.id as string).toLowerCase();
  if (lowerId.includes("sent")) icon = "send";
  else if (lowerId.includes("draft")) icon = "file";
  else if (lowerId.includes("star")) icon = "star";
  else if (lowerId.includes("trash")) icon = "trash";
  else if (lowerId.includes("unread")) icon = "unread";
  else if (lowerId.includes("spam") || lowerId.includes("archive"))
    icon = "archive";

  return {
    id: backendMailbox.id,
    label: backendMailbox.name,
    icon,
    unread: backendMailbox.unread,
  };
};
