/**
 * @file testNoteApi.js
 * @description API client for laboratory test notes operations (UC52 / Add Test Notes).
 * Conforms to: Production Standards, Clean Architecture & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch specimen context and existing notes timeline directly from backend DB.
 * @param {string} specimenId Barcode or specimen identifier.
 * @returns {Promise<Object|null>}
 */
export const fetchSpecimenContext = async (specimenId) => {
    if (!specimenId) return null;
    try {
        const response = await api.get(`/testnotes/context/${encodeURIComponent(specimenId)}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch specimen context for ${specimenId}:`, error);
        return null;
    }
};

/**
 * Fetch list of notes attached to a specimen.
 * @param {string} specimenId Barcode or specimen identifier.
 * @returns {Promise<Array>}
 */
export const fetchNotesBySpecimen = async (specimenId) => {
    if (!specimenId) return [];
    try {
        const response = await api.get(`/testnotes/specimen/${encodeURIComponent(specimenId)}`);
        return response.data?.data || [];
    } catch (error) {
        console.error(`Failed to fetch notes for specimen ${specimenId}:`, error);
        return [];
    }
};

/**
 * Submit a new test note to the specimen (UC52).
 * @param {Object} noteData Payload containing specimenId, noteType, visibility, tags, content.
 * @returns {Promise<Object>}
 */
export const createTestNote = async (noteData) => {
    try {
        const response = await api.post("/testnotes", noteData);
        return response.data;
    } catch (error) {
        console.error("Failed to create test note:", error);
        throw error;
    }
};

/**
 * Fetch available specimens from laboratory queue to populate selector.
 * @returns {Promise<Array>}
 */
export const fetchAvailableSpecimens = async () => {
    try {
        const response = await api.get("/samples");
        return response.data?.data || response.data || [];
    } catch (error) {
        console.error("Failed to fetch specimens:", error);
        return [];
    }
};
