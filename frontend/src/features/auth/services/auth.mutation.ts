import { useMutation } from "@tanstack/react-query";
import {
  loginUser,
  loginWithGoogle,
  logoutUser,
  registerUser,
} from "./auth.api";
import { useAuthStore } from "@/stores/auth.store";
import { useNavigate } from "react-router-dom";

export const useSignInMutation = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      login(data.accessToken, data.refreshToken, "local");
      navigate("/");
    },
  });
};

export const useSignUpMutation = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      navigate("/signin");
    },
  });
};

export const useLogoutMutation = () => {
  const logout = useAuthStore((state) => state.logout);
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      logout();
    },
  });
};

export const useLoginWithGoogleMutation = () => {
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: loginWithGoogle,
    onSuccess: (data) => {
      login(data.accessToken, data.refreshToken, "google");
      navigate("/");
    },
    onError: () => {
      navigate("/signin");
    },
  });
};
