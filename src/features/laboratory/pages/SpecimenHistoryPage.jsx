/**
 * @file SpecimenHistoryPage.jsx
 * @description Master Specimen History, Lifecycle Audit Trail & Cold Storage Management page (UC70 / Issue I3-068 / BR-212 / BR-213).
 * Conforms to: ISO 15189:2022 Specimen Traceability, Production Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
    FaBarcode,
    FaSearch,
    FaVial,
    FaHistory,
    FaUser,
    FaCalendarAlt,
    FaSync,
    FaExclamationCircle,
    FaCheckCircle,
    FaFileAlt,
    FaArrowRight,
    FaWarehouse
} from "react-icons/fa";
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
                <FaVial className="me-1" />
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

    return (
        <div className="container-fluid py-4 px-lg-4 bg-light" style={{ minHeight: "100vh" }}>
            {/* Page Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <h4 className="fw-bold text-dark mb-0">Truy Vấn Lịch Sử Mẫu Bệnh Phẩm</h4>
                        <span className="badge bg-primary-subtle text-primary border border-primary font-monospace">
                            UC70 • BR-212 / BR-213
                        </span>
                        <span className="badge bg-success-subtle text-success border border-success">
                            ISO 15189
                        </span>
                    </div>
                    <p className="text-secondary small mb-0">
                        Theo dõi định danh, chuỗi hành trình lấy mẫu - vận chuyển - phân tích và giám sát bảo quản lạnh.
                    </p>
                </div>

                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 shadow-sm"
                        onClick={() => {
                            loadSpecimenDetail(activeBarcode);
                            loadSpecimenDirectory();
                        }}
                    >
                        <FaSync className={loadingSpecimen || loadingList ? "fa-spin" : ""} />
                        <span>Làm Mới</span>
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

            {/* Quick Barcode Scanner & Search Bar */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body p-3">
                    <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
                        <div className="col-12 col-md-6 col-lg-7">
                            <div className="input-group">
                                <span className="input-group-text bg-light text-primary border-end-0">
                                    <FaBarcode className="fs-5" />
                                </span>
                                <input
                                    type="text"
                                    className="form-control form-control-lg border-start-0 font-monospace fw-bold"
                                    placeholder="Quét mã vạch Code 128 hoặc nhập mã mẫu (vd: SMP-261021-001)..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-6 col-md-3 col-lg-2">
                            <button
                                type="submit"
                                className="btn btn-primary btn-lg w-100 d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                disabled={loadingSpecimen}
                            >
                                <FaSearch />
                                <span>Truy Vấn</span>
                            </button>
                        </div>

                        {/* Quick Suggestion Chips from live API directory */}
                        {specimenList.length > 0 && (
                            <div className="col-12 col-md-12 col-lg-3 d-flex flex-wrap align-items-center gap-1 text-muted small">
                                <span className="fw-semibold">Mẫu nhanh:</span>
                                {specimenList.slice(0, 4).map((item) => (
                                    <button
                                        key={item.barcode}
                                        type="button"
                                        className={`btn btn-sm py-0 px-2 font-monospace ${
                                            activeBarcode === item.barcode ? "btn-dark" : "btn-outline-secondary"
                                        }`}
                                        onClick={() => handleSelectSpecimen(item.barcode)}
                                    >
                                        {item.barcode}
                                    </button>
                                ))}
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Error State */}
            {specimenError && (
                <div className="alert alert-danger shadow-sm mb-4 d-flex align-items-center gap-3">
                    <FaExclamationCircle className="fs-3 flex-shrink-0" />
                    <div>
                        <h6 className="fw-bold mb-1">Không thể hiển thị thông tin bệnh phẩm</h6>
                        <p className="mb-0 small">{specimenError}</p>
                    </div>
                </div>
            )}

            {/* Active Specimen Master Card */}
            {loadingSpecimen ? (
                <div className="card shadow-sm border-0 mb-4 text-center py-5">
                    <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
                    <p className="text-muted mb-0">Đang truy xuất chuỗi hành trình bệnh phẩm từ cơ sở dữ liệu y khoa...</p>
                </div>
            ) : currentSpecimen ? (
                <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                    <div className="card-header bg-white border-bottom p-4">
                        <div className="row g-3 align-items-center justify-content-between">
                            <div className="col-12 col-md-auto d-flex align-items-center gap-3">
                                <div className="p-3 bg-primary-subtle text-primary rounded-3 text-center">
                                    <FaBarcode className="display-6" />
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <h4 className="fw-bold text-dark font-monospace mb-0">
                                            {currentSpecimen.barcode}
                                        </h4>
                                        {renderStatusBadge(currentStatus)}
                                    </div>
                                    <div className="d-flex flex-wrap gap-2 text-secondary small align-items-center">
                                        {currentSpecimen.rfidTag && (
                                            <span className="badge bg-light text-secondary border font-monospace">
                                                RFID: {currentSpecimen.rfidTag}
                                            </span>
                                        )}
                                        <span>Đơn chỉ định: <strong>{orderNumber}</strong></span>
                                        <span>•</span>
                                        <span>Loại mẫu: <strong>{currentSpecimen.sampleType}</strong></span>
                                        {currentSpecimen.testPackageName && (
                                            <>
                                                <span>•</span>
                                                <span className="text-primary fw-semibold">{currentSpecimen.testPackageName}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {canEditSpecimen && (
                                <div className="col-12 col-md-auto d-flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-xs"
                                        onClick={() => setShowStorageModal(true)}
                                    >
                                        <FaWarehouse />
                                        <span>Đổi Vị Trí Tủ Lạnh</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary d-flex align-items-center gap-2 shadow-sm"
                                        onClick={() => setShowEventModal(true)}
                                    >
                                        <FaHistory />
                                        <span>Ghi Nhận Sự Kiện</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Specimen Key Attribute Grid */}
                    <div className="card-body p-4 bg-light border-bottom">
                        <div className="row g-3">
                            {/* Patient Info */}
                            <div className="col-12 col-md-6 col-lg-4">
                                <div className="p-3 bg-white rounded border h-100 shadow-xs">
                                    <span className="text-muted small fw-bold text-uppercase d-block mb-2">
                                        <FaUser className="text-primary me-1" /> Thông Tin Bệnh Nhân
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
                                        <FaVial className="text-info me-1" /> Đặc Tính Ống Mẫu & Thuốc Thử
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
                                        <FaCalendarAlt className="text-warning me-1" /> Thời Gian & Người Lấy Mẫu
                                    </span>
                                    <div className="text-secondary small">
                                        <div>Thời điểm lấy: <strong>{collectionTime ? new Date(collectionTime).toLocaleString("vi-VN") : "--"}</strong></div>
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
                    <div className="card-body p-4">
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

            {/* Specimen Master Directory Table */}
            <div className="card shadow-sm border-0">
                <div className="card-header bg-white border-bottom py-3">
                    <div className="row g-2 align-items-center justify-content-between">
                        <div className="col-12 col-md-auto">
                            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                                <FaFileAlt className="text-primary" />
                                Danh Sách Mẫu Bệnh Phẩm Toàn Viện
                            </h6>
                            <small className="text-muted">Tổng cộng {totalCount} mẫu bệnh phẩm được theo dõi</small>
                        </div>

                        {/* Filter Tabs */}
                        <div className="col-12 col-md-auto d-flex flex-wrap gap-2">
                            <div className="btn-group btn-group-sm">
                                {STATUS_TABS.map((tab) => (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        className={`btn ${statusFilter === tab.key ? "btn-primary" : "btn-outline-secondary"}`}
                                        onClick={() => {
                                            setStatusFilter(tab.key);
                                            setPageNumber(1);
                                        }}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-100 overflow-hidden">
                    <table className="table table-hover table-sm align-middle mb-0" style={{ tableLayout: "fixed", width: "100%", fontSize: "0.84rem" }}>
                        <thead className="table-light text-secondary text-uppercase" style={{ fontSize: "0.75rem" }}>
                            <tr>
                                <th style={{ width: "14%" }}>Mã Vạch</th>
                                <th style={{ width: "18%" }}>Bệnh Nhân</th>
                                <th style={{ width: "13%" }}>Loại Mẫu</th>
                                <th style={{ width: "13%" }}>Thời Gian Lấy</th>
                                <th style={{ width: "13%" }}>Trạng Thái</th>
                                <th style={{ width: "15%" }}>Vị Trí Lưu Trữ</th>
                                <th style={{ width: "7%" }} className="text-center">Hạn Lưu</th>
                                <th style={{ width: "7%" }} className="text-end">Thao Tác</th>
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
                                            <td>
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
                                                {collected ? new Date(collected).toLocaleString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    hour: "2-digit",
                                                    minute: "2-digit"
                                                }) : "--"}
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
                                                        className={`badge ${
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
                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 shadow-xs px-2 py-1"
                                                    style={{ fontSize: "0.78rem" }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectSpecimen(item.barcode);
                                                    }}
                                                >
                                                    <span>Xem</span>
                                                    <FaArrowRight size={9} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
