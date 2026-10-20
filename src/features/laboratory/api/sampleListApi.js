/**
 * @file sampleListApi.js
 * @description API client for laboratory sample collection lists and barcode generation (UC37).
 * Conforms to: Production Standards & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch checked-in appointments ready for phlebotomy intake directly from backend and database.
 * @returns {Promise<Array>} List of checked-in appointments.
 */
export const fetchCheckedInAppointments = async () => {
    try {
        const response = await api.get("/samplelist/appointments");
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch checked-in appointments from backend API:", error);
        return [];
    }
};

/**
 * Fetch phlebotomy collection batches.
 * @param {string|null} date Filter date string.
 * @returns {Promise<Array>} Batches list.
 */
export const fetchCollectionBatches = async (date = null) => {
    try {
        const response = await api.get("/samplelist/batches", { params: { date } });
        return response.data?.data || [];
    } catch (error) {
        console.error("Failed to fetch collection batches:", error);
        return [];
    }
};

/**
 * Fetch batch details by code.
 * @param {string} batchCode Batch code.
 * @returns {Promise<Object>} Batch details.
 */
export const fetchBatchByCode = async (batchCode) => {
    try {
        const response = await api.get(`/samplelist/batches/${batchCode}`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch batch ${batchCode}:`, error);
        throw error;
    }
};

/**
 * Confirm and create a new sample collection batch list.
 * @param {Object} batchData Batch payload.
 * @returns {Promise<Object>} Created batch response.
 */
export const createCollectionBatch = async (batchData) => {
    try {
        const response = await api.post("/samplelist/batches", batchData);
        return response.data;
    } catch (error) {
        console.error("Failed to create collection batch:", error);
        throw error;
    }
};

/**
 * Generate printable Code 128 barcode labels for a collection batch.
 * @param {string} batchCode Batch code.
 * @returns {Promise<Object>} Barcode labels payload.
 */
export const fetchBatchBarcodes = async (batchCode) => {
    try {
        const response = await api.get(`/samplelist/batches/${batchCode}/barcodes`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch barcodes for batch ${batchCode}:`, error);
        throw error;
    }
};
