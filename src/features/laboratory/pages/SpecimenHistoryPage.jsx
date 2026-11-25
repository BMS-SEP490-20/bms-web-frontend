/**
 * @file SpecimenHistoryPage.jsx
 * @description Master Specimen History, Lifecycle Audit Trail & Cold Storage Management page (UC70 / Issue I3-068 / BR-212 / BR-213).
 * Conforms to: ISO 15189:2022 Specimen Traceability, Production Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Barcode as LucideBarcode, Search as LucideSearch, TestTube2, History as LucideHistory, User, Calendar, RefreshCw, AlertCircle, CheckCircle2, FileText, ArrowRight, Warehouse, X as LucideX } from 'lucide-react';
import {
    fetchSpecimenHistories,
    fetchSpecimenHistoryByBarcode,
    addSpecimenTrackingEvent,
    updateSpecimenStorage
} from "../api/specimenHistoryApi";
import { ROLES, getStoredUser, hasRole } from "../../../constants/roles";
import SpecimenLifecycleTimeline from "../components/SpecimenLifecycleTimeline";
import SpecimenStorageCard from "../components/SpecimenStorageCard";
import AddTrackingEventModal from "../components/AddTrackingEventModal";
import UpdateStorageModal from "../components/UpdateStorageModal";

// Quick filter tabs
const STATUS_TABS = [
    { key: "ALL", label: "Tất Cả Mẫu" },
    { key: "Collected", label: "Đã Lấy Mẫu" },
    { key: "InTransit", label: "Đang Vận Chuyển" },
    { key: "Received", label: "Đã Tiếp Nhận" },
    { key: "Analyzing", label: "Đang Phân Tích" },
    { key: "Stored", label: "Đã Lưu Kho Lạnh" }
];

export default function SpecimenHistoryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentUser = getStoredUser();
    const canEditSpecimen = hasRole(currentUser, ROLES.LAB);

    // Barcode query parameter
    const paramBarcode = searchParams.get("barcode") || "";

    // States
    const [searchInput, setSearchInput] = useState(paramBarcode);
    const [activeBarcode, setActiveBarcode] = useState(paramBarcode);
    const [currentSpecimen, setCurrentSpecimen] = useState(null);
    const [loadingSpecimen, setLoadingSpecimen] = useState(false);
    const [specimenError, setSpecimenError] = useState(null);

    // List & Directory States
    const [specimenList, setSpecimenList] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize] = useState(10);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [loadingList, setLoadingList] = useState(false);

    // Modals
    const [showEventModal, setShowEventModal] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toastMessage]);

    // Load detailed specimen by barcode
    const loadSpecimenDetail = useCallback(async (barcode) => {
        if (!barcode) return;
        setLoadingSpecimen(true);
        setSpecimenError(null);
        try {
            const data = await fetchSpecimenHistoryByBarcode(barcode);
            if (data) {
                setCurrentSpecimen(data);
                setActiveBarcode(data.barcode);
            } else {
                setSpecimenError(`Không tìm thấy mẫu bệnh phẩm có mã '${barcode}'.`);
            }
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Không thể tải thông tin bệnh phẩm.";
            setSpecimenError(msg);
        } finally {
            setLoadingSpecimen(false);
        }
    }, []);

    // Load directory list
    const loadSpecimenDirectory = useCallback(async () => {
        setLoadingList(true);
        try {
            const params = {
                pageNumber,
                pageSize,
                status: statusFilter === "ALL" ? undefined : statusFilter
            };
            const result = await fetchSpecimenHistories(params);
            const items = result.items || [];
            setSpecimenList(items);
            setTotalCount(result.totalCount || 0);
            if (!activeBarcode && items.length > 0 && items[0].barcode) {
                setSearchInput(items[0].barcode);
                setActiveBarcode(items[0].barcode);
            }
        } catch (err) {
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể tải danh sách lịch sử bệnh phẩm."
            });
        } finally {
            setLoadingList(false);
        }
    }, [pageNumber, pageSize, statusFilter, activeBarcode]);

    // Initial load
    useEffect(() => {
        loadSpecimenDetail(activeBarcode);
    }, [activeBarcode, loadSpecimenDetail]);

    useEffect(() => {
        loadSpecimenDirectory();
    }, [loadSpecimenDirectory]);

    // Trigger Search
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const cleaned = searchInput.trim();
        if (cleaned) {
            setActiveBarcode(cleaned);
            setSearchParams({ barcode: cleaned });
            loadSpecimenDetail(cleaned);
        }
    };

    // Quick select specimen from table or chips
    const handleSelectSpecimen = (barcode) => {
        setSearchInput(barcode);
        setActiveBarcode(barcode);
        setSearchParams({ barcode });
        loadSpecimenDetail(barcode);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Add tracking event callback
    const handleSaveTrackingEvent = async (eventDto) => {
        if (!activeBarcode) return;
        const updated = await addSpecimenTrackingEvent(activeBarcode, eventDto);
        if (updated) {
            setCurrentSpecimen(updated);
            setToastMessage({ type: "success", text: "Đã ghi nhận sự kiện vòng đời mẫu thành công!" });
            loadSpecimenDirectory();
        }
    };

    // Update storage callback
    const handleSaveStorage = async (storageDto) => {
        if (!activeBarcode) return;
        const updated = await updateSpecimenStorage(activeBarcode, storageDto);
        if (updated) {
            setCurrentSpecimen(updated);
            setToastMessage({ type: "success", text: "Cập nhật vị trí lưu trữ lạnh thành công!" });
            loadSpecimenDirectory();
        }
    };

    // Render tube color badge
    const renderTubeBadge = (colorName, tubeType) => {
        let bgStyle = { backgroundColor: "#64748b", color: "#fff" };
        const lower = (colorName || "").toLowerCase();
        if (lower.includes("tím") || lower.includes("purple") || lower.includes("edta")) {
            bgStyle = { backgroundColor: "#7c3aed", color: "#fff" };
        } else if (lower.includes("vàng") || lower.includes("yellow") || lower.includes("serum")) {
            bgStyle = { backgroundColor: "#eab308", color: "#000" };
        } else if (lower.includes("xanh dương") || lower.includes("blue") || lower.includes("citrate")) {
            bgStyle = { backgroundColor: "#0284c7", color: "#fff" };
        } else if (lower.includes("xanh lá") || lower.includes("green") || lower.includes("heparin")) {
            bgStyle = { backgroundColor: "#16a34a", color: "#fff" };
        } else if (lower.includes("đỏ") || lower.includes("red")) {
            bgStyle = { backgroundColor: "#dc2626", color: "#fff" };
        }

        return (
            <span className="badge rounded-pill px-2 py-1 shadow-xs fw-semibold" style={bgStyle}>
                <TestTube2 className="me-1"  size="1em"/>
                {colorName || "Ống tiêu chuẩn"} {tubeType ? `(${tubeType})` : ""}
            </span>
        );
    };

    // Status badge mapper
    const renderStatusBadge = (status) => {
        const s = (status || "").toLowerCase();
        if (s.includes("stor") || s.includes("archive")) {
            return <span className="badge bg-info text-dark">Lưu Kho Lạnh</span>;
        }
        if (s.includes("complet")) {
            return <span className="badge bg-success">Đã Hoàn Thành</span>;
        }
        if (s.includes("analy") || s.includes("process")) {
            return <span className="badge bg-primary">Đang Phân Tích</span>;
        }
        if (s.includes("receiv")) {
            return <span className="badge bg-secondary">Đã Tiếp Nhận</span>;
        }
        if (s.includes("transit")) {
            return <span className="badge bg-warning text-dark">Đang Vận Chuyển</span>;
        }
        if (s.includes("collect")) {
            return <span className="badge bg-info">Đã Lấy Mẫu</span>;
        }
        if (s.includes("discard") || s.includes("reject")) {
            return <span className="badge bg-danger">Đã Hủy / Từ Chối</span>;
        }
        return <span className="badge bg-light text-dark border">{status || "Khởi tạo"}</span>;
    };

    // Timeline events and storage normalization
    const timelineEvents = currentSpecimen?.timeline || currentSpecimen?.timelineEvents || [];
    const storageInfo = currentSpecimen?.storage || currentSpecimen?.storageInfo;
    const currentStatus = currentSpecimen?.status || currentSpecimen?.currentStatus || "Stored";
    const orderNumber = currentSpecimen?.orderId || currentSpecimen?.testOrderNumber || "--";
    const collectionTime = currentSpecimen?.collectionTime || currentSpecimen?.collectedAt;
    const collector = currentSpecimen?.collectorName || currentSpecimen?.collectedBy || "Điều dưỡng khoa khám";

    const formatClinicalDateTime = (raw, options) => {
        if (!raw) return "--";
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
            return options ? d.toLocaleString("vi-VN", options) : d.toLocaleString("vi-VN");
        }
        return String(raw);
    };

    return (
        <div className="w-100 py-1">
            {/* Header Card */}
            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">
                            Truy vấn lịch sử &amp; Vòng đời mẫu bệnh phẩm
                        </h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Theo dõi sự kiện vòng đời mẫu bệnh phẩm, thông tin lấy mẫu và vị trí lưu trữ kho lạnh.
                    </p>
                </div>

                <div className="bms-page-actions">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1.5 rounded-pill px-3 fw-semibold text-nowrap"
                        style={{ color: '#1E60E6', borderColor: '#1E60E6' }}
                        onClick={() => {
                            loadSpecimenDetail(activeBarcode);
                            loadSpecimenDirectory();
                        }}
                    >
                        <RefreshCw size={13} className={loadingSpecimen || loadingList ? "fa-spin" : ""} />
                        <span>Làm mới</span>
                    </button>
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

            {/* Single-Line Barcode Lookup Filter Bar */}
            <form onSubmit={handleSearchSubmit} className="bms-filter-bar mb-3">
                <div className="bms-search-input-pill">
                    <LucideBarcode className="bms-search-icon"  size="1em"/>
                    <input
                        type="text"
                        placeholder="Quét mã vạch hoặc nhập mã mẫu bệnh phẩm..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                        <button
                            type="button"
                            className="bms-search-clear"
                            onClick={() => setSearchInput("")}
                        >
                            <LucideX size={12} />
                        </button>
                    )}
                </div>

                <button
                    type="submit"
                    className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1 text-nowrap"
                    style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' }}
                    disabled={loadingSpecimen}
                >
                    <LucideSearch  size="1em"/>
                    <span>Truy vấn</span>
                </button>

                <select
                    className="form-select"
                    style={{ width: "auto" }}
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPageNumber(1);
                    }}
                >
                    {STATUS_TABS.map((tab) => (
                        <option key={tab.key} value={tab.key}>{tab.label}</option>
                    ))}
                </select>

                {specimenList.length > 0 && (
                    <div className="d-flex flex-wrap align-items-center gap-1 text-muted small">
                        <span className="fw-semibold">Mẫu nhanh:</span>
                        {specimenList.slice(0, 3).map((item) => (
                            <button
                                key={item.barcode}
                                type="button"
                                className={`btn btn-sm py-0 px-2 rounded-pill font-monospace ${
                                    activeBarcode === item.barcode ? "btn-primary text-white" : "btn-outline-secondary"
                                }`}
                                style={activeBarcode === item.barcode ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : {}}
                                onClick={() => handleSelectSpecimen(item.barcode)}
                            >
                                {item.barcode}
                            </button>
                        ))}
                    </div>
                )}

                <span className="bms-filter-meta">
                    Tổng cộng <strong>{totalCount}</strong> mẫu
                </span>
            </form>

            {/* Error State */}
            {specimenError && (
                <div className="alert alert-danger shadow-sm mb-4 d-flex align-items-center gap-3">
                    <AlertCircle className="fs-3 flex-shrink-0"  size="1em"/>
                    <div>
                        <h6 className="fw-bold mb-1">Không thể hiển thị thông tin bệnh phẩm</h6>
                        <p className="mb-0 small">{specimenError}</p>
                    </div>
                </div>
            )}

            {/* Active Specimen Master Card */}
            {loadingSpecimen ? (
                <div className="card shadow-sm border-0 mb-4 text-center py-3 rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                    <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
                    <p className="text-muted mb-0">Đang truy xuất chuỗi hành trình bệnh phẩm từ cơ sở dữ liệu y khoa...</p>
                </div>
            ) : currentSpecimen ? (
                <div className="card shadow-sm border-0 mb-4 overflow-hidden rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
                    <div className="card-header bg-white border-bottom p-2" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                        <div className="row g-3 align-items-center justify-content-between">
                            <div className="col-12 col-md-auto d-flex align-items-center gap-3">
                                <div className="p-3 rounded-4 text-center" style={{ backgroundColor: 'rgba(30, 96, 230,0.12)', color: '#1E60E6' }}>
                                    <LucideBarcode className="display-6"  size="1em"/>
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <h4 className="fw-bold font-monospace mb-0" style={{ color: '#0F172A' }}>
                                            {currentSpecimen.barcode}
                                        </h4>
                                        {renderStatusBadge(currentStatus)}
                                    </div>
                                    <div className="d-flex flex-wrap gap-2 text-secondary small align-items-center">
                                        {currentSpecimen.rfidTag && (
                                            <span className="badge rounded-pill bg-light text-secondary border font-monospace px-2">
                                                RFID: {currentSpecimen.rfidTag}
                                            </span>
                                        )}
                                        <span>Đơn chỉ định: <strong>{orderNumber}</strong></span>
                                        <span>•</span>
                                        <span>Loại mẫu: <strong>{currentSpecimen.sampleType}</strong></span>
                                        {currentSpecimen.testPackageName && (
                                            <>
                                                <span>•</span>
                                                <span className="fw-semibold" style={{ color: '#1E60E6' }}>{currentSpecimen.testPackageName}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {canEditSpecimen && (
                                <div className="col-12 col-md-auto d-flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-xs rounded-pill px-3"
                                        style={{ color: '#1E60E6', borderColor: '#1E60E6' }}
                                        onClick={() => setShowStorageModal(true)}
                                    >
                                        <Warehouse  size="1em"/>
                                        <span>Đổi Vị Trí Tủ Lạnh</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn d-flex align-items-center gap-2 shadow-sm rounded-pill px-3"
                                        style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', color: '#ffffff' }}
                                        onClick={() => setShowEventModal(true)}
                                    >
                                        <LucideHistory  size="1em"/>
                                        <span>Ghi Nhận Sự Kiện</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Specimen Key Attribute Grid */}
                    <div className="card-body p-2 bg-light border-bottom">
                        <div className="row g-3">
                            {/* Patient Info */}
                            <div className="col-12 col-md-6 col-lg-4">
                                <div className="p-3 bg-white rounded border h-100 shadow-xs">
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-2">
                                        <User className="text-primary me-1"  size="1em"/> Thông Tin Bệnh Nhân
                                    </span>
                                    <h6 className="fw-bold text-dark mb-1">{currentSpecimen.patientName}</h6>
                                    <div className="text-secondary small">
                                        <div>Mã BN: <strong className="font-monospace text-primary">{currentSpecimen.patientId}</strong></div>
                                        <div>Giới tính / Tuổi: {currentSpecimen.patientGender || "N/A"} {currentSpecimen.patientAge ? `(${currentSpecimen.patientAge} tuổi)` : ""}</div>
                                        {currentSpecimen.patientPhone && (
                                            <div>SĐT: {currentSpecimen.patientPhone}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tube & Physical Characteristics */}
                            <div className="col-12 col-md-6 col-lg-4">
                                <div className="p-3 bg-white rounded border h-100 shadow-xs">
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-2">
                                        <TestTube2 className="text-info me-1"  size="1em"/> Đặc Tính Ống Mẫu & Thuốc Thử
                                    </span>
                                    <div className="mb-2">
                                        {renderTubeBadge(currentSpecimen.tubeColor, currentSpecimen.sampleType)}
                                    </div>
                                    <div className="text-secondary small">
                                        <div>Chất chống đông: <strong>{currentSpecimen.anticoagulant || "Không (Ống trơn)"}</strong></div>
                                        <div>Thể tích lấy mẫu: <strong>{currentSpecimen.volumeMl} ml</strong></div>
                                        <div>Đạt chuẩn: <span className="badge bg-success-subtle text-success">Đạt yêu cầu thử nghiệm</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* Collection & Phlebotomy Info */}
                            <div className="col-12 col-md-12 col-lg-4">
                                <div className="p-3 bg-white rounded border h-100 shadow-xs">
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-2">
                                        <Calendar className="text-warning me-1"  size="1em"/> Thời Gian & Người Lấy Mẫu
                                    </span>
                                    <div className="text-secondary small">
                                        <div>Thời điểm lấy: <strong>{formatClinicalDateTime(collectionTime)}</strong></div>
                                        <div>Người lấy mẫu: <strong>{collector}</strong></div>
                                        <div>Khoa/Phòng gửi: <strong>{currentSpecimen.department || "Khoa Xét Nghiệm Trung Tâm"}</strong></div>
                                        {currentSpecimen.rejectionReason && (
                                            <div className="badge bg-danger mt-1">Lý do từ chối: {currentSpecimen.rejectionReason}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Side-by-side: Timeline & Physical Storage */}
                    <div className="card-body p-2">
                        <div className="row g-4">
                            <div className="col-12 col-xl-7">
                                <SpecimenLifecycleTimeline
                                    events={timelineEvents}
                                    onAddEventClick={canEditSpecimen ? () => setShowEventModal(true) : undefined}
                                />
                            </div>
                            <div className="col-12 col-xl-5">
                                <SpecimenStorageCard
                                    storageInfo={storageInfo}
                                    onUpdateStorageClick={canEditSpecimen ? () => setShowStorageModal(true) : undefined}
                                    canEdit={canEditSpecimen}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Specimen Master Directory Standalone Table */}
            <section className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h2 className="bms-table-standalone-title">Danh sách mẫu bệnh phẩm toàn viện</h2>
                        <p className="bms-table-standalone-subtitle">Theo dõi trạng thái xử lý, kho lạnh và thời hạn lưu mẫu</p>
                    </div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-3 py-1.5">
                        {specimenList.length} / {totalCount} mẫu
                    </span>
                </div>

                <div className="bms-table-standalone-body">
                    <table className="table table-hover table-sm align-middle mb-0" style={{ tableLayout: "fixed", width: "100%", fontSize: "0.84rem" }}>
                        <thead className="table-light text-secondary text-uppercase" style={{ fontSize: "0.75rem" }}>
                            <tr>
                                <th className="ps-3" style={{ width: "14%" }}>Mã vạch</th>
                                <th style={{ width: "18%" }}>Bệnh nhân</th>
                                <th style={{ width: "13%" }}>Loại mẫu</th>
                                <th style={{ width: "13%" }}>Thời gian lấy</th>
                                <th style={{ width: "13%" }}>Trạng thái</th>
                                <th style={{ width: "14%" }}>Vị trí lưu trữ</th>
                                <th style={{ width: "7%" }} className="text-center">Hạn lưu</th>
                                <th style={{ width: "8%" }} className="text-end pe-3">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingList ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">
                                        <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                        Đang tải danh sách mẫu...
                                    </td>
                                </tr>
                            ) : specimenList.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-4 text-muted">
                                        Không tìm thấy mẫu bệnh phẩm nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                specimenList.map((item) => {
                                    const isSelected = activeBarcode === item.barcode;
                                    const collected = item.collectionTime || item.collectedAt;
                                    const remDays = item.remainingDays !== undefined ? item.remainingDays : item.daysRemaining;

                                    return (
                                        <tr
                                            key={item.id || item.barcode}
                                            className={isSelected ? "table-primary fw-semibold" : ""}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => handleSelectSpecimen(item.barcode)}
                                        >
                                            <td className="ps-3">
                                                <span className="font-monospace text-primary fw-bold">
                                                    {item.barcode}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="fw-bold text-dark">{item.patientName}</div>
                                                <small className="text-muted font-monospace">{item.patientId}</small>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center gap-1">
                                                    {renderTubeBadge(item.tubeColor, item.sampleType)}
                                                </div>
                                            </td>
                                            <td className="small text-secondary">
                                                {formatClinicalDateTime(collected, {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                })}
                                            </td>
                                            <td>{renderStatusBadge(item.status || item.currentStatus)}</td>
                                            <td className="small font-monospace">
                                                {item.storageUnit ? (
                                                    <span>
                                                        {item.storageUnit} ({item.rackId || "--"})
                                                    </span>
                                                ) : (
                                                    <span className="text-muted">Chưa gán</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {remDays !== undefined && remDays !== null ? (
                                                    <span
                                                        className={`badge rounded-pill ${
                                                            remDays <= 0
                                                                ? "bg-danger"
                                                                : remDays <= 2
                                                                ? "bg-warning text-dark"
                                                                : "bg-light text-dark border"
                                                        }`}
                                                    >
                                                        {remDays} ngày
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">--</span>
                                                )}
                                            </td>
                                            <td className="text-end pe-3">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary rounded-pill px-2.5 py-0.5 d-inline-flex align-items-center gap-1 text-nowrap"
                                                    style={{ fontSize: "0.78rem" }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectSpecimen(item.barcode);
                                                    }}
                                                >
                                                    <span>Xem</span>
                                                    <ArrowRight size={9} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Modals */}
            {canEditSpecimen && (
                <>
                    <AddTrackingEventModal
                        show={showEventModal}
                        onHide={() => setShowEventModal(false)}
                        barcode={activeBarcode}
                        onSave={handleSaveTrackingEvent}
                    />

                    <UpdateStorageModal
                        show={showStorageModal}
                        onHide={() => setShowStorageModal(false)}
                        barcode={activeBarcode}
                        currentStorage={storageInfo}
                        onSave={handleSaveStorage}
                    />
                </>
            )}
        </div>
    );
}
