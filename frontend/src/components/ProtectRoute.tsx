// src/components/ProtectRoute.tsx
import { useAuthStore } from "@/stores/auth.store";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => !!state.accessToken);

  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
