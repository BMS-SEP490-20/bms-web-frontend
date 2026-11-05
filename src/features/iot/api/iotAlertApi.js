/**
 * @file iotAlertApi.js
 * @description API client for IoT alert threshold violations (incident list, summary,
 * acknowledgement, resolution, telemetry evaluation). Talks only to the real backend;
 * no in-memory fallback data is ever returned.
 */

import api from "../../../config/api.js";

/**
 * Unwraps the standard `{ success, data }` envelope or throws a readable error.
 * @param {import("axios").AxiosResponse} res
 * @returns {*} The `data` payload.
 */
function unwrap(res) {
    if (res?.data?.success === false) {
        throw new Error(res.data.message || "Yêu cầu không thành công.");
    }
    return res?.data?.data ?? res?.data;
}

/**
 * Fetch list of alerts with optional filters.
 * @param {Object} params - { status, severity, deviceId, sensorType }
 * @returns {Promise<Array>}
 */
export async function fetchAlerts(params = {}) {
    const data = unwrap(await api.get("/iot/alerts", { params }));
    return Array.isArray(data) ? data : [];
}

/**
 * Fetch currently active alerts.
 * @returns {Promise<Array>}
 */
export async function fetchActiveAlerts() {
    return fetchAlerts({ status: "Active" });
}

/**
 * Fetch aggregate alert counters.
 * @returns {Promise<Object>}
 */
export async function fetchAlertSummary() {
    return unwrap(await api.get("/iot/alerts/summary"));
}

/**
 * Fetch one alert by id.
 * @param {string} alertId
 * @returns {Promise<Object|null>}
 */
export async function getAlertById(alertId) {
    return unwrap(await api.get(`/iot/alerts/${encodeURIComponent(alertId)}`)) || null;
}

/**
 * Acknowledge an active alert.
 * @param {string} alertId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function acknowledgeAlert(alertId, payload) {
    return unwrap(await api.put(`/iot/alerts/${encodeURIComponent(alertId)}/acknowledge`, payload));
}

/**
 * Resolve an alert with corrective action notes.
 * @param {string} alertId
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function resolveAlert(alertId, payload) {
    return unwrap(await api.put(`/iot/alerts/${encodeURIComponent(alertId)}/resolve`, payload));
}

/**
 * Submit a telemetry reading for threshold evaluation.
 * @param {Object} reading - { deviceId, sensorType, value }
 * @returns {Promise<Object>}
 */
export async function evaluateTelemetry(reading) {
    return unwrap(await api.post("/iot/telemetry/evaluate", reading));
}

/**
 * Trigger a drill alert through the backend simulate endpoint.
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function simulateAlert(payload) {
    return unwrap(await api.post("/iot/alerts/simulate", payload));
}
