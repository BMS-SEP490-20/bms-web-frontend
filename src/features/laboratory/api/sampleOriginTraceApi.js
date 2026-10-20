/**
 * @file sampleOriginTraceApi.js
 * @description API client for laboratory specimen origin traceability & chain of custody (UC77 / Issue I3-089).
 * Conforms to: Production Standards, Clean MVC Architecture & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch origin trace lineage flow and chain of custody metrics for a specimen.
 * @param {string} specimenId Barcode or specimen identifier.
 * @returns {Promise<Object|null>}
 */
export const fetchSampleOriginTrace = async (specimenId) => {
    if (!specimenId) return null;
    try {
        const response = await api.get(`/laboratory/trace/${encodeURIComponent(specimenId)}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch origin trace for ${specimenId}:`, error);
        return null;
    }
};

/**
 * Fetch recent traceable specimens for quick search.
 * @returns {Promise<Array>}
 */
export const fetchRecentTraceableSpecimens = async () => {
    try {
        const response = await api.get("/laboratory/trace/recent");
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch recent traceable specimens:", error);
        return [];
    }
};

/**
 * Export chain of custody audit certificate PDF payload.
 * @param {string} specimenId Specimen barcode or ID.
 * @returns {Promise<Object|null>}
 */
export const exportTracePdf = async (specimenId) => {
    if (!specimenId) return null;
    try {
        const response = await api.get(`/laboratory/trace/${encodeURIComponent(specimenId)}/export-pdf`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to export trace PDF for ${specimenId}:`, error);
        throw error;
    }
};
