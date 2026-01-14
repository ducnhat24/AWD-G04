// src/stores/auth.store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { fetchUserProfile, type UserProfile } from "@/services/user.service";
import { refreshAccessToken } from "@/features/auth/services/auth.api";

export const authChannel = new BroadcastChannel("auth_sync_channel");

interface AuthState {
  // State
  accessToken: string | null;
  user: UserProfile | null;
  authProvider: "local" | "google" | null;
  isLoading: boolean;

  isAuthenticated: () => boolean;
  login: (
    accessToken: string,
    refreshToken: string,
    provider: "local" | "google"
  ) => Promise<void>; // Chuyển thành async để component có thể await
  logout: (fromRemote?: boolean) => void;
  initializeAuth: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools((set, get) => ({
    accessToken: null,
    user: null,
    authProvider: null,
    isLoading: true, // Mặc định true

    isAuthenticated: () => !!get().accessToken,

    login: async (newAccessToken, newRefreshToken, provider) => {
      localStorage.setItem("refreshToken", newRefreshToken);
      localStorage.setItem("authProvider", provider);

      set({
        accessToken: newAccessToken,
        authProvider: provider,
      });

      await get().fetchUser();
    },

    logout: (fromRemote = false) => {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authProvider");

      set({
        accessToken: null,
        user: null,
        authProvider: null,
        isLoading: false,
      });

      // Chỉ gửi tín hiệu nếu logout chủ động (không phải do nhận tín hiệu từ tab khác)
      if (!fromRemote) {
        authChannel.postMessage("LOGOUT");
      }
    },

    fetchUser: async () => {
      const { accessToken } = get();
      if (!accessToken) return;

      try {
        const profile = await fetchUserProfile();
        set({ user: profile });
      } catch (error) {
        console.error("Failed to fetch user profile", error);
      }
    },

    initializeAuth: async () => {
      const refreshToken = localStorage.getItem("refreshToken");
      const storedProvider = localStorage.getItem("authProvider") as
        | "local"
        | "google"
        | null;

      if (!refreshToken) {
        // Không có token => Kết thúc loading ngay
        set({ isLoading: false, accessToken: null, user: null });
        return;
      }

      try {
        // Gọi API refresh
        const response = await refreshAccessToken({ refreshToken });

        const newAccessToken = response.accessToken;
        const newRefreshToken = refreshToken;

        await get().login(
          newAccessToken,
          newRefreshToken,
          storedProvider || "local"
        );
      } catch (error: any) {
        console.error("Failed to restore session", error);

        const isNetworkError = !error.response || error.code === "ERR_NETWORK";

        if (isNetworkError) {
          console.warn("Offline mode detected. Restoring session explicitly.");

          // "Fake" trạng thái đăng nhập để qua mặt ProtectedRoute
          // Token này không dùng được để gọi API (vì offline), nhưng đủ để render UI
          set({
            accessToken: "OFFLINE_ACCESS_TOKEN",
            authProvider: storedProvider || "local",
            isLoading: false,
          });

          // (Tuỳ chọn) Nếu bạn có lưu user info vào localStorage thì load lại ở đây
          // set({ user: JSON.parse(localStorage.getItem("user") || "null") })

          return; // Dừng hàm, KHÔNG gọi logout()
        }

        // Chỉ logout nếu lỗi từ server (Token sai/hết hạn)
        get().logout();
      } finally {
        set({ isLoading: false });
      }
    },
  }))
);
