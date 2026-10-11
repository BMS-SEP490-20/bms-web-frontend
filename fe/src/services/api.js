/**
 * API Configuration and HTTP Client
 * 
 * This module configures the Axios HTTP client for the Blood Laboratory Management System.
 * It includes request/response interceptors for authentication and error handling.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import axios from 'axios';

// API Configuration
// Note: Các service sẽ tự thêm /gateway vào path, nên baseURL không cần /gateway
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:7001';

/**
 * Configured Axios instance for API communication
 * 
 * @type {AxiosInstance}
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

/**
 * Request Interceptor
 * 
 * Automatically adds authentication token to all outgoing requests.
 * Retrieves token from localStorage and includes it in Authorization header.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * 
 * Handles common error responses:
 * - 401 Unauthorized: Redirects to login and clears stored auth data
 * - Network errors: Logs server unavailability message
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const fullUrl = error.config?.baseURL + url;

      // Don't logout for certain endpoints that handle 401 gracefully
      // These endpoints return empty data instead of error
      const skipLogoutEndpoints = [
        '/gateway/admin/accounts', // Admin-only endpoint, service handles 401
        '/gateway/admin/users',     // Admin-only endpoint
        '/roles',                   // May not be available
        '/rolePermissions'          // May not be available
      ];

      const shouldLogout = !skipLogoutEndpoints.some(endpoint => url.includes(endpoint));

      if (shouldLogout) {
        // Only logout for authentication-related errors
        setTimeout(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }, 1000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
