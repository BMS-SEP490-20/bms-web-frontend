/**
 * @file PushNotificationCenterPage.jsx
 * @description Master Multi-Channel Push Notification & Audit Log Center (UC58 / I3-032).
 * Integrates real-time dispatch, multi-channel gateway routing (Push/FCM, InApp, SMS, Email),
 * emergency critical panic override, BR-NOTIF-01 rate limit monitoring, and in-app bell drawer.
 * Conforms to: Production Medical Standards, Clinical Emergency Escalation & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    FaBell,
    FaPaperPlane,
    FaExclamationTriangle,
    FaCheckCircle,
    FaTimesCircle,
    FaClock,
    FaSync,
    FaSearch,
    FaFilter,
    FaMobileAlt,
    FaEnvelope,
    FaCommentDots,
    FaRedo,
    FaEye,
    FaCheckDouble,
    FaShieldAlt,
    FaVolumeUp,
    FaBolt,
    FaUser,
    FaArrowRight,
    FaTimes,
    FaInfoCircle
} from "react-icons/fa";
import {
    dispatchNotification,
    getNotificationLogs,
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    resendNotification
} from "../api/pushNotificationApi";

// Predefined Demo Users for Quick Dispatch
const DEMO_USERS = [
    { id: "PAT-00892", name: "Trần Thị Ánh (Bệnh nhân Ngoại trú)", role: "Patient", defaultPlatform: "Android" },
    { id: "PAT-00451", name: "Lê Hoàng Nam (Bệnh nhân Lấy mẫu tại nhà)", role: "Patient", defaultPlatform: "iOS" },
    { id: "STAFF-0012", name: "BS. Nguyễn Văn Bình (Khoa Cấp cứu)", role: "Doctor", defaultPlatform: "Web" },
    { id: "LAB-003", name: "KTV. Phạm Quốc Hưng (Phòng Lab Sinh Hóa)", role: "Staff", defaultPlatform: "Web" }
];

// Predefined Template Categories
const CATEGORIES = [
    { key: "RESULT_READY", label: "Kết quả XN sẵn sàng", defaultPriority: "High", defaultAction: "/patient/test-reports" },
    { key: "CRITICAL_PANIC", label: "Báo động Nguy kịch (Critical Panic)", defaultPriority: "Critical_Panic", defaultAction: "/doctor/medical-records" },
    { key: "APPOINTMENT_REMINDER", label: "Nhắc nhở lịch hẹn", defaultPriority: "Normal", defaultAction: "/patient/appointments" },
    { key: "PAYMENT_REMINDER", label: "Nhắc thanh toán viện phí", defaultPriority: "Normal", defaultAction: "/billing/calculate-fee" },
    { key: "SYSTEM_ALERT", label: "Thông báo bảo trì hệ thống", defaultPriority: "Normal", defaultAction: "/dashboard" }
];

export default function PushNotificationCenterPage() {
    // Audit logs state
    const [logs, setLogs] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(8);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [activeTab, setActiveTab] = useState("ALL"); // ALL, CRITICAL, PUSH, INAPP, FAILED
    const [searchTerm, setSearchTerm] = useState("");
    const [channelFilter, setChannelFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");

    // Dispatch form state
    const [formUserId, setFormUserId] = useState("PAT-00892");
    const [formRecipientName, setFormRecipientName] = useState("Trần Thị Ánh");
    const [formChannel, setFormChannel] = useState("Push");
    const [formPriority, setFormPriority] = useState("High");
    const [formCategory, setFormCategory] = useState("RESULT_READY");
    const [formTitle, setFormTitle] = useState("Kết quả xét nghiệm Tổng phân tích máu đã sẵn sàng");
    const [formBody, setFormBody] = useState("Phiếu kết quả xét nghiệm mã số #ORD-2026-9901 đã được bác sĩ Trưởng khoa phê duyệt. Vui lòng bấm để xem chi tiết.");
    const [formActionUrl, setFormActionUrl] = useState("/patient/test-reports/ORD-2026-9901");
    const [formPlatform, setFormPlatform] = useState("Android");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formAlert, setFormAlert] = useState(null); // { type: 'success' | 'danger', message: string }

    // In-App Notification Drawer Simulation
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerUserId, setDrawerUserId] = useState("PAT-00892");
    const [userNotifications, setUserNotifications] = useState([]);
    const [drawerUnreadOnly, setDrawerUnreadOnly] = useState(false);

    // Details Modal
    const [selectedDetail, setSelectedDetail] = useState(null);

    // Sound effect synthesis via Web Audio API
    const playChime = useCallback((isCritical = false) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (isCritical) {
                // Emergency Alarm dual tone
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.5);
            } else {
                // Gentle chime
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.4);
            }
        } catch {
            // Audio context blocked or not supported
        }
    }, []);

    // Load audit logs
    const fetchLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            let priorityParam = priorityFilter;
            let channelParam = channelFilter;
            let statusParam = "ALL";

            if (activeTab === "CRITICAL") priorityParam = "Critical_Panic";
            if (activeTab === "PUSH") channelParam = "Push";
            if (activeTab === "INAPP") channelParam = "InApp";
            if (activeTab === "FAILED") statusParam = "FAILED";

            const result = await getNotificationLogs({
                search: searchTerm,
                channel: channelParam,
                priority: priorityParam,
                status: statusParam,
                pageNumber: currentPage,
                pageSize
            });

            setLogs(result.items || []);
            setTotalCount(result.totalCount || 0);
        } catch (error) {
            console.error("Failed to load notification logs:", error);
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, channelFilter, priorityFilter, searchTerm, currentPage, pageSize]);

    // Load user notifications for drawer
    const fetchUserNotifs = useCallback(async () => {
        try {
            const list = await getUserNotifications(drawerUserId, { unreadOnly: drawerUnreadOnly });
            setUserNotifications(list || []);
        } catch (err) {
            console.error("Failed to fetch user notifications:", err);
        }
    }, [drawerUserId, drawerUnreadOnly]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchUserNotifs();
    }, [fetchUserNotifs]);

    // Metrics calculations
    const metrics = useMemo(() => {
        const total = totalCount || logs.length;
        const criticalCount = logs.filter(l => l.priority === "Critical_Panic" || l.category === "CRITICAL_PANIC").length;
        const failedCount = logs.filter(l => l.status === "FAILED").length;
        const deliveredCount = logs.filter(l => l.status === "DELIVERED").length;
        const successRate = total > 0 ? Math.round((deliveredCount / total) * 100) : 100;
        return { total, criticalCount, failedCount, deliveredCount, successRate };
    }, [logs, totalCount]);

    // Unread count for bell
    const unreadCount = useMemo(() => {
        return userNotifications.filter(n => !n.isRead).length;
    }, [userNotifications]);

    // Handle Quick User Selection
    const handleSelectDemoUser = (user) => {
        setFormUserId(user.id);
        setFormRecipientName(user.name);
        setFormPlatform(user.defaultPlatform);
    };

    // Handle Category Selection
    const handleSelectCategory = (catKey) => {
        const cat = CATEGORIES.find(c => c.key === catKey);
        if (!cat) return;
        setFormCategory(cat.key);
        setFormPriority(cat.defaultPriority);
        setFormActionUrl(cat.defaultAction);

        if (cat.key === "CRITICAL_PANIC") {
            setFormTitle("BÁO ĐỘNG NGUY KỊCH: Giá trị sinh hóa vượt ngưỡng đỏ");
            setFormBody("Phòng xét nghiệm ghi nhận kết quả bất thường nguy kịch cần hội chẩn và xử trí cấp bách!");
            setFormChannel("Push");
        } else if (cat.key === "RESULT_READY") {
            setFormTitle("Kết quả xét nghiệm đã hoàn thành");
            setFormBody("Phiếu xét nghiệm của bạn đã được duyệt và cấp mã bảo mật xem trực tuyến.");
        } else if (cat.key === "APPOINTMENT_REMINDER") {
            setFormTitle("Nhắc nhở lịch hẹn khám bệnh BMS");
            setFormBody("Quý khách có lịch hẹn khám tại cơ sở số 1 vào ngày mai. Vui lòng đến đúng giờ.");
        } else if (cat.key === "PAYMENT_REMINDER") {
            setFormTitle("Thông báo viện phí cần quyết toán");
            setFormBody("Hóa đơn khám chữa bệnh của quý khách đã có thông tin chi tiết BHYT và số tiền đồng chi trả.");
        }
    };

    // Quick Test Action Buttons
    const triggerQuickTest = (type) => {
        if (type === "CRITICAL") {
            handleSelectCategory("CRITICAL_PANIC");
            setFormPriority("Critical_Panic");
            setFormChannel("Push");
        } else if (type === "RESULT") {
            handleSelectCategory("RESULT_READY");
            setFormPriority("High");
            setFormChannel("InApp");
        } else if (type === "FEE") {
            handleSelectCategory("PAYMENT_REMINDER");
            setFormPriority("Normal");
            setFormChannel("SMS");
        }
    };

    // Dispatch form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormAlert(null);
        setIsSubmitting(true);

        try {
            const isCritical = formPriority === "Critical_Panic" || formCategory === "CRITICAL_PANIC";
            const payload = {
                userId: formUserId,
                recipientName: formRecipientName,
                channel: formChannel,
                priority: formPriority,
                category: formCategory,
                title: formTitle,
                body: formBody,
                actionUrl: formActionUrl,
                devicePlatform: formPlatform
            };

            const result = await dispatchNotification(payload);

            playChime(isCritical);
            setFormAlert({
                type: "success",
                message: `[Mã: ${result.notificationId}] Đã gửi thông báo thành công qua kênh ${formChannel} đến ${formRecipientName} (${formUserId})!`
            });

            // Refresh logs and user notifications
            await fetchLogs();
            await fetchUserNotifs();
        } catch (error) {
            setFormAlert({
                type: "danger",
                message: error.message || "Không thể gửi thông báo. Vui lòng kiểm tra lại kết nối."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Resend failed notification
    const handleResend = async (id) => {
        try {
            const res = await resendNotification(id);
            setFormAlert({
                type: "success",
                message: res.message || `Đã thử gửi lại thông báo #${id} thành công!`
            });
            await fetchLogs();
        } catch (err) {
            setFormAlert({
                type: "danger",
                message: err.message || "Gửi lại thông báo thất bại."
            });
        }
    };

    // Mark single notification read
    const handleMarkRead = async (id) => {
        await markNotificationRead(id);
        await fetchLogs();
        await fetchUserNotifs();
    };

    // Mark all read for user
    const handleMarkAllRead = async () => {
        await markAllNotificationsRead(drawerUserId);
        await fetchLogs();
        await fetchUserNotifs();
    };

    return (
        <div className="container-fluid py-4 px-xl-5" style={{ minHeight: "90vh", background: "#f8fafc" }}>
            {/* Header Section */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
                <div>
                    <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-primary px-3 py-2 fs-6">UC58</span>
                        <h2 className="h3 mb-0 fw-bold text-slate-800">Trung Tâm Quản Lý & Phát Thông Báo Đa Kênh (Push Notifications)</h2>
                    </div>
                    <p className="text-muted small mt-1 mb-0">
                        Phát thông báo đẩy đa kênh (FCM Push, InApp, SMS, Email), kiểm soát giới hạn tần suất (BR-NOTIF-01: Tối đa 5 tin/phút) và kích hoạt ngoại lệ Báo động Nguy kịch (Critical Panic).
                    </p>
                </div>

                {/* Simulation Bell & Quick Actions */}
                <div className="d-flex align-items-center gap-3 mt-3 mt-md-0">
                    <button
                        className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => triggerQuickTest("CRITICAL")}
                        title="Nạp mẫu báo động nguy kịch vượt giới hạn"
                    >
                        <FaBolt /> Test Critical Panic
                    </button>
                    <button
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => triggerQuickTest("RESULT")}
                        title="Nạp mẫu thông báo kết quả xét nghiệm"
                    >
                        <FaCheckCircle /> Test Kết quả XN
                    </button>

                    {/* Bell Icon Simulation Button */}
                    <button
                        className="btn btn-light position-relative border shadow-sm px-3 py-2 d-flex align-items-center gap-2"
                        onClick={() => setIsDrawerOpen(true)}
                        id="btn-open-notification-drawer"
                    >
                        <FaBell className="text-primary fs-5" />
                        <span className="small fw-semibold d-none d-sm-inline">Hộp thư In-App</span>
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                                {unreadCount}
                                <span className="visually-hidden">thông báo chưa đọc</span>
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Metrics Ribbon */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-primary border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-muted small fw-semibold text-uppercase">Tổng Thông Báo</div>
                                <div className="fs-3 fw-bold text-dark mt-1">{metrics.total}</div>
                            </div>
                            <div className="rounded-circle bg-primary-subtle p-3 text-primary">
                                <FaPaperPlane className="fs-4" />
                            </div>
                        </div>
                        <div className="small text-muted mt-2">
                            <span className="text-success fw-bold">100%</span> nhật ký lưu trữ audit trail
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-danger border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-muted small fw-semibold text-uppercase">Báo Động Nguy Kịch</div>
                                <div className="fs-3 fw-bold text-danger mt-1">{metrics.criticalCount}</div>
                            </div>
                            <div className="rounded-circle bg-danger-subtle p-3 text-danger">
                                <FaExclamationTriangle className="fs-4" />
                            </div>
                        </div>
                        <div className="small text-danger mt-2 fw-semibold">
                            Ưu tiên cao nhất (Bypass Rate-Limit)
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-success border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-muted small fw-semibold text-uppercase">Tỷ Lệ Chuyển Giao</div>
                                <div className="fs-3 fw-bold text-success mt-1">{metrics.successRate}%</div>
                            </div>
                            <div className="rounded-circle bg-success-subtle p-3 text-success">
                                <FaCheckCircle className="fs-4" />
                            </div>
                        </div>
                        <div className="small text-muted mt-2">
                            {metrics.deliveredCount} tin đã gửi thành công
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-3 p-3 bg-white h-100 border-start border-warning border-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <div className="text-muted small fw-semibold text-uppercase">Lỗi / Chờ Thử Lại</div>
                                <div className="fs-3 fw-bold text-warning mt-1">{metrics.failedCount}</div>
                            </div>
                            <div className="rounded-circle bg-warning-subtle p-3 text-warning">
                                <FaClock className="fs-4" />
                            </div>
                        </div>
                        <div className="small text-muted mt-2">
                            Tự động thử lại tối đa 3 lần
                        </div>
                    </div>
                </div>
            </div>

            {/* Alert Banner */}
            {formAlert && (
                <div className={`alert alert-${formAlert.type} alert-dismissible fade show shadow-sm mb-4`} role="alert">
                    <div className="d-flex align-items-center gap-2">
                        {formAlert.type === "success" ? <FaCheckCircle className="fs-5" /> : <FaExclamationTriangle className="fs-5" />}
                        <div>{formAlert.message}</div>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setFormAlert(null)} aria-label="Close"></button>
                </div>
            )}

            {/* Main Content Layout: Form & Audit Table */}
            <div className="row g-4">
                {/* Left Column: Notification Dispatcher Form */}
                <div className="col-12 col-lg-5 col-xl-4">
                    <div className="card border-0 shadow-sm rounded-3 overflow-hidden sticky-top" style={{ top: "1.5rem" }}>
                        <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                            <h5 className="card-title mb-0 fw-bold d-flex align-items-center gap-2">
                                <FaPaperPlane className="text-primary" /> Phát Thông Báo Mới
                            </h5>
                            <span className="badge bg-secondary-subtle text-secondary small">Gateway Dispatcher</span>
                        </div>
                        <div className="card-body p-3 p-md-4">
                            <form onSubmit={handleSubmit}>
                                {/* Quick Demo User Selection */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-1">
                                        Đối tượng nhận (Demo Quick Select):
                                    </label>
                                    <div className="d-flex flex-wrap gap-1 mb-2">
                                        {DEMO_USERS.map(u => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                className={`btn btn-xs ${formUserId === u.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                                                onClick={() => handleSelectDemoUser(u)}
                                            >
                                                {u.id} ({u.role})
                                            </button>
                                        ))}
                                    </div>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaUser className="text-muted" /></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formUserId}
                                            onChange={e => setFormUserId(e.target.value)}
                                            placeholder="Mã người dùng (VD: PAT-00892)"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Recipient Name */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-1">Họ tên người nhận:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formRecipientName}
                                        onChange={e => setFormRecipientName(e.target.value)}
                                        placeholder="Tên bệnh nhân / Bác sĩ"
                                        required
                                    />
                                </div>

                                {/* Category Selection */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-1">Loại thông báo / Sự kiện:</label>
                                    <select
                                        className="form-select"
                                        value={formCategory}
                                        onChange={e => handleSelectCategory(e.target.value)}
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c.key} value={c.key}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Channel and Priority Row */}
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-muted text-uppercase mb-1">Kênh gửi:</label>
                                        <select
                                            className="form-select"
                                            value={formChannel}
                                            onChange={e => setFormChannel(e.target.value)}
                                        >
                                            <option value="Push">Push (FCM/APNS)</option>
                                            <option value="InApp">In-App Banner</option>
                                            <option value="SMS">SMS Gateway</option>
                                            <option value="Email">Email SMTP</option>
                                        </select>
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small fw-bold text-muted text-uppercase mb-1">Độ ưu tiên:</label>
                                        <select
                                            className={`form-select ${formPriority === 'Critical_Panic' ? 'border-danger text-danger fw-bold' : ''}`}
                                            value={formPriority}
                                            onChange={e => setFormPriority(e.target.value)}
                                        >
                                            <option value="Normal">Normal</option>
                                            <option value="High">High</option>
                                            <option value="Critical_Panic">CRITICAL PANIC</option>
                                        </select>
                                    </div>
                                </div>

                                {formPriority === "Critical_Panic" && (
                                    <div className="p-2 mb-3 rounded bg-danger-subtle text-danger small d-flex align-items-center gap-2 border border-danger">
                                        <FaExclamationTriangle className="flex-shrink-0" />
                                        <span><strong>Lưu ý khẩn cấp:</strong> Thông báo Critical Panic sẽ bypass rate limit và kích hoạt âm thanh cảnh báo trực tiếp đến thiết bị.</span>
                                    </div>
                                )}

                                {/* Title */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-1">Tiêu đề thông báo:</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formTitle}
                                        onChange={e => setFormTitle(e.target.value)}
                                        placeholder="Nhập tiêu đề tóm tắt..."
                                        required
                                    />
                                </div>

                                {/* Body */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-1">Nội dung chi tiết:</label>
                                    <textarea
                                        className="form-control"
                                        rows={3}
                                        value={formBody}
                                        onChange={e => setFormBody(e.target.value)}
                                        placeholder="Nội dung gửi đến người nhận..."
                                        required
                                    />
                                    <div className="d-flex justify-content-between text-muted small mt-1">
                                        <span>Tối đa 500 ký tự</span>
                                        <span>{formBody.length}/500</span>
                                    </div>
                                </div>

                                {/* Action URL */}
                                <div className="mb-3">
                                    <label className="form-label small fw-bold text-muted text-uppercase mb-1">Liên kết chuyển hướng (Action URL):</label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace small"
                                        value={formActionUrl}
                                        onChange={e => setFormActionUrl(e.target.value)}
                                        placeholder="/patient/test-reports"
                                    />
                                </div>

                                {/* Rate limit compliance badge */}
                                <div className="p-2 mb-3 rounded bg-light border small text-muted d-flex align-items-center justify-content-between">
                                    <span className="d-flex align-items-center gap-1">
                                        <FaShieldAlt className="text-success" />
                                        BR-NOTIF-01: Max 5 msg/min/user
                                    </span>
                                    <span className="badge bg-success-subtle text-success">Compliant</span>
                                </div>

                                {/* Submit button */}
                                <button
                                    type="submit"
                                    className={`btn ${formPriority === 'Critical_Panic' ? 'btn-danger' : 'btn-primary'} w-100 py-2 d-flex align-items-center justify-content-center gap-2 shadow-sm`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status"></span>
                                            <span>Đang chuyển phát qua Gateway...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaPaperPlane />
                                            <span>Phát Thông Báo Ngay</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Right Column: Audit Logs & Filtering */}
                <div className="col-12 col-lg-7 col-xl-8">
                    <div className="card border-0 shadow-sm rounded-3">
                        {/* Table Header & Controls */}
                        <div className="card-header bg-white py-3 border-bottom">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                                <div>
                                    <h5 className="card-title mb-0 fw-bold text-dark">Nhật Ký Chuyển Phát & Audit Trail</h5>
                                    <span className="text-muted small">Lịch sử giám sát trạng thái chuyển giao thông báo đa kênh</span>
                                </div>
                                <button
                                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                                    onClick={fetchLogs}
                                    disabled={isLoading}
                                >
                                    <FaSync className={isLoading ? "fa-spin" : ""} /> Làm mới
                                </button>
                            </div>

                            {/* Filter Tabs */}
                            <ul className="nav nav-pills mt-3 gap-2">
                                {[
                                    { key: "ALL", label: "Tất cả" },
                                    { key: "CRITICAL", label: "Nguy Kịch (Critical)", badge: "bg-danger text-white" },
                                    { key: "PUSH", label: "Push (FCM)" },
                                    { key: "INAPP", label: "In-App" },
                                    { key: "FAILED", label: "Thất bại / Dead-Letter", badge: "bg-warning text-dark" }
                                ].map(tab => (
                                    <li className="nav-item" key={tab.key}>
                                        <button
                                            className={`nav-link py-1 px-3 small ${activeTab === tab.key ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveTab(tab.key);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {/* Search & Channel Filters */}
                            <div className="row g-2 mt-2 pt-2 border-top">
                                <div className="col-12 col-sm-6">
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-light"><FaSearch className="text-muted" /></span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Tìm theo tiêu đề, người nhận, mã..."
                                            value={searchTerm}
                                            onChange={e => {
                                                setSearchTerm(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="col-6 col-sm-3">
                                    <select
                                        className="form-select form-select-sm"
                                        value={channelFilter}
                                        onChange={e => {
                                            setChannelFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option value="ALL">Mọi kênh</option>
                                        <option value="Push">Push (FCM)</option>
                                        <option value="InApp">In-App</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Email">Email</option>
                                    </select>
                                </div>
                                <div className="col-6 col-sm-3">
                                    <select
                                        className="form-select form-select-sm"
                                        value={priorityFilter}
                                        onChange={e => {
                                            setPriorityFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option value="ALL">Mọi ưu tiên</option>
                                        <option value="Normal">Normal</option>
                                        <option value="High">High</option>
                                        <option value="Critical_Panic">Critical Panic</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Audit Table */}
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light small text-muted text-uppercase">
                                    <tr>
                                        <th style={{ width: "120px" }}>Thời Gian</th>
                                        <th style={{ width: "130px" }}>Người Nhận</th>
                                        <th>Nội Dung Thông Báo</th>
                                        <th style={{ width: "100px" }}>Kênh</th>
                                        <th style={{ width: "110px" }}>Trạng Thái</th>
                                        <th style={{ width: "110px" }} className="text-end">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-muted">
                                                <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                                Đang tải dữ liệu nhật ký...
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center py-4 text-muted">
                                                Không tìm thấy thông báo nào phù hợp với bộ lọc.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map(log => {
                                            const isCritical = log.priority === "Critical_Panic" || log.category === "CRITICAL_PANIC";
                                            return (
                                                <tr key={log.id} className={isCritical ? "table-danger-subtle" : ""}>
                                                    {/* Sent Time */}
                                                    <td className="small text-muted">
                                                        <div>{new Date(log.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        <div style={{ fontSize: "0.75rem" }}>{new Date(log.sentAt).toLocaleDateString()}</div>
                                                    </td>

                                                    {/* Recipient */}
                                                    <td>
                                                        <div className="fw-semibold text-truncate" style={{ maxWidth: "120px" }}>
                                                            {log.recipientName || log.userId}
                                                        </div>
                                                        <span className="badge bg-light text-dark font-monospace" style={{ fontSize: "0.7rem" }}>
                                                            {log.userId}
                                                        </span>
                                                    </td>

                                                    {/* Content */}
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            {isCritical && (
                                                                <span className="badge bg-danger text-white py-1 px-2" style={{ fontSize: "0.65rem" }}>
                                                                    CRITICAL
                                                                </span>
                                                            )}
                                                            <span className="fw-bold text-dark text-truncate" style={{ maxWidth: "260px" }}>
                                                                {log.title}
                                                            </span>
                                                        </div>
                                                        <div className="text-muted small text-truncate mt-1" style={{ maxWidth: "340px" }}>
                                                            {log.body}
                                                        </div>
                                                        {log.actionUrl && (
                                                            <div className="font-monospace text-primary" style={{ fontSize: "0.7rem" }}>
                                                                Link: {log.actionUrl}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Channel Badge */}
                                                    <td>
                                                        <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                                                            {log.channel === "Push" && <FaMobileAlt className="text-primary" />}
                                                            {log.channel === "InApp" && <FaBell className="text-info" />}
                                                            {log.channel === "SMS" && <FaCommentDots className="text-success" />}
                                                            {log.channel === "Email" && <FaEnvelope className="text-secondary" />}
                                                            <span>{log.channel}</span>
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td>
                                                        {log.status === "DELIVERED" ? (
                                                            <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                                                                <FaCheckCircle /> Đã gửi
                                                            </span>
                                                        ) : log.status === "FAILED" ? (
                                                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1">
                                                                <FaTimesCircle /> Thất bại
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle d-inline-flex align-items-center gap-1">
                                                                <FaClock /> Đang chờ
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="text-end">
                                                        <div className="btn-group btn-group-sm">
                                                            <button
                                                                className="btn btn-outline-secondary"
                                                                title="Xem chi tiết"
                                                                onClick={() => setSelectedDetail(log)}
                                                            >
                                                                <FaEye />
                                                            </button>
                                                            {log.status === "FAILED" && (
                                                                <button
                                                                    className="btn btn-outline-warning"
                                                                    title="Gửi lại (Retry)"
                                                                    onClick={() => handleResend(log.id)}
                                                                >
                                                                    <FaRedo />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="card-footer bg-white py-3 border-top d-flex justify-content-between align-items-center">
                            <span className="small text-muted">
                                Hiển thị <strong>{logs.length}</strong> / <strong>{totalCount}</strong> thông báo
                            </span>
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    Trang trước
                                </button>
                                <button
                                    className="btn btn-outline-secondary btn-sm"
                                    disabled={currentPage * pageSize >= totalCount}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                >
                                    Trang sau
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* In-App Notification Drawer (Flyout) */}
            {isDrawerOpen && (
                <div
                    className="position-fixed top-0 end-0 bottom-0 bg-white shadow-lg border-start d-flex flex-column"
                    style={{ width: "400px", maxWidth: "90vw", zIndex: 1060 }}
                >
                    {/* Drawer Header */}
                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                        <div className="d-flex align-items-center gap-2">
                            <FaBell className="text-primary fs-5" />
                            <h6 className="mb-0 fw-bold">Thông Báo Của Bạn</h6>
                            {unreadCount > 0 && (
                                <span className="badge bg-danger rounded-pill">{unreadCount} mới</span>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setIsDrawerOpen(false)}
                            aria-label="Close"
                        ></button>
                    </div>

                    {/* Drawer User Switcher & Actions */}
                    <div className="p-2 border-bottom bg-white d-flex justify-content-between align-items-center">
                        <select
                            className="form-select form-select-sm"
                            style={{ width: "220px" }}
                            value={drawerUserId}
                            onChange={e => setDrawerUserId(e.target.value)}
                        >
                            {DEMO_USERS.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                            ))}
                        </select>
                        <button
                            className="btn btn-link btn-sm text-decoration-none p-0 d-flex align-items-center gap-1 text-primary small"
                            onClick={handleMarkAllRead}
                            title="Đánh dấu tất cả đã đọc"
                        >
                            <FaCheckDouble /> Đọc hết
                        </button>
                    </div>

                    {/* Drawer Notification List */}
                    <div className="flex-grow-1 overflow-auto p-2">
                        {userNotifications.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <FaBell className="fs-1 text-light-emphasis mb-2" />
                                <p className="mb-0 small">Chưa có thông báo nào cho tài khoản này.</p>
                            </div>
                        ) : (
                            userNotifications.map(item => {
                                const isCritical = item.priority === "Critical_Panic" || item.category === "CRITICAL_PANIC";
                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3 mb-2 rounded border position-relative transition-all ${!item.isRead ? 'bg-primary-subtle border-primary-subtle' : 'bg-white'}`}
                                        style={{ borderLeftWidth: isCritical ? "4px !important" : undefined, borderLeftColor: isCritical ? "#dc3545" : undefined }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <span className={`badge ${isCritical ? 'bg-danger text-white' : 'bg-light text-muted border'}`} style={{ fontSize: "0.65rem" }}>
                                                {item.category || item.channel}
                                            </span>
                                            <span className="text-muted small" style={{ fontSize: "0.7rem" }}>
                                                {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <h6 className="fw-bold mb-1 fs-6 text-dark">{item.title}</h6>
                                        <p className="small text-muted mb-2">{item.body}</p>
                                        <div className="d-flex justify-content-between align-items-center">
                                            {item.actionUrl ? (
                                                <a
                                                    href={item.actionUrl}
                                                    className="small fw-semibold text-primary text-decoration-none d-flex align-items-center gap-1"
                                                    onClick={() => handleMarkRead(item.id)}
                                                >
                                                    Xem chi tiết <FaArrowRight size={10} />
                                                </a>
                                            ) : <span></span>}
                                            {!item.isRead && (
                                                <button
                                                    className="btn btn-link btn-xs text-muted p-0 text-decoration-none small"
                                                    onClick={() => handleMarkRead(item.id)}
                                                >
                                                    Đánh dấu đã đọc
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Notification Detail Modal */}
            {selectedDetail && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">Chi Tiết Nhật Ký Thông Báo #{selectedDetail.id}</h5>
                                <button type="button" className="btn-close" onClick={() => setSelectedDetail(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="text-muted small text-uppercase fw-bold">Tiêu đề:</label>
                                    <div className="fw-bold fs-6">{selectedDetail.title}</div>
                                </div>
                                <div className="mb-3">
                                    <label className="text-muted small text-uppercase fw-bold">Nội dung:</label>
                                    <div className="p-2 bg-light rounded text-secondary small">{selectedDetail.body}</div>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="text-muted small text-uppercase fw-bold">Người nhận:</label>
                                        <div>{selectedDetail.recipientName} ({selectedDetail.userId})</div>
                                    </div>
                                    <div className="col-6">
                                        <label className="text-muted small text-uppercase fw-bold">Kênh / Nền tảng:</label>
                                        <div>{selectedDetail.channel} ({selectedDetail.devicePlatform || "Web"})</div>
                                    </div>
                                </div>
                                <div className="row g-2 mb-3">
                                    <div className="col-6">
                                        <label className="text-muted small text-uppercase fw-bold">Độ ưu tiên:</label>
                                        <div>{selectedDetail.priority}</div>
                                    </div>
                                    <div className="col-6">
                                        <label className="text-muted small text-uppercase fw-bold">Trạng thái:</label>
                                        <div>{selectedDetail.status}</div>
                                    </div>
                                </div>
                                {selectedDetail.errorMessage && (
                                    <div className="p-2 rounded bg-danger-subtle text-danger small">
                                        <strong>Lỗi gateway:</strong> {selectedDetail.errorMessage}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedDetail(null)}>
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
