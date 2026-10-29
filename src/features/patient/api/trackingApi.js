/**
 * @file trackingApi.js
 * @description API client for tracking specimen lifecycle and 6-stage test progress (UC48 / Issue I3-002).
 * Conforms to: Production Standards, ISO 15189 & AGENTS-DESIGN.md.
 */

import api from "../../../config/api";

/**
 * Fetch specimen 6-stage lifecycle progress by Order Number, Barcode, or Sample ID.
 * Supports public anonymous tracking and authenticated clinical tracking.
 * @param {string} identifier Order number (e.g. ORD-2026-0881) or barcode.
 * @returns {Promise<Object|null>} Tracking response payload.
 */
export const fetchTrackingByCode = async (identifier) => {
    if (!identifier || !identifier.trim()) return null;
    try {
        const response = await api.get(`/tracking/${encodeURIComponent(identifier.trim())}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch tracking for ${identifier}:`, error);
        return null;
    }
};

/**
 * Fetch active trackings for a logged-in patient.
 * @param {string} patientId Patient identifier.
 * @returns {Promise<Array>} List of active trackings.
 */
export const fetchPatientTrackings = async (patientId) => {
    if (!patientId) return [];
    try {
        const response = await api.get(`/tracking/patient/${encodeURIComponent(patientId)}`);
        return response.data?.data || [];
    } catch (error) {
        console.error(`Failed to fetch patient trackings for ${patientId}:`, error);
        return [];
    }
};

/**
 * Search tracking records across the laboratory (Clinical staff).
 * @param {Object} params Filter parameters.
 * @returns {Promise<Array>} Search results.
 */
export const searchTrackings = async (params = {}) => {
    try {
        const response = await api.get("/tracking/search", { params });
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to search trackings:", error);
        return [];
    }
};
