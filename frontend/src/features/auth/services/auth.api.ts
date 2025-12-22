// src/services/auth.service.ts
import { http } from "../../../services/http.client";
import type {
  LoginRequestDto,
  LoginResponseDto,
  RefreshRequestDto,
  RefreshResponseDto,
  RegisterRequestDto,
} from "./auth.dto";
import { catchGlobalAxiosError } from "@/services/global-exception";

export const loginUser = async (
  values: LoginRequestDto
): Promise<LoginResponseDto> => {
  const { data } = await http.post("/auth/login", values);
  return data;
};

export const registerUser = async (
  values: RegisterRequestDto
): Promise<unknown> => {
  try {
    const { email, password } = values;
    const { data } = await http.post("/user/register", { email, password });
    return data;
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};

export const refreshAccessToken = async (
  values: RefreshRequestDto
): Promise<RefreshResponseDto> => {
  try {
    const { data } = await http.post(`/auth/refresh`, {
      refreshToken: values.refreshToken,
    });
    return data;
  } catch (error) {
    throw catchGlobalAxiosError(error);
  }
};
