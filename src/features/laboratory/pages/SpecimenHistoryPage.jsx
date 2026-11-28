/**
 * @file SpecimenHistoryPage.jsx
 * @description Management-first Specimen History & Traceability page (UC70).
 * 100% DB-driven from blood_samples + specimen_histories (zero hardcoded mock storage/temperature/QC values).
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Modal, Row, Col, Badge, Alert, Spinner } from "react-bootstrap";
import {
    Barcode as LucideBarcode,
    Search as LucideSearch,
    TestTube2,
    History as LucideHistory,
    User,
    Calendar,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Warehouse,
    X as LucideX,
    FlaskConical,
    Clock,
    Eye
} from "lucide-react";
import TablePagination, { usePagination } from "../../../components/ui/TablePagination";
import {
    fetchSpecimenHistories,
    fetchSpecimenHistoryByBarcode,
    addSpecimenTrackingEvent,
    updateSpecimenStorage
} from "../api/specimenHistoryApi";
import { ROLES, getStoredUser, hasRole } from "../../../constants/roles";
import { formatTubeColorVi, formatSampleTypeVi } from "../../../shared/workflow/labConsumables";
import SpecimenLifecycleTimeline from "../components/SpecimenLifecycleTimeline";
import SpecimenStorageCard from "../components/SpecimenStorageCard";
import AddTrackingEventModal from "../components/AddTrackingEventModal";
import UpdateStorageModal from "../components/UpdateStorageModal";

const STATUS_TABS = [
    { key: "ALL", label: "Tất cả" },
    { key: "PendingCollection", label: "Chờ lấy mẫu" },
    { key: "Collected", label: "Đã lấy mẫu" },
    { key: "Received", label: "Đã tiếp nhận" },
    { key: "Testing", label: "Đang xét nghiệm" },
    { key: "Completed", label: "Hoàn tất" },
    { key: "Rejected", label: "Từ chối" }
];

function normalizeStatusKey(raw) {
    const s = String(raw || "").trim().toLowerCase();
    if (s === "pendingcollection" || s === "pending") return "PendingCollection";
    if (s === "collected") return "Collected";
    if (s === "received" || s === "processing") return "Received";
    if (s === "testing" || s === "analyzing" || s === "rerunrequested") return "Testing";
    if (s === "completed" || s === "stored") return "Completed";
    if (s === "rejected" || s === "discarded") return "Rejected";
    return raw || "";
}

function renderStatusBadge(status) {
    const key = normalizeStatusKey(status);
    switch (key) {
        case "PendingCollection":
            return <Badge bg="secondary" className="rounded-pill px-2.5 py-1">Chờ lấy mẫu</Badge>;
        case "Collected":
            return <Badge bg="info" text="dark" className="rounded-pill px-2.5 py-1">Đã lấy mẫu</Badge>;
        case "Received":
            return <Badge bg="primary" className="rounded-pill px-2.5 py-1">Đã tiếp nhận Lab</Badge>;
        case "Testing":
            return <Badge bg="warning" text="dark" className="rounded-pill px-2.5 py-1">Đang xét nghiệm</Badge>;
        case "Completed":
            return <Badge bg="success" className="rounded-pill px-2.5 py-1">Hoàn tất</Badge>;
        case "Rejected":
            return <Badge bg="danger" className="rounded-pill px-2.5 py-1">Từ chối mẫu</Badge>;
        default:
            return <Badge bg="light" text="dark" className="border rounded-pill px-2.5 py-1">{status || "—"}</Badge>;
    }
}

function formatGenderVi(raw) {
    const s = String(raw || "").trim().toLowerCase();
    if (s === "male" || s === "nam") return "Nam";
    if (s === "female" || s === "nữ" || s === "nu") return "Nữ";
    if (s === "other" || s === "khác") return "Khác";
    return raw || "";
}

function formatClinicalDateTime(raw) {
    if (!raw) return "—";
    const s = String(raw).trim();
    if (!s || s.startsWith("01/01/0001")) return "—";
    const d = new Date(s);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() > 1970) {
        return d.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }
    return s;
}

export default function SpecimenHistoryPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentUser = getStoredUser();
    const canEditSpecimen = hasRole(currentUser, ROLES.LAB);

    const paramBarcode = searchParams.get("barcode") || "";

    const [allSpecimens, setAllSpecimens] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [searchInput, setSearchInput] = useState("");

    const [showDetailModal, setShowDetailModal] = useState(Boolean(paramBarcode));
    const [activeBarcode, setActiveBarcode] = useState(paramBarcode);
    const [currentSpecimen, setCurrentSpecimen] = useState(null);
    const [loadingSpecimen, setLoadingSpecimen] = useState(false);
    const [specimenError, setSpecimenError] = useState(null);

    const [showEventModal, setShowEventModal] = useState(false);
    const [showStorageModal, setShowStorageModal] = useState(false);
    const [toastMessage, setToastMessage] = useState(null);

    useEffect(() => {
        if (!toastMessage) return undefined;
        const timer = setTimeout(() => setToastMessage(null), 4000);
        return () => clearTimeout(timer);
    }, [toastMessage]);

    const loadAllSpecimens = useCallback(async () => {
        setLoadingList(true);
        try {
            const result = await fetchSpecimenHistories({ page: 1, pageSize: 200 });
            setAllSpecimens(Array.isArray(result.items) ? result.items : []);
        } catch (err) {
            setToastMessage({
                type: "danger",
                text: err?.response?.data?.message || err?.message || "Không thể tải danh sách mẫu bệnh phẩm từ cơ sở dữ liệu."
            });
            setAllSpecimens([]);
        } finally {
            setLoadingList(false);
        }
    }, []);

    const loadSpecimenDetail = useCallback(async (barcode) => {
        const clean = String(barcode || "").trim();
        if (!clean) return;
        setLoadingSpecimen(true);
        setSpecimenError(null);
        try {
            const data = await fetchSpecimenHistoryByBarcode(clean);
            if (data) {
                setCurrentSpecimen(data);
                setActiveBarcode(data.barcode || clean);
            } else {
                setCurrentSpecimen(null);
                setSpecimenError(`Không tìm thấy mẫu bệnh phẩm có mã "${clean}" trong cơ sở dữ liệu.`);
            }
        } catch (err) {
            setCurrentSpecimen(null);
            setSpecimenError(err?.response?.data?.message || err?.message || "Không thể tải chi tiết truy vết mẫu bệnh phẩm.");
        } finally {
            setLoadingSpecimen(false);
        }
    }, []);

    useEffect(() => {
        loadAllSpecimens();
    }, [loadAllSpecimens]);

    useEffect(() => {
        if (paramBarcode) {
            setActiveBarcode(paramBarcode);
            setShowDetailModal(true);
            void loadSpecimenDetail(paramBarcode);
        }
    }, [paramBarcode, loadSpecimenDetail]);

    const statusCounts = useMemo(() => {
        const counts = {
            ALL: allSpecimens.length,
            PendingCollection: 0,
            Collected: 0,
            Received: 0,
            Testing: 0,
            Completed: 0,
            Rejected: 0
        };
        for (const item of allSpecimens) {
            const key = normalizeStatusKey(item.status || item.currentStatus);
            if (counts[key] !== undefined) counts[key] += 1;
        }
        return counts;
    }, [allSpecimens]);

    const filteredSpecimens = useMemo(() => {
        const kw = searchInput.trim().toLowerCase();
        return allSpecimens.filter((item) => {
            if (statusFilter !== "ALL") {
                const key = normalizeStatusKey(item.status || item.currentStatus);
                if (key !== statusFilter) return false;
            }
            if (!kw) return true;
            const blob = `${item.barcode || ""} ${item.patientName || ""} ${item.patientId || ""} ${item.orderId || ""} ${item.testPackageName || ""} ${item.storageUnit || ""}`.toLowerCase();
            return blob.includes(kw);
        });
    }, [allSpecimens, statusFilter, searchInput]);

    const pagination = usePagination(filteredSpecimens, 10);

    const openSpecimenDetail = (barcode) => {
        const clean = String(barcode || "").trim();
        if (!clean) return;
        setActiveBarcode(clean);
        setShowDetailModal(true);
        setSearchParams({ barcode: clean });
        void loadSpecimenDetail(clean);
    };

    const closeSpecimenDetail = () => {
        setShowDetailModal(false);
        if (searchParams.has("barcode")) {
            setSearchParams({});
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const q = searchInput.trim();
        if (!q) return;
        const exact = allSpecimens.find(
            (s) => String(s.barcode || "").toLowerCase() === q.toLowerCase()
        );
        if (exact) {
            openSpecimenDetail(exact.barcode);
        } else if (/^(SMP|SPC|BC|SA)/i.test(q)) {
            openSpecimenDetail(q);
        }
    };

    const handleSaveTrackingEvent = async (eventDto) => {
        if (!activeBarcode) return;
        const updated = await addSpecimenTrackingEvent(activeBarcode, eventDto);
        if (updated) {
            setCurrentSpecimen(updated);
            setToastMessage({ type: "success", text: "Đã ghi nhận sự kiện vòng đời mẫu vào cơ sở dữ liệu." });
            void loadAllSpecimens();
        }
    };

    const handleSaveStorage = async (storageDto) => {
        if (!activeBarcode) return;
        const updated = await updateSpecimenStorage(activeBarcode, storageDto);
        if (updated) {
            setCurrentSpecimen(updated);
            setToastMessage({ type: "success", text: "Đã cập nhật vị trí lưu trữ lạnh vào cơ sở dữ liệu." });
            void loadAllSpecimens();
        }
    };

    const timelineEvents = currentSpecimen?.timeline || [];
    const storageInfo = currentSpecimen?.storage || null;

    return (
        <div className="w-100 py-1">

            <div className="bms-page-header-card mb-3">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">Lịch sử &amp; Truy vết mẫu bệnh phẩm</h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Quản lý toàn bộ vòng đời ống mẫu bệnh phẩm theo dữ liệu thực từ hệ thống Lab, lịch sử sự kiện và vị trí lưu kho lạnh.
                    </p>
                </div>
                <div className="bms-page-actions">
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1.5 rounded-pill px-3 fw-semibold text-nowrap"
                        disabled={loadingList}
                        onClick={() => {
                            void loadAllSpecimens();
                            if (showDetailModal && activeBarcode) void loadSpecimenDetail(activeBarcode);
                        }}
                    >
                        <RefreshCw size={13} className={loadingList ? "fa-spin" : ""} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            <Row className="g-3 mb-3">
                <Col md={3} sm={6}>
                    <div
                        className="bms-kpi-quad-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => setStatusFilter("ALL")}
                        onKeyDown={(e) => { if (e.key === "Enter") setStatusFilter("ALL"); }}
                        style={{ cursor: "pointer", border: statusFilter === "ALL" ? "1.5px solid #1E60E6" : undefined }}
                    >
                        <div>
                            <h6 className="bms-kpi-label">Tổng Mẫu Bệnh Phẩm</h6>
                            <div className="bms-kpi-value text-primary">{statusCounts.ALL}</div>
                            <div className="bms-kpi-sub text-muted">
                                {statusCounts.Rejected > 0 ? `${statusCounts.Rejected} mẫu từ chối` : "Dữ liệu thực từ CSDL"}
                            </div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                            <TestTube2 size="1em" />
                        </div>
                    </div>
                </Col>
                <Col md={3} sm={6}>
                    <div
                        className="bms-kpi-quad-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => setStatusFilter("Received")}
                        onKeyDown={(e) => { if (e.key === "Enter") setStatusFilter("Received"); }}
                        style={{ cursor: "pointer", border: statusFilter === "Received" ? "1.5px solid #0284C7" : undefined }}
                    >
                        <div>
                            <h6 className="bms-kpi-label">Đã Tiếp Nhận Lab</h6>
                            <div className="bms-kpi-value" style={{ color: "#0284C7" }}>{statusCounts.Received}</div>
                            <div className="bms-kpi-sub text-muted">
                                {statusCounts.PendingCollection > 0 ? `Chờ lấy mẫu: ${statusCounts.PendingCollection}` : "Sẵn sàng phân tích"}
                            </div>
                        </div>
                        <div className="bms-kpi-icon-badge" style={{ background: "#E0F2FE", color: "#0284C7" }}>
                            <Clock size="1em" />
                        </div>
                    </div>
                </Col>
                <Col md={3} sm={6}>
                    <div
                        className="bms-kpi-quad-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => setStatusFilter("Testing")}
                        onKeyDown={(e) => { if (e.key === "Enter") setStatusFilter("Testing"); }}
                        style={{ cursor: "pointer", border: statusFilter === "Testing" ? "1.5px solid #D97706" : undefined }}
                    >
                        <div>
                            <h6 className="bms-kpi-label">Đang Xét Nghiệm</h6>
                            <div className="bms-kpi-value" style={{ color: "#D97706" }}>{statusCounts.Testing}</div>
                            <div className="bms-kpi-sub text-muted">Đang chạy máy / chờ nhập KQ</div>
                        </div>
                        <div className="bms-kpi-icon-badge" style={{ background: "#FEF3C7", color: "#D97706" }}>
                            <FlaskConical size="1em" />
                        </div>
                    </div>
                </Col>
                <Col md={3} sm={6}>
                    <div
                        className="bms-kpi-quad-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => setStatusFilter("Completed")}
                        onKeyDown={(e) => { if (e.key === "Enter") setStatusFilter("Completed"); }}
                        style={{ cursor: "pointer", border: statusFilter === "Completed" ? "1.5px solid #10B981" : undefined }}
                    >
                        <div>
                            <h6 className="bms-kpi-label">Đã Hoàn Tất</h6>
                            <div className="bms-kpi-value text-success">{statusCounts.Completed}</div>
                            <div className="bms-kpi-sub text-muted">Đã trả KQ &amp; lưu vết đầy đủ</div>
                        </div>
                        <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                            <CheckCircle2 size="1em" />
                        </div>
                    </div>
                </Col>
            </Row>

            {toastMessage && (
                <Alert
                    variant={toastMessage.type}
                    dismissible
                    onClose={() => setToastMessage(null)}
                    className="rounded-4 shadow-sm border-0 mb-3 py-2 small d-flex align-items-center gap-2"
                >
                    <CheckCircle2 size={16} />
                    <span>{toastMessage.text}</span>
                </Alert>
            )}

            <div className="bms-filter-bar mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div className="d-flex align-items-center gap-1.5 flex-wrap">
                    {STATUS_TABS.map((tab) => {
                        const count = statusCounts[tab.key] ?? 0;
                        const active = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${
                                    active ? "btn-primary text-white shadow-sm" : "btn-light text-secondary border"
                                }`}
                                style={active ? { backgroundColor: "#1E60E6", borderColor: "#1E60E6" } : undefined}
                                onClick={() => setStatusFilter(tab.key)}
                            >
                                {tab.label} ({count})
                            </button>
                        );
                    })}
                </div>

                <form
                    onSubmit={handleSearchSubmit}
                    className="d-flex align-items-center gap-2 flex-grow-1 justify-content-end"
                    style={{ maxWidth: 420 }}
                >
                    <div className="bms-search-input-pill flex-grow-1">
                        <LucideBarcode className="bms-search-icon" size={14} />
                        <input
                            type="text"
                            placeholder="Quét barcode, mã BN, tên bệnh nhân hoặc gói..."
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
                        className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1 text-nowrap text-white"
                        style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                        disabled={!searchInput.trim()}
                    >
                        <LucideSearch size={13} />
                        <span>Tra cứu</span>
                    </button>
                </form>
            </div>

            <section className="bms-table-standalone-section">
                <div className="bms-table-standalone-header">
                    <div>
                        <h2 className="bms-table-standalone-title">Danh sách mẫu bệnh phẩm</h2>
                        <p className="bms-table-standalone-subtitle">
                            Bấm vào một dòng bất kỳ để mở hồ sơ truy vết chi tiết, nhật ký sự kiện và quản lý lưu kho lạnh.
                        </p>
                    </div>
                    <span className="badge bg-light text-dark border rounded-pill px-3 py-1.5">
                        {filteredSpecimens.length} / {allSpecimens.length} mẫu
                    </span>
                </div>

                <div className="bms-table-standalone-body">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                            <thead className="table-light text-muted small text-uppercase">
                                <tr>
                                    <th className="ps-3">Barcode ống</th>
                                    <th>Bệnh nhân</th>
                                    <th>Gói XN &amp; Loại ống</th>
                                    <th>Thời gian lấy mẫu</th>
                                    <th>Trạng thái</th>
                                    <th>Vị trí lưu kho</th>
                                    <th className="text-end pe-3">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingList ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-muted small">
                                            <Spinner animation="border" size="sm" className="me-2 text-primary" />
                                            Đang tải danh sách mẫu bệnh phẩm từ cơ sở dữ liệu…
                                        </td>
                                    </tr>
                                ) : filteredSpecimens.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-muted small">
                                            Không tìm thấy mẫu bệnh phẩm nào khớp với bộ lọc hiện tại.
                                        </td>
                                    </tr>
                                ) : (
                                    pagination.paginatedItems.map((item) => {
                                        const isPending = normalizeStatusKey(item.status) === "PendingCollection";
                                        const hasStorage = Boolean(item.storageUnit && String(item.storageUnit).trim());
                                        return (
                                            <tr
                                                key={item.id || item.barcode}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => openSpecimenDetail(item.barcode)}
                                            >
                                                <td className="ps-3">
                                                    <div className="d-flex align-items-center gap-1.5 flex-wrap">
                                                        <code className="fw-bold text-primary">{item.barcode}</code>
                                                        {String(item.priority || "").toUpperCase() === "STAT" && (
                                                            <Badge bg="danger" style={{ fontSize: "0.65rem" }}>STAT</Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fw-semibold text-dark">{item.patientName || "—"}</div>
                                                    <div className="text-muted font-monospace" style={{ fontSize: "0.73rem" }}>
                                                        {item.patientId || "—"}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="fw-medium text-dark">
                                                        {item.testPackageName || "—"}
                                                    </div>
                                                    <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                                                        {item.sampleType && (
                                                            <span className="badge bg-light text-secondary border" style={{ fontSize: "0.68rem" }}>
                                                                {formatSampleTypeVi(item.sampleType)}
                                                            </span>
                                                        )}
                                                        {item.tubeColor && (
                                                            <span className="badge bg-light text-dark border" style={{ fontSize: "0.68rem" }}>
                                                                {formatTubeColorVi(item.tubeColor)}
                                                            </span>
                                                        )}
                                                        {item.volumeMl > 0 && (
                                                            <span className="text-muted" style={{ fontSize: "0.72rem" }}>
                                                                {item.volumeMl} mL
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="small text-secondary">
                                                    {isPending ? (
                                                        <span className="text-muted">Chưa lấy mẫu</span>
                                                    ) : (
                                                        formatClinicalDateTime(item.collectionTime)
                                                    )}
                                                </td>
                                                <td>{renderStatusBadge(item.status)}</td>
                                                <td className="small">
                                                    {hasStorage ? (
                                                        <div>
                                                            <div className="fw-medium text-dark">{item.storageUnit}</div>
                                                            {(item.rackId || item.slotPosition) && (
                                                                <div className="text-muted font-monospace" style={{ fontSize: "0.72rem" }}>
                                                                    {[item.rackId, item.slotPosition].filter(Boolean).join(" · ")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted">Chưa lưu kho</span>
                                                    )}
                                                </td>
                                                <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1 text-nowrap"
                                                        style={{ fontSize: "0.78rem" }}
                                                        onClick={() => openSpecimenDetail(item.barcode)}
                                                    >
                                                        <Eye size={13} />
                                                        <span>Truy vết</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <TablePagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.totalItems}
                        pageSize={pagination.pageSize}
                        onPageChange={pagination.setPage}
                        onPageSizeChange={pagination.setPageSize}
                        itemLabel="mẫu bệnh phẩm"
                    />
                </div>
            </section>

            <Modal
                show={showDetailModal}
                onHide={closeSpecimenDetail}
                size="xl"
                centered
                scrollable
            >
                <Modal.Header closeButton className="bg-white border-bottom">
                    <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2 flex-wrap">
                        <LucideBarcode style={{ color: "#1E60E6" }} size={18} />
                        <span className="font-monospace">{currentSpecimen?.barcode || activeBarcode}</span>
                        {currentSpecimen?.status && renderStatusBadge(currentSpecimen.status)}
                        {currentSpecimen?.testPackageName && (
                            <span className="badge rounded-pill" style={{ background: "#EFF6FF", color: "#1E60E6", fontSize: "0.75rem" }}>
                                {currentSpecimen.testPackageName}
                            </span>
                        )}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body className="p-4" style={{ backgroundColor: "#F8FAFC" }}>
                    {loadingSpecimen ? (
                        <div className="text-center py-5 text-muted">
                            <Spinner animation="border" size="sm" className="me-2 text-primary" />
                            Đang tải dữ liệu truy vết mẫu từ cơ sở dữ liệu…
                        </div>
                    ) : specimenError ? (
                        <Alert variant="danger" className="rounded-3 mb-0 d-flex align-items-center gap-2">
                            <AlertCircle size={18} />
                            <span>{specimenError}</span>
                        </Alert>
                    ) : currentSpecimen ? (
                        <>

                            <div className="p-3 bg-white rounded-4 border mb-3 shadow-xs" style={{ borderColor: "#E2E8F0" }}>
                                <Row className="g-3 small">
                                    <Col md={4}>
                                        <div className="text-muted d-flex align-items-center gap-1 mb-1">
                                            <User size={13} className="text-primary" />
                                            <span>Bệnh nhân</span>
                                        </div>
                                        <div className="fw-bold text-dark">{currentSpecimen.patientName || "—"}</div>
                                        <div className="text-muted font-monospace" style={{ fontSize: "0.75rem" }}>
                                            {currentSpecimen.patientId || "—"}
                                            {currentSpecimen.patientGender ? ` · ${formatGenderVi(currentSpecimen.patientGender)}` : ""}
                                            {currentSpecimen.patientAge > 0 ? ` · ${currentSpecimen.patientAge} tuổi` : ""}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted d-flex align-items-center gap-1 mb-1">
                                            <TestTube2 size={13} className="text-primary" />
                                            <span>Ống mẫu &amp; Thể tích</span>
                                        </div>
                                        <div className="fw-semibold text-dark">
                                            {[
                                                currentSpecimen.tubeColor ? formatTubeColorVi(currentSpecimen.tubeColor) : null,
                                                currentSpecimen.sampleType ? formatSampleTypeVi(currentSpecimen.sampleType) : null
                                            ].filter(Boolean).join(" · ") || "—"}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                            {[
                                                currentSpecimen.anticoagulant ? `Chống đông: ${currentSpecimen.anticoagulant}` : null,
                                                currentSpecimen.volumeMl > 0 ? `Thể tích: ${currentSpecimen.volumeMl} mL` : null,
                                                currentSpecimen.rfidTag ? `RFID: ${currentSpecimen.rfidTag}` : null
                                            ].filter(Boolean).join(" · ") || "—"}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <div className="text-muted d-flex align-items-center gap-1 mb-1">
                                            <Calendar size={13} className="text-primary" />
                                            <span>Lấy mẫu &amp; Phòng Lab</span>
                                        </div>
                                        <div className="fw-semibold text-dark">
                                            {normalizeStatusKey(currentSpecimen.status) === "PendingCollection"
                                                ? "Chưa lấy mẫu"
                                                : formatClinicalDateTime(currentSpecimen.collectionTime)}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                            {[
                                                currentSpecimen.collectorName || null,
                                                currentSpecimen.collectionSite || null
                                            ].filter(Boolean).join(" · ") || "—"}
                                        </div>
                                    </Col>
                                </Row>

                                {currentSpecimen.rejectionReason && (
                                    <Alert variant="danger" className="mt-3 mb-0 py-2 small rounded-3">
                                        <strong>Lý do từ chối mẫu:</strong> {currentSpecimen.rejectionReason}
                                    </Alert>
                                )}
                            </div>

                            <Row className="g-3">
                                <Col xl={7}>
                                    <SpecimenLifecycleTimeline
                                        events={timelineEvents}
                                        onAddEventClick={canEditSpecimen ? () => setShowEventModal(true) : undefined}
                                    />
                                </Col>
                                <Col xl={5}>
                                    <SpecimenStorageCard
                                        storageInfo={storageInfo}
                                        onUpdateStorageClick={canEditSpecimen ? () => setShowStorageModal(true) : undefined}
                                        canEdit={canEditSpecimen}
                                    />
                                </Col>
                            </Row>
                        </>
                    ) : null}
                </Modal.Body>

                <Modal.Footer className="bg-white border-top d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-2">
                        {canEditSpecimen && currentSpecimen && (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1.5"
                                    onClick={() => setShowStorageModal(true)}
                                >
                                    <Warehouse size={14} />
                                    <span>{storageInfo ? "Đổi Vị Trí Tủ Lạnh" : "Gán Vị Trí Lưu Kho"}</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary rounded-pill px-3 fw-semibold text-white d-inline-flex align-items-center gap-1.5"
                                    style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                                    onClick={() => setShowEventModal(true)}
                                >
                                    <LucideHistory size={14} />
                                    <span>Ghi Nhận Sự Kiện</span>
                                </button>
                            </>
                        )}
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-light border rounded-pill px-3 fw-semibold"
                        onClick={closeSpecimenDetail}
                    >
                        Đóng
                    </button>
                </Modal.Footer>
            </Modal>

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
