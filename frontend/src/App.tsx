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

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const logout = useAuthStore((state) => state.logout);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const handleAuthSync = (event: MessageEvent) => {
      if (event.data === "LOGOUT") {
        console.log("Đồng bộ đăng xuất từ tab khác");
        logout(true); // true = remote logout (không gửi lại tin nhắn)
      }
    };

    console.log("Đăng ký lắng nghe kênh đồng bộ auth");
    authChannel.onmessage = handleAuthSync;

    return () => {
      authChannel.onmessage = null;
    };
  }, [logout]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

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
