// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { setAccessToken } from "@/lib/api"; // Import từ file api
import { refreshAccessToken } from "@/services/apiService"; // Import từ service

// Định nghĩa kiểu dữ liệu cho context
interface AuthContextType {
  accessToken: string | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 1. Access token lưu trong MEMORY (React state) (Req 21)
  const [accessToken, setTokenInState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Kiểm tra Refresh Token khi app tải
  useEffect(() => {
    const initializeAuth = async () => {
      // Chỉ thực hiện khi có refreshToken trong localStorage (Req 22)
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          // Thử gọi API refresh
          const { accessToken: newAccessToken } = await refreshAccessToken();
          // Thành công: Đăng nhập
          login(newAccessToken, refreshToken);
        } catch (error) {
          // Thất bại: (token hết hạn), coi như logout
          console.error("Failed to refresh on init", error);
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []); // Chỉ chạy 1 lần khi app mount

  // 3. Hàm Login: Nhận cả 2 token
  const login = (newAccessToken: string, newRefreshToken: string) => {
    setTokenInState(newAccessToken); // Lưu access vào state (memory)
    setAccessToken(newAccessToken); // Cập nhật cho Axios interceptor
    localStorage.setItem("refreshToken", newRefreshToken); // Lưu refresh vào localStorage (Req 22)
  };

  // 4. Hàm Logout: Xóa tất cả token (Req 22)
  const logout = () => {
    setTokenInState(null);
    setAccessToken(null); // Xóa khỏi Axios interceptor
    localStorage.removeItem("refreshToken");
  };

  const isAuthenticated = !!accessToken;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        login,
        logout,
        isAuthenticated,
        isLoading,
      }}
    >
      {!isLoading && children} {/* Chỉ render con khi đã check xong */}
    </AuthContext.Provider>
  );
};

// Custom Hook (giữ nguyên)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
