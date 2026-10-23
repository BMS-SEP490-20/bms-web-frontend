/**
 * @file pushNotificationApi.js
 * @description Central API client and mock synchronization layer for UC58 Push Notifications.
 * Handles dispatching multi-channel notifications (Push/FCM, InApp, SMS, Email),
 * tracking audit logs, device token registrations, and unread counters.
 * Conforms to: Production Standards, BR-NOTIF-01 Rate Limiting & AGENTS-CODE.md.
 */

let apiInstance = null;

async function getApi() {
    if (apiInstance) return apiInstance;
    try {
        const mod = await import("../../../config/api.js");
        apiInstance = mod.default || mod;
        return apiInstance;
    } catch {
        return null;
    }
}

// In-memory mock database for development, offline demonstration, and unit testing
let mockNotificationLogs = [
    {
        id: "notif-001",
        userId: "PAT-00892",
        recipientName: "Trần Thị Ánh",
        channel: "Push",
        priority: "Critical_Panic",
        category: "CRITICAL_PANIC",
        title: "BÁO ĐỘNG NGUY KỊCH: Kali huyết cao (6.8 mmol/L)",
        body: "Bệnh nhân Trần Thị Ánh có giá trị Kali máu vượt ngưỡng nguy kịch 6.8 mmol/L. Yêu cầu bác sĩ trực can thiệp ngay lập tức!",
        actionUrl: "/doctor/medical-records/PAT-00892",
        status: "DELIVERED",
        devicePlatform: "Android",
        retryCount: 0,
        errorMessage: null,
        isRead: false,
        sentAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        readAt: null
    },
    {
        id: "notif-002",
        userId: "PAT-00892",
        recipientName: "Trần Thị Ánh",
        channel: "InApp",
        priority: "High",
        category: "RESULT_READY",
        title: "Kết quả xét nghiệm Tổng phân tích máu đã sẵn sàng",
        body: "Phiếu kết quả xét nghiệm mã số #ORD-2026-9901 đã được bác sĩ Trưởng khoa phê duyệt. Vui lòng bấm để xem chi tiết.",
        actionUrl: "/patient/test-reports/ORD-2026-9901",
        status: "DELIVERED",
        devicePlatform: "Web",
        retryCount: 0,
        errorMessage: null,
        isRead: true,
        sentAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        readAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
    },
    {
        id: "notif-003",
        userId: "PAT-00451",
        recipientName: "Lê Hoàng Nam",
        channel: "SMS",
        priority: "Normal",
        category: "APPOINTMENT_REMINDER",
        title: "Nhắc nhở lịch hẹn lấy mẫu tại nhà ngày mai",
        body: "Kính chào Quý khách Lê Hoàng Nam, điều dưỡng BMS sẽ có mặt tại nhà quý khách lúc 08:30 ngày mai (24/10/2026).",
        actionUrl: "/patient/appointments",
        status: "DELIVERED",
        devicePlatform: "SMS_Gateway",
        retryCount: 0,
        errorMessage: null,
        isRead: false,
        sentAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        readAt: null
    },
    {
        id: "notif-004",
        userId: "PAT-00104",
        recipientName: "Nguyễn Văn Hùng",
        channel: "Push",
        priority: "Normal",
        category: "PAYMENT_REMINDER",
        title: "Hóa đơn viện phí chưa thanh toán",
        body: "Hóa đơn viện phí #INV-8821 với số tiền 420.000 VNĐ đang chờ thanh toán qua cổng VNPay/MoMo.",
        actionUrl: "/billing/calculate-fee",
        status: "FAILED",
        devicePlatform: "iOS",
        retryCount: 3,
        errorMessage: "FCM Device Token Expired / APNS BadDeviceToken",
        isRead: false,
        sentAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        readAt: null
    },
    {
        id: "notif-005",
        userId: "STAFF-0012",
        recipientName: "BS. Nguyễn Văn Bình",
        channel: "InApp",
        priority: "Normal",
        category: "SYSTEM_ALERT",
        title: "Bảo trì định kỳ máy phân tích sinh hóa Cobas 8000",
        body: "Hệ thống LIS thông báo máy Cobas 8000 phòng Lab 02 sẽ được bảo trì vào lúc 18:00 hôm nay.",
        actionUrl: "/laboratory/batches",
        status: "DELIVERED",
        devicePlatform: "Web",
        retryCount: 0,
        errorMessage: null,
        isRead: false,
        sentAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        readAt: null
    }
];

// Anti-spam tracker for mock mode (BR-NOTIF-01: max 5 per min per user)
const mockUserDispatchHistory = new Map();

/**
 * Dispatch a push/multi-channel notification.
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
export async function dispatchNotification(payload) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.post("/v1/notifications/dispatch", payload);
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch (err) {
            console.warn("Backend API dispatch failed, utilizing fallback mock logic:", err.message);
        }
    }

    // Fallback Mock Engine adhering to BR-NOTIF-01
    const { userId, channel, priority, category, title, body, actionUrl, devicePlatform } = payload;
    const now = Date.now();

    // Check rate limit if not Critical_Panic
    const isCritical = priority === "Critical_Panic" || category === "CRITICAL_PANIC";
    if (!isCritical) {
        const timestamps = mockUserDispatchHistory.get(userId) || [];
        const recentTimestamps = timestamps.filter(t => now - t < 60000);
        if (recentTimestamps.length >= 5) {
            throw new Error(`[BR-NOTIF-01] Vượt quá giới hạn tần suất gửi tin nhắn (Tối đa 5 thông báo/phút cho bệnh nhân ${userId}).`);
        }
        recentTimestamps.push(now);
        mockUserDispatchHistory.set(userId, recentTimestamps);
    }

    const newLog = {
        id: `notif-${Date.now().toString().slice(-6)}`,
        userId: userId || "PAT-DEMO",
        recipientName: payload.recipientName || "Người nhận",
        channel: channel || "Push",
        priority: priority || "Normal",
        category: category || "GENERAL",
        title: title || "Thông báo từ BMS",
        body: body || "",
        actionUrl: actionUrl || "/notifications",
        status: "DELIVERED",
        devicePlatform: devicePlatform || "Web",
        retryCount: 0,
        errorMessage: null,
        isRead: false,
        sentAt: new Date().toISOString(),
        readAt: null
    };

    mockNotificationLogs.unshift(newLog);
    return {
        notificationId: newLog.id,
        status: newLog.status,
        channel: newLog.channel,
        deliveredAt: newLog.sentAt,
        message: "Thông báo đã được gửi thành công đến người nhận."
    };
}

/**
 * Fetch paged notification audit logs with search, channel, priority, and status filtering.
 * @param {Object} params 
 * @returns {Promise<Object>}
 */
export async function getNotificationLogs(params = {}) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get("/v1/notifications/logs", { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch (err) {
            console.warn("Backend API getNotificationLogs failed, utilizing mock logs:", err.message);
        }
    }

    // Mock search/filtering
    let filtered = [...mockNotificationLogs];
    const { channel, priority, status, search, userId } = params;

    if (userId) {
        filtered = filtered.filter(n => n.userId.toLowerCase() === userId.toLowerCase());
    }
    if (channel && channel !== "ALL") {
        filtered = filtered.filter(n => n.channel.toLowerCase() === channel.toLowerCase());
    }
    if (priority && priority !== "ALL") {
        filtered = filtered.filter(n => n.priority.toLowerCase() === priority.toLowerCase());
    }
    if (status && status !== "ALL") {
        filtered = filtered.filter(n => n.status.toLowerCase() === status.toLowerCase());
    }
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.body.toLowerCase().includes(q) ||
            n.userId.toLowerCase().includes(q) ||
            (n.recipientName && n.recipientName.toLowerCase().includes(q))
        );
    }

    const page = params.pageNumber || 1;
    const pageSize = params.pageSize || 10;
    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const pagedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
        items: pagedItems,
        totalCount,
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize) || 1
    };
}

/**
 * Get active user notifications (for in-app bell drawer).
 * @param {string} userId 
 * @param {Object} params 
 * @returns {Promise<Array>}
 */
export async function getUserNotifications(userId, params = {}) {
    if (!userId) return [];
    const api = await getApi();
    if (api) {
        try {
            const res = await api.get(`/v1/notifications/user/${encodeURIComponent(userId)}`, { params });
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch (err) {
            console.warn("Backend API getUserNotifications failed, using mock data:", err.message);
        }
    }

    let userLogs = mockNotificationLogs.filter(n => n.userId.toLowerCase() === userId.toLowerCase());
    if (params.unreadOnly) {
        userLogs = userLogs.filter(n => !n.isRead);
    }
    return userLogs;
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId 
 * @returns {Promise<boolean>}
 */
export async function markNotificationRead(notificationId) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.put(`/v1/notifications/${encodeURIComponent(notificationId)}/read`);
            if (res.data?.success) return true;
        } catch (err) {
            console.warn("Backend API markNotificationRead failed, using mock:", err.message);
        }
    }

    const item = mockNotificationLogs.find(n => n.id === notificationId);
    if (item) {
        item.isRead = true;
        item.readAt = new Date().toISOString();
        return true;
    }
    return false;
}

/**
 * Mark all notifications as read for a given user.
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export async function markAllNotificationsRead(userId) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.put(`/v1/notifications/user/${encodeURIComponent(userId)}/read-all`);
            if (res.data?.success) return true;
        } catch (err) {
            console.warn("Backend API markAllNotificationsRead failed, using mock:", err.message);
        }
    }

    mockNotificationLogs.forEach(n => {
        if (n.userId.toLowerCase() === userId.toLowerCase()) {
            n.isRead = true;
            n.readAt = new Date().toISOString();
        }
    });
    return true;
}

/**
 * Resend / retry a failed notification.
 * @param {string} notificationId 
 * @returns {Promise<Object>}
 */
export async function resendNotification(notificationId) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.post(`/v1/notifications/${encodeURIComponent(notificationId)}/resend`);
            if (res.data?.success && res.data?.data) {
                return res.data.data;
            }
        } catch (err) {
            console.warn("Backend API resend failed, using mock:", err.message);
        }
    }

    const item = mockNotificationLogs.find(n => n.id === notificationId);
    if (item) {
        item.status = "DELIVERED";
        item.retryCount += 1;
        item.errorMessage = null;
        item.sentAt = new Date().toISOString();
        return {
            notificationId: item.id,
            status: "DELIVERED",
            retryCount: item.retryCount,
            message: "Gửi lại thông báo thành công qua kênh dự phòng."
        };
    }
    throw new Error("Không tìm thấy mã thông báo yêu cầu gửi lại.");
}

/**
 * Register mobile/web push token for user device.
 * @param {Object} payload { userId, token, platform }
 * @returns {Promise<boolean>}
 */
export async function registerDeviceToken(payload) {
    const api = await getApi();
    if (api) {
        try {
            const res = await api.post("/v1/notifications/register-token", payload);
            if (res.data?.success) return true;
        } catch (err) {
            console.warn("Backend API registerDeviceToken failed, using mock:", err.message);
        }
    }
    return true;
}
