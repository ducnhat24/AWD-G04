import { useAuthStore } from "@/stores/auth.store";
import { Navigate, Outlet } from "react-router-dom";

const PublicRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <div>Đang tải...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
