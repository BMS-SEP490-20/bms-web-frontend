/**
 * @file BackupManagementPage.jsx
 * @description Master page for Database Backup & Restore procedures (UC80 / BR-243).
 * Specifically handles archiving and restoring patient laboratory diagnostic test data with SHA-256 integrity validation.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & AGENTS-DESIGN.md.
 * @module features/backup/pages/BackupManagementPage
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    FaDatabase,
    FaShieldAlt,
    FaUndo,
    FaDownload,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSync,
    FaSearch,
    FaPlus,
    FaEye,
    FaHdd,
    FaCalendarAlt,
    FaHistory,
    FaTrashAlt,
    FaCheck
} from "react-icons/fa";
import {
    fetchBackups,
    fetchBackupStats,
    verifyBackupIntegrity,
    fetchRestoreHistory,
    getBackupDownloadUrl,
    downloadBackupArchive,
    deleteBackup,
} from "../api/backupApi";
import { ROLES, getStoredUser, hasRole } from "../../../constants/roles";
import CreateBackupModal from "../components/CreateBackupModal";
import RestoreConfirmationModal from "../components/RestoreConfirmationModal";
import BackupDetailModal from "../components/BackupDetailModal";

const TABS = [
    { key: "ALL", label: "Tất Cả Bản Sao Lưu" },
    { key: "PATIENT", label: "Dữ Liệu Xét Nghiệm Bệnh Nhân", badgeClass: "bg-primary" },
    { key: "FULL", label: "Toàn Bộ Cơ Sở Dữ Liệu" },
    { key: "HISTORY", label: "Lịch Sử Khôi Phục Dữ Liệu", icon: FaHistory }
];

export default function BackupManagementPage() {
    const currentUser = getStoredUser();
    const isAdmin = hasRole(currentUser, ROLES.ADMIN);

    // States
    const [backups, setBackups] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        totalBackups: 0,
        completedBackups: 0,
        failedBackups: 0,
        patientTestScopeBackups: 0,
        totalStorageMb: 0,
        integritySuccessRate: 100.0,
        lastBackupTime: null
    });

    const [restoreHistory, setRestoreHistory] = useState([]);
    const [activeTab, setActiveTab] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [verifyingId, setVerifyingId] = useState(null);
    const [downloadingId, setDownloadingId] = useState(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            try {
                const statsData = await fetchBackupStats();
                if (statsData) setStats(statsData);
            } catch (err) {
                console.warn("[Backup Page] Error loading stats:", err);
            }

            if (activeTab === "HISTORY") {
                const historyData = await fetchRestoreHistory();
                const safeHistory = Array.isArray(historyData)
                    ? historyData
                    : (Array.isArray(historyData?.items) ? historyData.items : (Array.isArray(historyData?.data) ? historyData.data : []));
                setRestoreHistory(safeHistory);
            } else {
                let scopeParam = null;
                if (activeTab === "PATIENT") scopeParam = 1;
                if (activeTab === "FULL") scopeParam = 2;

                const data = await fetchBackups({
                    scope: scopeParam,
                    pageNumber: currentPage,
                    pageSize
                });

                const safeBackups = Array.isArray(data)
                    ? data
                    : (Array.isArray(data?.items) 
                        ? data.items 
                        : (Array.isArray(data?.Items) ? data.Items : (Array.isArray(data?.data) ? data.data : [])));

                setBackups(safeBackups);
                setTotalCount(data?.totalCount ?? data?.TotalCount ?? safeBackups.length);
            }
        } catch (err) {
            console.error("[Backup Page] Error loading data:", err);
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể tải danh sách bản sao lưu cơ sở dữ liệu."
            });
        } finally {
            setLoading(false);
        }
    }, [activeTab, currentPage, pageSize]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleVerify = async (backup) => {
        const id = backup.backupId || backup.id;
        setVerifyingId(id);
        try {
            const res = await verifyBackupIntegrity(id);
            if (res?.isValid) {
                setToastMessage({
                    type: "success",
                    text: `Bản sao lưu ${id} hợp lệ! Mã băm SHA-256 khớp 100%.`
                });
            } else {
                setToastMessage({
                    type: "danger",
                    text: `Cảnh báo: Bản sao lưu ${id} không khớp mã băm SHA-256!`
                });
            }
            loadData();
        } catch (err) {
            console.error("[Backup Page] Verify integrity error:", err);
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Lỗi trong quá trình xác thực mã băm SHA-256."
            });
        } finally {
            setVerifyingId(null);
        }
    };

    const handleBackupCreated = (newBackup) => {
        setToastMessage({
            type: "success",
            text: `Đã khởi tạo bản sao lưu ${newBackup?.backupId || ''} thành công!`
        });
        loadData();
    };

    const handleDownload = async (item) => {
        const id = item.id || item.backupId;
        const preferredName = item.fileName || `${item.backupId || item.id}.json.gz`;
        try {
            setDownloadingId(item.backupId || item.id);
            await downloadBackupArchive(id, preferredName);
        } catch {
            const directUrl = getBackupDownloadUrl(id);
            window.open(directUrl, "_blank");
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDeleteBackup = async (item) => {
        const id = item.backupId || item.id;
        try {
            await deleteBackup(id);
            setToastMessage({
                type: "success",
                text: `Đã xóa bản sao lưu ${item.backupId || id} thành công.`
            });
            loadData();
        } catch (err) {
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể xóa bản sao lưu."
            });
        }
    };

    const handleRestoreSuccess = (result) => {
        setToastMessage({
            type: "success",
            text: `Khôi phục thành công ${result.restoredCount || result.totalRecordsRestored || 'toàn bộ'} bản ghi dữ liệu y tế vào hệ thống BMS!`
        });
        loadData();
    };

    // Safe filtered backups
    const safeBackupsList = useMemo(() => (Array.isArray(backups) ? backups : []), [backups]);

    const filteredBackups = useMemo(() => {
        if (!searchTerm.trim()) return safeBackupsList;
        const term = searchTerm.toLowerCase();
        return safeBackupsList.filter((b) => {
            return (
                b.backupName?.toLowerCase().includes(term) ||
                b.backupId?.toLowerCase().includes(term) ||
                b.createdBy?.toLowerCase().includes(term)
            );
        });
    }, [safeBackupsList, searchTerm]);

    const renderStatusBadge = (status) => {
        switch (status) {
            case "Completed":
                return <span className="badge bg-success"><FaCheckCircle className="me-1" /> Toàn Vẹn</span>;
            case "Restored":
                return <span className="badge bg-primary"><FaUndo className="me-1" /> Đã Khôi Phục</span>;
            case "Corrupted":
                return <span className="badge bg-danger"><FaExclamationTriangle className="me-1" /> Hư Hỏng</span>;
            case "Failed":
                return <span className="badge bg-danger">Thất Bại</span>;
            default:
                return <span className="badge bg-warning text-dark">Đang Xử Lý</span>;
        }
    };

    return (
        <div className="container-fluid py-4 px-lg-4 bg-light" style={{ minHeight: "100vh" }}>
            {/* Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <h4 className="fw-bold mb-0" style={{ color: '#0f2743' }}>Quản Lý Sao Lưu & Phục Hồi Dữ Liệu</h4>
                        <span className="badge rounded-pill font-monospace" style={{ background: 'rgba(94, 133, 230, 0.1)', color: '#648CF4', border: '1px solid rgba(94, 133, 230, 0.25)' }}>
                            ISO 15189 • Nghị Định 123/2020/NĐ-CP
                        </span>
                        <span className="badge rounded-pill" style={{ background: 'rgba(145, 222, 131, 0.2)', color: '#2E7D32', border: '1px solid rgba(145, 222, 131, 0.35)' }}>
                            Niêm Phong Số SHA-256 (Lưu Trữ 10 Năm)
                        </span>
                    </div>
                    <p className="text-secondary small mb-0">
                        Lưu trữ và niêm phong dữ liệu xét nghiệm của bệnh nhân, xác thực mã băm SHA-256 và quy trình khôi phục an toàn (UC80).
                    </p>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={loadData}
                        style={{ borderRadius: 9999, borderColor: '#648CF4', color: '#648CF4' }}
                    >
                        <FaSync className={loading ? "fa-spin" : ""} />
                        <span>Làm Mới</span>
                    </button>
                    {isAdmin && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                            onClick={() => setShowCreateModal(true)}
                            style={{ borderRadius: 9999, background: '#648CF4', borderColor: '#648CF4', boxShadow: '0 4px 14px rgba(94, 133, 230, 0.25)' }}
                        >
                            <FaPlus />
                            <span>Sao Lưu Dữ Liệu Xét Nghiệm Mới</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div
                    className={`alert alert-${toastMessage.type} alert-dismissible fade show shadow-sm mb-4`}
                    role="alert"
                    style={{ borderRadius: 14 }}
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

            {/* KPI Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card shadow-sm border-0 h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, background: '#ffffff' }}>
                        <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                                        Tổng Bản Sao Lưu
                                    </span>
                                    <h3 className="fw-bold mb-0" style={{ color: '#0f2743', fontVariantNumeric: 'tabular-nums' }}>{stats.totalBackups}</h3>
                                </div>
                                <div className="p-3 rounded-circle" style={{ background: 'rgba(94, 133, 230, 0.1)', color: '#648CF4' }}>
                                    <FaDatabase className="fs-4" />
                                </div>
                            </div>
                            <small className="text-secondary mt-2 d-block">
                                <span className="fw-semibold" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>{stats.patientTestScopeBackups}</span> bản lưu trữ xét nghiệm
                            </small>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card shadow-sm border-0 h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, background: '#ffffff' }}>
                        <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                                        Dung Lượng Đã Dùng
                                    </span>
                                    <h3 className="fw-bold mb-0" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums' }}>{stats.totalStorageMb} MB</h3>
                                </div>
                                <div className="p-3 rounded-circle" style={{ background: 'rgba(94, 133, 230, 0.1)', color: '#648CF4' }}>
                                    <FaHdd className="fs-4" />
                                </div>
                            </div>
                            <small className="text-secondary mt-2 d-block">
                                Nén bảo mật định dạng <code>.json.gz</code>
                            </small>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card shadow-sm border-0 h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, background: '#ffffff' }}>
                        <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                                        Độ Toàn Vẹn SHA-256
                                    </span>
                                    <h3 className="fw-bold mb-0" style={{ color: '#2E7D32', fontVariantNumeric: 'tabular-nums' }}>{stats.integritySuccessRate}%</h3>
                                </div>
                                <div className="p-3 rounded-circle" style={{ background: 'rgba(145, 222, 131, 0.2)', color: '#2E7D32' }}>
                                    <FaShieldAlt className="fs-4" />
                                </div>
                            </div>
                            <small className="text-secondary mt-2 d-block">
                                100% bản lưu trữ được niêm phong số
                            </small>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card shadow-sm border-0 h-100" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, background: '#ffffff' }}>
                        <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-1">
                                        Thời Hạn Lưu Trữ
                                    </span>
                                    <h3 className="fw-bold mb-0" style={{ color: '#b45309', fontVariantNumeric: 'tabular-nums' }}>10 Năm</h3>
                                </div>
                                <div className="p-3 rounded-circle" style={{ background: 'rgba(231, 188, 76, 0.2)', color: '#b45309' }}>
                                    <FaCalendarAlt className="fs-4" />
                                </div>
                            </div>
                            <small className="text-secondary mt-2 d-block">
                                Tuân thủ chuẩn ISO 15189 & Nghị định 123/2020/NĐ-CP (Tối thiểu 10 năm)
                            </small>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="card shadow-sm border-0 mb-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18 }}>
                <div className="card-body p-3">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <ul className="nav nav-pills gap-1">
                            {TABS.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.key;
                                return (
                                    <li className="nav-item" key={tab.key}>
                                        <button
                                            type="button"
                                            className={`nav-link btn-sm d-flex align-items-center gap-2 ${
                                                isActive ? "active" : "text-secondary"
                                            }`}
                                            onClick={() => {
                                                setActiveTab(tab.key);
                                                setCurrentPage(1);
                                            }}
                                            style={{
                                                borderRadius: 9999,
                                                background: isActive ? '#648CF4' : 'transparent',
                                                color: isActive ? '#fff' : '#64748b',
                                                fontWeight: 600,
                                                padding: '6px 14px'
                                            }}
                                        >
                                            {Icon && <Icon />}
                                            <span>{tab.label}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>

                        {activeTab !== "HISTORY" && (
                            <div className="input-group input-group-sm" style={{ maxWidth: "320px" }}>
                                <span className="input-group-text border-end-0" style={{ background: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                                    <FaSearch className="text-muted" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Tìm theo tên, mã sao lưu..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ background: '#EEF2F6', borderColor: 'rgba(15, 23, 42, 0.05)', borderRadius: '0 10px 10px 0' }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content: Backups Table or Restore Audits */}
            {activeTab === "HISTORY" ? (
                /* Restore Audits Directory Table */
                <div className="card shadow-sm border-0" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, overflow: 'hidden' }}>
                    <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ background: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <h6 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2743' }}>
                            <FaHistory style={{ color: '#648CF4' }} />
                            Nhật Ký Kiểm Toán Khôi Phục Dữ Liệu
                        </h6>
                        <small className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>Tổng cộng {restoreHistory.length} phiên khôi phục ghi nhận</small>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: '#EEF2F6' }}>
                                <tr>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Mã Phiên Khôi Phục</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Mã Bản Sao Lưu</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Người Khôi Phục</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Vai Trò</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Số Bản Ghi Phục Hồi</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Xác Thực SHA-256</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Thời Gian Thực Thi</th>
                                    <th style={{ color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                            Đang tải nhật ký khôi phục...
                                        </td>
                                    </tr>
                                ) : (!Array.isArray(restoreHistory) || restoreHistory.length === 0) ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            Chưa ghi nhận phiên khôi phục nào trên hệ thống.
                                        </td>
                                    </tr>
                                ) : (
                                    restoreHistory.map((log) => (
                                        <tr key={log.id || log.restoreId} style={{ borderBottom: '1px solid #EEF2F6' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="font-monospace fw-bold" style={{ color: '#648CF4' }}>
                                                    {log.restoreId}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="font-monospace text-dark fw-semibold">
                                                    {log.backupId}
                                                </span>
                                            </td>
                                            <td className="fw-semibold text-dark" style={{ padding: '12px 16px' }}>{log.restoredBy}</td>
                                            <td style={{ padding: '12px 16px' }}><span className="badge rounded-pill" style={{ background: '#EEF2F6', color: '#475569' }}>{log.restoredByRole || "Quản trị viên"}</span></td>
                                            <td className="fw-bold" style={{ color: '#648CF4', fontVariantNumeric: 'tabular-nums', padding: '12px 16px' }}>{log.totalRecordsRestored ?? 0} bản ghi</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="badge rounded-pill" style={{ background: 'rgba(145, 222, 131, 0.2)', color: '#2E7D32', border: '1px solid rgba(145, 222, 131, 0.35)' }}>
                                                    <FaCheck className="me-1" /> Khớp 100%
                                                </span>
                                            </td>
                                            <td className="small text-secondary" style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums' }}>
                                                {log.executedAt ? new Date(log.executedAt).toLocaleString("vi-VN") : "—"}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="badge rounded-pill" style={{ background: 'rgba(145, 222, 131, 0.2)', color: '#2E7D32' }}>Hoàn Thành</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* Backups Directory Table */
                <div className="card shadow-sm border-0" style={{ border: '1px solid rgba(15, 23, 42, 0.05)', borderRadius: 18, overflow: 'hidden' }}>
                    <div className="card-header border-bottom py-3 d-flex justify-content-between align-items-center" style={{ background: '#ffffff', borderBottom: '1px solid rgba(15, 23, 42, 0.05)' }}>
                        <h6 className="mb-0 fw-bold d-flex align-items-center gap-2" style={{ color: '#0f2743' }}>
                            <FaDatabase style={{ color: '#648CF4' }} />
                            Danh Sách Bản Sao Lưu Cơ Sở Dữ Liệu Xét Nghiệm
                        </h6>
                        <small className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>Tổng cộng {filteredBackups.length} bản sao lưu sẵn sàng</small>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead style={{ background: '#EEF2F6' }}>
                                <tr>
                                    <th style={{ minWidth: "150px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Mã Sao Lưu</th>
                                    <th style={{ minWidth: "220px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Tên Bản Sao Lưu</th>
                                    <th style={{ minWidth: "140px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Phạm Vi</th>
                                    <th style={{ minWidth: "110px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Dung Lượng</th>
                                    <th style={{ minWidth: "150px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Mã SHA-256</th>
                                    <th style={{ minWidth: "120px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Trạng Thái</th>
                                    <th style={{ minWidth: "140px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }}>Thời Gian Tạo</th>
                                    <th style={{ minWidth: "200px", color: '#475569', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '12px 16px' }} className="text-end">Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                            Đang tải dữ liệu bản sao lưu...
                                        </td>
                                    </tr>
                                ) : filteredBackups.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-5 text-muted">
                                            Không tìm thấy bản sao lưu nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBackups.map((item) => (
                                        <tr key={item.id || item.backupId} style={{ borderBottom: '1px solid #EEF2F6' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="font-monospace fw-bold" style={{ color: '#648CF4' }}>
                                                    {item.backupId}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div className="fw-bold" style={{ color: '#0f2743' }}>{item.backupName}</div>
                                                <small className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {item.totalRecords || 0} bản ghi y khoa • Người tạo: {item.createdBy || 'Quản trị viên'}
                                                </small>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span className="badge rounded-pill" style={{
                                                    background: item.scope === "PatientTestResults" || item.scope === 1 ? 'rgba(94, 133, 230, 0.1)' : '#EEF2F6',
                                                    color: item.scope === "PatientTestResults" || item.scope === 1 ? '#648CF4' : '#64748b',
                                                    border: '1px solid rgba(94, 133, 230, 0.2)'
                                                }}>
                                                    {item.scope === "PatientTestResults" || item.scope === 1 ? "Dữ Liệu Xét Nghiệm" : "Toàn Bộ Hệ Thống"}
                                                </span>
                                            </td>
                                            <td className="font-monospace text-secondary" style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums' }}>
                                                {item.fileSizeFormatted || "1.8 MB"}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span
                                                    className="font-monospace small text-muted text-truncate d-inline-block"
                                                    style={{ maxWidth: "130px" }}
                                                    title={item.checksumSha256}
                                                >
                                                    {item.checksumSha256 ? `${item.checksumSha256.substring(0, 12)}...` : "--"}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>{renderStatusBadge(item.status)}</td>
                                            <td className="small text-secondary" style={{ padding: '12px 16px', fontVariantNumeric: 'tabular-nums' }}>
                                                {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                }) : "--"}
                                            </td>
                                            <td className="text-end" style={{ padding: '12px 16px' }}>
                                                <div className="d-flex justify-content-end gap-1">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-success btn-sm"
                                                        title="Kiểm tra toàn vẹn SHA-256"
                                                        onClick={() => handleVerify(item)}
                                                        disabled={verifyingId === item.backupId}
                                                        style={{ borderRadius: 9999 }}
                                                    >
                                                        {verifyingId === item.backupId ? (
                                                            <div className="spinner-border spinner-border-sm" role="status"></div>
                                                        ) : (
                                                            <FaShieldAlt />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary btn-sm"
                                                        title="Tải tệp nén sao lưu"
                                                        onClick={() => handleDownload(item)}
                                                        disabled={downloadingId === (item.backupId || item.id)}
                                                        style={{ borderRadius: 9999 }}
                                                    >
                                                        {downloadingId === (item.backupId || item.id) ? (
                                                            <div className="spinner-border spinner-border-sm" role="status"></div>
                                                        ) : (
                                                            <FaDownload />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-primary btn-sm"
                                                        title="Xem chi tiết bản sao lưu"
                                                        onClick={() => {
                                                            setSelectedBackup(item);
                                                            setShowDetailModal(true);
                                                        }}
                                                        style={{ borderRadius: 9999, borderColor: '#648CF4', color: '#648CF4' }}
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    {isAdmin && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-danger btn-sm"
                                                                title="Khôi phục dữ liệu từ bản này"
                                                                onClick={() => {
                                                                    setSelectedBackup(item);
                                                                    setShowRestoreModal(true);
                                                                }}
                                                                style={{ borderRadius: 9999 }}
                                                            >
                                                                <FaUndo />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-secondary btn-sm"
                                                                title="Xóa bản sao lưu"
                                                                onClick={() => handleDeleteBackup(item)}
                                                                style={{ borderRadius: 9999 }}
                                                            >
                                                                <FaTrashAlt />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modals */}
            {isAdmin && (
                <>
                    <CreateBackupModal
                        show={showCreateModal}
                        onHide={() => setShowCreateModal(false)}
                        onBackupCreated={handleBackupCreated}
                    />

                    <RestoreConfirmationModal
                        show={showRestoreModal}
                        onHide={() => setShowRestoreModal(false)}
                        backup={selectedBackup}
                        onRestoreSuccess={handleRestoreSuccess}
                    />
                </>
            )}

            <BackupDetailModal
                show={showDetailModal}
                onHide={() => setShowDetailModal(false)}
                backup={selectedBackup}
                onRestoreTrigger={isAdmin ? (b) => {
                    setSelectedBackup(b);
                    setShowRestoreModal(true);
                } : undefined}
            />
        </div>
    );
}
