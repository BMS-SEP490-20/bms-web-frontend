/**
 * @file pushNotificationApi.js
 * @description API client for push / multi-channel notifications (dispatch, audit logs,
 * per-user inbox, read state, resend, device tokens). Talks only to the real backend;
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
 * Dispatch a push/multi-channel notification.
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function dispatchNotification(payload) {
    return unwrap(await api.post("/v1/notifications/dispatch", payload));
}

/**
 * Fetch notification audit logs.
 * @param {Object} params
 * @returns {Promise<Object|Array>}
 */
export async function getNotificationLogs(params = {}) {
    return unwrap(await api.get("/v1/notifications/logs", { params }));
}

/**
 * Fetch a user's notification inbox.
 * @param {string} userId
 * @param {Object} params
 * @returns {Promise<Object|Array>}
 */
export async function getUserNotifications(userId, params = {}) {
    return unwrap(await api.get(`/v1/notifications/user/${encodeURIComponent(userId)}`, { params }));
}

/**
 * Mark one notification as read.
 * @param {string} notificationId
 * @returns {Promise<Object>}
 */
export async function markNotificationRead(notificationId) {
    return unwrap(await api.patch(`/v1/notifications/${encodeURIComponent(notificationId)}/read`));
}

/**
 * Mark all notifications of a user as read.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function markAllNotificationsRead(userId) {
    return unwrap(await api.patch(`/v1/notifications/user/${encodeURIComponent(userId)}/read-all`));
}

/**
 * Resend a previously failed notification.
 * @param {string} notificationId
 * @returns {Promise<Object>}
 */
export async function resendNotification(notificationId) {
    return unwrap(await api.post(`/v1/notifications/${encodeURIComponent(notificationId)}/resend`));
}

/**
 * Register a device token for push delivery.
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function registerDeviceToken(payload) {
    return unwrap(await api.post("/v1/notifications/register-token", payload));
}
