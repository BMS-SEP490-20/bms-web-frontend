/**
 * @file NotifyTestResultsPage.jsx
 * @description Master Laboratory Test Result Notification & Panic Value Escalation management page (UC60 / BR-183).
 * Conforms to: Production Medical Standards, Clinical Emergency Escalation & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
    FaBell,
    FaExclamationTriangle,
    FaPaperPlane,
    FaCheckCircle,
    FaSync,
    FaSearch,
    FaPhoneAlt,
    FaEnvelope,
    FaMobileAlt,
    FaFilter,
    FaEye,
    FaRedo,
    FaCheck,
    FaUser
} from "react-icons/fa";
import {
    fetchNotifications,
    fetchNotificationById,
    dispatchNotification,
    markNotificationAsRead,
    resendNotification,
    fetchNotificationStats
} from "../api/testResultNotificationApi";
import DispatchNotificationModal from "../components/DispatchNotificationModal";
import NotificationDetailModal from "../components/NotificationDetailModal";

const TABS = [
    { key: "ALL", label: "Tất Cả Thông Báo" },
    { key: "PANIC", label: "Báo Động Nguy Kịch (Critical)", icon: FaExclamationTriangle, badgeClass: "bg-danger" },
    { key: "UNREAD", label: "Chưa Đọc (Unread)" },
    { key: "DELIVERED", label: "Đã Chuyển Giao" }
];

export default function NotifyTestResultsPage() {
    // States
    const [notifications, setNotifications] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [stats, setStats] = useState({
        totalNotifications: 0,
        deliveredSuccessfully: 0,
        criticalPanicAlerts: 0,
        pendingCount: 0,
        failedCount: 0,
        deliverySuccessRate: 100.0
    });

    // Filters
    const [activeTab, setActiveTab] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedChannel, setSelectedChannel] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("");
    const [loading, setLoading] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Modals
    const [showDispatchModal, setShowDispatchModal] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Auto-dismiss toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Load data
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                pageNumber: currentPage,
                pageSize,
                channel: selectedChannel || undefined,
                priority: selectedPriority || undefined,
                isCritical: activeTab === "PANIC" ? true : undefined,
                status: activeTab === "DELIVERED" ? 3 : undefined
            };

            const [notifData, statsData] = await Promise.all([
                fetchNotifications(params),
                fetchNotificationStats()
            ]);

            let items = notifData.items || [];
            if (activeTab === "UNREAD") {
                items = items.filter((x) => !x.isRead);
            }

            if (searchTerm.trim()) {
                const term = searchTerm.trim().toLowerCase();
                items = items.filter(
                    (x) =>
                        (x.patientName && x.patientName.toLowerCase().includes(term)) ||
                        (x.testOrderId && x.testOrderId.toLowerCase().includes(term)) ||
                        (x.patientPhone && x.patientPhone.includes(term)) ||
                        (x.notificationId && x.notificationId.toLowerCase().includes(term))
                );
            }

            setNotifications(items);
            setTotalCount(notifData.totalCount || 0);
            setStats(statsData);
        } catch (err) {
            console.error("Lỗi khi tải danh sách thông báo:", err);
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, activeTab, selectedChannel, selectedPriority, searchTerm]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // View detail
    const handleViewDetail = async (id) => {
        try {
            const detail = await fetchNotificationById(id);
            if (detail) {
                setSelectedNotification(detail);
                setShowDetailModal(true);
            }
        } catch (err) {
            console.error("Không thể mở chi tiết thông báo:", err);
        }
    };

    // Dispatch new
    const handleDispatch = async (payload) => {
        await dispatchNotification(payload);
        setToastMessage({ type: "success", text: "Phát hành thông báo kết quả xét nghiệm thành công!" });
        loadData();
    };

    // Mark as read
    const handleMarkAsRead = async (id) => {
        await markNotificationAsRead(id);
        setToastMessage({ type: "success", text: "Đã đánh dấu thông báo là đã đọc." });
        loadData();
        if (selectedNotification) {
            setSelectedNotification((prev) => (prev ? { ...prev, status: "Read", readAt: new Date().toISOString() } : null));
        }
    };

    // Resend
    const handleResend = async (id) => {
        const updated = await resendNotification(id);
        setToastMessage({ type: "success", text: "Đã gửi lại thông báo kết quả thành công!" });
        loadData();
        if (updated) {
            setSelectedNotification(updated);
        }
    };

    const renderChannelIcon = (channel) => {
        switch (channel) {
            case "Sms":
                return <span className="badge bg-success-subtle text-success border border-success"><FaPhoneAlt className="me-1" /> SMS</span>;
            case "Email":
                return <span className="badge bg-primary-subtle text-primary border border-primary"><FaEnvelope className="me-1" /> Email</span>;
            case "Push":
                return <span className="badge bg-info-subtle text-info border border-info"><FaMobileAlt className="me-1" /> Push App</span>;
            default:
                return <span className="badge bg-secondary-subtle text-secondary border"><FaBell className="me-1" /> Đa kênh (All)</span>;
        }
    };

    const renderPriorityBadge = (priority, isPanic) => {
        if (isPanic || priority === "Critical") {
            return (
                <span className="badge bg-danger shadow-xs animate-pulse">
                    <FaExclamationTriangle className="me-1" /> Báo động khẩn
                </span>
            );
        }
        if (priority === "Urgent" || priority === "High") {
            return <span className="badge bg-warning text-dark">Ưu tiên cao</span>;
        }
        return <span className="badge bg-light text-dark border">Bình thường</span>;
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case "Read":
                return <span className="badge bg-info text-dark"><FaCheck className="me-1" /> Đã đọc</span>;
            case "Delivered":
                return <span className="badge bg-success"><FaCheckCircle className="me-1" /> Đã nhận</span>;
            case "Failed":
                return <span className="badge bg-danger">Thất bại</span>;
            default:
                return <span className="badge bg-warning text-dark">Đang gửi</span>;
        }
    };

    return (
        <div className="container-fluid py-4 px-lg-4 bg-light" style={{ minHeight: "100vh" }}>
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <h4 className="fw-bold text-dark mb-0">Quản Lý & Phát Thông Báo Kết Quả Xét Nghiệm</h4>
                        <span className="badge bg-primary-subtle text-primary border border-primary font-monospace">
                            UC60 • BR-182 / BR-183
                        </span>
                        <span className="badge bg-danger-subtle text-danger border border-danger">
                            Panic Value Escalation
                        </span>
                    </div>
                    <p className="text-secondary small mb-0">
                        Cơ chế truyền thông báo đa kênh (In-App, SMS, Email, Push) và kích hoạt quy trình báo động hoảng loạn y khoa.
                    </p>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={loadData}
                    >
                        <FaSync className={loading ? "fa-spin" : ""} />
                        <span>Làm Mới</span>
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => setShowDispatchModal(true)}
                    >
                        <FaPaperPlane />
                        <span>+ Phát Thông Báo Mới</span>
                    </button>
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div
                    className={`alert alert-${toastMessage.type} alert-dismissible fade show shadow-sm mb-4`}
                    role="alert"
                >
                    <div className="d-flex align-items-center">
                        <FaCheckCircle className="me-2 fs-5" />
                        <div>{toastMessage.text}</div>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setToastMessage(null)}
                    ></button>
                </div>
            )}

            {/* 4 Stat KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body p-3 d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase d-block">Tổng Số Thông Báo</span>
                                <h3 className="fw-bold text-dark mb-0 font-monospace">{stats.totalNotifications}</h3>
                                <small className="text-muted">Đã phát hành toàn viện</small>
                            </div>
                            <div className="p-3 bg-primary-subtle text-primary rounded-circle">
                                <FaBell className="fs-4" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body p-3 d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase d-block">Tỷ Lệ Tiếp Nhận</span>
                                <h3 className="fw-bold text-success mb-0 font-monospace">{stats.deliverySuccessRate}%</h3>
                                <small className="text-success">{stats.deliveredSuccessfully} thông báo thành công</small>
                            </div>
                            <div className="p-3 bg-success-subtle text-success rounded-circle">
                                <FaCheckCircle className="fs-4" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body p-3 d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase d-block">Báo Động Nguy Kịch</span>
                                <h3 className="fw-bold text-danger mb-0 font-monospace">{stats.criticalPanicAlerts}</h3>
                                <small className="text-danger fw-semibold">Chỉ số hoảng loạn cần can thiệp</small>
                            </div>
                            <div className="p-3 bg-danger-subtle text-danger rounded-circle">
                                <FaExclamationTriangle className="fs-4" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body p-3 d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase d-block">Chờ Xử Lý / Thất Bại</span>
                                <h3 className="fw-bold text-warning mb-0 font-monospace">{stats.pendingCount + stats.failedCount}</h3>
                                <small className="text-muted">{stats.failedCount} tin nhắn cần gửi lại</small>
                            </div>
                            <div className="p-3 bg-warning-subtle text-warning rounded-circle">
                                <FaRedo className="fs-4" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-3">
                    <div className="row g-2 align-items-center justify-content-between">
                        {/* Tabs */}
                        <div className="col-12 col-xl-auto">
                            <div className="btn-group btn-group-sm">
                                {TABS.map((tab) => {
                                    const isActive = activeTab === tab.key;
                                    const TabIcon = tab.icon;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            className={`btn ${isActive ? "btn-primary" : "btn-outline-secondary"} d-flex align-items-center gap-1`}
                                            onClick={() => {
                                                setActiveTab(tab.key);
                                                setCurrentPage(1);
                                            }}
                                        >
                                            {TabIcon && <TabIcon className="me-1" />}
                                            <span>{tab.label}</span>
                                            {tab.key === "PANIC" && stats.criticalPanicAlerts > 0 && (
                                                <span className="badge bg-danger ms-1">{stats.criticalPanicAlerts}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="col-12 col-xl-auto d-flex flex-wrap gap-2">
                            <div className="input-group input-group-sm" style={{ width: "260px" }}>
                                <span className="input-group-text bg-light text-muted border-end-0">
                                    <FaSearch />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Tìm theo BN, SĐT, Mã đơn..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <select
                                className="form-select form-select-sm"
                                style={{ width: "140px" }}
                                value={selectedChannel}
                                onChange={(e) => setSelectedChannel(e.target.value)}
                            >
                                <option value="">Tất cả kênh</option>
                                <option value="InApp">In-App</option>
                                <option value="Sms">SMS</option>
                                <option value="Email">Email</option>
                                <option value="Push">Push App</option>
                            </select>

                            <select
                                className="form-select form-select-sm"
                                style={{ width: "140px" }}
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                            >
                                <option value="">Tất cả ưu tiên</option>
                                <option value="Normal">Bình thường</option>
                                <option value="High">Ưu tiên cao</option>
                                <option value="Urgent">Khẩn cấp</option>
                                <option value="Critical">Nguy kịch</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Directory Table */}
            <div className="card shadow-sm border-0">
                <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                    <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        <FaBell className="text-primary" />
                        Danh Sách Thông Báo Kết Quả Xét Nghiệm
                    </h6>
                    <small className="text-muted">Tổng cộng {notifications.length} bản ghi hiển thị</small>
                </div>

                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-secondary small text-uppercase">
                            <tr>
                                <th style={{ minWidth: "150px" }}>Mã Thông Báo</th>
                                <th style={{ minWidth: "130px" }}>Đơn Xét Nghiệm</th>
                                <th style={{ minWidth: "180px" }}>Bệnh Nhân</th>
                                <th style={{ minWidth: "120px" }}>Kênh Gửi</th>
                                <th style={{ minWidth: "140px" }}>Mức Độ Ưu Tiên</th>
                                <th style={{ minWidth: "120px" }}>Trạng Thái</th>
                                <th style={{ minWidth: "140px" }}>Thời Gian Phát</th>
                                <th style={{ minWidth: "130px" }} className="text-end">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-5 text-muted">
                                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                        Đang tải thông báo kết quả...
                                    </td>
                                </tr>
                            ) : notifications.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-5 text-muted">
                                        Không tìm thấy thông báo kết quả nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                notifications.map((notif) => (
                                    <tr
                                        key={notif.id || notif.notificationId}
                                        className={notif.isCriticalPanicValue ? "table-danger" : ""}
                                    >
                                        <td>
                                            <span className="font-monospace text-primary fw-bold">
                                                {notif.notificationId}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-monospace fw-semibold text-dark">
                                                {notif.testOrderId}
                                            </span>
                                            {notif.testPackageName && (
                                                <small className="d-block text-muted text-truncate" style={{ maxWidth: "160px" }}>
                                                    {notif.testPackageName}
                                                </small>
                                            )}
                                        </td>
                                        <td>
                                            <div className="fw-bold text-dark">{notif.patientName}</div>
                                            <small className="text-muted font-monospace">{notif.patientId}</small>
                                            {notif.patientEmail && (
                                                <small className="text-primary d-block mt-1">
                                                    <FaEnvelope size={10} className="me-1" />{notif.patientEmail}
                                                </small>
                                            )}
                                        </td>
                                        <td>{renderChannelIcon(notif.channel)}</td>
                                        <td>{renderPriorityBadge(notif.priority, notif.isCriticalPanicValue)}</td>
                                        <td>{renderStatusBadge(notif.status)}</td>
                                        <td className="small text-secondary">
                                            {notif.sentAt ? new Date(notif.sentAt).toLocaleString("vi-VN", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            }) : "--"}
                                        </td>
                                        <td className="text-end">
                                            <div className="d-inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-xs"
                                                    onClick={() => handleViewDetail(notif.notificationId || notif.id)}
                                                    title="Xem chi tiết"
                                                >
                                                    <FaEye size={12} />
                                                    <span>Chi tiết</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center shadow-xs"
                                                    onClick={() => handleResend(notif.notificationId || notif.id)}
                                                    title="Gửi lại"
                                                >
                                                    <FaRedo size={11} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <DispatchNotificationModal
                show={showDispatchModal}
                onHide={() => setShowDispatchModal(false)}
                onDispatchSuccess={handleDispatch}
            />

            <NotificationDetailModal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                notification={selectedNotification}
                onMarkAsRead={handleMarkAsRead}
                onResend={handleResend}
            />
        </div>
    );
}
