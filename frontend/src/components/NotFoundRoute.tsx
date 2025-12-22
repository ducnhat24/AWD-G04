import { useAuthStore } from "@/stores/auth.store";
import { Navigate } from "react-router-dom";

const NotFoundRedirect = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to="/signin" replace />;
};

export default NotFoundRedirect;
