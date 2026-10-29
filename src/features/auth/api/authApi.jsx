/**
 * @file authApi.jsx
 * @description Dedicated authentication HTTP client for password recovery endpoints (UC10 / BR-IAM-01).
 * @module features/auth/api/authApi
 */

import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const authClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Dispatches a password recovery OTP code to the specified user email address (UC10).
 * Connects to BMS Backend /api/auth/forgot and /api/auth/forgot-password.
 *
 * @param {string} email - Registered user email address.
 * @returns {Promise<object>} Backend response payload containing dispatch status message.
 */
export async function sendPasswordRecoveryOtp(email) {
    try {
        const response = await authClient.post("/api/auth/forgot", {
            email: email.trim(),
        });
        return response.data;
    } catch (firstErr) {
        try {
            const response = await authClient.post("/api/auth/forgot-password", {
                email: email.trim(),
            });
            return response.data;
        } catch (secondErr) {
            throw (secondErr.response ? secondErr : firstErr);
        }
    }
}

export default {
    sendPasswordRecoveryOtp,
};
