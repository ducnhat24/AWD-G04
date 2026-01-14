import { useAuthStore } from "@/stores/auth.store";
import { Navigate, Outlet } from "react-router-dom";
import { LoadingOverlay } from "./common/LoadingOverlay";

const ProtectedRoute = () => {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);

  if (isLoading) {
    return <LoadingOverlay visible={true} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
