/**
 * @file apiClient.jsx
 * @description Dedicated Axios instance for the admin service package module.
 * Injects stored authentication bearer tokens into outbound requests.
 * @module features/admin/api/apiClient
 */

import axios from "axios";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem("bms_access_token") ||
            sessionStorage.getItem("bms_access_token") ||
            localStorage.getItem("bms_token") ||
            sessionStorage.getItem("bms_token") ||
            localStorage.getItem("accessToken") ||
            sessionStorage.getItem("accessToken") ||
            localStorage.getItem("token") ||
            sessionStorage.getItem("token");

        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.warn("[admin/apiClient] 401 Unauthorized: Session token is missing, invalid, or expired.");
        }
        return Promise.reject(error);
    }
);

export default apiClient;