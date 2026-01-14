// src/services/email.service.ts
import { http } from "../../../services/http.client";
import { transformEmail, transformMailbox } from "@/utils/mapper";
import type { Email } from "../types/email.type";

export const findLabelId = (
  mailboxes: { id: string; label: string }[],
  name: string
): string | undefined => {
  const mailbox = mailboxes.find((m) => m.label === name);
  return mailbox?.id;
};

export const fetchMailboxes = async () => {
  const { data } = await http.get("/mail/mailboxes");
  if (Array.isArray(data) && data.length > 0 && "name" in data[0]) {
    return data.map(transformMailbox);
  }
  return data;
};

export const fetchEmails = async (
  folderId: string,
  pageParam: string | number = 1,
  limit: number = 10,
  searchQuery?: string
): Promise<{ emails: Email[]; nextPageToken?: string }> => {
  const mappedLabel = folderId;
  const params: Record<string, string | number> = { limit };

  if (typeof pageParam === "string") {
    params.pageToken = pageParam;
  } else if (typeof pageParam === "number" && pageParam > 1) {
    params.page = pageParam;
  }

  if (searchQuery) params.search = searchQuery;

  try {
    const { data } = await http.get(`/mail/mailboxes/${mappedLabel}/emails`, {
      params,
    });

    let emails: Email[] = [];
    let nextPageToken: string | undefined = undefined;

    if (Array.isArray(data)) {
      emails = data.map((e) => transformEmail(e as Record<string, unknown>, folderId));
    } else if (data && typeof data === "object") {
      const dataObj = data as Record<string, unknown>;
      const rawEmails = (dataObj.messages || dataObj.emails || []) as unknown[];
      if (Array.isArray(rawEmails)) {
        emails = rawEmails.map((e) => transformEmail(e as Record<string, unknown>, folderId));
      }
      nextPageToken = dataObj.nextPageToken as string | undefined;
    }

    return { emails, nextPageToken };
  } catch (error) {
    console.error("Error fetching emails:", error);
    return { emails: [] };
  }
};

export const searchEmails = async (query: string): Promise<Email[]> => {
  try {
    const { data } = await http.post(`/mail/search/semantic`, {
      query: query
    });

    let emails: Email[] = [];

    if (Array.isArray(data)) {
      emails = data.map((e) => transformEmail(e as Record<string, unknown>));
    } else if (data && typeof data === "object") {
      const dataObj = data as Record<string, unknown>;
      const rawEmails = (dataObj.messages || dataObj.emails || []) as unknown[];
      if (Array.isArray(rawEmails)) {
        emails = rawEmails.map((e) => transformEmail(e as Record<string, unknown>));
      }
    }

    return emails;
  } catch (error) {
    console.error("Error searching emails:", error);
    throw error;
  }
};

export const fetchEmailDetail = async (
  emailId: string
): Promise<Email | undefined> => {
  const { data } = await http.get(`/mail/emails/${emailId}`);
  if (data && "snippet" in data) {
    return transformEmail(data);
  }
  return data;
};

export const sendEmail = async (to: string, subject: string, body: string) => {
  const { data } = await http.post("/mail/send", { to, subject, body });
  return data;
};

export const replyEmail = async (emailId: string, body: string) => {
  const { data } = await http.post(`/mail/emails/${emailId}/reply`, { body });
  return data;
};

export const forwardEmail = async (
  emailId: string,
  to: string,
  subject: string,
  body: string
) => {
  const { data } = await http.post(`/mail/emails/${emailId}/forward`, {
    to,
    subject,
    body,
  });
  return data;
};

export const modifyEmail = async (
  emailId: string,
  addLabels: string[],
  removeLabels: string[]
) => {
  const { data } = await http.post(`/mail/emails/${emailId}/modify`, {
    addLabels,
    removeLabels,
  });
  return data;
};

export const fetchEmailSummary = async (id: string): Promise<string> => {
  const { data } = await http.get<{ id: string; summary: string }>(
    `/mail/emails/${id}/summary`
  );
  return data.summary;
};

export const fetchAttachment = async (
  emailId: string,
  attachmentId: string
) => {
  const response = await http.get(
    `/mail/attachments/${emailId}/${attachmentId}`,
    { responseType: "blob" }
  );
  return response.data as Blob;
};

export const getSuggestions = async (query: string): Promise<string[]> => {
  try {
    const { data } = await http.get<string[]>("/mail/suggestions", {
      params: { q: query },
    });
    return data;
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return [];
  }
};
