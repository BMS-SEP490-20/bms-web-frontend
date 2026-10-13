
/**
 * @file api.js
 * @description Centralized HTTP client for BMS Web Frontend.
 * Supports JWT authentication, JSON responses, and DELETE requests
 * that return HTTP 204 No Content.
 */

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Lấy access token từ localStorage hoặc sessionStorage.
 * Hỗ trợ các key token hiện đang được sử dụng trong BMS.
 */
function getToken() {
    return (
        localStorage.getItem("bms_access_token") ||
        sessionStorage.getItem("bms_access_token") ||
        localStorage.getItem("bms_token") ||
        sessionStorage.getItem("bms_token")
    );
}

/**
 * Gửi HTTP request đến BMS Backend API.
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

    let response;

    try {
        response = await fetch(`${API_URL}${path}`, {
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

