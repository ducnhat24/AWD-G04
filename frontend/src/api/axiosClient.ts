// src/api/axiosClient.ts
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store'; // Import Store của bạn

// Lấy URL từ biến môi trường
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const axiosClient = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// --- INTERCEPTOR: Lấy Token từ RAM (Zustand) ---
axiosClient.interceptors.request.use(
    (config) => {
        // 👇 CÁCH LẤY TOKEN ĐÚNG VỚI CODE CỦA BẠN:
        // Gọi trực tiếp getState() để lấy accessToken mới nhất trong memory
        const token = useAuthStore.getState().accessToken;

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- INTERCEPTOR: Xử lý lỗi 401 (Token hết hạn) ---
axiosClient.interceptors.response.use(
    (response) => {
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 (Unauthorized) và chưa thử retry lần nào
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                console.log('🔄 Token hết hạn, đang thử refresh...');

                // Gọi hàm initializeAuth để refresh token (Hàm này bạn đã viết logic refresh rồi)
                await useAuthStore.getState().initializeAuth();

                // Lấy lại token mới sau khi refresh
                const newToken = useAuthStore.getState().accessToken;

                if (newToken) {
                    // Gắn token mới vào header và gọi lại request cũ
                    originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                    return axiosClient(originalRequest);
                }
            } catch {
                console.error('Refresh token thất bại -> Logout');
                useAuthStore.getState().logout();
                window.location.href = '/signin';
            }
        }

        return Promise.reject(error);
    }
);

export default axiosClient;