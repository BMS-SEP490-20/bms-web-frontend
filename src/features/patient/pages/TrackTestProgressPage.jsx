/**
 * @file TrackTestProgressPage.jsx
 * @description Dedicated Patient Portal and Clinical view for tracking 6-stage test specimen progress in real time (UC48).
 * Clean, Non-AI Human-Centered Medical UI conforming to AGENTS-DESIGN.md and ISO 15189:2022.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate, Link } from "react-router-dom";
import { 
    FaSearch, 
    FaVial, 
    FaCheckCircle, 
    FaClock, 
    FaMicroscope, 
    FaFileMedicalAlt, 
    FaHospital, 
    FaUserMd, 
    FaExclamationTriangle, 
    FaTimesCircle, 
    FaRedoAlt, 
    FaBarcode, 
    FaArrowRight, 
    FaPrint, 
    FaTimes, 
    FaCheck
} from "react-icons/fa";
import { fetchTrackingByCode } from "../api/trackingApi";
import PortalNavbar from "../../home/components/PortalNavbar";
import MegaFooter from "../../home/components/MegaFooter";
import usePageTransition from "../../../shared/hooks/usePageTransition";
import "./TrackTestProgressPage.css";

export default function TrackTestProgressPage() {
    const pageTransitionClass = usePageTransition();
    const [searchParams] = useSearchParams();
    const { identifier: routeIdentifier } = useParams();
    const navigate = useNavigate();

    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

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
        setHasSearched(true);
        try {
            const data = await fetchTrackingByCode(code);
            if (!data) {
                setErrorMessage(`Không tìm thấy tiến trình xét nghiệm cho mã "${code}". Vui lòng kiểm tra lại mã in trên phiếu hẹn.`);
                setTrackingData(null);
            } else {
                setTrackingData(data);
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

    const handleClearSearch = () => {
        setSearchInput("");
        setTrackingData(null);
        setErrorMessage("");
        setHasSearched(false);
        navigate("/tracking", { replace: true });
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
                return (
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-semibold">
                        <FaCheckCircle className="me-1" /> Đã hoàn tất
                    </span>
                );
            case "InProgress":
            case 1:
                return (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-semibold">
                        <FaClock className="me-1" /> Đang xử lý
                    </span>
                );
            case "Warning":
            case 3:
                return (
                    <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 fw-semibold">
                        <FaExclamationTriangle className="me-1" /> Cần chạy lại (Rerun)
                    </span>
                );
            case "Rejected":
            case 4:
                return (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-semibold">
                        <FaTimesCircle className="me-1" /> Mẫu từ chối
                    </span>
                );
            default:
                return (
                    <span className="badge bg-light text-muted border px-2 py-1 fw-normal">
                        Chờ thực hiện
                    </span>
                );
        }
    };

    const getStepIcon = (stepNumber, status) => {
        if (status === "Completed" || status === 2) return <FaCheck />;
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
        <div className="bms-tracking-page" style={{ overflowX: 'hidden' }}>
            <PortalNavbar />
            
            <main className={`bms-tracking-main bms-page-directional-content ${pageTransitionClass}`}>
                <div className="container" style={{ maxWidth: 1180 }}>
                    
                    {/* 1. TOP SPOTLIGHT EXECUTIVE HERO (Header + Separated Input & Button Aligned Right - Pure 2D Flat, Zero Border) */}
                    <div className="bms-tracking-hero mb-4">
                        <div className="row align-items-center g-4">
                            {/* Left Column: Heading & Concise Subtitle */}
                            <div className="col-lg-6">
                                <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                                    <img src="/assets/lab-icon.png" alt="" style={{ width: '15px', height: '15px', objectFit: 'contain' }} />
                                    <span>TIÊU CHUẨN ISO 15189:2022 · BẢO MẬT PII</span>
                                </div>
                                <h1 className="fw-bold mb-2" style={{ fontSize: '26px', color: '#0F172A', letterSpacing: '-0.025em', lineHeight: '1.25' }}>
                                    Tra Cứu Lộ Trình Mẫu Máu
                                </h1>
                                <p className="mb-0 text-muted" style={{ fontSize: '13px', maxWidth: '480px', lineHeight: '1.6', color: '#475569' }}>
                                    Theo dõi tiến trình phân tích mẫu và thời gian trả kết quả theo thời gian thực.
                                </p>
                            </div>

                            {/* Right Column: Distinct Search Input & Action Button Side by Side */}
                            <div className="col-lg-6 d-flex justify-content-lg-end">
                                <form onSubmit={handleFormSubmit} className="d-flex align-items-center gap-2.5 w-100" style={{ maxWidth: '480px' }}>
                                    <div className="position-relative flex-grow-1">
                                        <FaBarcode style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#1E60E6', fontSize: '15px', pointerEvents: 'none' }} />
                                        <input
                                            type="text"
                                            className="form-control"
                                            style={{
                                                height: '46px',
                                                paddingLeft: '44px',
                                                paddingRight: searchInput ? '36px' : '16px',
                                                backgroundColor: '#F1F5F9',
                                                border: 'none',
                                                borderRadius: '9999px',
                                                fontSize: '13px',
                                                fontWeight: 500,
                                                color: '#0F172A',
                                                outline: 'none',
                                                boxShadow: 'none'
                                            }}
                                            placeholder="Nhập mã đơn (VD: BC-... hoặc ORD-...)"
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            autoFocus
                                        />
                                        {searchInput && (
                                            <button 
                                                type="button" 
                                                onClick={() => setSearchInput("")}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#94A3B8',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    padding: '4px'
                                                }}
                                                title="Xóa nội dung"
                                            >
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="btn fw-bold flex-shrink-0 d-flex align-items-center justify-content-center gap-2"
                                        style={{
                                            height: '46px',
                                            padding: '0 24px',
                                            backgroundColor: '#1E60E6',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '9999px',
                                            fontSize: '13px',
                                            boxShadow: 'none',
                                            cursor: loading ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                <span>Đang tìm...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSearch style={{ fontSize: '12px' }} />
                                                <span>Tra Cứu</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* 2. ERROR NOTIFICATION */}
                    {errorMessage && (
                        <div className="alert alert-warning border-0 rounded-3 p-3 mb-3 d-flex align-items-center gap-3" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                            <FaExclamationTriangle className="fs-5 flex-shrink-0" style={{ color: '#D97706' }} />
                            <div>
                                <div className="fw-bold mb-0" style={{ fontSize: '13px' }}>Không tìm thấy dữ liệu</div>
                                <div style={{ fontSize: '12px' }}>{errorMessage}</div>
                            </div>
                        </div>
                    )}

                    {/* 3. DEFAULT GUIDE STATE (When no search has been performed) */}
                    {!trackingData && !loading && (
                        <div className="bms-guide-container">
                            {/* 3 Step Guide Cards */}
                            <div className="bms-steps">
                                <div className="bms-step-card-box text-start">
                                    <div className="w-100 text-center mb-2">
                                        <img src="/assets/bms/svg/sections/landing/step-01-register.svg" alt="Nhận mã phiếu" style={{ height: '88px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="bms-step-num">01</div>
                                    <h3 className="bms-step-title">Nhận Mã Phiếu Lấy Mẫu</h3>
                                    <p className="bms-step-desc">
                                        Mã vạch Barcode (Code 128) được in trực tiếp trên phiếu tiếp nhận lấy mẫu hoặc gửi qua tin nhắn SMS sau khi hoàn tất thủ tục đăng ký.
                                    </p>
                                </div>

                                <div className="bms-step-card-box text-start">
                                    <div className="w-100 text-center mb-2">
                                        <img src="/assets/bms/svg/sections/landing/step-02-sampling.svg" alt="Nhập mã tra cứu" style={{ height: '88px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="bms-step-num">02</div>
                                    <h3 className="bms-step-title">Nhập Mã Tra Cứu</h3>
                                    <p className="bms-step-desc">
                                        Điền mã vạch vào thanh tìm kiếm phía trên. Hệ thống hỗ trợ tra cứu nhanh cả mã vạch ống máu (BC-...) và mã phiếu khám (ORD-...).
                                    </p>
                                </div>

                                <div className="bms-step-card-box text-start">
                                    <div className="w-100 text-center mb-2">
                                        <img src="/assets/bms/svg/sections/landing/step-03-analysis.svg" alt="Theo dõi kết quả" style={{ height: '88px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="bms-step-num">03</div>
                                    <h3 className="bms-step-title">Theo Dõi Thời Gian Thực</h3>
                                    <p className="bms-step-desc">
                                        Nắm rõ vị trí mẫu máu đang ở đâu trong chu trình 6 chặng chuẩn ISO 15189, thời gian dự kiến trả kết quả và chữ ký số bác sĩ.
                                    </p>
                                </div>
                            </div>

                            {/* 6-Stage Workflow Strip with Custom Designed Flow Connectors */}
                            <div className="bms-stages-overview my-4" style={{ padding: '28px 32px' }}>
                                <div className="text-center mb-3">
                                    <h4 className="bms-stages-overview-title mb-1" style={{ fontSize: '16px' }}>Chu Trình Khép Kín 6 Chặng Chuẩn Y Tế ISO 15189</h4>
                                    <p className="bms-stages-overview-subtitle mb-0" style={{ fontSize: '12.5px' }}>
                                        Toàn bộ mẫu bệnh phẩm được theo dõi bằng mã định danh duy nhất xuyên suốt phòng Lab tự động
                                    </p>
                                </div>
                                
                                <div className="bms-stages-flow-row">
                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 1</span>
                                        <div className="bms-stage-flow-title">Tiếp Nhận Chỉ Định</div>
                                    </div>
                                    <div className="bms-stage-flow-connector" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E60E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="13 6 19 12 13 18"></polyline>
                                        </svg>
                                    </div>

                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 2</span>
                                        <div className="bms-stage-flow-title">Lấy Mẫu &amp; Barcode</div>
                                    </div>
                                    <div className="bms-stage-flow-connector" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E60E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="13 6 19 12 13 18"></polyline>
                                        </svg>
                                    </div>

                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 3</span>
                                        <div className="bms-stage-flow-title">Nhập Lab (LIS)</div>
                                    </div>
                                    <div className="bms-stage-flow-connector" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E60E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="13 6 19 12 13 18"></polyline>
                                        </svg>
                                    </div>

                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 4</span>
                                        <div className="bms-stage-flow-title">Phân Tích Máy Tự Động</div>
                                    </div>
                                    <div className="bms-stage-flow-connector" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E60E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="13 6 19 12 13 18"></polyline>
                                        </svg>
                                    </div>

                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 5</span>
                                        <div className="bms-stage-flow-title">Bác Sĩ Thẩm Định</div>
                                    </div>
                                    <div className="bms-stage-flow-connector" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E60E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="13 6 19 12 13 18"></polyline>
                                        </svg>
                                    </div>

                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 6</span>
                                        <div className="bms-stage-flow-title">Ký Số &amp; Trả Kết Quả</div>
                                    </div>
                                </div>
                            </div>

                            {/* Explainer Patient Journey Row */}
                            <div className="bms-stages-overview my-3 text-center" style={{ padding: '24px' }}>
                                <h4 className="bms-stages-overview-title mb-1">Hành Trình Xét Nghiệm Khép Kín Chuẩn Y Tế BMS</h4>
                                <p className="bms-stages-overview-subtitle mb-3">
                                    Minh họa toàn diện từ thời điểm tiếp nhận mẫu đến khi cấp chứng thư chữ ký số
                                </p>
                                <img
                                    src="/assets/bms/svg/sections/landing/sec-09-patient-journey.svg"
                                    alt="Hành trình xét nghiệm bệnh nhân"
                                    style={{ width: '100%', maxWidth: '440px', height: 'auto', margin: '0 auto', display: 'block' }}
                                />
                            </div>

                            {/* Trust & Support Strip - Clean typography without decorative icons */}
                            <div className="bms-trust-box">
                                <div className="bms-trust-item">
                                    <span>Bảo mật thông tin y tế theo Nghị định 13/2023/NĐ-CP (Tên bệnh nhân được mã hóa PII khi tra cứu công khai).</span>
                                </div>
                                <div className="bms-trust-item">
                                    <span>Tổng đài hỗ trợ: <strong>1900 6868</strong> (06:00 - 20:30 hàng ngày)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 5. SEARCH RESULTS VIEW (When Tracking Data is Available) */}
                    {trackingData && (
                        <div className="row g-4">
                            {/* Left Column: Specimen Overview & Patient Metadata */}
                            <div className="col-lg-4">
                                <div className="bms-result-meta-card sticky-top" style={{ top: 24 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <div>
                                            <div className="text-muted small" style={{ fontSize: 12 }}>MÃ VẠCH ĐỊNH DANH</div>
                                            <h2 className="bms-specimen-id-badge">{trackingData.orderNumber}</h2>
                                        </div>
                                        <span className={`badge ${trackingData.priority === "Stat" || trackingData.priority === "Urgent" ? "bg-danger" : "bg-primary-subtle text-primary border border-primary-subtle"} px-2 py-1`}>
                                            {trackingData.priority === "Stat" ? "⚡ CẤP CỨU STAT" : "Chuẩn Routine"}
                                        </span>
                                    </div>

                                    <ul className="bms-specimen-detail-list">
                                        <li className="bms-specimen-detail-item">
                                            <span className="bms-specimen-detail-label">Bệnh nhân</span>
                                            <span className="bms-specimen-detail-val">{trackingData.patientName}</span>
                                        </li>
                                        <li className="bms-specimen-detail-item">
                                            <span className="bms-specimen-detail-label">Thông tin sinh hiệu</span>
                                            <span className="bms-specimen-detail-val">
                                                {trackingData.patientGender} • {trackingData.patientAge} tuổi
                                            </span>
                                        </li>
                                        <li className="bms-specimen-detail-item">
                                            <span className="bms-specimen-detail-label">Mã hồ sơ bệnh án</span>
                                            <span className="bms-specimen-detail-val font-monospace text-secondary">
                                                {trackingData.patientId || "—"}
                                            </span>
                                        </li>
                                        <li className="bms-specimen-detail-item flex-column gap-1">
                                            <span className="bms-specimen-detail-label">Gói xét nghiệm thực hiện:</span>
                                            <div className="fw-semibold text-dark ps-2 border-start border-2 border-primary mt-1">
                                                {trackingData.testPackageNames?.map((pkg, idx) => (
                                                    <div key={idx} className="small py-0.5">{pkg}</div>
                                                ))}
                                            </div>
                                        </li>
                                        <li className="bms-specimen-detail-item">
                                            <span className="bms-specimen-detail-label">Tiếp nhận lúc</span>
                                            <span className="bms-specimen-detail-val">{formatDateTime(trackingData.orderedAt)}</span>
                                        </li>
                                        <li className="bms-specimen-detail-item">
                                            <span className="bms-specimen-detail-label">Dự kiến hoàn tất</span>
                                            <span className="bms-specimen-detail-val text-primary fw-bold">
                                                {formatDateTime(trackingData.estimatedCompletionTime)}
                                            </span>
                                        </li>
                                    </ul>

                                    {/* Rejection / Rerun Alerts */}
                                    {trackingData.isRejected && (
                                        <div className="alert alert-danger py-2 px-3 small rounded-3 mt-3 mb-0">
                                            <strong><FaTimesCircle className="me-1" /> Mẫu bị từ chối:</strong> {trackingData.rejectionReason}
                                        </div>
                                    )}

                                    {trackingData.isRerunRequested && (
                                        <div className="alert alert-warning py-2 px-3 small rounded-3 mt-3 mb-0">
                                            <strong><FaExclamationTriangle className="me-1" /> Yêu cầu kiểm tra lại:</strong> {trackingData.rerunReason}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="d-grid gap-2 mt-4 pt-3 border-top">
                                        {trackingData.isCompleted && (
                                            <a 
                                                href={`/results/${encodeURIComponent(trackingData.orderNumber)}/report`} 
                                                className="btn btn-success d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                                            >
                                                <FaFileMedicalAlt /> Xem Báo Cáo Kết Quả
                                            </a>
                                        )}
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 py-2 small"
                                            onClick={() => handleTrackLookup(trackingData.orderNumber)}
                                        >
                                            <FaRedoAlt /> Tải Lại Tiến Trình
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 py-2 small"
                                            onClick={() => window.print()}
                                        >
                                            <FaPrint /> In Phiếu Lộ Trình
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-link text-decoration-none text-muted small py-1"
                                            onClick={handleClearSearch}
                                        >
                                            ← Tra cứu mã khác
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: 6-Stage Interactive Stepper */}
                            <div className="col-lg-8">
                                <div className="bms-stepper-container">
                                    <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom flex-wrap gap-2">
                                        <div>
                                            <h3 className="h5 fw-bold text-dark mb-0">Chi Tiết Tiến Trình Xét Nghiệm</h3>
                                            <div className="text-muted small">Tuân thủ quy trình kiểm soát chất lượng mẫu ISO 15189</div>
                                        </div>
                                        <span className="badge bg-primary px-3 py-2 fw-semibold">
                                            Chặng {trackingData.currentStepNumber}/6: {trackingData.currentStepName}
                                        </span>
                                    </div>

                                    {/* Timeline Stepper Nodes */}
                                    <div className="bms-stepper-timeline">
                                        {trackingData.steps?.map((step) => {
                                            const isCompleted = step.status === "Completed" || step.status === 2;
                                            const isInProgress = step.status === "InProgress" || step.status === 1;
                                            const isRejected = step.status === "Rejected" || step.status === 4;
                                            const isWarning = step.status === "Warning" || step.status === 3;

                                            let nodeClass = "pending";
                                            if (isCompleted) nodeClass = "completed";
                                            else if (isInProgress) nodeClass = "inprogress";
                                            else if (isRejected) nodeClass = "rejected";
                                            else if (isWarning) nodeClass = "warning";

                                            return (
                                                <div key={step.stepNumber} className="bms-stepper-item">
                                                    {/* Milestone Icon Node */}
                                                    <div className={`bms-stepper-node ${nodeClass}`}>
                                                        {getStepIcon(step.stepNumber, step.status)}
                                                    </div>

                                                    {/* Step Information Card */}
                                                    <div className={`bms-step-card ${isInProgress ? "active-step" : ""}`}>
                                                        <div className="bms-step-card-header">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="text-muted small fw-bold">#{step.stepNumber}</span>
                                                                <h4 className="bms-step-title">{step.title}</h4>
                                                            </div>
                                                            <div>{getStepStatusBadge(step.status)}</div>
                                                        </div>

                                                        <p className="bms-step-desc">{step.description}</p>

                                                        <div className="bms-step-meta">
                                                            <div className="bms-step-meta-item">
                                                                <FaClock className="text-secondary" />
                                                                <span><strong>Thời gian:</strong> {formatDateTime(step.timestamp)}</span>
                                                            </div>
                                                            {step.handlerName && (
                                                                <div className="bms-step-meta-item">
                                                                    <FaUserMd className="text-primary" />
                                                                    <span><strong>Phụ trách:</strong> {step.handlerName}</span>
                                                                </div>
                                                            )}
                                                            {step.department && (
                                                                <div className="bms-step-meta-item">
                                                                    <FaHospital className="text-secondary" />
                                                                    <span>{step.department}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {step.notes && (
                                                            <div className="alert alert-warning py-1.5 px-2.5 small rounded-2 mt-2 mb-0 d-flex align-items-center gap-2">
                                                                <FaExclamationTriangle className="text-warning flex-shrink-0" />
                                                                <span>{step.notes}</span>
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
            </main>

            <MegaFooter />
        </div>
    );
}
