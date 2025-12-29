import { useEffect, useRef } from "react"; // Thêm useRef
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useGoogleCallBack } from "../hooks/useGoogleCallBack";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);

  // Ref để track xem code đã được xử lý chưa
  const calledRef = useRef(false);

  const { handlers } = useGoogleCallBack();

  useEffect(() => {
    const code = searchParams.get("code");

    // Kiểm tra: Có code VÀ chưa từng gọi xử lý
    if (code && !calledRef.current) {
      calledRef.current = true; // Đánh dấu là đã gọi ngay lập tức
      handlers.loginWithGoogle(code);
    }

    // Bỏ isLoginGoogle ra khỏi dependency để tránh chạy lại khi loading xong
  }, [searchParams, handlers]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />

      <div className="mt-4 text-center">
        <h3 className="text-xl font-semibold text-foreground">
          Đang xử lý đăng nhập...
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Vui lòng chờ trong giây lát
        </p>
      </div>
    </div>
  );
};

export default GoogleCallback;
