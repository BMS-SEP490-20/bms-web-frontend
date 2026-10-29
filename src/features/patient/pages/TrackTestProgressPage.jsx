/**
 * @file TrackTestProgressPage.jsx
 * @description Dedicated Patient Portal and Clinical view for tracking 6-stage test specimen progress in real time (UC48 / Issue I3-002).
 * Conforms to: Production Standards, ISO 15189, HIPAA Patient Privacy & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { 
    FaSearch, 
    FaVial, 
    FaCheckCircle, 
    FaClock, 
    FaMicroscope, 
    FaFileMedicalAlt, 
    FaShieldAlt, 
    FaHospital, 
    FaUserMd, 
    FaExclamationTriangle, 
    FaTimesCircle, 
    FaRedoAlt, 
    FaBarcode, 
    FaArrowRight, 
    FaPrint, 
    FaPhoneAlt 
} from "react-icons/fa";
import { fetchTrackingByCode } from "../api/trackingApi";

export default function TrackTestProgressPage() {
    const [searchParams] = useSearchParams();
    const { identifier: routeIdentifier } = useParams();
    const navigate = useNavigate();

    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Initialize search from route param or query string
    useEffect(() => {
        const queryCode = searchParams.get("code") || searchParams.get("barcode") || routeIdentifier || "";
        if (queryCode) {
            setSearchInput(queryCode);
            handleTrackLookup(queryCode);
        }
    }, [searchParams, routeIdentifier]);

    const handleTrackLookup = async (codeToSearch) => {
        const code = (codeToSearch || searchInput).trim();
        if (!code) {
            setErrorMessage("Vui lòng nhập mã biên nhận hoặc mã vạch barcode.");
            return;
        }

        setLoading(true);
        setErrorMessage("");
        try {
            const data = await fetchTrackingByCode(code);
            if (!data) {
                setErrorMessage(`Không tìm thấy tiến trình xét nghiệm cho mã "${code}". Vui lòng kiểm tra lại thông tin.`);
                setTrackingData(null);
            } else {
                setTrackingData(data);
                // Update URL query parameter without full reload
                navigate(`?code=${encodeURIComponent(code)}`, { replace: true });
            }
        } catch (err) {
            console.error("Lookup error:", err);
            setErrorMessage("Có lỗi xảy ra trong quá trình tra cứu. Vui lòng thử lại sau.");
            setTrackingData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        handleTrackLookup(searchInput);
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return "---";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "---";
            return d.toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            });
        } catch {
            return "---";
        }
    };

    const getStepStatusBadge = (status) => {
        switch (status) {
            case "Completed":
            case 2:
                return <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1"><FaCheckCircle className="me-1" /> Đã hoàn tất</span>;
            case "InProgress":
            case 1:
                return <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1"><FaClock className="me-1 spinner-border spinner-border-sm" /> Đang xử lý</span>;
            case "Warning":
            case 3:
                return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1"><FaExclamationTriangle className="me-1" /> Cảnh báo / Rerun</span>;
            case "Rejected":
            case 4:
                return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1"><FaTimesCircle className="me-1" /> Mẫu từ chối</span>;
            default:
                return <span className="badge bg-light text-muted border px-2 py-1">Chờ thực hiện</span>;
        }
    };

    const getStepIcon = (stepNumber) => {
        switch (stepNumber) {
            case 1: return <FaHospital />;
            case 2: return <FaVial />;
            case 3: return <FaBarcode />;
            case 4: return <FaMicroscope />;
            case 5: return <FaUserMd />;
            case 6: return <FaFileMedicalAlt />;
            default: return <FaCheckCircle />;
        }
    };

    return (
        <div className="bms-tracking-page py-4 bg-light min-vh-100">
            <div className="container" style={{ maxWidth: 1100 }}>
                {/* 1. HEADER SECTION */}
                <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
                    <div className="bg-primary text-white p-4" style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)" }}>
                        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                            <div>
                                <div className="badge bg-white text-primary mb-2 px-3 py-1 fw-bold">
                                    <FaShieldAlt className="me-1" /> TIÊU CHUẨN ISO 15189:2012
                                </div>
                                <h2 className="fw-bold mb-1">Theo Dõi Lộ Trình Mẫu Máu & Xét Nghiệm</h2>
                                <p className="mb-0 text-white-50 small">
                                    Hệ thống cập nhật thời gian thực từng chặng từ khâu tiếp nhận đến thẩm định chữ ký số điện tử.
                                </p>
                            </div>
                            <div className="d-flex gap-2">
                                <a href="tel:19006868" className="btn btn-outline-light btn-sm px-3 d-flex align-items-center gap-2">
                                    <FaPhoneAlt /> Hotline: 1900 6868
                                </a>
                            </div>
                        </div>

                        {/* Search Input Bar */}
                        <form onSubmit={handleFormSubmit} className="mt-4">
                            <div className="input-group input-group-lg shadow-sm rounded-3 overflow-hidden">
                                <span className="input-group-text bg-white border-0 text-primary ps-3">
                                    <FaBarcode />
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-0 py-3"
                                    placeholder="Nhập Mã đơn xét nghiệm (ORD-2026-...) hoặc Mã vạch Barcode..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    autoFocus
                                />
                                <button type="submit" className="btn btn-dark px-4 fw-bold" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Đang Tra Cứu...
                                        </>
                                    ) : (
                                        <>
                                            <FaSearch className="me-2" /> Tra Cứu Ngay
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="small text-white-50 mt-2">
                                * Gợi ý: Tra cứu nhanh với mã mẫu thử nghiệm ví dụ: <code>ORD-2026-0001</code> hoặc <code>BC-2026-0001</code>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                    <div className="alert alert-warning border-0 shadow-sm rounded-4 d-flex align-items-center gap-3 p-3 mb-4">
                        <FaExclamationTriangle className="text-warning fs-3 flex-shrink-0" />
                        <div>
                            <h6 className="fw-bold mb-1">Thông Báo Tra Cứu</h6>
                            <p className="mb-0 small">{errorMessage}</p>
                        </div>
                    </div>
                )}

                {/* 2. TRACKING DETAILS CARD */}
                {trackingData && (
                    <div className="row g-4">
                        {/* Summary Left Column */}
                        <div className="col-lg-4">
                            <div className="card shadow-sm border-0 rounded-4 p-4 sticky-top" style={{ top: 20 }}>
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <div className="text-muted small">Mã Đơn / Barcode</div>
                                        <h4 className="fw-bold text-primary font-monospace mb-0">{trackingData.orderNumber}</h4>
                                    </div>
                                    <span className={`badge ${trackingData.priority === "Stat" || trackingData.priority === "Urgent" ? "bg-danger" : "bg-primary"} px-2 py-1`}>
                                        {trackingData.priority === "Stat" ? "⚡ CẤP CỨU STAT" : "Chuẩn Routine"}
                                    </span>
                                </div>

                                <hr className="my-3 opacity-25" />

                                <div className="mb-3">
                                    <div className="text-muted small">Bệnh nhân</div>
                                    <div className="fw-bold text-dark fs-5">{trackingData.patientName}</div>
                                    <div className="text-secondary small">
                                        Giới tính: {trackingData.patientGender} • {trackingData.patientAge} tuổi
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="text-muted small">Gói xét nghiệm chỉ định</div>
                                    <ul className="list-unstyled mb-0 mt-1">
                                        {trackingData.testPackageNames?.map((pkg, idx) => (
                                            <li key={idx} className="small text-dark fw-semibold mb-1 d-flex align-items-center gap-1">
                                                <FaVial className="text-primary" style={{ fontSize: 11 }} /> {pkg}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mb-3 p-3 bg-light rounded-3 border">
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-muted">Thời gian đăng ký:</span>
                                        <strong>{formatDateTime(trackingData.orderedAt)}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between small mb-1">
                                        <span className="text-muted">Dự kiến trả kết quả:</span>
                                        <strong className="text-primary">{formatDateTime(trackingData.estimatedCompletionTime)}</strong>
                                    </div>
                                    <div className="d-flex justify-content-between small">
                                        <span className="text-muted">Thời gian đã trôi qua:</span>
                                        <span className="badge bg-secondary-subtle text-secondary">{trackingData.elapsedMinutes} phút</span>
                                    </div>
                                </div>

                                {trackingData.isRejected && (
                                    <div className="alert alert-danger py-2 px-3 small rounded-3 mb-3">
                                        <strong><FaTimesCircle className="me-1" /> Mẫu bị từ chối:</strong> {trackingData.rejectionReason}
                                    </div>
                                )}

                                {trackingData.isRerunRequested && (
                                    <div className="alert alert-warning py-2 px-3 small rounded-3 mb-3">
                                        <strong><FaExclamationTriangle className="me-1" /> Yêu cầu chạy lại:</strong> {trackingData.rerunReason}
                                    </div>
                                )}

                                <div className="d-grid gap-2">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2"
                                        onClick={() => handleTrackLookup(trackingData.orderNumber)}
                                    >
                                        <FaRedoAlt /> Tải Lại Tiến Trình
                                    </button>
                                    {trackingData.isCompleted && (
                                        <a 
                                            href={`/results/${encodeURIComponent(trackingData.orderNumber)}/report`} 
                                            className="btn btn-success d-flex align-items-center justify-content-center gap-2"
                                        >
                                            <FaFileMedicalAlt /> Xem Báo Cáo Kết Quả
                                        </a>
                                    )}
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center gap-1"
                                        onClick={() => window.print()}
                                    >
                                        <FaPrint /> In Phiếu Lộ Trình
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 6-Stage Stepper Right Column */}
                        <div className="col-lg-8">
                            <div className="card shadow-sm border-0 rounded-4 p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <h4 className="fw-bold text-dark mb-0">6 Chặng Quy Trình Xét Nghiệm Khép Kín</h4>
                                        <div className="text-muted small">Tuân thủ tiêu chuẩn chất lượng phòng xét nghiệm ISO 15189</div>
                                    </div>
                                    <span className="badge bg-primary px-3 py-2 fs-6">
                                        Chặng {trackingData.currentStepNumber}/6: {trackingData.currentStepName}
                                    </span>
                                </div>

                                {/* Step Timeline List */}
                                <div className="bms-timeline position-relative ps-4" style={{ borderLeft: "3px solid #e2e8f0", marginLeft: 15 }}>
                                    {trackingData.steps?.map((step) => {
                                        const isCompleted = step.status === "Completed" || step.status === 2;
                                        const isInProgress = step.status === "InProgress" || step.status === 1;
                                        const isRejected = step.status === "Rejected" || step.status === 4;
                                        const isWarning = step.status === "Warning" || step.status === 3;

                                        let iconBg = "#94a3b8";
                                        if (isCompleted) iconBg = "#10b981";
                                        else if (isInProgress) iconBg = "#3b82f6";
                                        else if (isRejected) iconBg = "#ef4444";
                                        else if (isWarning) iconBg = "#f59e0b";

                                        return (
                                            <div key={step.stepNumber} className="mb-4 position-relative">
                                                {/* Milestone Icon Node */}
                                                <div 
                                                    style={{
                                                        position: "absolute",
                                                        left: -32,
                                                        top: 0,
                                                        width: 34,
                                                        height: 34,
                                                        borderRadius: "50%",
                                                        backgroundColor: iconBg,
                                                        color: "#fff",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 14,
                                                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                                        transition: "all 0.3s ease"
                                                    }}
                                                >
                                                    {getStepIcon(step.stepNumber)}
                                                </div>

                                                {/* Card Content for Step */}
                                                <div className={`p-3 rounded-4 border ${isInProgress ? "border-primary bg-primary-subtle shadow-sm" : isRejected ? "border-danger bg-danger-subtle" : isCompleted ? "border-success-subtle bg-white shadow-sm" : "bg-light"}`}>
                                                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-1">
                                                        <h5 className="fw-bold mb-0 text-dark">
                                                            {step.title}
                                                        </h5>
                                                        <div>{getStepStatusBadge(step.status)}</div>
                                                    </div>

                                                    <p className="text-secondary small mb-2">{step.description}</p>

                                                    <div className="d-flex flex-wrap gap-3 small text-muted pt-2 border-top">
                                                        <div>
                                                            <FaClock className="me-1 text-primary" />
                                                            <strong>Thời gian:</strong> {formatDateTime(step.timestamp)}
                                                        </div>
                                                        {step.handlerName && (
                                                            <div>
                                                                <FaUserMd className="me-1 text-success" />
                                                                <strong>Phụ trách:</strong> {step.handlerName}
                                                            </div>
                                                        )}
                                                        {step.department && (
                                                            <div>
                                                                <FaHospital className="me-1 text-secondary" />
                                                                {step.department}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {step.notes && (
                                                        <div className="mt-2 p-2 bg-white rounded border small text-danger fw-semibold">
                                                            <FaExclamationTriangle className="me-1" /> {step.notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
