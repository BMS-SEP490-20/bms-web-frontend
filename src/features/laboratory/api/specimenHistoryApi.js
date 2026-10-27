/**
 * @file specimenHistoryApi.js
 * @description API client for Specimen History retrieval, event tracking, and cold storage management (UC70 / Issue I3-068 / BR-212 / BR-213).
 * Conforms to: Production Standards, Clean MVC Architecture & AGENTS.md.
 */

import api from "../../../config/api";

/**
 * Fetch paged specimen history records with optional filters.
 * @param {Object} params - Query parameters { barcode, patientId, testOrderId, sampleType, status, fromDate, toDate, pageNumber, pageSize }
 * @returns {Promise<{ items: Array, totalCount: number, pageNumber: number, pageSize: number, totalPages: number }>}
 */
export const fetchSpecimenHistories = async (params = {}) => {
    try {
        const response = await api.get("/laboratory/specimens/history", { params });
        return response.data?.data || { items: [], totalCount: 0, pageNumber: 1, pageSize: 15, totalPages: 0 };
    } catch (error) {
        console.error("Failed to fetch specimen history list:", error);
        throw error;
    }
};

/**
 * Fetch comprehensive history and tracking details for a single specimen by barcode.
 * @param {string} barcode - Barcode or Specimen identifier (e.g., SMP-261021-001)
 * @returns {Promise<Object>} SpecimenHistoryDetailDto
 */
export const fetchSpecimenHistoryByBarcode = async (barcode) => {
    if (!barcode) return null;
    try {
        const response = await api.get(`/laboratory/specimens/${encodeURIComponent(barcode)}/history`);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to fetch specimen history for barcode ${barcode}:`, error);
        throw error;
    }
};

/**
 * Fetch all specimen history records for a specific patient.
 * @param {string} patientId - Patient Identifier (e.g., USR-PAT-01)
 * @returns {Promise<Array>} List of SpecimenHistoryListItemDto
 */
export const fetchSpecimenHistoriesByPatient = async (patientId) => {
    if (!patientId) return [];
    try {
        const response = await api.get(`/laboratory/specimens/patient/${encodeURIComponent(patientId)}/history`);
        return response.data?.data || [];
    } catch (error) {
        console.error(`Failed to fetch specimen history for patient ${patientId}:`, error);
        throw error;
    }
};

/**
 * Append a tracking or processing event to a specimen's lifecycle timeline.
 * @param {string} barcode - Specimen Barcode
 * @param {Object} eventData - { eventType, location, notes, equipmentId, operatorName }
 * @returns {Promise<Object>} Updated SpecimenHistoryDetailDto
 */
export const addSpecimenTrackingEvent = async (barcode, eventData) => {
    if (!barcode) throw new Error("Mã vạch mẫu bệnh phẩm là bắt buộc.");
    try {
        const response = await api.post(`/laboratory/specimens/${encodeURIComponent(barcode)}/events`, eventData);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to add tracking event for ${barcode}:`, error);
        throw error;
    }
};

/**
 * Update physical cold storage location and retention parameters for a specimen.
 * @param {string} barcode - Specimen Barcode
 * @param {Object} storageData - { storageUnit, rackId, shelfRow, boxSlot, targetTemperatureCelsius, targetRetentionDays, notes }
 * @returns {Promise<Object>} Updated SpecimenHistoryDetailDto
 */
export const updateSpecimenStorage = async (barcode, storageData) => {
    if (!barcode) throw new Error("Mã vạch mẫu bệnh phẩm là bắt buộc.");
    try {
        const response = await api.put(`/laboratory/specimens/${encodeURIComponent(barcode)}/storage`, storageData);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to update storage for ${barcode}:`, error);
        throw error;
    }
};
