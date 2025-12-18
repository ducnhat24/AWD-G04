// src/services/snooze.service.ts
import { http } from "./http.client";
import { type Email } from "@/data/mockData";

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

        const emails: Email[] = rawEmails.map((item: any) => ({
            id: item.id || item.messageId,
            sender: item.sender || "Unknown",
            senderEmail: item.sender || "",
            recipient: "Me",
            recipientEmail: "me@example.com",
            subject: item.subject || "(No Subject)",
            preview: item.snippet || "",
            body: item.snippet || "",
            timestamp: item.date || new Date().toISOString(),
            isRead: true,
            isStarred: false,
            folder: "snoozed",
            avatarColor: "bg-yellow-500",
            attachments: [],
            snoozeUntil: item.snoozeInfo?.wakeUpTime,
        }));

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
