import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import SignInPage from "./features/auth/pages/SignIn";
import HomePage from "./pages/Home";
import SignUpPage from "./features/auth/pages/SignUp";
import ProtectedRoute from "./components/ProtectRoute";
import PublicRoute from "./components/PublicRoute";
import NotFoundRedirect from "./components/NotFoundRoute";
import GoogleCallback from "./features/google/GoogleCallBack";
import { useAuthStore } from "./stores/auth.store";

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      <Route element={<PublicRoute />}>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Route>

      <Route path="/login/oauth/google/callback" element={<GoogleCallback />} />

      <Route path="*" element={<NotFoundRedirect />} />
    </Routes>
  );
}

export default App;
