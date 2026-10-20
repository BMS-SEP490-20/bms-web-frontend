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
    try {
        const response = await api.get(`/testresults/patient/order/${orderId}`);
        return response.data?.data || null;
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
    try {
        const response = await api.get(`/testresults/patient/order/${orderId}/export-pdf`);
        return response.data?.data || null;
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
    try {
        const response = await api.post(`/testresults/patient/order/${orderId}/share`);
        return response.data?.data || null;
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
    try {
        const response = await api.get(`/testresults/patient/${patientId}`);
        return response.data?.data || [];
    } catch (error) {
        console.error(`Failed to fetch patient results list for ${patientId}:`, error);
        return [];
    }
};
