// src/services/snooze.service.ts
import { http } from "../../../services/http.client";
import type { Email } from "../types/email.type";

export interface SnoozeResponse {
  userId: string;
  messageId: string;
  wakeUpTime: string;
  status: string;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export const snoozeEmail = async (
  id: string,
  date: string
): Promise<SnoozeResponse> => {
  const { data } = await http.post("/snooze", {
    messageId: id,
    wakeUpTime: date,
  });
  return data;
};

export const fetchSnoozedEmails = async (
  pageParam: number = 1,
  limit: number = 10
): Promise<{ emails: Email[]; nextPageToken?: number; total?: number }> => {
  try {
    const { data: response } = await http.get("/snooze", {
      params: { page: pageParam, limit },
    });

    const rawEmails = response.data || [];
    const meta = response.meta || {};

    const emails: Email[] = (rawEmails as unknown[]).map((item) => {
      const emailItem = item as Record<string, unknown>;
      return {
        id: (emailItem.id || emailItem.messageId) as string,
        sender: (emailItem.sender as string) || "Unknown",
        senderEmail: (emailItem.sender as string) || "",
        recipient: "Me",
        recipientEmail: "me@example.com",
        subject: (emailItem.subject as string) || "(No Subject)",
        preview: (emailItem.snippet as string) || "",
        body: (emailItem.snippet as string) || "",
        timestamp: (emailItem.date as string) || new Date().toISOString(),
        isRead: true,
        isStarred: false,
        folder: "snoozed",
        avatarColor: "bg-yellow-500",
        attachments: [],
        snoozeUntil: (emailItem.snoozeInfo as Record<string, unknown> | undefined)?.wakeUpTime as string | undefined,
      };
    });

    const nextPageToken =
      rawEmails.length === limit
        ? meta.page
          ? meta.page + 1
          : pageParam + 1
        : undefined;

    return {
      emails,
      nextPageToken,
      total: meta.total,
    };
  } catch (error) {
    console.error("Error fetching snoozed emails:", error);
    return { emails: [] };
  }
};
