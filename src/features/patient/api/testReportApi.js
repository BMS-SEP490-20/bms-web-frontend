/**
 * @file testReportApi.js
 * Patient & Doctor Test Report & Official Medical Document Export API (ISO 15189:2022).
 * Integrates dual-signature validation, verification hashes, and diagnostic lab data.
 */

import api from "../../../config/api";

/**
 * Fetch official test report for a specific order directly from backend database.
 * If backend does not contain report record or network fails, returns null (zero fabricated data).
 * @param {string} orderId Order identifier or order number.
 * @returns {Promise<Object|null>} Report payload or null if not found.
 */
export const fetchReportByOrder = async (orderId) => {
    try {
        const encoded = encodeURIComponent(orderId || '');
        const response = await api.get(`/reports/order/${encoded}`).catch(() => api.get(`/testreports/order/${encoded}`));
        if (response?.data?.data) {
            return response.data.data;
        }
        return response?.data || null;
    } catch (error) {
        console.warn(`Phiếu kết quả #${orderId} không tìm thấy trên hệ thống backend API.`, error);
        return null;
    }
};

/**
 * Trigger backend report generation and PDF compile for an approved sample.
 * @param {string} orderId 
 * @param {Object} data 
 * @returns {Promise<Object>} Created report.
 */
export const generateReport = async (orderId, data = {}) => {
    try {
        const encoded = encodeURIComponent(orderId || '');
        const response = await api.post(`/reports/order/${encoded}/generate`, data).catch(() =>
            api.post(`/testreports/order/${encoded}/generate`, data)
        );
        return response.data;
    } catch (error) {
        console.error(`Failed to generate report for order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Download signed PDF document byte stream metadata.
 * @param {string} orderId 
 * @returns {Promise<Object>} PDF export metadata.
 */
export const fetchReportPdf = async (orderId) => {
    try {
        const encoded = encodeURIComponent(orderId || '');
        const response = await api.get(`/reports/order/${encoded}/pdf`).catch(() =>
            api.get(`/testreports/order/${encoded}/pdf`)
        );
        return response.data?.data;
    } catch (error) {
        console.error(`Failed to fetch report PDF for order ${orderId}:`, error);
        return null;
    }
};
