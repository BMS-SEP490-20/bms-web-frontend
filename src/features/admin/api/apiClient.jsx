
import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem("bms_access_token") ||
            sessionStorage.getItem("bms_access_token") ||
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

export default apiClient;