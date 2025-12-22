// src/lib/api.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/stores/auth.store"; // Import Store

// 1. Tạo Instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// =================================================================
// 2. Request Interceptor: Lấy Token từ Zustand Store
// =================================================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Lấy token trực tiếp từ Store tại thời điểm gọi API
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =================================================================
// 3. Response Interceptor: Xử lý Refresh Token
// =================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (
  error: AxiosError | null,
  token: string | null = null
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Nếu lỗi 401 và chưa từng retry
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      if (isRefreshing) {
        // Nếu đang refresh, xếp hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken"); // Lấy refresh token từ Storage
        if (!refreshToken) throw new Error("No refresh token available");

        // Gọi API Refresh (Dùng axios gốc để tránh lặp vô tận interceptor)
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken || refreshToken; // Nếu BE trả về RT mới thì dùng, ko thì dùng cũ

        // QUAN TRỌNG: Cập nhật ngược lại vào Store
        // Actions login sẽ tự set state và localStorage
        useAuthStore.getState().login(newAccessToken, newRefreshToken, "local");

        // Xử lý hàng đợi đang chờ
        processQueue(null, newAccessToken);

        // Gọi lại request ban đầu với token mới
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Nếu refresh lỗi => Logout luôn
        processQueue(refreshError as AxiosError, null);

        // Gọi action logout của Store (nó sẽ clear state và localStorage)
        useAuthStore.getState().logout();

        // Optional: Redirect về trang login nếu cần thiết (thường Router sẽ tự làm việc này khi state user null)
        // window.location.href = "/signin";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
