import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import SignInPage from "./features/auth/pages/SignIn";
import HomePage from "./features/home/pages/Home";
import SignUpPage from "./features/auth/pages/SignUp";
import ProtectedRoute from "./components/ProtectRoute";
import PublicRoute from "./components/PublicRoute";
import NotFoundRedirect from "./components/NotFoundRoute";
import GoogleCallback from "./features/google/pages/GoogleCallBack";
import { authChannel, useAuthStore } from "./stores/auth.store";
import { useThemeStore } from "./stores/theme.store";
import axiosClient from "./api/axiosClient";
import { io } from 'socket.io-client';
import { useMailStore } from "./stores/mail.store";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const triggerRefresh = useMailStore((state) => state.triggerRefresh);

  // 1. Logic Auth & Theme (Giữ nguyên)
  useEffect(() => {
    const handleAuthSync = (event: MessageEvent) => {
      if (event.data === "LOGOUT") logout(true);
    };
    authChannel.onmessage = handleAuthSync;
    return () => { authChannel.onmessage = null; };
  }, [logout]);

  useEffect(() => { initializeAuth(); }, [initializeAuth]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  // 2. LOGIC KHỞI TẠO (Force Sync + Watch)
  // Chạy 1 lần duy nhất khi User mới vào để đảm bảo dữ liệu mới nhất
  useEffect(() => {
    const initMailSystem = async () => {
      if (user?._id) {
        try {
          console.log("🚀 Bắt đầu khởi tạo hệ thống Mail...");

          // B1: Đăng ký Webhook trước (để không sót mail)
          await axiosClient.post('/mail/watch');

          // B2: Force Sync (kéo mail cũ về)
          await axiosClient.post('/mail/sync');
          console.log("✅ Đồng bộ Initial hoàn tất!");

          // B3: Refresh giao diện
          triggerRefresh();
        } catch (error) {
          console.error("❌ Lỗi khởi tạo hệ thống Mail:", error);
        }
      }
    };
    initMailSystem();
  }, [user?._id]); // Chỉ chạy khi user ID thay đổi

  // 3. LOGIC REAL-TIME (Socket.IO) - 👇 ĐOẠN NÀY VỪA BỊ THIẾU NÈ
  // Lắng nghe sự kiện "NEW_MAIL" về sau
  useEffect(() => {
    if (!user?._id) return;

    // Kết nối Socket
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      path: '/socket.io/',
    });

    socket.on('connect', () => {
      console.log('🟢 Socket connected');
      socket.emit('join_room', user._id);
    });

    // Khi Server báo có mail mới -> Refresh giao diện
    socket.on('NEW_MAIL', (data) => {
      console.log('⚡ NHẬN ĐƯỢC MAIL MỚI (Real-time):', data);
      triggerRefresh();
    });

    return () => {
      socket.disconnect();
    };
  }, [user?._id]);

  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route element={<PublicRoute />}>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Route>
      <Route path="/login/oauth/google/callback" element={<GoogleCallback />} />
      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

export default App;