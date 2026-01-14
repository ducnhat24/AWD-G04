// src/components/PublicRoute.tsx
import { useAuthStore } from "@/stores/auth.store";
import { Navigate, Outlet } from "react-router-dom";
import { LoadingOverlay } from "./common/LoadingOverlay";

const PublicRoute = () => {
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingOverlay visible={true} />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
};

export default PublicRoute;
