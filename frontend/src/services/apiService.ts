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
type UserProfile = {
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

// GET /mailboxes
export const fetchMailboxes = async () => {
  // Gọi axios thật, MSW sẽ chặn URL này và trả về danh sách FOLDERS
  const { data } = await api.get("/mailboxes");
  return data;
};

// GET /mailboxes/:id/emails
export const fetchEmails = async (folderId: string): Promise<Email[]> => {
  // Gọi axios thật
  const { data } = await api.get(`/mailboxes/${folderId}/emails`);
  return data;
};

// GET /emails/:id
export const fetchEmailDetail = async (emailId: string): Promise<Email | undefined> => {
  // Gọi axios thật
  const { data } = await api.get(`/emails/${emailId}`);
  return data;
};