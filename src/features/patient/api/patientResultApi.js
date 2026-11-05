/**
 * @file patientResultApi.js
 * @description API client for patient portal diagnostic test result inspection, PDF export, and sharing (UC62 / Issue I3-044).
 * Conforms to: Production Standards, Clean MVC Architecture & Zero Fabricated Data principles.
 */

import api from "../../../config/api";

/**
 * Fetch patient test result breakdown, parameters, reference ranges, and doctor assessment for an order.
 * @param {string} orderId Order identifier or order number.
 * @returns {Promise<Object|null>} Diagnostic result detail payload.
 */
export const fetchPatientResult = async (orderId) => {
    if (!orderId) return null;
    try {
        const response = await api.get(`/testresults/patient/order/${orderId}`);
        const data = response.data?.data || response.data;
        if (data && (data.Parameters || data.parameters || data.OrderId || data.orderId)) {
            return data;
        }
    } catch {
        // Try fallback report endpoint
    }

    try {
        const response = await api.get(`/reports/order/${orderId}`);
        return response.data?.data || response.data || null;
    } catch (error) {
        console.error(`Failed to fetch patient result for order ${orderId}:`, error);
        return null;
    }
};

/**
 * Request printable HTML and PDF metadata payload for a patient test result.
 * @param {string} orderId Order identifier or order number.
 * @returns {Promise<Object>} PDF export metadata including printableHtml.
 */
export const exportResultPdf = async (orderId) => {
    if (!orderId) return null;
    try {
        const response = await api.get(`/testresults/patient/order/${orderId}/export-pdf`);
        const data = response.data?.data || response.data;
        if (data && data.printableHtml) return data;
    } catch {
        // Try fallback PDF report endpoint
    }

    try {
        const res = await api.get(`/reports/order/${orderId}/pdf`);
        return res.data?.data || res.data || null;
    } catch (error) {
        console.error(`Failed to export PDF for order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Generate a secure, time-limited share link for consulting physicians.
 * @param {string} orderId Order identifier or order number.
 * @returns {Promise<Object>} Share token and URL payload.
 */
export const shareResultWithDoctor = async (orderId) => {
    if (!orderId) return null;
    try {
        const response = await api.post(`/testresults/patient/order/${orderId}/share`);
        return response.data?.data || response.data || null;
    } catch (error) {
        console.error(`Failed to generate share link for order ${orderId}:`, error);
        throw error;
    }
};

/**
 * Retrieve all released test results for a patient.
 * @param {string} patientId Patient identifier.
 * @returns {Promise<Array>} List of patient diagnostic results.
 */
export const fetchPatientResultsList = async (patientId) => {
    if (!patientId) return [];
    try {
        const response = await api.get(`/testresults/patient/${patientId}`);
        const data = response.data?.data || response.data;
        if (Array.isArray(data) && data.length > 0) return data;
    } catch {
        // Try fallback
    }

    try {
        const response = await api.get(`/reports/patient/${patientId}`);
        const data = response.data?.data || response.data;
        if (Array.isArray(data)) return data;
    } catch {
        // ignore
    }

    return [];
};
