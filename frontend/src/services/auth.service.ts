// src/services/auth.service.ts
import axios from "axios";
import { http } from "./http.client";

export type LoginFormValues = {
    email: string;
    password: string;
};

export type RegisterFormValues = {
    email: string;
    password: string;
};

export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
};

export type RefreshResponse = {
    accessToken: string;
};

export const loginUser = async (
    values: LoginFormValues
): Promise<LoginResponse> => {
    const { data } = await http.post("/auth/login", values);
    return data;
};

export const registerUser = async (
    values: RegisterFormValues
): Promise<unknown> => {
    const { email, password } = values;
    const { data } = await http.post("/user/register", { email, password });
    return data;
};

export const refreshAccessToken = async (): Promise<RefreshResponse> => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
        throw new Error("No refresh token available");
    }
    const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh`,
        { refreshToken }
    );
    return data;
};

