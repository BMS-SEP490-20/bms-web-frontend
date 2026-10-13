import axios from "axios";

// Có thể đổi bằng VITE_API_BASE_URL trong file .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const authClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Gửi OTP khôi phục mật khẩu.
 * Mặc định gọi POST /api/auth/forgot-password với body { email }.
 * Nếu backend dùng route/field khác, sửa tại hàm này.
 */
export async function sendPasswordRecoveryOtp(email) {
    const response = await authClient.post("/api/auth/forgot-password", {
        email: email.trim(),
    });

    return response.data;
}
