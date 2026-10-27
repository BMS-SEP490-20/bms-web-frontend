/**
 * @file api.js
 * @description Centralized HTTP networking client for BMS Web Frontend.
 * Provides both an Axios instance with request/response interceptors and a native fetch wrapper (apiRequest).
 * Handles JWT bearer authentication injection, path normalization, and RFC 7807 problem details parsing.
 * Conforms to: Production Engineering Standards & AGENTS-CODE.md.
 */

import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api";

/**
 * Retrieves the stored JWT access token from localStorage or sessionStorage.
 * Checks known key variations to maintain backward compatibility across modules.
 *
 * @returns {string|null} The raw JWT access token or null if not authenticated.
 */
export function getToken() {
    return (
        localStorage.getItem("bms_access_token") ||
        sessionStorage.getItem("bms_access_token") ||
        localStorage.getItem("bms_token") ||
        sessionStorage.getItem("bms_token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );
}

/**
 * Pre-configured Axios instance with authorization header interceptors and JSON defaults.
 */
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Request interceptor: attach bearer token and normalize duplicate /api prefixes
api.interceptors.request.use(
    (config) => {
        // Prevent accidental '/api/api/' path doubling when baseUrl already ends with '/api'
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

// Response interceptor: log unauthenticated session expiries for telemetry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("[BMS API] 401 Unauthorized: Session token is missing, invalid, or expired.");
        }
        return Promise.reject(error);
    }
);

/**
 * Executes an HTTP fetch request against the BMS Backend API with automatic authorization.
 *
 * @param {string} path - The relative endpoint path (e.g. "/service-packages").
 * @param {object} [options] - Fetch request options.
 * @param {string} [options.method='GET'] - HTTP verb (GET, POST, PUT, DELETE, PATCH).
 * @param {*} [options.body] - Request body payload serialized to JSON.
 * @param {Record<string, string>} [options.headers={}] - Custom HTTP headers.
 * @returns {Promise<any>} The parsed JSON payload, plain text, or null for 204 No Content.
 * @throws {Error} Human-readable error message parsed from backend problem details.
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
            `Cannot connect to BMS API at ${API_URL}. ` +
            "Please check backend service availability and network configuration."
        );
    }

    // Handle 204 No Content (typically returned by DELETE or empty operations)
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
            `Request failed with status ${response.status}`;

        if (response.status === 401) {
            console.warn(
                "[BMS API] 401 Unauthorized: Session token is missing, invalid, or expired."
            );
        }

        throw new Error(message);
    }

    return data;
}

/**
 * Normalizes collection responses from diverse backend endpoint conventions into a clean array.
 * Unwraps direct arrays, paged containers ({ data: [...] }), or envelope wrappers ({ items: [...] }).
 *
 * @param {any} data - Raw response object or array.
 * @returns {any[]} Guaranteed JavaScript array of items.
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
