/**
 * @file testResultNotificationApi.js
 * @description API client for Laboratory Diagnostic Test Result Notifications (UC60 / BR-183).
 * Conforms to: Production Standards, Clean MVC Architecture & AGENTS-CODE.md.
 */

import api from "../../../config/api";

/**
 * Fetch paged list of notifications with optional filters.
 * @param {Object} params - { patientId, testOrderId, channel, priority, status, isCritical, fromDate, toDate, pageNumber, pageSize }
 * @returns {Promise<{ items: Array, totalCount: number, currentPage: number, pageSize: number, totalPages: number }>}
 */
export const fetchNotifications = async (params = {}) => {
    const response = await api.get("/notifications/test-results", { params });
    return response.data?.data || { items: [], totalCount: 0, currentPage: 1, pageSize: 15, totalPages: 0 };
};

/**
 * Fetch notification detail by ID.
 * @param {string} id - Notification ID
 * @returns {Promise<Object>}
 */
export const fetchNotificationById = async (id) => {
    if (!id) return null;
    const response = await api.get(`/notifications/test-results/${encodeURIComponent(id)}`);
    return response.data?.data || null;
};

/**
 * Fetch notifications for a specific patient.
 * @param {string} patientId - Patient Identifier
 * @returns {Promise<Array>}
 */
export const fetchPatientNotifications = async (patientId) => {
    if (!patientId) return [];
    const response = await api.get(`/notifications/test-results/patient/${encodeURIComponent(patientId)}`);
    return response.data?.data || [];
};

/**
 * Fetch unread notification count for a patient.
 * @param {string} patientId - Patient Identifier
 * @returns {Promise<number>}
 */
export const fetchPatientUnreadCount = async (patientId) => {
    if (!patientId) return 0;
    try {
        const response = await api.get(`/notifications/test-results/patient/${encodeURIComponent(patientId)}/unread-count`);
        return response.data?.data ?? 0;
    } catch {
        return 0;
    }
};

/**
 * Dispatch a new test result notification.
 * @param {Object} payload - { testOrderId, specimenBarcode, patientId, patientName, patientPhone, patientEmail, title, message, channel, priority, isCriticalPanicValue, criticalParameters, requiresImmediateAction, clinicalRecommendation, testPackageName }
 * @returns {Promise<Object>}
 */
export const dispatchNotification = async (payload) => {
    const response = await api.post("/notifications/test-results/dispatch", payload);
    return response.data?.data || null;
};

/**
 * Mark a notification as read.
 * @param {string} id - Notification ID
 * @returns {Promise<boolean>}
 */
export const markNotificationAsRead = async (id) => {
    if (!id) return false;
    const response = await api.put(`/notifications/test-results/${encodeURIComponent(id)}/read`);
    return response.data?.data === true;
};

/**
 * Resend an existing notification with optional overrides.
 * @param {string} id - Notification ID
 * @param {Object} payload - { channelOverride, destinationOverride }
 * @returns {Promise<Object>}
 */
export const resendNotification = async (id, payload = {}) => {
    if (!id) throw new Error("Mã thông báo không được để trống.");
    const response = await api.post(`/notifications/test-results/${encodeURIComponent(id)}/resend`, payload);
    return response.data?.data || null;
};

/**
 * Fetch overall notification statistics.
 * @returns {Promise<{ totalNotifications: number, deliveredSuccessfully: number, criticalPanicAlerts: number, pendingCount: number, failedCount: number, deliverySuccessRate: number }>}
 */
export const fetchNotificationStats = async () => {
    try {
        const response = await api.get("/notifications/test-results/stats");
        return response.data?.data || {
            totalNotifications: 0,
            deliveredSuccessfully: 0,
            criticalPanicAlerts: 0,
            pendingCount: 0,
            failedCount: 0,
            deliverySuccessRate: 100.0
        };
    } catch {
        return {
            totalNotifications: 0,
            deliveredSuccessfully: 0,
            criticalPanicAlerts: 0,
            pendingCount: 0,
            failedCount: 0,
            deliverySuccessRate: 100.0
        };
    }
};


/**
 * Fetch list of patients with completed test results (UC60).
 * @returns {Promise<Array>}
 */
export const fetchCompletedTestPatients = async () => {
    const response = await api.get("/notifications/test-results/completed-patients");
    return response.data?.data || [];
};
