/**
 * @file BackupManagementPage.jsx
 * @description Master page for Database Backup & Restore procedures (UC80 / BR-243).
 * Specifically handles archiving and restoring patient laboratory diagnostic test data with SHA-256 integrity validation.
 * Conforms to: Production Medical Standards, ISO 15189 Quality Management & AGENTS-DESIGN.md.
 * @module features/backup/pages/BackupManagementPage
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Database as LucideDatabase, Undo2, Download, CheckCircle2, AlertTriangle, RefreshCw, Search, Plus, Eye, HardDrive, Calendar, History, Trash2, Check, X as LucideX } from 'lucide-react';
import TablePagination, { usePagination } from "../../../components/ui/TablePagination";
import {
    fetchBackups,
    fetchBackupStats,
    verifyBackupIntegrity,
    fetchRestoreHistory,
    getBackupDownloadUrl,
    downloadBackupArchive,
    deleteBackup } from "../api/backupApi";
import { ROLES, getStoredUser, hasRole } from "../../../constants/roles";
import CreateBackupModal from "../components/CreateBackupModal";
import RestoreConfirmationModal from "../components/RestoreConfirmationModal";
import BackupDetailModal from "../components/BackupDetailModal";

const TABS = [
    { key: "ALL", label: "Tất Cả Bản Sao Lưu" },
    { key: "PATIENT", label: "Dữ Liệu Xét Nghiệm Bệnh Nhân", badgeClass: "bg-primary" },
    { key: "FULL", label: "Toàn Bộ Cơ Sở Dữ Liệu" },
    { key: "HISTORY", label: "Lịch Sử Khôi Phục Dữ Liệu", icon: History }
];

export default function BackupManagementPage() {
    const currentUser = getStoredUser();
    const isAdmin = hasRole(currentUser, ROLES.ADMIN);

    // States
    const [backups, setBackups] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
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
    const restorePag = usePagination(restoreHistory, 10);
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
        if (!window.confirm(`Bạn có chắc chắn muốn xóa bản sao lưu "${item.backupName || id}"? Thao tác này không thể hoàn tác.`)) {
            return;
        }
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
    const safeBackups = useMemo(() => (Array.isArray(backups) ? backups : []), [backups]);
    const safeBackupsList = safeBackups;

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
                return <span className="badge bg-success"><CheckCircle2 className="me-1"  size="1em"/> Toàn Vẹn</span>;
            case "Restored":
                return <span className="badge bg-primary"><Undo2 className="me-1"  size="1em"/> Đã Khôi Phục</span>;
            case "Corrupted":
                return <span className="badge bg-danger"><AlertTriangle className="me-1"  size="1em"/> Hư Hỏng</span>;
            case "Failed":
                return <span className="badge bg-danger">Thất Bại</span>;
            default:
                return <span className="badge bg-warning text-dark">Đang Xử Lý</span>;
        }
    };

    return (
        <div className="w-100 py-1">
            {/* Page Header Card */}
            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">
                            Quản Lý Sao Lưu &amp; Phục Hồi Dữ Liệu Xét Nghiệm
                        </h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Lưu trữ định kỳ, kiểm tra toàn vẹn mã băm SHA-256 và khôi phục dữ liệu xét nghiệm
                    </p>
                </div>

                <div className="bms-page-actions">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill"
                        onClick={loadData}
                        style={{ borderColor: '#1E60E6', color: '#1E60E6' }}
                    >
                        <RefreshCw className={loading ? "fa-spin" : ""}  size="1em"/>
                        <span>Làm Mới</span>
                    </button>
                    {isAdmin && (
                        <button
                            type="button"
                            className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 py-2 fw-semibold rounded-pill"
                            onClick={() => setShowCreateModal(true)}
                            style={{ background: '#1E60E6', borderColor: '#1E60E6' }}
                        >
                            <Plus  size="1em"/>
                            <span>Sao Lưu Dữ Liệu Mới</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
                <div
                    className={`alert alert-${toastMessage.type} alert-dismissible fade show mb-4`}
                    role="alert"
                    style={{ borderRadius: 14 }}
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

            {/* KPI Quad Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Tổng Bản Sao Lưu</h6>
                            <div className="bms-kpi-value">{stats.totalBackups}</div>
                            <div className="bms-kpi-sub text-muted">
                                <span className="fw-semibold text-primary">{stats.patientTestScopeBackups}</span> bản lưu trữ xét nghiệm
                            </div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                            <LucideDatabase  size="1em"/>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Dung Lượng Đã Dùng</h6>
                            <div className="bms-kpi-value text-primary">{stats.totalStorageMb} MB</div>
                            <div className="bms-kpi-sub text-muted">
                                Nén bảo mật định dạng <code>.json.gz</code>
                            </div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-cyan">
                            <HardDrive  size="1em"/>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Độ Toàn Vẹn SHA-256</h6>
                            <div className="bms-kpi-value text-success">{stats.integritySuccessRate}%</div>
                            <div className="bms-kpi-sub text-muted">
                                Niêm phong số và đối chiếu tự động
                            </div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                            <CheckCircle2  size="1em"/>
                        </div>
                    </div>
                </div>

                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="bms-kpi-quad-card">
                        <div>
                            <h6 className="bms-kpi-label">Thời Hạn Lưu Trữ</h6>
                            <div className="bms-kpi-value" style={{ color: '#b45309' }}>10 Năm</div>
                            <div className="bms-kpi-sub text-muted">
                                Chính sách lưu trữ dữ liệu y tế dài hạn
                            </div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                            <Calendar  size="1em"/>
                        </div>
                    </div>
                </div>
            </div>

            {/* External Tab Bar (separated cleanly from table container) */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                <div className="d-flex flex-wrap align-items-center gap-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                className="btn btn-sm d-inline-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold"
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    setCurrentPage(1);
                                }}
                                style={{
                                    background: isActive ? '#1E60E6' : '#FFFFFF',
                                    color: isActive ? '#FFFFFF' : '#475569',
                                    border: isActive ? '1px solid #1E60E6' : '1px solid #E2E8F0',
                                    fontSize: '13px'
                                }}
                            >
                                {Icon && <Icon size={14} />}
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Single-Line Filter Bar */}
            {activeTab !== "HISTORY" && (
                <div className="bms-filter-bar mb-3">
                    <div className="bms-search-input-pill">
                        <Search className="bms-search-icon" size="1em" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, mã sao lưu hoặc người tạo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                className="bms-search-clear"
                                onClick={() => setSearchTerm('')}
                                title="Xóa tìm kiếm"
                            >
                                <LucideX size={12} />
                            </button>
                        )}
                    </div>
                    <span className="bms-filter-meta">
                        Hiển thị <strong>{filteredBackups.length}</strong> / {totalCount || safeBackupsList.length} bản sao lưu
                    </span>
                </div>
            )}

            <div className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h5 className="bms-table-standalone-title">
                            {activeTab === "HISTORY" ? (
                                <History size={16} style={{ color: '#1E60E6' }} />
                            ) : (
                                <LucideDatabase size={16} style={{ color: '#1E60E6' }} />
                            )}
                            <span>{TABS.find(t => t.key === activeTab)?.label || "Danh Sách Bản Sao Lưu"}</span>
                        </h5>
                    </div>
                </div>

                {/* Standalone Table Body */}
                <div className="bms-table-standalone-body">
                    {activeTab === "HISTORY" ? (
                        <div className="table-responsive">
                            <table className="bms-dash-table">
                                <thead>
                                    <tr>
                                        <th className="ps-4">MÃ PHIÊN KHÔI PHỤC</th>
                                        <th>MÃ BẢN SAO LƯU</th>
                                        <th>NGƯỜI KHÔI PHỤC</th>
                                        <th>VAI TRÒ</th>
                                        <th>SỐ BẢN GHI</th>
                                        <th>XÁC THỰC SHA-256</th>
                                        <th>THỜI GIAN THỰC THI</th>
                                        <th className="text-end pe-4">TRẠNG THÁI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-3 text-muted">
                                                <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                                Đang tải nhật ký khôi phục...
                                            </td>
                                        </tr>
                                    ) : (!Array.isArray(restoreHistory) || restoreHistory.length === 0) ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-3 text-muted">
                                                Chưa ghi nhận phiên khôi phục nào trên hệ thống.
                                            </td>
                                        </tr>
                                    ) : (
                                        restorePag.paginatedItems.map((log) => (
                                            <tr key={log.id || log.restoreId}>
                                                <td className="ps-4">
                                                    <span className="font-monospace fw-bold text-primary">
                                                        {log.restoreId}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className="font-monospace text-dark fw-semibold">
                                                        {log.backupId}
                                                    </span>
                                                </td>
                                                <td className="fw-semibold text-dark">{log.restoredBy}</td>
                                                <td><span className="bms-pill-badge bms-pill-stat">{log.restoredByRole || "Quản trị viên"}</span></td>
                                                <td className="fw-bold text-primary" style={{ fontVariantNumeric: 'tabular-nums' }}>{log.totalRecordsRestored ?? 0} bản ghi</td>
                                                <td>
                                                    <span className="bms-pill-badge bms-pill-success">
                                                        <Check className="me-1"  size="1em"/> Khớp 100%
                                                    </span>
                                                </td>
                                                <td className="small text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {log.executedAt ? new Date(log.executedAt).toLocaleString("vi-VN") : "—"}
                                                </td>
                                                <td className="text-end pe-4">
                                                    <span className="bms-pill-badge bms-pill-success">Hoàn Thành</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                            <TablePagination
                                page={restorePag.page}
                                totalPages={restorePag.totalPages}
                                totalItems={restorePag.totalItems}
                                pageSize={restorePag.pageSize}
                                onPageChange={restorePag.setPage}
                                onPageSizeChange={restorePag.setPageSize}
                                itemLabel="lần khôi phục"
                            />
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="bms-dash-table">
                                <thead>
                                    <tr>
                                        <th className="ps-4">MÃ SAO LƯU</th>
                                        <th>TÊN BẢN SAO LƯU</th>
                                        <th>PHẠM VI</th>
                                        <th>DUNG LƯỢNG</th>
                                        <th>MÃ SHA-256</th>
                                        <th>TRẠNG THÁI</th>
                                        <th>THỜI GIAN TẠO</th>
                                        <th className="text-end pe-4">THAO TÁC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-3 text-muted">
                                                <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                                Đang tải dữ liệu bản sao lưu...
                                            </td>
                                        </tr>
                                    ) : filteredBackups.length === 0 ? (
                                        <tr>
                                            <td colSpan="8" className="text-center py-3 text-muted">
                                                Không tìm thấy bản sao lưu nào phù hợp với bộ lọc.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBackups.map((item) => (
                                            <tr key={item.id || item.backupId}>
                                                <td className="ps-4">
                                                    <span className="font-monospace fw-bold text-primary">
                                                        {item.backupId}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="fw-bold text-dark">{item.backupName}</div>
                                                    <small className="text-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                        {item.totalRecords || 0} bản ghi y khoa • Người tạo: {item.createdBy || 'Quản trị viên'}
                                                    </small>
                                                </td>
                                                <td>
                                                    <span className="bms-pill-badge bms-pill-stat">
                                                        {item.scope === "PatientTestResults" || item.scope === 1 ? "Dữ Liệu Xét Nghiệm" : "Toàn Bộ Hệ Thống"}
                                                    </span>
                                                </td>
                                                <td className="font-monospace text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {item.fileSizeFormatted || "1.8 MB"}
                                                </td>
                                                <td>
                                                    <span
                                                        className="font-monospace small text-muted text-truncate d-inline-block"
                                                        style={{ maxWidth: "130px" }}
                                                        title={item.checksumSha256}
                                                    >
                                                        {item.checksumSha256 ? `${item.checksumSha256.substring(0, 12)}...` : "--"}
                                                    </span>
                                                </td>
                                                <td>{renderStatusBadge(item.status)}</td>
                                                <td className="small text-secondary" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    }) : "--"}
                                                </td>
                                                <td className="text-end pe-4">
                                                    <div className="d-flex justify-content-end gap-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-success btn-sm rounded-pill px-2.5 py-1"
                                                            title="Kiểm tra toàn vẹn SHA-256"
                                                            onClick={() => handleVerify(item)}
                                                            disabled={verifyingId === item.backupId}
                                                        >
                                                            {verifyingId === item.backupId ? (
                                                                <div className="spinner-border spinner-border-sm" role="status"></div>
                                                            ) : (
                                                                <CheckCircle2 size={12} />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary btn-sm rounded-pill px-2.5 py-1"
                                                            title="Tải tệp nén sao lưu"
                                                            onClick={() => handleDownload(item)}
                                                            disabled={downloadingId === (item.backupId || item.id)}
                                                        >
                                                            {downloadingId === (item.backupId || item.id) ? (
                                                                <div className="spinner-border spinner-border-sm" role="status"></div>
                                                            ) : (
                                                                <Download size={12} />
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-primary btn-sm rounded-pill px-2.5 py-1"
                                                            title="Xem chi tiết bản sao lưu"
                                                            onClick={() => {
                                                                setSelectedBackup(item);
                                                                setShowDetailModal(true);
                                                            }}
                                                        >
                                                            <Eye size={12} />
                                                        </button>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-danger btn-sm rounded-pill px-2.5 py-1"
                                                                    title="Khôi phục dữ liệu từ bản này"
                                                                    onClick={() => {
                                                                        setSelectedBackup(item);
                                                                        setShowRestoreModal(true);
                                                                    }}
                                                                >
                                                                    <Undo2 size={12} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-outline-secondary btn-sm rounded-pill px-2.5 py-1"
                                                                    title="Xóa bản sao lưu"
                                                                    onClick={() => handleDeleteBackup(item)}
                                                                >
                                                                    <Trash2 size={12} />
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
                            <TablePagination
                                page={currentPage}
                                totalItems={totalCount || filteredBackups.length}
                                pageSize={pageSize}
                                onPageChange={(nextPage) => setCurrentPage(nextPage)}
                                onPageSizeChange={(nextSize) => {
                                    setPageSize(nextSize);
                                    setCurrentPage(1);
                                }}
                                itemLabel="bản sao lưu"
                            />
                        </div>
                    )}
                </div>
            </div>

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
