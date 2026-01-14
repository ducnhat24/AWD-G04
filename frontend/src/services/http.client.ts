import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth.store";

// 1. Tạo Instance
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Quan trọng nếu backend dùng cookie
  timeout: 10000,
});

// =================================================================
// 2. Request Interceptor: Tự động gắn Token
// =================================================================
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =================================================================
// 3. Response Interceptor: Refresh Token & Error Handling
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

http.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // ----------------------------------------------------------------
    // [QUAN TRỌNG] XỬ LÝ OFFLINE / MẤT MẠNG
    // ----------------------------------------------------------------
    // Nếu không có response (server không trả về) hoặc mã lỗi là ERR_NETWORK
    const isNetworkError =
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.message === "Network Error" || // Message chuẩn của Axios
      error.message?.includes("Network Error"); // Đôi khi nó nằm trong chuỗi dài;

    if (isNetworkError) {
      console.warn("Network connection lost. Switching to offline mode.");

      return Promise.reject(error);
    }

    // ----------------------------------------------------------------
    // CASE 1: Lỗi 401 (Unauthorized) -> Thử Refresh Token
    // ----------------------------------------------------------------
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/login")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) throw new Error("No refresh token available");

        // Gọi API Refresh
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/refresh`,
          { refreshToken }
        );

        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken || refreshToken;

        // Cập nhật Store
        useAuthStore.getState().login(newAccessToken, newRefreshToken, "local");

        // Xử lý hàng đợi
        processQueue(null, newAccessToken);

        // Gọi lại request cũ
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null);

        // Chỉ Logout nếu Refresh Token thực sự hết hạn (Server trả về lỗi), không phải do mất mạng
        useAuthStore.getState().logout();
        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ----------------------------------------------------------------
    // CASE 2: Các lỗi khác (403, 500...)
    // ----------------------------------------------------------------
    if (error.response?.status !== 401) {
      const message =
        (error.response?.data as any)?.message || "Đã có lỗi xảy ra";

      console.log("HTTP Error:", {
        status: error.response?.status,
        message: message,
        url: originalRequest.url,
      });

      if (error.response?.status === 403) {
        toast.error("Bạn không có quyền thực hiện hành động này.");
      } else if (error.response?.status && error.response.status >= 500) {
        toast.error("Lỗi hệ thống (Server Error). Vui lòng thử lại sau.");
      }
      // Các lỗi 4xx khác có thể handle tùy ý
    }

    return Promise.reject(error);
  }
);
