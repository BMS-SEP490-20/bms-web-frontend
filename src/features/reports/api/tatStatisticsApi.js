/**
 * @file tatStatisticsApi.js
 * @description API networking client for UC63 Turnaround Time (TAT) Analytics.
 */

let apiInstance = null;

async function getApi() {
    if (apiInstance) return apiInstance;
    const mod = await import("../../../config/api.js");
    apiInstance = mod.default || mod;
    return apiInstance;
}

function extractApiError(err, fallbackMessage) {
    return new Error(
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        err?.message ||
        fallbackMessage
    );
}

/**
 * Fetch master Turnaround Time (TAT) statistics report.
 * @param {Object} params - { fromDate, toDate, department, priority, labRoom }
 * @returns {Promise<Object>}
 */
export async function fetchTatReport(params = {}) {
    const api = await getApi();
    try {
        const res = await api.get("/v1/statistics/tat/report", { params });
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải báo cáo thống kê TAT.");
    } catch (err) {
        if (err?.response?.status === 404) {
            try {
                const res = await api.get("/TatReports/report", { params });
                if (res.data?.success && res.data?.data) {
                    return res.data.data;
                }
            } catch (err2) {
                throw extractApiError(err2, "Không thể tải báo cáo thống kê TAT.");
            }
        }
        throw extractApiError(err, "Không thể tải báo cáo thống kê TAT.");
    }
}

/**
 * Fetch top-level KPI summary metrics.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function fetchTatSummary(params = {}) {
    const api = await getApi();
    try {
        const res = await api.get("/v1/statistics/tat/summary", { params });
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải tóm tắt KPI TAT.");
    } catch (err) {
        throw extractApiError(err, "Không thể tải tóm tắt KPI TAT.");
    }
}

/**
 * Fetch periodic trend data points for chart rendering.
 * @param {Object} params
 * @returns {Promise<Array>}
 */
export async function fetchTatTrends(params = {}) {
    const api = await getApi();
    try {
        const res = await api.get("/v1/statistics/tat/trends", { params });
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải xu hướng TAT.");
    } catch (err) {
        throw extractApiError(err, "Không thể tải xu hướng TAT.");
    }
}

/**
 * Fetch SLA outlier sample violations exceeding target thresholds.
 * @param {Object} params
 * @returns {Promise<Array>}
 */
export async function fetchTatViolations(params = {}) {
    const api = await getApi();
    try {
        const res = await api.get("/v1/statistics/tat/violations", { params });
        if (res.data?.success && res.data?.data) {
            return res.data.data;
        }
        throw new Error(res.data?.message || "Không thể tải danh sách mẫu quá hạn TAT.");
    } catch (err) {
        throw extractApiError(err, "Không thể tải danh sách mẫu quá hạn TAT.");
    }
}

/**
 * Export TAT report as CSV blob.
 * @param {Object} params
 * @returns {Promise<Blob>}
 */
export async function exportTatCsv(params = {}) {
    const api = await getApi();
    try {
        const res = await api.get("/v1/statistics/tat/export/csv", {
            params,
            responseType: "blob"
        });
        if (res.data) {
            return res.data;
        }
        throw new Error("Không nhận được dữ liệu CSV từ máy chủ.");
    } catch (err) {
        throw extractApiError(err, "Xuất báo cáo TAT CSV thất bại.");
    }
}
