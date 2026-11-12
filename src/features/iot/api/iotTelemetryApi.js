/**
 * @file iotTelemetryApi.js
 * @description API client for IoT Temperature & Humidity Collection (UC65, UC66),
 * Connection Outage Tracking, Offline Buffer Synchronization, and Sensor Log History (UC69).
 * Conforms to: Production Engineering Standards, BR-IOT-01, BR-IOT-02 & AGENTS-CODE.md.
 */

import api from "../../../config/api.js";

function unwrap(res) {
    if (res?.data?.success === false) {
        throw new Error(res.data.message || "Yêu cầu dữ liệu cảm biến IoT không thành công.");
    }
    return res?.data?.data ?? res?.data;
}

/**
 * Normalizes a single sensor log record so both backend DTO property names
 * (temperatureC, humidityPercent, isViolation) and UI property names
 * (temperature, humidity, isAnomaly) are always populated.
 */
function normalizeLogItem(item, mktFallback = null) {
    if (!item) return null;
    const temperature = Number(item.temperature ?? item.temperatureC ?? 0);
    const rawHum = item.humidity ?? item.humidityPercent;
    const humidity = rawHum !== null && rawHum !== undefined ? Number(rawHum) : null;
    const isViolation = Boolean(item.isAnomaly ?? item.isViolation ?? (item.status && item.status !== "Normal"));

    return {
        ...item,
        temperature,
        temperatureC: temperature,
        humidity,
        humidityPercent: humidity,
        meanKineticTemperature: Number(item.meanKineticTemperature ?? mktFallback ?? temperature),
        minAllowedTemp: Number(item.minAllowedTemp ?? item.minTempAllowed ?? 2.0),
        maxAllowedTemp: Number(item.maxAllowedTemp ?? item.maxTempAllowed ?? 8.0),
        minAllowedHumidity: Number(item.minAllowedHumidity ?? item.minHumidityAllowed ?? 45.0),
        maxAllowedHumidity: Number(item.maxAllowedHumidity ?? item.maxHumidityAllowed ?? 75.0),
        isAnomaly: isViolation,
        isViolation,
        isBuffered: Boolean(item.isBuffered),
        status: item.status || (isViolation ? "Warning" : "Normal"),
        alertMessage:
            item.alertMessage ||
            (isViolation
                ? `Vượt ngưỡng an toàn (${temperature.toFixed(1)}°C${humidity != null ? ` / ${humidity.toFixed(1)}%` : ""})`
                : "")
    };
}

/**
 * Normalizes the dashboard response from GET /api/iot/temperature so all UI views work seamlessly.
 */
function normalizeDashboard(raw, requestedDeviceId = "BMS-IOT-001") {
    const data = raw || {};
    const mkt = Number(data.meanKineticTemperature ?? data.summary?.meanKineticTemperature ?? data.latestTemperature ?? 0);

    const rawLogs = Array.isArray(data.logs)
        ? data.logs
        : Array.isArray(data.items)
        ? data.items
        : [];
    const items = rawLogs.map((l) => normalizeLogItem(l, mkt)).filter(Boolean);

    const rawChart = Array.isArray(data.chartSeries)
        ? data.chartSeries
        : [...items].reverse();
    const chartSeries = rawChart.map((l) => normalizeLogItem(l, mkt)).filter(Boolean);

    const outages = (Array.isArray(data.outages) ? data.outages : []).map((o) => ({
        ...o,
        status: o.status === "Disconnected" || o.status === "Ongoing" ? "Ongoing" : "Recovered"
    }));

    const connRaw = data.connection || {};
    const connection = {
        deviceId: connRaw.deviceId || requestedDeviceId,
        deviceName: connRaw.deviceName || "ESP32 DHT22 Tủ Bảo Quản Máu 01",
        location: connRaw.location || "Blood Storage Room 01",
        isConnected: Boolean(connRaw.isConnected),
        connectionState: connRaw.connectionState || (connRaw.isConnected ? "CONNECTED" : "DISCONNECTED"),
        lastSeenAt: connRaw.lastSeenAt || null,
        secondsSinceLastSeen: Number(connRaw.secondsSinceLastSeen ?? connRaw.currentOutageSeconds ?? 0),
        expectedIntervalSeconds: Number(data.intervalSeconds ?? connRaw.expectedIntervalSeconds ?? 5),
        disconnectThresholdSeconds: Number(connRaw.timeoutThresholdSeconds ?? connRaw.disconnectThresholdSeconds ?? 30),
        alertCode: connRaw.alertCode || "MSG-ERR-03",
        alertMessage:
            connRaw.alertMessage ||
            "MSG-ERR-03: Mất kết nối đến cảm biến IoT. Không thể lấy dữ liệu thời gian thực!",
        activeOutage: connRaw.activeOutage || null,
        lastRecoveredOutage: connRaw.lastRecoveredOutage || null
    };

    const currentTemperature = Number(
        data.latestTemperature ??
            connRaw.latestTemperature ??
            (items.length > 0 ? items[0].temperature : 0)
    );
    const rawLatestHum =
        data.latestHumidity ??
        connRaw.latestHumidity ??
        (items.length > 0 ? items[0].humidity : null);

    const summary = {
        currentTemperature,
        minTemperature: Number(data.minTemperature ?? data.summary?.minTemperature ?? currentTemperature),
        maxTemperature: Number(data.maxTemperature ?? data.summary?.maxTemperature ?? currentTemperature),
        avgTemperature: Number(data.avgTemperature ?? data.summary?.avgTemperature ?? currentTemperature),
        meanKineticTemperature: mkt || currentTemperature,
        currentHumidity: rawLatestHum != null ? Number(rawLatestHum) : null,
        minHumidity: data.minHumidity != null ? Number(data.minHumidity) : null,
        maxHumidity: data.maxHumidity != null ? Number(data.maxHumidity) : null,
        avgHumidity: data.avgHumidity != null ? Number(data.avgHumidity) : null,
        minAllowedTemp: Number(data.minTempThreshold ?? data.summary?.minAllowedTemp ?? 2.0),
        maxAllowedTemp: Number(data.maxTempThreshold ?? data.summary?.maxAllowedTemp ?? 8.0),
        minAllowedHumidity: Number(data.minHumidityThreshold ?? data.summary?.minAllowedHumidity ?? 45.0),
        maxAllowedHumidity: Number(data.maxHumidityThreshold ?? data.summary?.maxAllowedHumidity ?? 75.0),
        totalReadings: Number(data.totalLogsCount ?? data.summary?.totalReadings ?? items.length),
        violationReadings: Number(data.violationLogsCount ?? data.summary?.violationReadings ?? 0),
        bufferedReadingsCount: Number(data.bufferedLogsCount ?? data.summary?.bufferedReadingsCount ?? 0),
        outageCount: Number(data.outagesCount ?? data.summary?.outageCount ?? outages.length)
    };

    return {
        ...data,
        connection,
        summary,
        items,
        logs: items,
        chartSeries,
        outages
    };
}

/**
 * Fetch comprehensive IoT monitoring dashboard (live connection status, KPIs, chart series, outages, and logs).
 * @param {Object} params - { deviceId, status, outageId, search, hours, fromDate, toDate, page, pageNumber, pageSize }
 * @returns {Promise<Object>}
 */
export async function fetchIotMonitoringDashboard(params = {}) {
    const queryParams = {
        ...params,
        pageNumber: params.pageNumber || params.page || 1,
        pageSize: params.pageSize || 120
    };
    const raw = unwrap(await api.get("/iot/temperature", { params: queryParams }));
    return normalizeDashboard(raw, params.deviceId || "BMS-IOT-001");
}

/**
 * Alias of fetchIotMonitoringDashboard used by IotMonitorPage.
 */
export const getIotMonitorDashboard = fetchIotMonitoringDashboard;

/**
 * Fetch real-time connection status for an IoT sensor device.
 * @param {string} [deviceId="BMS-IOT-001"]
 * @returns {Promise<Object>}
 */
export async function fetchIotConnectionStatus(deviceId = "BMS-IOT-001") {
    return unwrap(await api.get("/iot/status", { params: { deviceId } }));
}

/**
 * Fetch connection loss outage windows and buffered data sync counts.
 * @param {string} [deviceId="BMS-IOT-001"]
 * @returns {Promise<Array>}
 */
export async function fetchIotOutages(deviceId = "BMS-IOT-001") {
    const data = unwrap(await api.get("/iot/outages", { params: { deviceId } }));
    return Array.isArray(data) ? data : [];
}

/**
 * Post a live or buffered temperature & humidity reading to Backend (/api/iot/temperature).
 * @param {Object} payload - { deviceId, location, temperature, humidity, bufferedReadings }
 * @returns {Promise<Object>}
 */
export async function ingestIotTelemetry(payload) {
    const res = unwrap(await api.post("/iot/temperature", payload));
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("bms-iot-status-changed"));
    }
    return res;
}

/**
 * Alias of ingestIotTelemetry used by IotMonitorPage.
 */
export const recordTemperatureTelemetry = ingestIotTelemetry;

/**
 * Trigger disconnection state for testing connection loss banner (MSG-ERR-03).
 * @param {string|Object} [deviceOrOpts="BMS-IOT-001"]
 * @returns {Promise<Object>}
 */
export async function forceIotDisconnect(deviceOrOpts = "BMS-IOT-001") {
    const deviceId =
        typeof deviceOrOpts === "string"
            ? deviceOrOpts
            : deviceOrOpts?.deviceId || "BMS-IOT-001";
    const res = unwrap(await api.post(`/iot/disconnect?deviceId=${encodeURIComponent(deviceId)}`));
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("bms-iot-status-changed"));
    }
    return res;
}

/**
 * Reconnect device and flush buffered offline readings captured during disconnection.
 * @param {Object} payload - { deviceId, location, outageDurationSeconds, sampleIntervalSeconds, baseTemperature, baseHumidity, bufferedReadings }
 * @returns {Promise<Object>}
 */
export async function reconnectAndSyncIot(payload = {}) {
    let res;
    if (Array.isArray(payload.bufferedReadings) && payload.bufferedReadings.length > 0) {
        res = unwrap(
            await api.post("/iot/temperature", {
                deviceId: payload.deviceId || "BMS-IOT-001",
                location: payload.location || "Blood Storage Room 01",
                temperature: payload.currentTemperature ?? payload.baseTemperature ?? 4.5,
                humidity: payload.currentHumidity ?? payload.baseHumidity ?? 58.5,
                bufferedReadings: payload.bufferedReadings
            })
        );
    } else {
        res = unwrap(await api.post("/iot/reconnect-sync", payload));
    }
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("bms-iot-status-changed"));
    }
    return res;
}


const SELECTED_IOT_DEVICE_KEY = "bms_selected_iot_device_id";

export function getSelectedIotDeviceId(fallback = "") {
    if (typeof window === "undefined") return fallback;
    try {
        return window.localStorage.getItem(SELECTED_IOT_DEVICE_KEY) || fallback;
    } catch {
        return fallback;
    }
}

export function setSelectedIotDeviceId(deviceId) {
    if (typeof window === "undefined" || !deviceId) return;
    try {
        window.localStorage.setItem(SELECTED_IOT_DEVICE_KEY, deviceId);
        window.dispatchEvent(new CustomEvent("bms-iot-device-changed", { detail: { deviceId } }));
    } catch {
        // Ignore storage restrictions
    }
}

export async function fetchIotDevices() {
    const res = unwrap(await api.get("/iot/devices"));
    return Array.isArray(res) ? res : [];
}


export async function createIotDevice(payload) {
    return unwrap(await api.post("/iot/devices", payload));
}

export async function fetchIotMqttConfig() {
    return unwrap(await api.get("/iot/mqtt-config"));
}

export async function updateIotMqttConfig(payload) {
    return unwrap(await api.put("/iot/mqtt-config", payload));
}
