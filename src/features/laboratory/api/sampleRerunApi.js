/**
 * @file sampleRerunApi.js
 * @description API client for laboratory sample rerun requisitions and comparison tracking (UC47).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch open rerun requests in the laboratory queue directly from backend & database.
 * @returns {Promise<Array>} List of open rerun items.
 */
export const fetchOpenReruns = async () => {
    try {
        const response = await api.get("/samples/reruns");
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch reruns from backend API:", error);
        return [];
    }
};

/**
 * Fetch sample details and current analytical result for rerun requisition directly from database.
 * @param {string} sampleId Specimen identifier.
 * @returns {Promise<Object|null>} Specimen details.
 */
export const fetchSampleRerunDetails = async (sampleId) => {
    try {
        const response = await api.get(`/samples/${sampleId}/rerun-details`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch rerun details for ${sampleId} from backend API:`, error);
        return null;
    }
};

/**
 * Submit a sample rerun requisition (UC47).
 * @param {string} sampleId Specimen identifier.
 * @param {Object} rerunData Request payload.
 * @returns {Promise<Object>} API response.
 */
export const submitSampleRerun = async (sampleId, rerunData) => {
    try {
        const response = await api.post(`/samples/${sampleId}/rerun`, rerunData);
        return response.data;
    } catch (error) {
        console.error(`Failed to submit rerun for sample ${sampleId}:`, error);
        throw error;
    }
};
