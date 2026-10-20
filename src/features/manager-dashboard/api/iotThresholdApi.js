/**
 * @file iotThresholdApi.js
 * @description API client for IoT environmental sensor telemetry threshold configuration (UC67 / Issue I3-059).
 * Conforms to: Production Standards, Clean MVC Architecture & Zero Fabricated Data principles.
 */

import api from "../../../config/api";

/**
 * Fetch all configured IoT thresholds, rule counts, and alert recipients summary.
 * @returns {Promise<Object>} Threshold configuration summary.
 */
export const fetchIotThresholdsSummary = async () => {
    try {
        const response = await api.get("/iot/thresholds");
        return response.data?.data || null;
    } catch (error) {
        console.error("Failed to fetch IoT thresholds summary:", error);
        throw error;
    }
};

/**
 * Update thresholds for a specific IoT device.
 * @param {string} deviceId Device identifier (e.g. TEMP-001).
 * @param {Object} data LowAlert, HighAlert, IntervalSeconds.
 * @returns {Promise<Object>} Updated device threshold.
 */
export const updateIotThreshold = async (deviceId, data) => {
    try {
        const response = await api.put(`/iot/thresholds/${deviceId}`, data);
        return response.data?.data || null;
    } catch (error) {
        console.error(`Failed to update IoT threshold for ${deviceId}:`, error);
        throw error;
    }
};

/**
 * Batch update thresholds across all edited devices ("Save all").
 * @param {Array<Object>} devices Array of { deviceId, lowAlert, highAlert, intervalSeconds }.
 * @returns {Promise<Object>} Updated summary.
 */
export const batchUpdateIotThresholds = async (devices) => {
    try {
        const response = await api.post("/iot/thresholds/batch", { devices });
        return response.data?.data || null;
    } catch (error) {
        console.error("Failed to batch update IoT thresholds:", error);
        throw error;
    }
};

/**
 * Reset all IoT thresholds to system regulatory default values.
 * @returns {Promise<Object>} Default thresholds summary.
 */
export const resetDefaultIotThresholds = async () => {
    try {
        const response = await api.post("/iot/thresholds/reset-defaults");
        return response.data?.data || null;
    } catch (error) {
        console.error("Failed to reset default IoT thresholds:", error);
        throw error;
    }
};

/**
 * Add a new alert escalation recipient.
 * @param {Object} recipient { fullName, role, email, phone, channels }.
 * @returns {Promise<Object>} Created recipient.
 */
export const addAlertRecipient = async (recipient) => {
    try {
        const response = await api.post("/iot/thresholds/recipients", recipient);
        return response.data?.data || null;
    } catch (error) {
        console.error("Failed to add alert recipient:", error);
        throw error;
    }
};

/**
 * Remove an alert escalation recipient by ID.
 * @param {string} recipientId Recipient identifier.
 * @returns {Promise<boolean>} Success status.
 */
export const removeAlertRecipient = async (recipientId) => {
    try {
        const response = await api.delete(`/iot/thresholds/recipients/${recipientId}`);
        return response.data?.success || false;
    } catch (error) {
        console.error(`Failed to remove alert recipient ${recipientId}:`, error);
        throw error;
    }
};
