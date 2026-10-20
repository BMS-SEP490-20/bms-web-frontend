/**
 * @file testReportApi.js
 * @description API client for laboratory test report generation and PDF retrieval (UC42).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch official test report for a specific order directly from backend and database.
 * @param {string} orderId Order identifier or order number.
 * @returns {Promise<Object|null>} Report payload.
 */
export const fetchReportByOrder = async (orderId) => {
    try {
        const response = await api.get(`/reports/order/${orderId}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch report for order ${orderId} from backend API:`, error);
        return null;
    }
};

/**
 * Generate or re-issue an official diagnostic report.
 * @param {string} orderId Order identifier.
 * @param {Object} data Notes and approver details.
 * @returns {Promise<Object>} Created report.
 */
export const generateReport = async (orderId, data = {}) => {
    try {
        const response = await api.post(`/reports/order/${orderId}/generate`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to generate report for order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Retrieve exportable PDF payload.
 * @param {string} orderId Order identifier.
 * @returns {Promise<Object>} PDF export metadata.
 */
export const fetchReportPdf = async (orderId) => {
    try {
        const response = await api.get(`/reports/order/${orderId}/pdf`);
        return response.data?.data;
    } catch (error) {
        console.error(`Failed to fetch report PDF for order ${orderId}:`, error);
        throw error;
    }
};
