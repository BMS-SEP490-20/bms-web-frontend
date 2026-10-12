/**
 * @file api.js
 * @description Axios HTTP client configuration cho toàn bộ hệ thống BMS Web Frontend.
 * Tích hợp base URL từ biến môi trường, tự động đính kèm JWT Bearer token và xử lý lỗi tập trung.
 * Tuân thủ: AGENTS-CODE.md chuẩn Comment và Architecture.
 */

import axios from 'axios';

// Base URL kết nối tới bms-backend Web API (.NET 8)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: tự động gắn token xác thực vào Authorization header nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: chuẩn hóa thông báo lỗi theo chuẩn RFC 7807 Problem Details
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu token hết hạn (401), xử lý đăng xuất an toàn
    if (error.response && error.response.status === 401) {
      // Có thể dispatch logout hoặc redirect khi cần thiết
      console.warn('[BMS API] 401 Unauthorized: Phiên làm việc đã hết hạn hoặc không hợp lệ.');
    }
    return Promise.reject(error);
  }
);

export default api;
