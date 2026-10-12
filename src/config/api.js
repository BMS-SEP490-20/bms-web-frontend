const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
    return (
        localStorage.getItem("bms_access_token") ||
        sessionStorage.getItem("bms_access_token")
    );
}

export async function apiRequest(path, { method = "GET", body } = {}) {
    const token = getToken();

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // DELETE có thể trả 204 (không có body) nên phải catch
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.Message ||
            data?.title ||
            data?.detail ||
            `Yêu cầu thất bại (${response.status})`
        );
    }

    return data;
}

// BE trả mảng thẳng hoặc bọc trong { data } / { items } / { result } đều chạy được
export function unwrapList(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.result)) return data.result;
    return [];
}