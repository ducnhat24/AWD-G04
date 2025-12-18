// src/utils/mapper.ts
import { type Email } from "@/data/mockData";

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
    backendEmail: any,
    folderId: string = "INBOX"
): Email => {
    const { sender, senderEmail } = parseSender(backendEmail.sender || "");
    const { sender: recipient, senderEmail: recipientEmail } = parseSender(
        backendEmail.to || ""
    );

    let isRead = backendEmail.isRead;
    let isStarred = backendEmail.isStarred;

    if (backendEmail.labelIds) {
        isRead = !backendEmail.labelIds.includes("UNREAD");
        isStarred = backendEmail.labelIds.includes("STARRED");
    }

    return {
        id: backendEmail.id,
        sender,
        senderEmail,
        recipient,
        recipientEmail,
        subject: backendEmail.subject || "(No Subject)",
        preview: backendEmail.snippet || "",
        body: backendEmail.body || "",
        timestamp: backendEmail.date || "",
        isRead: isRead ?? true,
        isStarred: isStarred ?? false,
        folder: folderId,
        avatarColor: "bg-blue-500",
        attachments:
            backendEmail.attachments?.map((att: any) => ({
                id: att.id || att._id || att.body?.attachmentId || att.attachmentId,
                filename: att.filename,
                mimeType: att.mimeType,
                size: att.size || att.body?.size,
            })) || [],
    };
};

/**
 * Transform backend mailbox data to frontend mailbox type
 */
export const transformMailbox = (backendMailbox: any) => {
    let icon = "inbox";
    const lowerId = backendMailbox.id.toLowerCase();
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
