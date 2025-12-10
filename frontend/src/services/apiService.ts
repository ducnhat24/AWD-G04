// src/services/apiService.ts
import { type Email } from "@/data/mockData";
import api from "@/lib/api";
import axios from "axios";
// Import các kiểu Zod từ form của bạn (Giả sử bạn export chúng)
// Hoặc định nghĩa lại kiểu Login/Register ở đây

// Giả sử kiểu Zod từ SignInPage
type LoginFormValues = {
  email: string;
  password: string;
};

// Giả sử kiểu Zod từ SignUpPage
type RegisterFormValues = {
  email: string;
  password: string;
};

// Backend trả về kiểu này khi login
type LoginResponse = {
  accessToken: string;
  refreshToken: string;
};

// Backend trả về kiểu này khi refresh
type RefreshResponse = {
  accessToken: string;
};

// Backend trả về kiểu này từ /user/me
export type UserProfile = {
  _id: string;
  email: string;
  // ... các trường khác
};

// ========================================================
// 1. Auth Service
// ========================================================
export const loginUser = async (
  values: LoginFormValues
): Promise<LoginResponse> => {
  // Dùng endpoint /auth/login của NestJS
  const { data } = await api.post("/auth/login", values);
  return data;
};

export const registerUser = async (values: RegisterFormValues) => {
  // Dùng endpoint /user/register
  const { email, password } = values;
  const { data } = await api.post("/user/register", { email, password });
  return data;
};

export const refreshAccessToken = async (): Promise<RefreshResponse> => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }
  // Dùng axios gốc để tránh vòng lặp interceptor khi init
  const { data } = await axios.post(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    { refreshToken }
  );
  return data;
};

// ========================================================
// 2. User Service
// ========================================================
export const fetchUserProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get("/user/me");
  return data;
};

// ========================================================
// 3. Email Data Service (Mock Endpoints)
// ========================================================

// Helper to parse "Name <email>"
const parseSender = (fromHeader: string) => {
  // Example: "Google <no-reply@accounts.google.com>"
  const match = fromHeader.match(/(.*)<(.*)>/);
  if (match) {
    return {
      sender: match[1].trim().replace(/"/g, ""),
      senderEmail: match[2].trim(),
    };
  }
  // Example: "no-reply@accounts.google.com"
  return { sender: fromHeader, senderEmail: fromHeader };
};

const transformEmail = (
  backendEmail: any,
  folderId: string = "INBOX"
): Email => {
  const { sender, senderEmail } = parseSender(backendEmail.sender || "");
  
  // Parse recipient (to)
  // backendEmail.to might be a string or array, assuming string for now based on parseSender logic
  // If it's an array, we might need to join them or pick the first one.
  // Let's assume it's a string similar to sender for now.
  const { sender: recipient, senderEmail: recipientEmail } = parseSender(backendEmail.to || "");

  let isRead = backendEmail.isRead;
  let isStarred = backendEmail.isStarred;

  if (backendEmail.labelIds) {
    isRead = !backendEmail.labelIds.includes("UNREAD");
    isStarred = backendEmail.labelIds.includes("STARRED");
  }

  return {
    id: backendEmail.id,
    sender: sender,
    senderEmail: senderEmail,
    recipient: recipient,
    recipientEmail: recipientEmail,
    subject: backendEmail.subject || "(No Subject)",
    preview: backendEmail.snippet || "",
    body: backendEmail.body || "",
    timestamp: backendEmail.date || "",
    isRead: isRead ?? true,
    isStarred: isStarred ?? false,
    folder: folderId,
    avatarColor: "bg-blue-500", // Default
    attachments:
      backendEmail.attachments?.map((att: any) => ({
        id: att.id || att._id || att.body?.attachmentId || att.attachmentId,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size || att.body?.size,
      })) || [],
  };
};

const transformMailbox = (backendMailbox: any) => {
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
    icon: icon,
    unread: backendMailbox.unread,
  };
};

// GET /mailboxes
export const fetchMailboxes = async () => {
  // Gọi axios thật, MSW sẽ chặn URL này và trả về danh sách FOLDERS
  const { data } = await api.get("/mail/mailboxes");
  if (Array.isArray(data) && data.length > 0 && "name" in data[0]) {
    return data.map(transformMailbox);
  }
  return data;
};

// GET /mailboxes/:id/emails
export const fetchEmails = async (folderId: string): Promise<Email[]> => {
  // Gọi axios thật
  const { data } = await api.get(`/mail/mailboxes/${folderId}/emails`);
  if (Array.isArray(data) && data.length > 0 && "snippet" in data[0]) {
    return data.map((e) => transformEmail(e, folderId));
  }
  return data;
};

// GET /emails/:id
export const fetchEmailDetail = async (
  emailId: string
): Promise<Email | undefined> => {
  // Gọi axios thật
  const { data } = await api.get(`/mail/emails/${emailId}`);
  if (data && "snippet" in data) {
    return transformEmail(data);
  }
  return data;
};

// POST /mail/send
export const sendEmail = async (to: string, subject: string, body: string) => {
  const { data } = await api.post("/mail/send", { to, subject, body });
  return data;
};

// POST /mail/emails/:id/modify
export const modifyEmail = async (
  emailId: string,
  addLabels: string[],
  removeLabels: string[]
) => {
  const { data } = await api.post(`/mail/emails/${emailId}/modify`, {
    addLabels,
    removeLabels,
  });
  return data;
};

export const snoozeEmail = async (id: string, date: string) => {
  // Mock implementation
  console.log(`Snoozing email ${id} until ${date}`);
  return { id, snoozeUntil: date };
};

// GET /mail/attachments/:emailId/:attachmentId
export const fetchAttachment = async (
  emailId: string,
  attachmentId: string
) => {
  const response = await api.get(
    `/mail/attachments/${emailId}/${attachmentId}`,
    {
      responseType: "blob",
    }
  );
  return response.data;
};

// POST /mail/emails/:id/reply
export const replyEmail = async (emailId: string, body: string) => {
  const { data } = await api.post(`/mail/emails/${emailId}/reply`, { body });
  return data;
};

// POST /mail/emails/:id/forward
export const forwardEmail = async (
  emailId: string,
  to: string,
  subject: string,
  body: string
) => {
  const { data } = await api.post(`/mail/emails/${emailId}/forward`, {
    to,
    subject,
    body,
  });
  return data;
};