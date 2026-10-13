/**
 * @file api.js
 * @description Centralized HTTP client for BMS Web Frontend.
 * Supports Axios client with JWT interceptors, as well as fetch-based apiRequest.
 * Conforms to: RFC 7807 Problem Details and RESTful API standards.
 */

import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

/**
 * Lấy access token từ localStorage hoặc sessionStorage.
 * Hỗ trợ các key token hiện đang được sử dụng trong BMS.
 */
export function getToken() {
    return (
        localStorage.getItem("bms_access_token") ||
        sessionStorage.getItem("bms_access_token") ||
        localStorage.getItem("bms_token") ||
        sessionStorage.getItem("bms_token")
    );
}

/**
 * Axios instance with auth headers and normalized path handling
 */
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        // Normalize if path already starts with /api/ to prevent /api/api/
        if (config.url && config.url.startsWith('/api/')) {
            config.url = config.url.substring(4);
        }
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("[BMS API] 401 Unauthorized: Token không hợp lệ hoặc đã hết hạn.");
        }
        return Promise.reject(error);
    }
);

/**
 * Gửi HTTP request đến BMS Backend API qua fetch.
 *
 * @param {string} path API path, ví dụ: "/service-packages"
 * @param {object} options Request options
 * @returns {Promise<any>} Parsed JSON response hoặc null
 */
export async function apiRequest(
    path,
    { method = "GET", body, headers = {} } = {}
) {
    const token = getToken();

    // Normalize path to avoid /api/api/ if API_URL ends with /api
    let normalizedPath = path;
    if (normalizedPath.startsWith('/api/')) {
        normalizedPath = normalizedPath.substring(4);
    }
    const url = `${API_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;

    let response;

    try {
        response = await fetch(url, {
            method,
            headers: {
                Accept: "application/json",
                ...(body !== undefined
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...(token
                    ? { Authorization: `Bearer ${token}` }
                    : {}),
                ...headers,
            },
            body: body !== undefined
                ? JSON.stringify(body)
                : undefined,
        });
    } catch (error) {
        throw new Error(
            `Không thể kết nối BMS API tại ${API_URL}. ` +
            "Hãy kiểm tra backend và cấu hình mạng."
        );
    }

    // Một số API, đặc biệt DELETE, trả về 204 No Content.
    const contentType = response.headers.get("content-type") || "";

    let data = null;

    if (response.status !== 204) {
        if (contentType.includes("application/json")) {
            data = await response.json().catch(() => null);
        } else {
            data = await response.text().catch(() => null);
        }
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.Message ||
            data?.title ||
            data?.detail ||
            (typeof data === "string" && data.trim()) ||
            `Yêu cầu thất bại (${response.status})`;

        if (response.status === 401) {
            console.warn(
                "[BMS API] 401 Unauthorized: Token không hợp lệ hoặc đã hết hạn."
            );
        }

        throw new Error(message);
    }

    return data;
}

/**
 * Chuẩn hóa response danh sách từ backend.
 * Hỗ trợ mảng trực tiếp hoặc các wrapper phổ biến.
 */
export function unwrapList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (Array.isArray(data?.data)) {
        return data.data;
    }

    if (Array.isArray(data?.items)) {
        return data.items;
    }

    if (Array.isArray(data?.result)) {
        return data.result;
    }

    return [];
}

export { API_URL, api };
export default api;
