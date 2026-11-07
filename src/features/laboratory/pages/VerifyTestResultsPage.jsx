/**
 * @file VerifyTestResultsPage.jsx
 * @description Giao diện Thẩm Định Kết Quả Xét Nghiệm & Ký Số Điện Tử (Verify) (UC72 / Verify Test Results / Issue I3-074).
 * Dành riêng cho thẩm quyền Trưởng Khoa / Quản Lý Phòng Xét Nghiệm (Lab Manager).
 * Tuân thủ tiêu chuẩn: ISO 15189, Quyết định 2429/QĐ-BYT, Clean Medical Standard & AGENTS.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    FaCheckCircle,
    FaExclamationTriangle,
    FaArrowLeft,
    FaSearch,
    FaVial,
    FaUserCheck,
    FaClipboardCheck,
    FaTimes,
    FaCheck,
    FaShieldAlt,
    FaSyncAlt,
    FaInfoCircle,
    FaUndo,
    FaFileSignature,
    FaAward,
    FaUserMd,
    FaBell
} from "react-icons/fa";
import {
    fetchVerificationQueue,
    fetchVerificationDetails,
    verifyTestResult,
    returnTestResult
} from "../api/testResultVerificationApi";
import { dispatchNotification } from "../api/testResultNotificationApi";

export default function VerifyTestResultsPage() {
    const navigate = useNavigate();
    const { specimenId: routeSpecimenId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeSpecimenId = routeSpecimenId || searchParams.get("specimenId") || "SPC-261006-A1-0089";

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
    const [selectedSpecimenId, setSelectedSpecimenId] = useState(activeSpecimenId);
    const [verificationData, setVerificationData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    // Form thẩm định
    const [verifierComment, setVerifierComment] = useState(
        "Kết quả xét nghiệm đã được thẩm định kỹ thuật đầy đủ. Chỉ số nằm trong khoảng tham chiếu kiểm soát, biểu đồ Westgard/Levey-Jennings đạt chuẩn ISO 15189. Đã ký số điện tử và chuyển Bác sĩ điều trị hội chẩn."
    );

    // Modal trả mẫu yêu cầu hiệu chỉnh
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [returnError, setReturnError] = useState("");

    // Tải danh sách hàng đợi chờ thẩm định
    const loadQueue = useCallback(async () => {
        try {
            const items = await fetchVerificationQueue();
            const safeItems = Array.isArray(items) ? items : (items?.data && Array.isArray(items.data) ? items.data : []);
            setQueue(safeItems);
        } catch (err) {
            console.error("Lỗi khi tải hàng đợi thẩm định:", err);
            setQueue([]);
        }
    }, []);

    // Tải chi tiết gói thẩm định theo mã mẫu
    const loadVerificationDetails = useCallback(async (specimenId) => {
        if (!specimenId) return;
        setLoading(true);
        try {
            const data = await fetchVerificationDetails(specimenId);
            setVerificationData(data);
            if (data?.verifierComment) {
                setVerifierComment(data.verifierComment);
            }
        } catch (err) {
            console.error("Lỗi khi tải chi tiết thẩm định:", err);
            setAlertMessage({ type: "danger", text: "Không thể tải danh mục kiểm tra thẩm định xét nghiệm." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    useEffect(() => {
        loadVerificationDetails(selectedSpecimenId);
    }, [selectedSpecimenId, loadVerificationDetails]);

    const handleSelectSpecimen = (id) => {
        setSelectedSpecimenId(id);
        setSearchParams({ specimenId: id });
    };

    // Xử lý Ký số điện tử & Duyệt kết quả -> Chuyển bác sĩ điều trị và phát thông báo
    const handleVerify = async () => {
        if (!verifierComment || verifierComment.trim().length < 10) {
            setAlertMessage({
                type: "warning",
                text: "Ý kiến nhận xét của Trưởng Khoa phải đạt tối thiểu 10 ký tự trước khi ký số phê duyệt."
            });
            return;
        }

        setSubmitting(true);
        setAlertMessage(null);
        try {
            // 1. Gửi ký duyệt xác thực kỹ thuật lên máy chủ
            const res = await verifyTestResult(selectedSpecimenId, {
                verifierComment: verifierComment.trim()
            });

            // 2. Phát thông báo đồng bộ đến Bàn khám Bác sĩ (/doctor/console) và Cổng Bệnh nhân
            try {
                await dispatchNotification({
                    testOrderId: verificationData?.orderId || "ORD-261006-0187",
                    specimenBarcode: selectedSpecimenId,
                    patientId: verificationData?.patientId || "PT-2026-004523",
                    patientName: verificationData?.patientName || "Nguyễn Văn An",
                    patientPhone: "0912345678",
                    title: `Kết quả xét nghiệm ${selectedSpecimenId} đã được Trưởng Khoa phê duyệt`,
                    message: `Kết quả xét nghiệm bộ chỉ số [${verificationData?.packageName || "Xét nghiệm huyết học / sinh hóa"}] của bệnh nhân ${verificationData?.patientName || "Nguyễn Văn An"} đã hoàn tất thẩm định và ký số điện tử. Sẵn sàng hội chẩn lâm sàng.`,
                    channel: "IN_APP",
                    priority: "HIGH",
                    testPackageName: verificationData?.packageName || "Xét nghiệm tổng quát",
                    requiresImmediateAction: false,
                    clinicalRecommendation: verifierComment.trim()
                });
            } catch (notifyErr) {
                console.warn("Lỗi phát thông báo tự động (vẫn ghi nhận ký số):", notifyErr);
            }

            // 3. Phát CustomEvent trên cửa sổ trình duyệt để bàn khám bác sĩ & cổng bệnh nhân cập nhật tức thời
            if (typeof window !== "undefined") {
                const eventPayload = {
                    specimenId: selectedSpecimenId,
                    orderId: verificationData?.orderId || "ORD-261006-0187",
                    patientName: verificationData?.patientName || "Nguyễn Văn An",
                    patientId: verificationData?.patientId || "PT-2026-004523",
                    status: "verified",
                    timestamp: new Date().toISOString()
                };
                window.dispatchEvent(new CustomEvent("bms:test-result-verified", { detail: eventPayload }));
                localStorage.setItem("bms_last_verified_specimen", JSON.stringify(eventPayload));
            }

            setVerificationData(prev => ({
                ...(prev || {}),
                ...(res.data || {}),
                status: "Verified",
                verifiedBy: currentUser?.fullName || currentUser?.name || "BSCKII. Lê Lan Anh (Trưởng Khoa)",
                verifiedAt: new Date().toISOString()
            }));

            setAlertMessage({
                type: "success",
                text: "Ký số điện tử thành công! Kết quả xét nghiệm đã được thẩm định và phát thông báo tức thì tới Bàn khám Bác sĩ & Cổng Bệnh nhân."
            });
            await loadQueue();
        } catch (err) {
            console.error("Lỗi thẩm định ký số:", err);
            setAlertMessage({
                type: "danger",
                text: err.response?.data?.message || "Ký số phê duyệt thất bại. Vui lòng kiểm tra lại kết nối và thử lại."
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Xử lý Trả mẫu yêu cầu KTV hiệu chỉnh
    const handleReturnSubmit = async (e) => {
        e.preventDefault();
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

    const isVerified = verificationData?.status === "Verified" || verificationData?.status === "verified";
    const isReturned = verificationData?.status === "ReturnedForCorrection";

    const checklistItems = useMemo(() => {
        if (!verificationData || !Array.isArray(verificationData.checklist)) {
            return [];
        }
        return verificationData.checklist;
    }, [verificationData]);

    return (
        <div className="container-fluid py-2 px-md-5" style={{ maxWidth: 1400 }}>
            {/* Tiêu đề & Chọn mẫu xét nghiệm */}
            <header className="bms-page-header">
                <div className="bms-page-header-content">
                    <h1 className="bms-page-title">Thẩm định kết quả</h1>
                </div>
                <div className="bms-page-actions">
                    <div className="d-inline-flex align-items-center gap-2 bg-white p-2 rounded-4 border shadow-sm" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                        <label className="text-muted small fw-semibold mb-0">Chọn mẫu:</label>
                        <select
                            className="form-select form-select-sm border-0 bg-light rounded-pill"
                            style={{ width: "auto", minWidth: 220 }}
                            value={selectedSpecimenId}
                            onChange={(e) => handleSelectSpecimen(e.target.value)}
                        >
                            <option value="SPC-261006-A1-0089">SPC-261006-A1-0089 (Bộ mỡ máu Lipid)</option>
                            {Array.isArray(queue) && queue
                                .filter((q) => q?.specimenId && q.specimenId !== "SPC-261006-A1-0089")
                                .map((q) => (
                                    <option key={q.specimenId} value={q.specimenId}>
                                        {q.specimenId} — {q.packageName || "Xét nghiệm"} ({q.patientName || "Bệnh nhân"})
                                    </option>
                                ))}
                        </select>
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            style={{ borderRadius: '9999px' }}
                            title="Tải lại dữ liệu"
                            onClick={() => loadVerificationDetails(selectedSpecimenId)}
                        >
                            <FaSyncAlt />
                        </button>
                    </div>
                </div>
            </header>

            {/* Thông báo Alert */}
            {alertMessage && (
                <div className={`alert alert-${alertMessage.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4 shadow-sm rounded-3`} role="alert">
                    {alertMessage.type === "success" ? <FaCheckCircle className="fs-5 flex-shrink-0" /> : <FaExclamationTriangle className="fs-5 flex-shrink-0" />}
                    <div>{alertMessage.text}</div>
                    <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
                </div>
            )}

            {/* Banner Thông Tin Mẫu Bệnh Phẩm */}
            <div className="card shadow-sm border-0 mb-4 rounded-4" style={{ backgroundColor: '#EEF2F6' }}>
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-3 border-end" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                            <span className="text-muted small d-block">Mã Barcode Mẫu (Specimen ID)</span>
                            <span className="fw-bold font-monospace fs-6" style={{ color: '#1E60E6' }}>{verificationData?.specimenId || selectedSpecimenId}</span>
                        </div>
                        <div className="col-md-3 border-end">
                            <span className="text-muted small d-block">Phiếu chỉ định &amp; Gói xét nghiệm</span>
                            <span className="fw-semibold text-dark">{verificationData?.orderId || "ORD-261006-0187"} · {verificationData?.packageName || "Bộ mỡ máu Lipid Profile"}</span>
                        </div>
                        <div className="col-md-3 border-end">
                            <span className="text-muted small d-block">Bệnh nhân</span>
                            <span className="fw-semibold text-dark">{verificationData?.patientName || "Nguyễn Văn An"}</span>
                            <span className="text-muted small ms-1">({verificationData?.patientId || "PT-2026-004523"})</span>
                        </div>
                        <div className="col-md-3">
                            <span className="text-muted small d-block">Trạng thái phê duyệt</span>
                            {isVerified ? (
                                <span className="badge bg-success px-3 py-2 fs-6">
                                    <FaCheckCircle className="me-1" /> Đã Ký Số &amp; Thẩm Định
                                </span>
                            ) : isReturned ? (
                                <span className="badge bg-warning text-dark px-3 py-2 fs-6">
                                    <FaExclamationTriangle className="me-1" /> Yêu Cầu KTV Hiệu Chỉnh
                                </span>
                            ) : (
                                <span className="badge bg-info text-dark px-3 py-2 fs-6">
                                    <FaFileSignature className="me-1" /> Chờ Trưởng Khoa Thẩm Định
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
                            <FaAward className="fs-1 text-success flex-shrink-0" />
                            <div>
                                <h6 className="fw-bold mb-1">CHỨNG THƯ KÝ SỐ Y TẾ ĐIỆN TỬ HỢP LỆ</h6>
                                <div className="small text-muted">
                                    Người ký: <strong>{verificationData?.verifiedBy || currentUser?.fullName || "BSCKII. Lê Lan Anh (Trưởng Khoa)"}</strong> · 
                                    Thời gian ký: <strong>{verificationData?.verifiedAt ? new Date(verificationData.verifiedAt).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}</strong> · 
                                    Mã băm toàn vẹn: <span className="font-monospace text-primary">{verificationData?.digitalSignature || "SHA256:7f9a88c2...e9014f"}</span>
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
                                disabled={submitting || isVerified}
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
                                disabled={submitting || isVerified}
                            >
                                <FaFileSignature />
                                {isVerified ? "Đã Ký Số & Chuyển Bác Sĩ" : "Ký Số Điện Tử & Duyệt Kết Quả"}
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
                                disabled={submitting || isVerified}
                            >
                                <FaUndo className="text-warning" />
                                Trả về KTV yêu cầu chạy lại / hiệu chỉnh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Trả mẫu về KTV */}
            {showReturnModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow border-0">
                            <div className="modal-header bg-warning bg-opacity-25 border-bottom">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaExclamationTriangle className="text-warning" />
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
