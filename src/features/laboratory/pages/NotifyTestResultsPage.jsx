/**
 * @file NotifyTestResultsPage.jsx
 * @description Master Laboratory Test Result Notification & Panic Value Escalation management page (UC60 / BR-183).
 * Conforms to: Production Medical Standards, Clinical Emergency Escalation & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Bell, AlertTriangle, Send, CheckCircle2, RefreshCw, Search, Phone, Mail, Smartphone, Filter as LucideFilter, Eye, RotateCw, Check, User, X } from 'lucide-react';
import TablePagination from '../../../components/ui/TablePagination';
import {
    fetchNotifications,
    fetchNotificationById,
    dispatchNotification,
    markNotificationAsRead,
    resendNotification,
    fetchNotificationStats
} from "../api/testResultNotificationApi";
import { ROLES, getStoredUser, hasRole } from "../../../constants/roles";
import DispatchNotificationModal from "../components/DispatchNotificationModal";
import NotificationDetailModal from "../components/NotificationDetailModal";

const TABS = [
    { key: "ALL", label: "Tất Cả Thông Báo" },
    { key: "UNREAD", label: "Chưa Đọc (Unread)" },
    { key: "DELIVERED", label: "Đã Chuyển Giao" }
];

export default function NotifyTestResultsPage() {
    const currentUser = getStoredUser();
    const canDispatch = hasRole(currentUser, ROLES.DOCTOR, ROLES.MANAGER);
    const canMarkRead = hasRole(currentUser, ROLES.PATIENT);

    // States
    const [notifications, setNotifications] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể tải danh sách thông báo kết quả xét nghiệm."
            });
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
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể mở chi tiết thông báo kết quả xét nghiệm."
            });
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
        try {
            await markNotificationAsRead(id);
            setToastMessage({ type: "success", text: "Đã đánh dấu thông báo là đã đọc." });
            loadData();
            if (selectedNotification) {
                setSelectedNotification((prev) => (prev ? { ...prev, status: "Read", readAt: new Date().toISOString() } : null));
            }
        } catch (err) {
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể đánh dấu thông báo là đã đọc."
            });
            throw err;
        }
    };

    // Resend
    const handleResend = async (id) => {
        try {
            const updated = await resendNotification(id);
            setToastMessage({ type: "success", text: "Đã gửi lại thông báo kết quả thành công!" });
            loadData();
            if (updated) {
                setSelectedNotification(updated);
            }
        } catch (err) {
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể gửi lại thông báo kết quả xét nghiệm."
            });
            throw err;
        }
    };

    const renderChannelIcon = (channel) => {
        switch (channel) {
            case "Sms":
                return <span className="badge bg-success-subtle text-success border border-success"><Phone className="me-1"  size="1em"/> SMS</span>;
            case "Email":
                return <span className="badge bg-primary-subtle text-primary border border-primary"><Mail className="me-1"  size="1em"/> Email</span>;
            case "Push":
                return <span className="badge bg-info-subtle text-info border border-info"><Smartphone className="me-1"  size="1em"/> Push App</span>;
            default:
                return <span className="badge bg-secondary-subtle text-secondary border"><Bell className="me-1"  size="1em"/> Đa kênh (All)</span>;
        }
    };

    const renderPriorityBadge = (priority, isPanic) => {
        if (isPanic || priority === "Critical") {
            return (
                <span className="badge bg-danger shadow-xs animate-pulse">
                    <AlertTriangle className="me-1"  size="1em"/> Báo động khẩn
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
                return <span className="badge bg-info text-dark"><Check className="me-1"  size="1em"/> Đã đọc</span>;
            case "Delivered":
                return <span className="badge bg-success"><CheckCircle2 className="me-1"  size="1em"/> Đã nhận</span>;
            case "Failed":
                return <span className="badge bg-danger">Thất bại</span>;
            default:
                return <span className="badge bg-warning text-dark">Đang gửi</span>;
        }
    };

    return (
        <div className="w-100 py-1">
            {/* Header Card */}
            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">
                            Quản lý &amp; Phát thông báo kết quả xét nghiệm
                        </h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Gửi thông báo kết quả xét nghiệm đã được Bác sĩ phê duyệt qua Email cho bệnh nhân.
                    </p>
                </div>

                <div className="bms-page-actions">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5 rounded-pill px-3 fw-semibold text-nowrap"
                        style={{ color: "#1E60E6", borderColor: "#1E60E6" }}
                        onClick={loadData}
                    >
                        <RefreshCw size={13} className={loading ? "fa-spin" : ""} />
                        <span>Làm mới</span>
                    </button>
                    {canDispatch && (
                        <button
                            type="button"
                            className="btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3 fw-semibold text-white text-nowrap"
                            style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                            onClick={() => setShowDispatchModal(true)}
                        >
                            <Send size={13} />
                            <span>Phát thông báo mới</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div
                    className={`alert alert-${toastMessage.type} alert-dismissible fade show shadow-sm mb-4 rounded-3`}
                    role="alert"
                >
                    <div className="d-flex align-items-center">
                        <CheckCircle2 className="me-2 fs-5"  size="1em"/>
                        <div>{toastMessage.text}</div>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setToastMessage(null)}
                    ></button>
                </div>
            )}

            {/* 3 KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-4">
                    <div className="bms-kpi-quad-card">
                        <div className="bms-kpi-quad-top">
                            <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                                <Bell size={18} />
                            </div>
                        </div>
                        <div className="bms-kpi-quad-value">{stats.totalNotifications}</div>
                        <div className="bms-kpi-quad-title">Tổng số thông báo đã phát hành</div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="bms-kpi-quad-card">
                        <div className="bms-kpi-quad-top">
                            <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                                <CheckCircle2 size={18} />
                            </div>
                            <span className="bms-kpi-trend-pill">{stats.deliveredSuccessfully} thành công</span>
                        </div>
                        <div className="bms-kpi-quad-value">{stats.deliverySuccessRate}%</div>
                        <div className="bms-kpi-quad-title">Tỷ lệ tiếp nhận thông báo</div>
                    </div>
                </div>

                <div className="col-12 col-md-4">
                    <div className="bms-kpi-quad-card">
                        <div className="bms-kpi-quad-top">
                            <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                                <RotateCw size={18} />
                            </div>
                        </div>
                        <div className="bms-kpi-quad-value">{stats.pendingCount + stats.failedCount}</div>
                        <div className="bms-kpi-quad-title">Chờ xử lý / Cần gửi lại ({stats.failedCount})</div>
                    </div>
                </div>
            </div>

            {/* Single-Line Flat Filter Bar */}
            <div className="bms-filter-bar mb-3">
                <div className="bms-search-input-pill">
                    <Search className="bms-search-icon"  size="1em"/>
                    <input
                        type="text"
                        placeholder="Tìm theo tên bệnh nhân, SĐT, mã đơn hoặc mã thông báo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button type="button" className="bms-search-clear" onClick={() => setSearchTerm("")}>
                            <X size={12} />
                        </button>
                    )}
                </div>

                <select
                    className="form-select"
                    style={{ width: "auto" }}
                    value={activeTab}
                    onChange={(e) => {
                        setActiveTab(e.target.value);
                        setCurrentPage(1);
                    }}
                >
                    <option value="ALL">Tất cả thông báo</option>
                    <option value="UNREAD">Chưa đọc</option>
                    <option value="DELIVERED">Đã chuyển giao</option>
                </select>

                <select
                    className="form-select"
                    style={{ width: "auto" }}
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                >
                    <option value="">Tất cả kênh</option>
                    <option value="InApp">Trong ứng dụng</option>
                    <option value="Sms">Tin nhắn SMS</option>
                    <option value="Email">Email</option>
                    <option value="Push">Thông báo đẩy</option>
                </select>

                <select
                    className="form-select"
                    style={{ width: "auto" }}
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                >
                    <option value="">Tất cả mức ưu tiên</option>
                    <option value="Normal">Bình thường</option>
                    <option value="High">Ưu tiên cao</option>
                    <option value="Urgent">Khẩn cấp</option>
                </select>

                {(searchTerm || activeTab !== "ALL" || selectedChannel || selectedPriority) && (
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 text-nowrap"
                        onClick={() => {
                            setSearchTerm("");
                            setActiveTab("ALL");
                            setSelectedChannel("");
                            setSelectedPriority("");
                            setCurrentPage(1);
                        }}
                    >
                        Đặt lại
                    </button>
                )}

                <span className="bms-filter-meta">
                    Hiển thị <strong>{notifications.length}</strong> / {totalCount} thông báo
                </span>
            </div>

            {/* Standalone Notification Directory Table */}
            <section className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h2 className="bms-table-standalone-title">Danh sách thông báo kết quả xét nghiệm</h2>
                        <p className="bms-table-standalone-subtitle">Lịch sử gửi thông báo kết quả xét nghiệm đã được Bác sĩ phê duyệt qua Email</p>
                    </div>
                </div>

                <div className="bms-table-standalone-body">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-secondary small text-uppercase">
                            <tr>
                                <th className="ps-3" style={{ minWidth: "150px" }}>Mã thông báo</th>
                                <th style={{ minWidth: "130px" }}>Đơn xét nghiệm</th>
                                <th style={{ minWidth: "180px" }}>Bệnh nhân</th>
                                <th style={{ minWidth: "120px" }}>Kênh gửi</th>
                                <th style={{ minWidth: "140px" }}>Mức độ ưu tiên</th>
                                <th style={{ minWidth: "120px" }}>Trạng thái</th>
                                <th style={{ minWidth: "140px" }}>Thời gian phát</th>
                                <th style={{ minWidth: "130px" }} className="text-end pe-3">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                        Đang tải thông báo kết quả...
                                    </td>
                                </tr>
                            ) : notifications.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">
                                        Không tìm thấy thông báo kết quả nào phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                notifications.map((notif) => (
                                    <tr
                                        key={notif.id || notif.notificationId}
                                        className={notif.isCriticalPanicValue ? "table-danger" : ""}
                                    >
                                        <td className="ps-3">
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
                                                    <Mail size={10} className="me-1" />{notif.patientEmail}
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
                                        <td className="text-end pe-3">
                                            <div className="d-inline-flex gap-1">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary rounded-pill px-2.5 d-inline-flex align-items-center gap-1 text-nowrap"
                                                    onClick={() => handleViewDetail(notif.notificationId || notif.id)}
                                                    title="Xem chi tiết"
                                                >
                                                    <Eye size={12} />
                                                    <span>Chi tiết</span>
                                                </button>
                                                {canDispatch && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-secondary rounded-pill px-2.5 d-inline-flex align-items-center text-nowrap"
                                                        onClick={() => handleResend(notif.notificationId || notif.id)}
                                                        title="Gửi lại"
                                                    >
                                                        <RotateCw size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <TablePagination
                        page={currentPage}
                        totalItems={totalCount || notifications.length}
                        pageSize={pageSize}
                        onPageChange={(nextPage) => setCurrentPage(nextPage)}
                        onPageSizeChange={(nextSize) => {
                            setPageSize(nextSize);
                            setCurrentPage(1);
                        }}
                        itemLabel="thông báo"
                    />
                </div>
            </section>

            {/* Modals */}
            {canDispatch && (
                <DispatchNotificationModal
                    show={showDispatchModal}
                    onHide={() => setShowDispatchModal(false)}
                    onDispatchSuccess={handleDispatch}
                />
            )}

            <NotificationDetailModal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                notification={selectedNotification}
                onMarkAsRead={handleMarkAsRead}
                onResend={handleResend}
                canDispatch={canDispatch}
                canMarkRead={canMarkRead}
            />
        </div>
    );
}
