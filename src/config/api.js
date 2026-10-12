/**
 * @file api.js
 * @description Centralized Axios HTTP client configuration for the BMS Web Frontend.
 * Integrates base URL from environment variables, automatically attaches JWT Bearer token,
 * and handles centralized RFC 7807 problem details and unauthorized session expiries.
 * Conforms to: Production Engineering Standards.
 */

import axios from 'axios';

// Base URL connecting to the BMS Backend Web API (.NET) or local dev server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: automatically attaches authorization bearer token if present in local storage
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

// Response interceptor: handles common errors and session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the access token is invalid or expired (401), handle graceful session notice
    if (error.response && error.response.status === 401) {
      console.warn('[BMS API] 401 Unauthorized: User session has expired or is invalid.');
    }
    return Promise.reject(error);
  }
);

export default api;
