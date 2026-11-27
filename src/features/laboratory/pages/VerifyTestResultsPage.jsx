/**
 * @file VerifyTestResultsPage.jsx
 * @description Giao diện Thẩm Định Kết Quả Xét Nghiệm & Ký Số Điện Tử (Verify) (UC72 / Verify Test Results / Issue I3-074).
 * Dành riêng cho thẩm quyền Trưởng Khoa / Quản Lý Phòng Xét Nghiệm (Lab Manager).
 * Tuân thủ tiêu chuẩn: ISO 15189, Quyết định 2429/QĐ-BYT, Clean Medical Standard & AGENTS.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertTriangle, TestTube2, RefreshCw, Undo2, FileSignature, Award, ClipboardCheck } from 'lucide-react';
import TablePagination, { usePagination } from "../../../components/ui/TablePagination";
import {
    fetchVerificationQueue,
    fetchVerificationDetails,
    verifyTestResult,
    returnTestResult
} from "../api/testResultVerificationApi";
import { dispatchNotification } from "../api/testResultNotificationApi";

export default function VerifyTestResultsPage() {
    const { specimenId: routeSpecimenId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialSpecimenId = routeSpecimenId || searchParams.get("specimenId") || "";

    // Người dùng đăng nhập hiện tại
    const currentUser = useMemo(() => {
        try {
            const raw = localStorage.getItem("bms_user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    // State
    const [queue, setQueue] = useState([]);
    const queuePag = usePagination(queue, 8);
    const [queueLoading, setQueueLoading] = useState(true);
    const [selectedSpecimenId, setSelectedSpecimenId] = useState(initialSpecimenId);
    const [verificationData, setVerificationData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    // Form thẩm định
    const [verifierComment, setVerifierComment] = useState(
        "Kết quả xét nghiệm đã được kiểm tra kỹ thuật và chuyển Bác sĩ phụ trách duyệt."
    );

    // Modal trả mẫu yêu cầu hiệu chỉnh
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [returnError, setReturnError] = useState("");

    // Tải danh sách hàng đợi chờ thẩm định từ CSDL thực (test_results trạng thái waiting_review)
    const loadQueue = useCallback(async () => {
        setQueueLoading(true);
        try {
            const items = await fetchVerificationQueue();
            const safeItems = Array.isArray(items)
                ? items
                : (items?.data && Array.isArray(items.data) ? items.data : []);
            setQueue(safeItems);
            return safeItems;
        } catch (err) {
            console.error("Lỗi khi tải hàng đợi thẩm định:", err);
            setQueue([]);
            return [];
        } finally {
            setQueueLoading(false);
        }
    }, []);

    // Tải chi tiết gói thẩm định theo mã mẫu
    const loadVerificationDetails = useCallback(async (specimenId) => {
        if (!specimenId) {
            setVerificationData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await fetchVerificationDetails(specimenId);
            setVerificationData(data);
            if (data?.verifierComment) {
                setVerifierComment(data.verifierComment);
            }
        } catch (err) {
            console.error("Lỗi khi tải chi tiết thẩm định:", err);
            setVerificationData(null);
            setAlertMessage({ type: "danger", text: "Không thể tải danh mục kiểm tra thẩm định xét nghiệm." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        loadQueue().then((items) => {
            if (!mounted) return;
            setSelectedSpecimenId((prev) => {
                if (prev) return prev;
                if (items.length > 0 && items[0]?.specimenId) {
                    return items[0].specimenId;
                }
                return "";
            });
        });
        return () => {
            mounted = false;
        };
    }, [loadQueue]);

    useEffect(() => {
        if (selectedSpecimenId) {
            loadVerificationDetails(selectedSpecimenId);
        } else {
            setVerificationData(null);
            setLoading(false);
        }
    }, [selectedSpecimenId, loadVerificationDetails]);

    const handleSelectSpecimen = (id) => {
        setAlertMessage(null);
        setSelectedSpecimenId(id);
        if (id) {
            setSearchParams({ specimenId: id });
        } else {
            setSearchParams({});
        }
    };

    const handleRefreshAll = async () => {
        const items = await loadQueue();
        if (selectedSpecimenId) {
            await loadVerificationDetails(selectedSpecimenId);
        } else if (items.length > 0 && items[0]?.specimenId) {
            handleSelectSpecimen(items[0].specimenId);
        }
    };

    // GATE: Manager tech-verify only → chuyển BS. Không công bố Cổng BN (chỉ BS duyệt mới mở KQ).
    const handleVerify = async () => {
        if (!selectedSpecimenId) return;
        if (!verifierComment || verifierComment.trim().length < 10) {
            setAlertMessage({
                type: "warning",
                text: "Ý kiến nhận xét của Trưởng Khoa phải đạt tối thiểu 10 ký tự trước khi ký thẩm định kỹ thuật."
            });
            return;
        }

        setSubmitting(true);
        setAlertMessage(null);
        try {
            const res = await verifyTestResult(selectedSpecimenId, {
                verifierComment: verifierComment.trim()
            });

            // Chỉ báo bàn khám BS — không báo Cổng BN ở bước này.
            try {
                await dispatchNotification({
                    testOrderId: verificationData?.orderId || selectedSpecimenId,
                    specimenBarcode: selectedSpecimenId,
                    patientId: verificationData?.patientId || "",
                    patientName: verificationData?.patientName || "Bệnh nhân",
                    patientPhone: "",
                    title: `[CHỜ BS] Mẫu ${selectedSpecimenId} đã thẩm định kỹ thuật`,
                    message: `Trưởng Khoa đã ký kỹ thuật [${verificationData?.packageName || "Xét nghiệm lâm sàng"}] của bệnh nhân ${verificationData?.patientName || ""}. Bác sĩ vào /doctor/console → Thẩm Định & Tư Vấn → Ký Số & Trả Kết Quả Cho Bệnh Nhân.`,
                    channel: "IN_APP",
                    priority: verificationData?.isPanic ? "CRITICAL" : "HIGH",
                    testPackageName: verificationData?.packageName || "Xét nghiệm tổng quát",
                    requiresImmediateAction: Boolean(verificationData?.isPanic),
                    clinicalRecommendation: verifierComment.trim()
                });
            } catch (notifyErr) {
                console.warn("Lỗi phát thông báo BS (vẫn ghi nhận thẩm định kỹ thuật):", notifyErr);
            }

            if (typeof window !== "undefined") {
                const eventPayload = {
                    specimenId: selectedSpecimenId,
                    orderId: verificationData?.orderId || selectedSpecimenId,
                    patientName: verificationData?.patientName || "",
                    patientId: verificationData?.patientId || "",
                    status: "waiting_doctor_review",
                    timestamp: new Date().toISOString()
                };
                window.dispatchEvent(new CustomEvent("bms:test-result-verified", { detail: eventPayload }));
                localStorage.setItem("bms_last_verified_specimen", JSON.stringify(eventPayload));
            }

            setVerificationData(prev => ({
                ...(prev || {}),
                ...(res.data || {}),
                status: "Verified",
                verifiedBy: currentUser?.fullName || currentUser?.name || "Trưởng Khoa Xét Nghiệm",
                verifiedAt: new Date().toISOString()
            }));

            setAlertMessage({
                type: "success",
                text: `Thẩm định kỹ thuật thành công cho mẫu ${selectedSpecimenId}. Đã chuyển Bác sĩ — bệnh nhân chưa xem được chỉ số cho đến khi BS ký duyệt.`
            });
            await loadQueue();
        } catch (err) {
            console.error("Lỗi thẩm định ký số:", err);
            setAlertMessage({
                type: "danger",
                text: err.response?.data?.message || "Ký thẩm định kỹ thuật thất bại. Vui lòng kiểm tra lại kết nối và thử lại."
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Xử lý Trả mẫu yêu cầu KTV hiệu chỉnh
    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSpecimenId) return;
        if (!returnReason || returnReason.trim().length < 10) {
            setReturnError("Vui lòng nêu rõ lý do yêu cầu hiệu chỉnh (tối thiểu 10 ký tự).");
            return;
        }

        setSubmitting(true);
        setReturnError("");
        try {
            const res = await returnTestResult(selectedSpecimenId, {
                returnReason: returnReason.trim()
            });

            setVerificationData(prev => ({
                ...(prev || {}),
                ...(res.data || {}),
                status: "ReturnedForCorrection",
                returnedReason: returnReason.trim()
            }));
            setShowReturnModal(false);
            setReturnReason("");
            setAlertMessage({
                type: "info",
                text: `Mẫu xét nghiệm ${selectedSpecimenId} đã được trả về cho Kỹ thuật viên xét nghiệm để kiểm tra và chạy lại.`
            });
            await loadQueue();
        } catch (err) {
            console.error("Lỗi khi trả mẫu:", err);
            setReturnError(err.response?.data?.message || "Thao tác trả mẫu thất bại. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    // Định dạng huy hiệu trạng thái của từng tiêu chí checklist
    const renderStatusBadge = (status, statusType) => {
        const s = (status || "").toLowerCase();
        if (s === "flag" || statusType === "warn" || s === "cảnh báo") {
            return (
                <span className="badge bg-warning text-dark px-2 py-1 rounded-pill fw-semibold">
                    <span className="me-1">●</span> Cảnh Báo (Flag)
                </span>
            );
        }
        if (s === "ok" || s === "đạt") {
            return (
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill fw-semibold">
                    <span className="me-1">●</span> Đạt Chuẩn (OK)
                </span>
            );
        }
        if (s === "confirmed" || s === "đã xác nhận") {
            return (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-semibold">
                    <span className="me-1">●</span> Đã Xác Nhận
                </span>
            );
        }
        return (
            <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded-pill fw-semibold">
                <span className="me-1">●</span> {status || "Bình thường"}
            </span>
        );
    };

    const renderResultFlagBadge = (flag) => {
        const f = String(flag || "Normal").toLowerCase();
        if (f === "critical" || f === "panic") {
            return <span className="badge bg-danger px-2 py-1 fw-bold">NGUY HIỂM (CRITICAL)</span>;
        }
        if (f === "high") {
            return <span className="badge bg-warning text-dark px-2 py-1 fw-bold">&uarr; CAO (HIGH)</span>;
        }
        if (f === "low") {
            return <span className="badge bg-info text-dark px-2 py-1 fw-bold">&darr; THẤP (LOW)</span>;
        }
        return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Bình thường</span>;
    };

    const isVerified = verificationData?.status === "Verified" || verificationData?.status === "verified" || verificationData?.status === "Approved";
    const isReturned = verificationData?.status === "ReturnedForCorrection" || verificationData?.status === "Rerun";

    const checklistItems = useMemo(() => {
        if (!verificationData || !Array.isArray(verificationData.checklist)) {
            return [];
        }
        return verificationData.checklist;
    }, [verificationData]);

    const resultItems = useMemo(() => {
        if (!verificationData || !Array.isArray(verificationData.testResultItems)) {
            return [];
        }
        return verificationData.testResultItems;
    }, [verificationData]);

    // Danh sách dropdown bao gồm hàng đợi hiện tại + mẫu đang xem (nếu vừa ký duyệt xong không còn trong queue chờ)
    const selectableOptions = useMemo(() => {
        const list = Array.isArray(queue) ? [...queue] : [];
        if (selectedSpecimenId && !list.some((q) => q?.specimenId === selectedSpecimenId)) {
            list.unshift({
                specimenId: selectedSpecimenId,
                packageName: verificationData?.packageName || "Đang xem",
                patientName: verificationData?.patientName || "",
                status: verificationData?.status || ""
            });
        }
        return list;
    }, [queue, selectedSpecimenId, verificationData]);

    return (
        <div className="container-fluid py-2 px-md-5" style={{ maxWidth: 1400 }}>
            {/* Tiêu đề & Chọn mẫu xét nghiệm */}
            <header className="bms-page-header">
                <div className="bms-page-header-content">
                    <h1 className="bms-page-title">Thẩm định kết quả</h1>
                </div>
                <div className="bms-page-actions">
                    <div className="d-inline-flex align-items-center gap-2 bg-white p-2 rounded-4 border shadow-sm" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                        <label className="text-muted small fw-semibold mb-0">
                            Chọn mẫu chờ duyệt ({queue.length}):
                        </label>
                        <select
                            className="form-select form-select-sm border-0 bg-light rounded-pill"
                            style={{ width: "auto", minWidth: 280 }}
                            value={selectedSpecimenId}
                            onChange={(e) => handleSelectSpecimen(e.target.value)}
                            disabled={selectableOptions.length === 0}
                        >
                            {selectableOptions.length === 0 ? (
                                <option value="">-- Không có mẫu nào đang chờ duyệt --</option>
                            ) : (
                                selectableOptions.map((q) => (
                                    <option key={q.specimenId} value={q.specimenId}>
                                        {q.specimenId} — {q.packageName || "Xét nghiệm"} ({q.patientName || "Bệnh nhân"})
                                    </option>
                                ))
                            )}
                        </select>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            style={{ borderRadius: '9999px' }}
                            title="Tải lại danh sách chờ duyệt"
                            onClick={handleRefreshAll}
                        >
                            <RefreshCw  size="1em"/>
                        </button>
                    </div>
                </div>
            </header>

            {/* Hàng đợi các mẫu đang chờ thẩm định (click chọn nhanh) */}
            {queue.length > 0 && (
                <div className="card border-0 shadow-sm mb-4 rounded-4 bg-white">
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold text-dark small d-flex align-items-center gap-2">
                                <ClipboardCheck className="text-primary"  size="1em"/>
                                Hàng đợi kết quả KTV gửi lên chờ Trưởng Khoa thẩm định ({queue.length} mẫu)
                            </span>
                            <span className="text-muted small">Nhấp vào một mẫu để xem chỉ số đo và ký duyệt</span>
                        </div>
                        <div className="d-flex flex-wrap gap-2">
                            {queuePag.paginatedItems.map((item) => {
                                const isActive = item.specimenId === selectedSpecimenId;
                                return (
                                    <button
                                        key={item.specimenId}
                                        type="button"
                                        onClick={() => handleSelectSpecimen(item.specimenId)}
                                        className={`btn btn-sm text-start rounded-3 px-3 py-2 border ${
                                            isActive
                                                ? "btn-primary text-white border-primary shadow-sm"
                                                : "btn-light text-dark border-secondary-subtle"
                                        }`}
                                    >
                                        <div className="d-flex align-items-center gap-2">
                                            <TestTube2 className={isActive ? "text-white" : "text-primary"}  size="1em"/>
                                            <span className="font-monospace fw-bold">{item.specimenId}</span>
                                            {item.priority === "Urgent" && (
                                                <span className="badge bg-danger">PANIC</span>
                                            )}
                                            {item.flagCount > 0 && item.priority !== "Urgent" && (
                                                <span className="badge bg-warning text-dark">{item.flagCount} cảnh báo</span>
                                            )}
                                        </div>
                                        <div className={`small mt-1 ${isActive ? "text-white-50" : "text-muted"}`}>
                                            {item.patientName || "Bệnh nhân"} · {item.packageName || "Xét nghiệm"}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <TablePagination
                        page={queuePag.page}
                        totalPages={queuePag.totalPages}
                        totalItems={queuePag.totalItems}
                        pageSize={queuePag.pageSize}
                        onPageChange={queuePag.setPage}
                        onPageSizeChange={queuePag.setPageSize}
                        pageSizeOptions={[8, 16, 32]}
                        itemLabel="mẫu chờ thẩm định"
                        compact
                    />
                </div>
            )}

            {/* Thông báo Alert */}
            {alertMessage && (
                <div className={`alert alert-${alertMessage.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4 shadow-sm rounded-3`} role="alert">
                    {alertMessage.type === "success" ? <CheckCircle2 className="fs-5 flex-shrink-0"  size="1em"/> : <AlertTriangle className="fs-5 flex-shrink-0"  size="1em"/>}
                    <div>{alertMessage.text}</div>
                    <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
                </div>
            )}

            {/* Trạng thái trống khi chưa có kết quả nào chờ duyệt */}
            {!queueLoading && !selectedSpecimenId && (
                <div className="card border-0 shadow-sm rounded-4 bg-white text-center py-5 px-3">
                    <CheckCircle2 className="fs-1 text-success opacity-75 mx-auto mb-3"  size="1em"/>
                    <h5 className="fw-bold text-dark">Hiện chưa có kết quả xét nghiệm nào đang chờ duyệt</h5>
                    <p className="text-muted small mb-3">
                        Khi Kỹ thuật viên nhập và gửi kết quả xét nghiệm (trạng thái <code>waiting_review</code>), mẫu sẽ tự động xuất hiện tại đây để Trưởng Khoa thẩm định kỹ thuật và chuyển Bác sĩ.
                    </p>
                    <div>
                        <button type="button" className="btn btn-outline-primary btn-sm rounded-pill px-3" onClick={handleRefreshAll}>
                            <RefreshCw className="me-1"  size="1em"/> Làm mới hàng đợi
                        </button>
                    </div>
                </div>
            )}

            {selectedSpecimenId && (
                <>
                    {/* Banner Thông Tin Mẫu Bệnh Phẩm */}
                    <div className="card shadow-sm border-0 mb-4 rounded-4" style={{ backgroundColor: '#EEF2F6' }}>
                        <div className="card-body p-3">
                            <div className="row g-3 align-items-center">
                                <div className="col-md-3 border-end" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                                    <span className="text-muted small d-block">Mã Barcode Mẫu (Specimen ID)</span>
                                    <span className="fw-bold font-monospace fs-6" style={{ color: '#1E60E6' }}>
                                        {verificationData?.specimenId || selectedSpecimenId}
                                    </span>
                                    {verificationData?.testResultId && (
                                        <span className="text-muted small d-block font-monospace">Phiếu KQ: {verificationData.testResultId}</span>
                                    )}
                                </div>
                                <div className="col-md-3 border-end">
                                    <span className="text-muted small d-block">Phiếu chỉ định &amp; Gói xét nghiệm</span>
                                    <span className="fw-semibold text-dark">
                                        {verificationData?.orderId || "—"} · {verificationData?.packageName || "Xét nghiệm lâm sàng"}
                                    </span>
                                </div>
                                <div className="col-md-3 border-end">
                                    <span className="text-muted small d-block">Bệnh nhân</span>
                                    <span className="fw-semibold text-dark">{verificationData?.patientName || "—"}</span>
                                    {verificationData?.patientId && (
                                        <span className="text-muted small ms-1">({verificationData.patientId})</span>
                                    )}
                                </div>
                                <div className="col-md-3">
                                    <span className="text-muted small d-block">Trạng thái phê duyệt</span>
                                    {isVerified ? (
                                        <span className="badge bg-success px-3 py-2 fs-6">
                                            <CheckCircle2 className="me-1"  size="1em"/> Đã Thẩm Định Kỹ Thuật
                                        </span>
                                    ) : isReturned ? (
                                        <span className="badge bg-warning text-dark px-3 py-2 fs-6">
                                            <AlertTriangle className="me-1"  size="1em"/> Yêu Cầu KTV Hiệu Chỉnh
                                        </span>
                                    ) : (
                                        <span className="badge bg-info text-dark px-3 py-2 fs-6">
                                            <FileSignature className="me-1"  size="1em"/> Chờ thẩm định kỹ thuật (tùy chọn)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bảng kết quả đo thực tế do KTV nhập */}
                    {resultItems.length > 0 && (
                        <div className="bms-table-standalone-section mb-4">
                            <div className="bms-table-standalone-header">
                                <h2 className="bms-table-standalone-title">
                                    Kết quả đo thực tế KTV đã gửi ({resultItems.length} chỉ số)
                                </h2>
                                {verificationData?.deviceId && (
                                    <span className="small text-muted">Thiết bị: {verificationData.deviceId}</span>
                                )}
                            </div>
                            <div className="bms-table-standalone-body">
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="ps-4">Chỉ số xét nghiệm</th>
                                                <th className="text-end">Giá trị đo</th>
                                                <th>Đơn vị</th>
                                                <th>Khoảng tham chiếu</th>
                                                <th className="text-end pe-4">Đánh giá cờ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {resultItems.map((item, idx) => (
                                                <tr
                                                    key={`${item.criterionCode}-${idx}`}
                                                    className={
                                                        String(item.flag).toLowerCase() === "critical"
                                                            ? "table-danger"
                                                            : String(item.flag).toLowerCase() !== "normal"
                                                                ? "table-warning bg-opacity-25"
                                                                : undefined
                                                    }
                                                >
                                                    <td className="ps-4">
                                                        <strong className="text-dark">{item.criterionName || item.criterionCode}</strong>
                                                        <span className="badge bg-light text-secondary border font-monospace ms-2">
                                                            {item.criterionCode}
                                                        </span>
                                                    </td>
                                                    <td className="text-end fw-bold font-monospace">{item.measuredValue}</td>
                                                    <td className="text-secondary small">{item.unit || "—"}</td>
                                                    <td className="text-muted small font-monospace">{item.referenceInterval || "—"}</td>
                                                    <td className="text-end pe-4">{renderResultFlagBadge(item.flag)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bảng kiểm thẩm định kỹ thuật */}
                    <div className="bms-table-standalone-section mb-3">
                        <div className="bms-table-standalone-header">
                            <h2 className="bms-table-standalone-title">
                                Bảng kiểm — {verificationData?.specimenId || selectedSpecimenId}
                            </h2>
                            {verificationData?.flagCount > 0 && (
                                <span className="small text-warning">
                                    {verificationData.flagCount} chỉ số cần xem
                                </span>
                            )}
                        </div>
                        <div className="bms-table-standalone-body">
                            {loading ? (
                                <div className="text-center py-3 text-muted">
                                    <div className="spinner-border text-primary mb-2" role="status"></div>
                                    <div>Đang nạp bảng kiểm thẩm định kết quả...</div>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: "32%" }} className="ps-4">Hạng mục thẩm định kỹ thuật</th>
                                                <th style={{ width: "18%" }}>Đánh giá</th>
                                                <th className="pe-4">Chi tiết kiểm chuẩn &amp; Ghi chú lâm sàng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {checklistItems.length > 0 ? (
                                                checklistItems.map((item, idx) => (
                                                    <tr key={idx} className={item.status === "Flag" ? "table-warning bg-opacity-25" : ""}>
                                                        <td className="ps-4 fw-medium text-dark">{item.checkName}</td>
                                                        <td>{renderStatusBadge(item.status, item.statusType)}</td>
                                                        <td className="pe-4 text-muted small">{item.details}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={3} className="text-center py-2 text-muted">
                                                        Tất cả các tiêu chí tiền phân tích và phân tích trên máy đạt chuẩn kiểm định.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bms-page-header" style={{ alignItems: 'stretch' }}>
                        <div className="w-100">
                            {isVerified && (
                                <div className="alert alert-success d-flex align-items-center gap-3 mb-4 shadow-sm">
                                    <Award className="fs-1 text-success flex-shrink-0"  size="1em"/>
                                    <div>
                                        <h6 className="fw-bold mb-1">ĐÃ HOÀN TẤT THẨM ĐỊNH KỸ THUẬT</h6>
                                        <div className="small text-muted">
                                            Người thẩm định: <strong>{verificationData?.verifiedBy || currentUser?.fullName || "Trưởng Khoa Xét Nghiệm"}</strong> ·{" "}
                                            Thời gian: <strong>{verificationData?.verifiedAt ? new Date(verificationData.verifiedAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="row g-4 align-items-end">
                                <div className="col-lg-8">
                                    <label className="form-label fw-bold text-dark d-flex align-items-center justify-content-between">
                                        <span>Ý kiến kết luận &amp; Ghi chú thẩm định của Trưởng Khoa</span>
                                        <span className="text-muted small fw-normal">Tối thiểu 10 ký tự · Lưu vết kiểm toán y tế (Audit Log)</span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        placeholder="Nhập kết luận chuyên môn, xác nhận tính hợp lệ của mẫu, kiểm tra quy tắc Westgard hoặc ghi chú cho Bác sĩ điều trị..."
                                        value={verifierComment}
                                        onChange={(e) => setVerifierComment(e.target.value)}
                                        disabled={submitting || isVerified || isReturned}
                                    ></textarea>
                                    <small className="text-muted mt-1 d-block">
                                        Ghi nhận tính toàn vẹn của kết quả phân tích, xác nhận xu hướng Levey-Jennings QC hoặc ghi chú Delta check so với lần xét nghiệm trước.
                                    </small>
                                </div>

                                <div className="col-lg-4 d-flex flex-column gap-2 justify-content-end">
                                    <button
                                        type="button"
                                        className="btn btn-lg d-flex align-items-center justify-content-center gap-2 shadow-sm fw-semibold text-white"
                                        style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', borderRadius: '9999px' }}
                                        onClick={handleVerify}
                                        disabled={submitting || isVerified || isReturned}
                                    >
                                        <FileSignature  size="1em"/>
                                        {isVerified ? "Đã chuyển Bác sĩ thẩm định" : isReturned ? "Đã trả về KTV" : "Ký kỹ thuật & Chuyển Bác sĩ"}
                                    </button>

                                    <button
                                        type="button"
                                        className="btn btn-outline-warning text-dark d-flex align-items-center justify-content-center gap-2"
                                        style={{ borderRadius: '9999px' }}
                                        onClick={() => {
                                            setReturnReason("");
                                            setReturnError("");
                                            setShowReturnModal(true);
                                        }}
                                        disabled={submitting || isVerified || isReturned}
                                    >
                                        <Undo2 className="text-warning"  size="1em"/>
                                        Trả về KTV yêu cầu chạy lại / hiệu chỉnh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Modal: Trả mẫu về KTV */}
            {showReturnModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow border-0">
                            <div className="modal-header bg-warning bg-opacity-25 border-bottom">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <AlertTriangle className="text-warning"  size="1em"/>
                                    Yêu Cầu Hiệu Chỉnh / Chạy Lại Mẫu Xét Nghiệm
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowReturnModal(false)}></button>
                            </div>
                            <form onSubmit={handleReturnSubmit}>
                                <div className="modal-body p-2">
                                    <p className="text-muted small mb-3">
                                        Mẫu bệnh phẩm <strong>{selectedSpecimenId}</strong> sẽ được chuyển về hàng đợi của Kỹ thuật viên xét nghiệm. Vui lòng ghi rõ hướng dẫn hiệu chuẩn hoặc đo lường lại.
                                    </p>

                                    {returnError && (
                                        <div className="alert alert-danger py-2 small mb-3">
                                            {returnError}
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark">
                                            Lý do yêu cầu hiệu chỉnh <span className="text-danger">*</span>
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="Ví dụ: Chỉ số chênh lệch Delta check vượt quá 20% so với tiền sử; yêu cầu chạy lại mẫu trên máy phân tích dự phòng HM-01..."
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            required
                                        ></textarea>
                                        <div className="form-text">Yêu cầu tối thiểu 10 ký tự.</div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-top">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowReturnModal(false)}
                                    >
                                        Hủy Bỏ
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-warning text-dark fw-semibold"
                                        disabled={submitting}
                                    >
                                        {submitting ? "Đang xử lý..." : "Xác Nhận Trả Mẫu"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
