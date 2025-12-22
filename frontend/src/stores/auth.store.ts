// src/stores/auth.store.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware"; // Tùy chọn: giúp debug trên browser
import { fetchUserProfile, type UserProfile } from "@/services/user.service";
import { refreshAccessToken } from "@/features/auth/services/auth.api";

interface AuthState {
  // State
  accessToken: string | null;
  user: UserProfile | null;
  authProvider: "local" | "google" | null;
  isLoading: boolean;

  // Computed / Getter
  isAuthenticated: () => boolean;

  // Actions
  login: (
    accessToken: string,
    refreshToken: string,
    provider: "local" | "google"
  ) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools((set, get) => ({
    accessToken: null,
    user: null,
    authProvider: null,
    isLoading: true, // Mặc định là true để chờ check token khi app start

    // Hàm check nhanh xem đã login chưa dựa vào accessToken trong Store
    isAuthenticated: () => !!get().accessToken,

    // 1. Hàm Login: Gọi khi đăng nhập thành công hoặc refresh thành công
    login: async (newAccessToken, newRefreshToken, provider) => {
      // Lưu Refresh Token vào Storage (để tồn tại khi tắt browser)
      localStorage.setItem("refreshToken", newRefreshToken);
      localStorage.setItem("authProvider", provider);

      // Lưu Access Token vào Store (Memory - An toàn hơn)
      set({
        accessToken: newAccessToken,
        authProvider: provider,
        isLoading: false,
      });

      // Sau khi có token, tự động lấy thông tin user
      await get().fetchUser();
    },

    // 2. Hàm Logout: Xóa sạch mọi thứ
    logout: () => {
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authProvider");

      set({
        accessToken: null,
        user: null,
        authProvider: null,
        isLoading: false,
      });
    },

    // 3. Hàm Fetch User: Lấy profile dựa trên accessToken hiện tại
    fetchUser: async () => {
      const { accessToken } = get();
      if (!accessToken) return;

      try {
        const profile = await fetchUserProfile();
        set({ user: profile });
      } catch (error) {
        console.error("Failed to fetch user profile", error);
        // Nếu token sai/hết hạn mà API trả về 401, Interceptor ở api.ts sẽ lo việc logout
      }
    },

    // 4. Hàm Khởi tạo: Chạy 1 lần duy nhất khi F5 trang (gọi ở App.tsx)
    initializeAuth: async () => {
      set({ isLoading: true });

      // Lấy refresh token từ localStorage
      const refreshToken = localStorage.getItem("refreshToken");
      const storedProvider = localStorage.getItem("authProvider") as
        | "local"
        | "google"
        | null;

      if (!refreshToken) {
        // Không có token => Người dùng chưa đăng nhập (Khách)
        set({ isLoading: false, accessToken: null, user: null });
        return;
      }

      try {
        const response = await refreshAccessToken({ refreshToken });

        const newAccessToken = response.accessToken;
        const newRefreshToken = refreshToken;

        await get().login(
          newAccessToken,
          newRefreshToken,
          storedProvider || "local"
        );
      } catch (error) {
        console.error("Failed to restore session", error);
        // Refresh thất bại (token hết hạn/bị thu hồi) => Logout
        get().logout();
      } finally {
        set({ isLoading: false });
      }
    },
  }))
);
