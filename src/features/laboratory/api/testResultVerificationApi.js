/**
 * @file testResultVerificationApi.js
 * @description API client for laboratory technical test results verification (UC72 / Verify Test Results / Issue I3-074).
 * Conforms to: Production Standards, Clean MVC Architecture & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch specimens currently awaiting technical verification.
 * @returns {Promise<Array>} List of verification queue items.
 */
export const fetchVerificationQueue = async () => {
    try {
        const response = await api.get("/laboratory/verification/queue");
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch verification queue:", error);
        return [];
    }
};

/**
 * Fetch technical verification checklist and specimen diagnostic packet.
 * @param {string} specimenId Barcode or specimen identifier.
 * @returns {Promise<Object|null>} Verification packet.
 */
export const fetchVerificationDetails = async (specimenId) => {
    if (!specimenId) return null;
    try {
        const response = await api.get(`/laboratory/verification/${encodeURIComponent(specimenId)}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch verification details for ${specimenId}:`, error);
        return null;
    }
};

/**
 * Verify test results and advance specimen to doctor approval.
 * @param {string} specimenId Specimen barcode/ID.
 * @param {Object} payload { verifierComment }
 * @returns {Promise<Object>}
 */
export const verifyTestResult = async (specimenId, payload) => {
    try {
        const response = await api.post(`/laboratory/verification/${encodeURIComponent(specimenId)}/verify`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to verify test results for ${specimenId}:`, error);
        throw error;
    }
};

/**
 * Return specimen to laboratory technician for correction.
 * @param {string} specimenId Specimen barcode/ID.
 * @param {Object} payload { returnReason }
 * @returns {Promise<Object>}
 */
export const returnTestResult = async (specimenId, payload) => {
    try {
        const response = await api.post(`/laboratory/verification/${encodeURIComponent(specimenId)}/return`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to return test results for ${specimenId}:`, error);
        throw error;
    }
};
