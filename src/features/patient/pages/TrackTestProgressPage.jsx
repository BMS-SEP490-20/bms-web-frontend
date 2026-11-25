/**
 * @file TrackTestProgressPage.jsx
 * @description Dedicated Patient Portal and Clinical view for tracking 6-stage test specimen progress in real time (UC48).
 * Clean, Non-AI Human-Centered Medical UI conforming to AGENTS-DESIGN.md and ISO 15189:2022.
 */

import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Search, TestTube2, CheckCircle2, Clock, Microscope, FileHeart, Hospital, Stethoscope, AlertTriangle, XCircle, RotateCw, Barcode, ArrowRight, Printer, X as LucideX, Check } from 'lucide-react';
import { fetchTrackingByCode, fetchPatientTrackings } from "../api/trackingApi";
import { ROLES, resolveRoleId, getStoredUser } from "../../../constants/roles";
import PortalNavbar from "../../home/components/PortalNavbar";
import MegaFooter from "../../home/components/MegaFooter";
import usePageTransition from "../../../shared/hooks/usePageTransition";
import "./TrackTestProgressPage.css";

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prefer human ORD-/BC- codes; never show raw GUID as the primary label. */
function formatTrackingCode(item) {
    const ord = (item?.orderNumber || "").trim();
    const bc = (item?.barcode || "").trim();
    if (ord && !GUID_RE.test(ord)) return ord;
    if (bc && !GUID_RE.test(bc)) return bc;
    if (ord) return `Mẫu ${ord.slice(0, 8).toUpperCase()}`;
    if (bc) return `Mẫu ${bc.slice(0, 8).toUpperCase()}`;
    return "Mẫu —";
}

/** Code safe for tracking API lookup (barcode / ORD- over GUID). */
function trackingLookupCode(item) {
    const ord = (item?.orderNumber || "").trim();
    const bc = (item?.barcode || "").trim();
    if (ord && !GUID_RE.test(ord)) return ord;
    if (bc && !GUID_RE.test(bc)) return bc;
    return ord || bc || "";
}

/** Code for signed PDF export — prefer TRE/result id (barcode alone often 404). */
function trackingExportCode(item) {
    const candidates = [
        item?.resultCode,
        item?.testResultCode,
        item?.testResultId,
        item?.resultId,
        item?.orderCode,
        item?.orderNumber,
        item?.barcode
    ];
    for (const raw of candidates) {
        const v = (raw || "").toString().trim();
        if (!v || GUID_RE.test(v)) continue;
        return v;
    }
    return trackingLookupCode(item);
}

export default function TrackTestProgressPage() {
    const pageTransitionClass = usePageTransition();
    const [searchParams] = useSearchParams();
    const { identifier: routeIdentifier } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const storedUser = getStoredUser();
    const isPatient = Boolean(storedUser && resolveRoleId(storedUser) === ROLES.PATIENT);
    // Chỉ ẩn PortalNavbar/MegaFooter khi đã nằm trong PatientPortalLayout (/patient/*)
    const isEmbedded = location.pathname.startsWith("/patient/");
    // BN đã login: không hiện ô tìm đơn — chọn từ danh sách mẫu của mình
    const hideManualSearch = isPatient;

    const [searchInput, setSearchInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [trackingData, setTrackingData] = useState(null);
    const [myTrackings, setMyTrackings] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const openTrackingDetail = (item) => {
        if (!item) return;
        setTrackingData(item);
        setSearchInput(trackingLookupCode(item));
        setErrorMessage("");
        setHasSearched(true);
        setShowDetailModal(true);
    };

    const closeTrackingDetail = () => {
        setShowDetailModal(false);
        if (hideManualSearch) {
            setTrackingData(null);
            setHasSearched(false);
            navigate(isEmbedded ? "/patient/tracking" : "/tracking", { replace: true });
        }
    };

    // Tự động nạp danh sách mẫu xét nghiệm của chính bệnh nhân đang đăng nhập
    useEffect(() => {
        const user = getStoredUser();
        if (!user || resolveRoleId(user) !== ROLES.PATIENT) return;
        const pid = user.patientCode || user.patientId || user.id || user._id;
        if (!pid) return;

        let active = true;
        fetchPatientTrackings(pid).then((list) => {
            if (!active || !Array.isArray(list) || list.length === 0) return;
            setMyTrackings(list);
            // BN: chỉ hiện list — chi tiết mở modal khi bấm "Xem tiến trình"
        });
        return () => { active = false; };
    }, []);

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
                setShowDetailModal(true);
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
        setShowDetailModal(false);
        setErrorMessage("");
        setHasSearched(false);
        navigate(isEmbedded ? "/patient/tracking" : "/tracking", { replace: true });
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
                        <CheckCircle2 className="me-1"  size="1em"/> Đã hoàn tất
                    </span>
                );
            case "InProgress":
            case 1:
                return (
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 fw-semibold">
                        <Clock className="me-1"  size="1em"/> Đang xử lý
                    </span>
                );
            case "Warning":
            case 3:
                return (
                    <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 fw-semibold">
                        <AlertTriangle className="me-1"  size="1em"/> Cần chạy lại (Rerun)
                    </span>
                );
            case "Rejected":
            case 4:
                return (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-semibold">
                        <XCircle className="me-1"  size="1em"/> Mẫu từ chối
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
        if (status === "Completed" || status === 2) return <Check  size="1em"/>;
        switch (stepNumber) {
            case 1: return <Hospital  size="1em"/>;
            case 2: return <TestTube2  size="1em"/>;
            case 3: return <Barcode  size="1em"/>;
            case 4: return <Microscope  size="1em"/>;
            case 5: return <Stethoscope  size="1em"/>;
            case 6: return <FileHeart  size="1em"/>;
            default: return <CheckCircle2  size="1em"/>;
        }
    };

    return (
        <div className="bms-tracking-page">
            {!isEmbedded && <PortalNavbar />}
            
            <main className={`bms-tracking-main bms-page-directional-content ${pageTransitionClass}`}>
                <div className="container" style={{ maxWidth: 1180 }}>
                    
                    {/* 1. HERO — BN: không ô tìm đơn; khách: giữ form tra mã */}
                    <div className="bms-tracking-hero mb-4">
                        <div className={`row align-items-center g-4 ${hideManualSearch ? '' : ''}`}>
                            <div className={hideManualSearch ? 'col-12' : 'col-lg-6'}>
                                <h1 className="fw-bold mb-2" style={{ fontSize: '24px', color: '#0F172A', letterSpacing: '-0.02em', lineHeight: '1.25' }}>
                                    {hideManualSearch ? 'Tiến Trình & Kết Quả Xét Nghiệm' : 'Tra Cứu Lộ Trình Mẫu Máu'}
                                </h1>
                                <p className="mb-0 text-muted" style={{ fontSize: '13.5px', maxWidth: '560px', lineHeight: '1.6', color: '#475569' }}>
                                    {hideManualSearch
                                        ? 'Chọn mẫu trong danh sách bên dưới để xem lộ trình phân tích và kết quả ký số.'
                                        : 'Theo dõi trực tiếp tiến trình phân tích mẫu và thời gian nhận kết quả ký số.'}
                                </p>
                            </div>

                            {!hideManualSearch && (
                            <div className="col-lg-6 d-flex justify-content-lg-end">
                                <form onSubmit={handleFormSubmit} className="d-flex align-items-center gap-2.5 w-100" style={{ maxWidth: '480px' }}>
                                    <div className="position-relative flex-grow-1">
                                        <Barcode
                                            style={{
                                                position: 'absolute',
                                                left: '18px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#1E60E6',
                                                fontSize: '16px',
                                                pointerEvents: 'none',
                                                zIndex: 2
                                            }}
                                         size="1em"/>
                                        <input
                                            type="text"
                                            className="bms-track-search-input"
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
                                                    right: '14px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#94A3B8',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    padding: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    zIndex: 2
                                                }}
                                                title="Xóa nội dung"
                                            >
                                                <LucideX  size="1em"/>
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
                                                <Search style={{ fontSize: '12px' }}  size="1em"/>
                                                <span>Tra Cứu</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* 1.5. DANH SÁCH MẪU — layout list (không chip) */}
                    {myTrackings.length > 0 && (
                        <div className="bms-tracking-order-list mb-4">
                            <div className="d-flex justify-content-between align-items-end mb-3 px-1">
                                <div>
                                    <div className="fw-bold text-dark" style={{ fontSize: '15px' }}>
                                        <TestTube2 className="text-primary me-2"  size="1em"/>
                                        Mẫu xét nghiệm của tôi
                                    </div>
                                    <div className="text-muted small mt-1">{myTrackings.length} mẫu — chọn một dòng để xem tiến trình</div>
                                </div>
                            </div>
                            <div className="d-flex flex-column gap-2">
                                {myTrackings.map((item) => {
                                    const isSelected = trackingData && (trackingData.orderNumber === item.orderNumber || trackingData.barcode === item.barcode);
                                    return (
                                        <button
                                            key={`${item.orderNumber}-${item.barcode}`}
                                            type="button"
                                            onClick={() => openTrackingDetail(item)}
                                            className="bms-tracking-order-row text-start w-100 border-0"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '16px',
                                                flexWrap: 'wrap',
                                                background: isSelected && showDetailModal ? '#EEF4FD' : '#FFFFFF',
                                                borderRadius: '14px',
                                                padding: '16px 20px',
                                                boxShadow: 'none',
                                                outline: isSelected && showDetailModal ? '2px solid #1E60E6' : '1px solid #E2E8F0',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                                                <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                                    <span className="font-monospace fw-bold" style={{ fontSize: '14px', color: '#0F172A' }}>
                                                        {formatTrackingCode(item)}
                                                    </span>
                                                    <span
                                                        className="badge"
                                                        style={{
                                                            backgroundColor: item.isCompleted ? '#DCFCE7' : '#FEF3C7',
                                                            color: item.isCompleted ? '#166534' : '#92400E',
                                                            fontWeight: 650
                                                        }}
                                                    >
                                                        {item.isCompleted ? 'Đã có kết quả' : (item.currentStepName || 'Đang xử lý')}
                                                    </span>
                                                </div>
                                                <div className="text-muted" style={{ fontSize: '12.5px', lineHeight: 1.45 }}>
                                                    {(item.testPackageNames && item.testPackageNames[0]) || 'Xét nghiệm'}
                                                    {item.patientName ? ` · ${item.patientName}` : ''}
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2 flex-shrink-0" style={{ color: '#1E60E6', fontSize: '12.5px', fontWeight: 650 }}>
                                                Xem tiến trình <ArrowRight style={{ fontSize: '11px' }}  size="1em"/>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 2. ERROR NOTIFICATION */}
                    {errorMessage && (
                        <div className="alert alert-warning border-0 rounded-3 p-3 mb-3 d-flex align-items-center gap-3" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                            <AlertTriangle className="fs-5 flex-shrink-0" style={{ color: '#D97706' }}  size="1em"/>
                            <div>
                                <div className="fw-bold mb-0" style={{ fontSize: '13px' }}>Không tìm thấy dữ liệu</div>
                                <div style={{ fontSize: '12px' }}>{errorMessage}</div>
                            </div>
                        </div>
                    )}

                    {/* 3. DEFAULT GUIDE — chỉ khách / BN chưa có mẫu (BN có list thì không hướng dẫn nhập mã) */}
                    {!trackingData && !loading && !(hideManualSearch && myTrackings.length > 0) && (
                        <div className="bms-guide-container">
                            {/* 3 Step Guide Cards */}
                            <div className="bms-steps">
                                <div className="bms-step-card-box text-start">
                                    <div className="w-100 text-center mb-2">
                                        <img src="/assets/bms/svg/sections/landing/step-01-register.svg?v=transparent-20261106-1442" alt="Nhận mã phiếu" style={{ height: '88px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="bms-step-num">01</div>
                                    <h3 className="bms-step-title">Nhận Mã Phiếu Lấy Mẫu</h3>
                                    <p className="bms-step-desc">
                                        Mã phiếu tra cứu được in trực tiếp trên phiếu tiếp nhận lấy mẫu hoặc gửi qua tin nhắn SMS/Zalo sau khi hoàn tất thủ tục đăng ký.
                                    </p>
                                </div>

                                <div className="bms-step-card-box text-start">
                                    <div className="w-100 text-center mb-2">
                                        <img src="/assets/bms/svg/sections/landing/step-02-sampling.svg?v=transparent-20261106-1442" alt="Nhập mã tra cứu" style={{ height: '88px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="bms-step-num">02</div>
                                    <h3 className="bms-step-title">Nhập Mã Tra Cứu</h3>
                                    <p className="bms-step-desc">
                                        Điền mã vào thanh tìm kiếm phía trên. Hệ thống hỗ trợ tra cứu nhanh cả mã ống máu (BC-...) và mã phiếu xét nghiệm (ORD-...).
                                    </p>
                                </div>

                                <div className="bms-step-card-box text-start">
                                    <div className="w-100 text-center mb-2">
                                        <img src="/assets/bms/svg/sections/landing/step-03-analysis.svg?v=transparent-20261106-1442" alt="Theo dõi kết quả" style={{ height: '88px', objectFit: 'contain' }} />
                                    </div>
                                    <div className="bms-step-num">03</div>
                                    <h3 className="bms-step-title">Theo Dõi Thời Gian Thực</h3>
                                    <p className="bms-step-desc">
                                        Nắm rõ vị trí mẫu máu đang được xử lý ở bước nào, thời gian dự kiến hoàn thành và xem kết quả được Bác sĩ ký duyệt ngay lập tức.
                                    </p>
                                </div>
                            </div>

                            {/* 6-Stage Workflow Strip with Custom Designed Flow Connectors */}
                            <div className="bms-stages-overview my-4" style={{ padding: '28px 32px' }}>
                                <div className="text-center mb-3">
                                    <h4 className="bms-stages-overview-title mb-1" style={{ fontSize: '16px' }}>6 Bước Xử Lý Mẫu Xét Nghiệm</h4>
                                    <p className="bms-stages-overview-subtitle mb-0" style={{ fontSize: '12.5px' }}>
                                        Mẫu bệnh phẩm được kiểm soát nghiêm ngặt bằng mã định danh bảo mật từ khâu lấy mẫu đến kết quả cuối cùng
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
                                        <div className="bms-stage-flow-title">Lấy Mẫu An Toàn</div>
                                    </div>
                                    <div className="bms-stage-flow-connector" aria-hidden="true">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E60E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                            <polyline points="13 6 19 12 13 18"></polyline>
                                        </svg>
                                    </div>

                                    <div className="bms-stage-flow-card">
                                        <span className="bms-stage-flow-badge">Chặng 3</span>
                                        <div className="bms-stage-flow-title">Tiếp Nhận Vào Lab</div>
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

                            {/* Support Strip */}
                            <div className="bms-trust-box">
                                <div className="bms-trust-item">
                                    <span>Tổng đài hỗ trợ kết quả: <strong>1900 6868</strong> (07:00 - 20:30 hàng ngày)</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* Chi tiết tiến trình — modal khi xem từ list / tra cứu */}
            <Modal
                show={showDetailModal && Boolean(trackingData)}
                onHide={closeTrackingDetail}
                size="xl"
                centered
                scrollable
                dialogClassName="bms-tracking-detail-modal"
                contentClassName="border-0"
            >
                {trackingData && (
                    <>
                        <Modal.Header closeButton className="border-0 pb-0 px-4 pt-4">
                            <Modal.Title className="fs-5 fw-bold text-dark">
                                Chi tiết tiến trình · {formatTrackingCode(trackingData)}
                            </Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="px-4 pb-4 pt-3">
                            <div className="row g-4">
                                <div className="col-lg-4">
                                    <div className="bms-result-meta-card">
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div>
                                                <div className="text-muted small" style={{ fontSize: 12 }}>MÃ VẠCH ĐỊNH DANH</div>
                                                <h2 className="bms-specimen-id-badge">{formatTrackingCode(trackingData)}</h2>
                                            </div>
                                            <span className={`badge ${trackingData.priority === "Stat" || trackingData.priority === "Urgent" ? "bg-danger-subtle text-danger" : "bg-primary-subtle text-primary"} rounded-pill px-2.5 py-1`}>
                                                {trackingData.priority === "Stat" || trackingData.priority === "Urgent" ? "Cấp cứu (STAT)" : "Thường quy"}
                                            </span>
                                        </div>

                                        <ul className="bms-specimen-detail-list">
                                            <li className="bms-specimen-detail-item">
                                                <span className="bms-specimen-detail-label">Bệnh nhân</span>
                                                <span className="bms-specimen-detail-val">{trackingData.patientName}</span>
                                            </li>
                                            <li className="bms-specimen-detail-item">
                                                <span className="bms-specimen-detail-label">Giới tính &amp; Tuổi</span>
                                                <span className="bms-specimen-detail-val">
                                                    {trackingData.patientGender === "Male" || trackingData.patientGender === "Nam" ? "Nam" : trackingData.patientGender === "Female" || trackingData.patientGender === "Nữ" ? "Nữ" : (trackingData.patientGender || "—")}{trackingData.patientAge > 0 ? ` • ${trackingData.patientAge} tuổi` : ""}
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

                                        {trackingData.isRejected && (
                                            <div className="alert alert-danger py-2 px-3 small rounded-3 mt-3 mb-0">
                                                <strong><XCircle className="me-1"  size="1em"/> Mẫu bị từ chối:</strong> {trackingData.rejectionReason}
                                            </div>
                                        )}

                                        {trackingData.isRerunRequested && (
                                            <div className="alert alert-warning py-2 px-3 small rounded-3 mt-3 mb-0">
                                                <strong><AlertTriangle className="me-1"  size="1em"/> Yêu cầu kiểm tra lại:</strong> {trackingData.rerunReason}
                                            </div>
                                        )}

                                        <div className="d-grid gap-2 mt-4 pt-3 border-top">
                                            {trackingData.isCompleted && (
                                                <>
                                                    <Link
                                                        to="/patient/test-history"
                                                        className="btn btn-primary rounded-pill d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                                                        onClick={closeTrackingDetail}
                                                    >
                                                        <FileHeart  size="1em"/> Xem Chi Tiết Kết Quả Xét Nghiệm
                                                    </Link>
                                                    <Link
                                                        to={`/patient/results/export/${encodeURIComponent(trackingExportCode(trackingData))}`}
                                                        className="btn btn-success rounded-pill d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                                                        onClick={closeTrackingDetail}
                                                    >
                                                        <FileHeart  size="1em"/> Xem &amp; Tải Phiếu Kết Quả Ký Số (PDF)
                                                    </Link>
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                className="btn btn-outline-primary rounded-pill d-flex align-items-center justify-content-center gap-2 py-2 small"
                                                onClick={() => handleTrackLookup(trackingLookupCode(trackingData))}
                                            >
                                                <RotateCw  size="1em"/> Tải lại tiến trình
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary rounded-pill d-flex align-items-center justify-content-center gap-2 py-2 small"
                                                onClick={() => window.print()}
                                            >
                                                <Printer  size="1em"/> In phiếu lộ trình
                                            </button>
                                            {!hideManualSearch && (
                                                <button
                                                    type="button"
                                                    className="btn btn-link text-decoration-none text-muted small py-1"
                                                    onClick={handleClearSearch}
                                                >
                                                    Tra cứu mã khác
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-lg-8">
                                    <div className="bms-stepper-container">
                                        <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom flex-wrap gap-2">
                                            <div>
                                                <h3 className="h5 fw-bold text-dark mb-0">Chi Tiết Tiến Trình Xét Nghiệm</h3>
                                                <div className="text-muted small">Theo dõi trạng thái mẫu trực tuyến</div>
                                            </div>
                                            <span className="badge bg-primary px-3 py-2 fw-semibold">
                                                Chặng {trackingData.currentStepNumber}/6: {trackingData.currentStepName}
                                            </span>
                                        </div>

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
                                                        <div className={`bms-stepper-node ${nodeClass}`}>
                                                            {getStepIcon(step.stepNumber, step.status)}
                                                        </div>
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
                                                                    <Clock className="text-secondary"  size="1em"/>
                                                                    <span><strong>Thời gian:</strong> {formatDateTime(step.timestamp)}</span>
                                                                </div>
                                                                {step.handlerName && (
                                                                    <div className="bms-step-meta-item">
                                                                        <Stethoscope className="text-primary"  size="1em"/>
                                                                        <span><strong>Phụ trách:</strong> {step.handlerName}</span>
                                                                    </div>
                                                                )}
                                                                {step.department && (
                                                                    <div className="bms-step-meta-item">
                                                                        <Hospital className="text-secondary"  size="1em"/>
                                                                        <span>{step.department}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {step.notes && (
                                                                <div className="alert alert-warning py-1.5 px-2.5 small rounded-2 mt-2 mb-0 d-flex align-items-center gap-2">
                                                                    <AlertTriangle className="text-warning flex-shrink-0"  size="1em"/>
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
                        </Modal.Body>
                    </>
                )}
            </Modal>

            {!isEmbedded && <MegaFooter />}
        </div>
    );
}
