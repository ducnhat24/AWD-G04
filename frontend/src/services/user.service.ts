// src/services/user.service.ts
import { http } from "./http.client";

export type UserProfile = {
    _id: string;
    email: string;
};

export const fetchUserProfile = async (): Promise<UserProfile> => {
    const { data } = await http.get("/user/me");
    return data;
};

