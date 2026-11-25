/**
 * @file PushNotificationCenterPage.jsx
 * @description Multi-Channel Push Notification Center & Delivery Log (UC58 / I3-032).
 * Clean 2D flat BMS layout for Admins/Staff to compose & dispatch notifications and monitor delivery status,
 * plus dedicated Patient Notification Inbox view.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Bell,
    Send,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Search as LucideSearch,
    Smartphone,
    Mail,
    MessageSquare,
    RotateCw,
    Eye,
    CheckCheck,
    ArrowRight,
    ArrowLeft,
    X as LucideX,
    FlaskConical,
    Calendar,
    Receipt,
    Check
} from "lucide-react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { ROLES, resolveRoleId } from "../../../constants/roles";
import {
    dispatchNotification,
    getNotificationLogs,
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    resendNotification
} from "../api/pushNotificationApi";
import userManagementService from "../../../services/userManagementService";

const CATEGORIES = [
    { key: "RESULT_READY", label: "Kết quả xét nghiệm sẵn sàng", defaultPriority: "High", defaultAction: "/patient/test-history" },
    { key: "CRITICAL_PANIC", label: "Cảnh báo kết quả bất thường (Critical)", defaultPriority: "Critical_Panic", defaultAction: "/doctor/medical-records" },
    { key: "APPOINTMENT_REMINDER", label: "Nhắc nhở lịch hẹn", defaultPriority: "Normal", defaultAction: "/appointments" },
    { key: "PAYMENT_REMINDER", label: "Nhắc thanh toán", defaultPriority: "Normal", defaultAction: "/patient/payment-history" },
    { key: "SYSTEM_ALERT", label: "Thông báo hệ thống", defaultPriority: "Normal", defaultAction: "/dashboard" }
];

const LOG_TABS = [
    { key: "ALL", label: "Tất cả" },
    { key: "CRITICAL", label: "Nguy kịch" },
    { key: "PUSH", label: "Push (FCM)" },
    { key: "INAPP", label: "In-App" },
    { key: "FAILED", label: "Thất bại" }
];

export default function PushNotificationCenterPage() {
    const { user, userRole, userRoleId } = useAuth();
    const navigate = useNavigate();
    const currentRoleId = useMemo(() => resolveRoleId(user) ?? resolveRoleId(userRoleId), [user, userRoleId]);
    const isPatient = useMemo(() => currentRoleId === ROLES.PATIENT || userRole === "patient", [currentRoleId, userRole]);
    const canViewLogs = useMemo(() => currentRoleId === ROLES.ADMIN || currentRoleId === ROLES.MANAGER, [currentRoleId]);
    const canViewUsers = useMemo(() => currentRoleId === ROLES.ADMIN, [currentRoleId]);
    const [patientFilter, setPatientFilter] = useState("ALL");

    // Audit logs state
    const [logs, setLogs] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(8);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);

    // Filters
    const [activeTab, setActiveTab] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [channelFilter, setChannelFilter] = useState("ALL");
    const [priorityFilter, setPriorityFilter] = useState("ALL");

    // Dispatch form state
    const [formUserId, setFormUserId] = useState("");
    const [formRecipientName, setFormRecipientName] = useState("");
    const [formChannel, setFormChannel] = useState("InApp");
    const [formPriority, setFormPriority] = useState("Normal");
    const [formCategory, setFormCategory] = useState("SYSTEM_ALERT");
    const [formTitle, setFormTitle] = useState("");
    const [formBody, setFormBody] = useState("");
    const [formActionUrl, setFormActionUrl] = useState("");
    const [formPlatform, setFormPlatform] = useState("Web");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formAlert, setFormAlert] = useState(null);
    const [availableUsers, setAvailableUsers] = useState([]);

    // In-App Notification Drawer
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerUserId, setDrawerUserId] = useState("");
    const [userNotifications, setUserNotifications] = useState([]);

    // Detail Modal
    const [selectedDetail, setSelectedDetail] = useState(null);

    const playChime = useCallback((isCritical = false) => {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            if (isCritical) {
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.45);
            } else {
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 0.35);
            }
        } catch {
            // AudioContext unsupported or blocked
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        if (!canViewLogs) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setLoadError(null);
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

            const items = Array.isArray(result) ? result : (result?.items ?? []);
            setLogs(items);
            setTotalCount(result?.totalItems ?? result?.totalCount ?? items.length);
        } catch (error) {
            console.error("Failed to load notification logs:", error);
            setLoadError(error.message || "Không thể tải nhật ký thông báo từ máy chủ.");
        } finally {
            setIsLoading(false);
        }
    }, [canViewLogs, activeTab, channelFilter, priorityFilter, searchTerm, currentPage, pageSize]);

    const targetUserId = useMemo(() => {
        if (isPatient) return user?.id || user?._id || user?.sub || "";
        return drawerUserId;
    }, [isPatient, user, drawerUserId]);

    const fetchUserNotifs = useCallback(async () => {
        if (!targetUserId) return;
        try {
            const raw = await getUserNotifications(targetUserId, { unreadOnly: false });
            const list = Array.isArray(raw) ? raw : (raw?.items ?? []);
            setUserNotifications(list);
        } catch {
            setUserNotifications([]);
        }
    }, [targetUserId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchUserNotifs();
    }, [fetchUserNotifs]);

    const metrics = useMemo(() => {
        const total = totalCount || logs.length;
        const criticalCount = logs.filter(l => l.priority === "Critical_Panic" || l.category === "CRITICAL_PANIC").length;
        const failedCount = logs.filter(l => l.status === "FAILED").length;
        const deliveredCount = logs.filter(l => l.status === "DELIVERED").length;
        const successRate = logs.length > 0 ? Math.round((deliveredCount / logs.length) * 100) : 100;
        return { total, criticalCount, failedCount, deliveredCount, successRate };
    }, [logs, totalCount]);

    const unreadCount = useMemo(
        () => userNotifications.filter(n => !n.isRead && !n.IsRead).length,
        [userNotifications]
    );

    useEffect(() => {
        if (!canViewUsers) return;
        userManagementService.getAllUsers({ params: { pageSize: 50 } })
            .then(res => {
                const list = res?.success && Array.isArray(res.data) ? res.data : [];
                setAvailableUsers(list);
                if (list.length > 0) {
                    const firstId = list[0].id || list[0]._id || "";
                    setFormUserId(prev => prev || firstId);
                    setFormRecipientName(prev => prev || (list[0].fullName || list[0].username || ""));
                    setDrawerUserId(prev => prev || firstId);
                }
            })
            .catch(() => setAvailableUsers([]));
    }, [canViewUsers]);

    const handleSelectRecipient = (selectedId) => {
        setFormUserId(selectedId);
        const found = availableUsers.find(u => (u.id || u._id) === selectedId);
        if (found) {
            setFormRecipientName(found.fullName || found.username || "");
            setFormPlatform(found.defaultPlatform || "Web");
        }
    };

    const handleSelectCategory = (catKey) => {
        const cat = CATEGORIES.find(c => c.key === catKey);
        if (!cat) return;
        setFormCategory(cat.key);
        setFormPriority(cat.defaultPriority);
        setFormActionUrl(cat.defaultAction);

        if (!formTitle.trim() && !formBody.trim()) {
            setFormTitle(cat.label);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormAlert(null);
        setIsSubmitting(true);

        try {
            const isCritical = formPriority === "Critical_Panic" || formCategory === "CRITICAL_PANIC";
            const result = await dispatchNotification({
                userId: formUserId.trim(),
                recipientName: formRecipientName.trim(),
                channel: formChannel,
                priority: formPriority,
                category: formCategory,
                title: formTitle.trim(),
                body: formBody.trim(),
                actionUrl: formActionUrl.trim(),
                devicePlatform: formPlatform
            });

            playChime(isCritical);
            setFormAlert({
                type: "success",
                message: `Đã gửi thông báo ${result?.notificationId ? `#${result.notificationId} ` : ""}qua kênh ${formChannel} đến ${formRecipientName || formUserId}.`
            });
            setFormTitle("");
            setFormBody("");
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

    const handleResend = async (id) => {
        try {
            const res = await resendNotification(id);
            setFormAlert({
                type: "success",
                message: res?.message || `Đã gửi lại thông báo #${id}.`
            });
            await fetchLogs();
        } catch (err) {
            setFormAlert({
                type: "danger",
                message: err.message || "Gửi lại thông báo thất bại."
            });
        }
    };

    const handleMarkRead = async (id) => {
        try {
            await markNotificationRead(id);
            if (!isPatient) await fetchLogs();
            await fetchUserNotifs();
        } catch (err) {
            console.error("Failed to mark read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            const uid = isPatient ? (user?.id || user?._id || user?.sub) : drawerUserId;
            if (!uid) return;
            await markAllNotificationsRead(uid);
            if (!isPatient) await fetchLogs();
            await fetchUserNotifs();
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    if (isPatient) {
        const filteredNotifications = userNotifications.filter(item => {
            const isUnread = !item.isRead && !item.IsRead;
            const title = (item.title || item.Title || "").toLowerCase();
            const category = item.category || item.type || "";
            if (patientFilter === "UNREAD") return isUnread;
            if (patientFilter === "RESULTS") return category === "RESULT_READY" || category === "TEST_RESULT_READY" || title.includes("kết quả");
            if (patientFilter === "APPOINTMENTS") return category === "APPOINTMENT_REMINDER" || category === "APPOINTMENT" || title.includes("lịch");
            return true;
        });

        return (
            <div className="container-fluid py-4" style={{ maxWidth: "1050px" }}>
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1">
                                    <Bell size={13} /> Hộp thư thông báo
                                </span>
                                {unreadCount > 0 && (
                                    <span className="badge bg-danger text-white rounded-pill">
                                        {unreadCount} chưa đọc
                                    </span>
                                )}
                            </div>
                            <h2 className="fw-bold mb-1" style={{ color: "#0f2743" }}>Thông Báo &amp; Lịch Hẹn</h2>
                            <p className="text-muted small mb-0">
                                Xin chào <strong>{user?.fullName || user?.username || "Quý khách"}</strong> • Cập nhật trạng thái kết quả xét nghiệm và lịch hẹn
                            </p>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <button
                                className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-2 d-flex align-items-center gap-2"
                                onClick={() => navigate("/")}
                            >
                                <ArrowLeft size={14} /> Trang chủ
                            </button>
                            <button
                                className="btn btn-outline-primary btn-sm rounded-pill px-3 py-2 d-flex align-items-center gap-2"
                                onClick={fetchUserNotifs}
                            >
                                <RefreshCw size={14} /> Làm mới
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    className="btn btn-primary btn-sm rounded-pill px-3 py-2 d-flex align-items-center gap-2"
                                    onClick={handleMarkAllRead}
                                >
                                    <CheckCheck size={14} /> Đã đọc tất cả
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="d-flex gap-2 mb-3 overflow-auto pb-1">
                    {[
                        { key: "ALL", label: `Tất cả (${userNotifications.length})` },
                        { key: "UNREAD", label: `Chưa đọc (${unreadCount})` },
                        { key: "RESULTS", label: "Kết quả xét nghiệm" },
                        { key: "APPOINTMENTS", label: "Lịch hẹn khám" }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            className={`btn btn-sm rounded-pill px-3 py-2 fw-semibold ${patientFilter === tab.key ? "btn-primary text-white" : "btn-light text-secondary border"}`}
                            onClick={() => setPatientFilter(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {filteredNotifications.length === 0 ? (
                    <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
                        <div className="text-muted mb-3">
                            <Bell size={40} style={{ opacity: 0.3 }} />
                        </div>
                        <h5 className="fw-bold text-dark">Không có thông báo nào</h5>
                        <p className="text-muted small mb-3">
                            {patientFilter === "UNREAD"
                                ? "Quý khách đã đọc hết tất cả các thông báo."
                                : "Hiện tại không có thông báo nào trong mục này."}
                        </p>
                        <div>
                            <button className="btn btn-outline-primary btn-sm rounded-pill px-3 py-2" onClick={() => setPatientFilter("ALL")}>
                                Xem tất cả thông báo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {filteredNotifications.map((notif, idx) => {
                            const isUnread = !notif.isRead && !notif.IsRead;
                            const title = notif.title || notif.Title || "Thông báo";
                            const body = notif.body || notif.message || notif.Message || "";
                            const isResult = notif.category === "RESULT_READY" || notif.type === "TEST_RESULT_READY" || title.toLowerCase().includes("kết quả");
                            const isPanic = notif.priority === "Critical_Panic" || notif.category === "CRITICAL_PANIC" || notif.type === "PANIC_RESULT_ALERT";
                            const isAppt = notif.category === "APPOINTMENT_REMINDER" || notif.type === "APPOINTMENT" || title.toLowerCase().includes("lịch");
                            const isPayment = notif.category === "PAYMENT_REMINDER" || title.toLowerCase().includes("thanh toán");

                            return (
                                <div
                                    key={notif.id || notif._id || idx}
                                    className={`card border-0 shadow-sm rounded-4 p-4 ${isUnread ? "bg-white" : "bg-light bg-opacity-75"}`}
                                    style={{
                                        borderLeft: isPanic ? "5px solid #dc3545" : isUnread ? "5px solid #0d6efd" : "5px solid #dee2e6"
                                    }}
                                >
                                    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                                        <div className="d-flex align-items-start gap-3 flex-grow-1">
                                            <div
                                                className={`rounded-circle p-3 d-flex align-items-center justify-content-center flex-shrink-0 ${
                                                    isPanic ? "bg-danger-subtle text-danger" :
                                                    isResult ? "bg-success-subtle text-success" :
                                                    isAppt ? "bg-info-subtle text-info" :
                                                    isPayment ? "bg-warning-subtle text-warning" : "bg-primary-subtle text-primary"
                                                }`}
                                                style={{ width: "48px", height: "48px" }}
                                            >
                                                {isPanic ? <AlertTriangle size={20} /> :
                                                 isResult ? <FlaskConical size={20} /> :
                                                 isAppt ? <Calendar size={20} /> :
                                                 isPayment ? <Receipt size={20} /> : <Bell size={20} />}
                                            </div>
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                    <span className="fw-bold text-dark fs-6">{title}</span>
                                                    {isUnread && <span className="badge bg-primary rounded-pill small">Mới</span>}
                                                    {isPanic && <span className="badge bg-danger text-white rounded-pill small">Khẩn cấp</span>}
                                                </div>
                                                <p className="text-secondary small mb-2" style={{ lineHeight: 1.5 }}>{body}</p>
                                                <div className="d-flex align-items-center gap-2 text-muted small" style={{ fontSize: "0.8rem" }}>
                                                    <Clock size={12} />
                                                    <span>{notif.createdAt || notif.CreatedAt ? new Date(notif.createdAt || notif.CreatedAt).toLocaleString("vi-VN") : "Gần đây"}</span>
                                                    {notif.channel && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-uppercase fw-semibold">{notif.channel}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                            {isUnread && (
                                                <button
                                                    className="btn btn-light btn-sm rounded-pill px-3 py-1 text-secondary border d-flex align-items-center gap-1"
                                                    onClick={() => handleMarkRead(notif.id || notif._id)}
                                                >
                                                    <Check size={12} /> Đã đọc
                                                </button>
                                            )}
                                            {(notif.actionUrl || isResult || isAppt || isPayment) && (
                                                <button
                                                    className="btn btn-primary btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                                                    onClick={() => {
                                                        if (isUnread) handleMarkRead(notif.id || notif._id);
                                                        if (notif.actionUrl) navigate(notif.actionUrl);
                                                        else if (isResult) navigate("/patient/test-history");
                                                        else if (isAppt) navigate("/appointments");
                                                        else if (isPayment) navigate("/patient/payment-history");
                                                    }}
                                                >
                                                    <span>Chi tiết</span> <ArrowRight size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-100 py-1">
            {/* Page Header */}
            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">Trung Tâm Thông Báo Hệ Thống</h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Soạn phát thông báo đến người dùng và theo dõi nhật ký chuyển phát theo thời gian thực
                    </p>
                </div>

                <div className="bms-page-actions">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2"
                        onClick={fetchLogs}
                        disabled={isLoading}
                        style={{ borderColor: "#1E60E6", color: "#1E60E6" }}
                    >
                        <RefreshCw size={14} className={isLoading ? "fa-spin" : ""} />
                        <span>Làm Mới</span>
                    </button>
                    <button
                        type="button"
                        className="btn btn-light border rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2"
                        onClick={() => setIsDrawerOpen(true)}
                        id="btn-open-notification-drawer"
                    >
                        <Bell className="text-primary" size={14} />
                        <span>Hộp Thư</span>
                        {unreadCount > 0 && (
                            <span className="badge rounded-pill bg-danger">{unreadCount}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* KPI Quad Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Tổng Thông Báo</h6>
                            <div className="bms-kpi-value">{metrics.total}</div>
                            <div className="bms-kpi-sub text-muted">Bản ghi nhật ký chuyển phát</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                            <Send size="1em" />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Báo Động Nguy Kịch</h6>
                            <div className="bms-kpi-value text-danger">{metrics.criticalCount}</div>
                            <div className="bms-kpi-sub text-danger">Ưu tiên cao nhất</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
                            <AlertTriangle size="1em" />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Tỷ Lệ Chuyển Giao</h6>
                            <div className="bms-kpi-value text-success">{metrics.successRate}%</div>
                            <div className="bms-kpi-sub text-muted">{metrics.deliveredCount} tin đã chuyển thành công</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                            <CheckCircle2 size="1em" />
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Lỗi / Chờ Thử Lại</h6>
                            <div className="bms-kpi-value text-warning">{metrics.failedCount}</div>
                            <div className="bms-kpi-sub text-muted">Cần kiểm tra hoặc gửi lại</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                            <Clock size="1em" />
                        </div>
                    </div>
                </div>
            </div>

            {formAlert && (
                <div className={`alert alert-${formAlert.type} alert-dismissible fade show mb-4`} role="alert" style={{ borderRadius: 14 }}>
                    <div className="d-flex align-items-center gap-2">
                        {formAlert.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        <span>{formAlert.message}</span>
                    </div>
                    <button type="button" className="btn-close" onClick={() => setFormAlert(null)} aria-label="Close" />
                </div>
            )}

            {/* Main 2-Column Workspace */}
            <div className="row g-4 align-items-start">
                {/* Left Column: Composer */}
                <div className="col-12 col-xl-4">
                    <div className="bg-white rounded-4 border p-4" style={{ borderColor: "#E2E8F0" }}>
                        <div className="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom">
                            <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2" style={{ fontSize: "16px" }}>
                                <Send className="text-primary" size={16} />
                                <span>Phát Thông Báo Mới</span>
                            </h5>
                        </div>

                        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                            <div>
                                <label className="form-label small fw-semibold text-secondary mb-1">
                                    Chọn nhanh người nhận
                                </label>
                                <select
                                    className="form-select"
                                    value={availableUsers.some(u => (u.id || u._id) === formUserId) ? formUserId : ""}
                                    onChange={e => handleSelectRecipient(e.target.value)}
                                >
                                    <option value="">-- Chọn tài khoản từ hệ thống --</option>
                                    {availableUsers.map(u => {
                                        const uid = u.id || u._id;
                                        return (
                                            <option key={uid} value={uid}>
                                                {u.fullName || u.username} ({u.role || "user"})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="row g-2">
                                <div className="col-6">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Mã người nhận</label>
                                    <input
                                        type="text"
                                        className="form-control font-monospace"
                                        value={formUserId}
                                        onChange={e => setFormUserId(e.target.value)}
                                        placeholder="User ID"
                                        required
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Họ tên</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formRecipientName}
                                        onChange={e => setFormRecipientName(e.target.value)}
                                        placeholder="Tên người nhận"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="form-label small fw-semibold text-secondary mb-1">Loại thông báo</label>
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

                            <div className="row g-2">
                                <div className="col-6">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Kênh gửi</label>
                                    <select
                                        className="form-select"
                                        value={formChannel}
                                        onChange={e => setFormChannel(e.target.value)}
                                    >
                                        <option value="InApp">In-App</option>
                                        <option value="Push">Push (FCM)</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Email">Email</option>
                                    </select>
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-semibold text-secondary mb-1">Độ ưu tiên</label>
                                    <select
                                        className={`form-select ${formPriority === "Critical_Panic" ? "border-danger text-danger fw-semibold" : ""}`}
                                        value={formPriority}
                                        onChange={e => setFormPriority(e.target.value)}
                                    >
                                        <option value="Normal">Bình thường</option>
                                        <option value="High">Cao</option>
                                        <option value="Critical_Panic">Nguy kịch (Critical)</option>
                                    </select>
                                </div>
                            </div>

                            {formPriority === "Critical_Panic" && (
                                <div className="p-2 rounded-3 bg-danger-subtle text-danger small d-flex align-items-start gap-2 border border-danger-subtle">
                                    <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
                                    <span>Chế độ Critical sẽ ưu tiên phát ngay lập tức và kích hoạt cảnh báo âm thanh.</span>
                                </div>
                            )}

                            <div>
                                <label className="form-label small fw-semibold text-secondary mb-1">Tiêu đề thông báo</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formTitle}
                                    onChange={e => setFormTitle(e.target.value)}
                                    placeholder="Nhập tiêu đề thông báo..."
                                    required
                                />
                            </div>

                            <div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <label className="form-label small fw-semibold text-secondary mb-0">Nội dung chi tiết</label>
                                    <span className="text-muted" style={{ fontSize: "11px" }}>{formBody.length}/500</span>
                                </div>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    maxLength={500}
                                    value={formBody}
                                    onChange={e => setFormBody(e.target.value)}
                                    placeholder="Nhập nội dung gửi đến người nhận..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="form-label small fw-semibold text-secondary mb-1">Đường dẫn đính kèm (tùy chọn)</label>
                                <input
                                    type="text"
                                    className="form-control font-monospace small"
                                    value={formActionUrl}
                                    onChange={e => setFormActionUrl(e.target.value)}
                                    placeholder="/dashboard"
                                />
                            </div>

                            <button
                                type="submit"
                                className={`btn ${formPriority === "Critical_Panic" ? "btn-danger" : "btn-primary"} w-100 rounded-pill py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mt-1`}
                                disabled={isSubmitting}
                                style={formPriority !== "Critical_Panic" ? { background: "#1E60E6", borderColor: "#1E60E6" } : undefined}
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" />
                                        <span>Đang gửi thông báo...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} />
                                        <span>Phát Thông Báo Ngay</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: Tabs + Filter + Standalone Table */}
                <div className="col-12 col-xl-8">
                    {/* External Pill Tabs */}
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                        {LOG_TABS.map(tab => {
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    className="btn btn-sm rounded-pill px-3 py-2 fw-semibold"
                                    onClick={() => {
                                        setActiveTab(tab.key);
                                        setCurrentPage(1);
                                    }}
                                    style={{
                                        background: isActive ? "#1E60E6" : "#FFFFFF",
                                        color: isActive ? "#FFFFFF" : "#475569",
                                        border: isActive ? "1px solid #1E60E6" : "1px solid #E2E8F0",
                                        fontSize: "13px"
                                    }}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Single-Line Filter Bar */}
                    <div className="bms-filter-bar d-flex flex-wrap align-items-center gap-2 mb-3">
                        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: "220px" }}>
                            <LucideSearch className="bms-search-icon" size="1em" />
                            <input
                                type="text"
                                placeholder="Tìm theo tiêu đề, người nhận hoặc mã thông báo..."
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="bms-search-clear"
                                    onClick={() => {
                                        setSearchTerm("");
                                        setCurrentPage(1);
                                    }}
                                    title="Xóa tìm kiếm"
                                >
                                    <LucideX size={12} />
                                </button>
                            )}
                        </div>

                        <select
                            className="form-select form-select-sm"
                            value={channelFilter}
                            onChange={e => {
                                setChannelFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ width: "auto", minWidth: "145px", borderRadius: "9999px", paddingTop: "7px", paddingBottom: "7px" }}
                        >
                            <option value="ALL">Mọi kênh</option>
                            <option value="Push">Push (FCM)</option>
                            <option value="InApp">In-App</option>
                            <option value="SMS">SMS</option>
                            <option value="Email">Email</option>
                        </select>

                        <select
                            className="form-select form-select-sm"
                            value={priorityFilter}
                            onChange={e => {
                                setPriorityFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{ width: "auto", minWidth: "155px", borderRadius: "9999px", paddingTop: "7px", paddingBottom: "7px" }}
                        >
                            <option value="ALL">Mọi ưu tiên</option>
                            <option value="Normal">Bình thường</option>
                            <option value="High">Cao</option>
                            <option value="Critical_Panic">Nguy kịch</option>
                        </select>

                        {(searchTerm || channelFilter !== "ALL" || priorityFilter !== "ALL" || activeTab !== "ALL") && (
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm rounded-pill px-3 py-2 flex-shrink-0"
                                onClick={() => {
                                    setActiveTab("ALL");
                                    setSearchTerm("");
                                    setChannelFilter("ALL");
                                    setPriorityFilter("ALL");
                                    setCurrentPage(1);
                                }}
                            >
                                Xóa lọc
                            </button>
                        )}
                    </div>

                    {/* Standalone Table */}
                    <div className="bms-table-standalone-section">
                        <div className="bms-table-standalone-header">
                            <div>
                                <h5 className="bms-table-standalone-title">
                                    <Bell size={16} style={{ color: "#1E60E6" }} />
                                    <span>Nhật Ký Chuyển Phát Thông Báo</span>
                                </h5>
                                <div className="bms-table-standalone-subtitle">
                                    Tổng {totalCount} bản ghi lịch sử chuyển giao
                                </div>
                            </div>
                        </div>

                        <div className="bms-table-standalone-body">
                            <div className="table-responsive">
                                <table className="bms-dash-table">
                                    <thead>
                                        <tr>
                                            <th className="ps-4" style={{ width: "120px" }}>Thời Gian</th>
                                            <th style={{ width: "150px" }}>Người Nhận</th>
                                            <th>Nội Dung Thông Báo</th>
                                            <th style={{ width: "110px" }}>Kênh</th>
                                            <th style={{ width: "115px" }}>Trạng Thái</th>
                                            <th className="text-end pe-4" style={{ width: "100px" }}>Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-muted">
                                                    <div className="spinner-border spinner-border-sm me-2 text-primary" role="status" />
                                                    Đang tải dữ liệu nhật ký...
                                                </td>
                                            </tr>
                                        ) : loadError ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-4 text-danger">
                                                    <div className="mb-2 fw-semibold">{loadError}</div>
                                                    <button type="button" className="btn btn-sm btn-outline-primary rounded-pill px-3" onClick={fetchLogs}>
                                                        Thử lại
                                                    </button>
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
                                                        <td className="ps-4 small text-muted">
                                                            <div className="fw-semibold text-dark">{new Date(log.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</div>
                                                            <div style={{ fontSize: "11px" }}>{new Date(log.sentAt).toLocaleDateString("vi-VN")}</div>
                                                        </td>
                                                        <td>
                                                            <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: "140px" }}>
                                                                {log.recipientName || log.userId}
                                                            </div>
                                                            <div className="text-muted font-monospace text-truncate" style={{ fontSize: "11px", maxWidth: "140px" }}>
                                                                {log.userId}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                {isCritical && (
                                                                    <span className="badge bg-danger text-white" style={{ fontSize: "10px" }}>CRITICAL</span>
                                                                )}
                                                                <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: "260px" }}>
                                                                    {log.title}
                                                                </span>
                                                            </div>
                                                            <div className="text-muted small text-truncate mt-1" style={{ maxWidth: "320px" }}>
                                                                {log.body}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-light text-dark border d-inline-flex align-items-center gap-1">
                                                                {log.channel === "Push" && <Smartphone className="text-primary" size={12} />}
                                                                {log.channel === "InApp" && <Bell className="text-info" size={12} />}
                                                                {log.channel === "SMS" && <MessageSquare className="text-success" size={12} />}
                                                                {log.channel === "Email" && <Mail className="text-secondary" size={12} />}
                                                                <span>{log.channel}</span>
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {log.status === "DELIVERED" ? (
                                                                <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
                                                                    <CheckCircle2 size={12} /> Đã gửi
                                                                </span>
                                                            ) : log.status === "FAILED" ? (
                                                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1">
                                                                    <XCircle size={12} /> Thất bại
                                                                </span>
                                                            ) : (
                                                                <span className="badge bg-warning-subtle text-warning border border-warning-subtle d-inline-flex align-items-center gap-1">
                                                                    <Clock size={12} /> Đang chờ
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-end pe-4">
                                                            <div className="d-inline-flex gap-1">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-secondary btn-sm rounded-pill px-2 py-1"
                                                                    title="Xem chi tiết"
                                                                    onClick={() => setSelectedDetail(log)}
                                                                >
                                                                    <Eye size={13} />
                                                                </button>
                                                                {log.status === "FAILED" && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-outline-warning btn-sm rounded-pill px-2 py-1"
                                                                        title="Gửi lại"
                                                                        onClick={() => handleResend(log.notificationId || log.id)}
                                                                    >
                                                                        <RotateCw size={13} />
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
                        </div>

                        {/* Footer Pagination */}
                        <div className="px-4 py-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2 bg-white">
                            <span className="small text-muted">
                                Hiển thị <strong>{logs.length}</strong> / <strong>{totalCount}</strong> thông báo
                            </span>
                            <div className="d-flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm rounded-pill px-3"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    Trang trước
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm rounded-pill px-3"
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

            {/* In-App Notification Drawer */}
            {isDrawerOpen && (
                <div
                    className="position-fixed top-0 end-0 bottom-0 bg-white shadow-lg border-start d-flex flex-column"
                    style={{ width: "420px", maxWidth: "92vw", zIndex: 1060 }}
                >
                    <div className="px-4 py-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                        <div className="d-flex align-items-center gap-2">
                            <Bell className="text-primary" size={18} />
                            <h6 className="mb-0 fw-bold">Hộp Thư Thông Báo</h6>
                            {unreadCount > 0 && (
                                <span className="badge bg-danger rounded-pill">{unreadCount} mới</span>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setIsDrawerOpen(false)}
                            aria-label="Close"
                        />
                    </div>

                    <div className="px-4 py-2 border-bottom bg-white d-flex justify-content-between align-items-center gap-2">
                        <select
                            className="form-select form-select-sm flex-grow-1"
                            value={drawerUserId}
                            onChange={e => setDrawerUserId(e.target.value)}
                        >
                            {availableUsers.map(u => {
                                const uid = u.id || u._id;
                                return (
                                    <option key={uid} value={uid}>{u.fullName || u.username || uid}</option>
                                );
                            })}
                        </select>
                        <button
                            type="button"
                            className="btn btn-link btn-sm text-decoration-none p-0 d-flex align-items-center gap-1 text-primary small flex-shrink-0"
                            onClick={handleMarkAllRead}
                        >
                            <CheckCheck size={14} /> Đọc hết
                        </button>
                    </div>

                    <div className="flex-grow-1 overflow-auto p-3">
                        {userNotifications.length === 0 ? (
                            <div className="text-center py-5 text-muted">
                                <Bell size={36} className="mb-2 opacity-25" />
                                <p className="mb-0 small">Chưa có thông báo nào cho tài khoản này.</p>
                            </div>
                        ) : (
                            userNotifications.map(item => {
                                const isCritical = item.priority === "Critical_Panic" || item.category === "CRITICAL_PANIC";
                                return (
                                    <div
                                        key={item.id}
                                        className={`p-3 mb-2 rounded-3 border ${!item.isRead ? "bg-primary-subtle border-primary-subtle" : "bg-white"}`}
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-1">
                                            <span className={`badge ${isCritical ? "bg-danger text-white" : "bg-light text-muted border"}`} style={{ fontSize: "10px" }}>
                                                {item.category || item.channel}
                                            </span>
                                            <span className="text-muted" style={{ fontSize: "11px" }}>
                                                {new Date(item.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        <h6 className="fw-bold mb-1 fs-6 text-dark">{item.title}</h6>
                                        <p className="small text-muted mb-2">{item.body}</p>
                                        <div className="d-flex justify-content-between align-items-center">
                                            {item.actionUrl ? (
                                                <a
                                                    href={item.actionUrl}
                                                    className="small fw-semibold text-primary text-decoration-none d-inline-flex align-items-center gap-1"
                                                    onClick={() => handleMarkRead(item.id)}
                                                >
                                                    Xem chi tiết <ArrowRight size={11} />
                                                </a>
                                            ) : <span />}
                                            {!item.isRead && (
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm text-muted p-0 text-decoration-none"
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
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(15, 23, 42, 0.45)", zIndex: 1070 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-4">
                            <div className="modal-header bg-light">
                                <h5 className="modal-title fw-bold">Chi Tiết Thông Báo #{selectedDetail.id}</h5>
                                <button type="button" className="btn-close" onClick={() => setSelectedDetail(null)} />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="text-muted small fw-semibold">Tiêu đề</label>
                                    <div className="fw-bold text-dark">{selectedDetail.title}</div>
                                </div>
                                <div className="mb-3">
                                    <label className="text-muted small fw-semibold">Nội dung</label>
                                    <div className="p-3 bg-light rounded-3 text-secondary small">{selectedDetail.body}</div>
                                </div>
                                <div className="row g-3 mb-2">
                                    <div className="col-6">
                                        <label className="text-muted small fw-semibold">Người nhận</label>
                                        <div className="small text-dark">{selectedDetail.recipientName || selectedDetail.userId}</div>
                                    </div>
                                    <div className="col-6">
                                        <label className="text-muted small fw-semibold">Kênh / Nền tảng</label>
                                        <div className="small text-dark">{selectedDetail.channel} ({selectedDetail.devicePlatform || "Web"})</div>
                                    </div>
                                    <div className="col-6">
                                        <label className="text-muted small fw-semibold">Độ ưu tiên</label>
                                        <div className="small text-dark">{selectedDetail.priority}</div>
                                    </div>
                                    <div className="col-6">
                                        <label className="text-muted small fw-semibold">Trạng thái</label>
                                        <div className="small text-dark">{selectedDetail.status}</div>
                                    </div>
                                </div>
                                {selectedDetail.errorMessage && (
                                    <div className="p-3 mt-2 rounded-3 bg-danger-subtle text-danger small">
                                        <strong>Lỗi gateway:</strong> {selectedDetail.errorMessage}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary btn-sm rounded-pill px-4" onClick={() => setSelectedDetail(null)}>
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
