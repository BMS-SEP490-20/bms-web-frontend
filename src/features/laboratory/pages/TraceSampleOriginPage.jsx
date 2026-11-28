/**
 * @file TraceSampleOriginPage.jsx
 * @description Specimen origin traceability and chain of custody interface (UC77 / Issue I3-089).
 * Matches clinical design specification in docs-output/screens/05-lab-user.html#uc77.
 * Conforms to: ISO 15189 Quality Standards, Production Engineering & AGENTS.md.
 */

import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Search as LucideSearch, Barcode, ArrowRight, ArrowDown, Download, Clock, CheckCircle2, AlertTriangle, TestTube2, Stethoscope, User, FlaskConical, History, X } from 'lucide-react';
import {
    fetchSampleOriginTrace,
    fetchRecentTraceableSpecimens,
    exportTracePdf
} from "../api/sampleOriginTraceApi";

const CUSTODY_INTEGRITY_LABELS = {
    Unbroken: "Toàn vẹn chuỗi bảo quản",
    Verified: "Đã xác thực",
    Flagged: "Có cảnh báo"
};

export default function TraceSampleOriginPage() {
    const { specimenId: routeSpecimenId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialBarcode = routeSpecimenId || searchParams.get("specimenId") || "";

    const [searchInput, setSearchInput] = useState(initialBarcode);
    const [currentSpecimenId, setCurrentSpecimenId] = useState(initialBarcode);
    const [traceData, setTraceData] = useState(null);
    const [recentSpecimens, setRecentSpecimens] = useState([]);
    const [loading, setLoading] = useState(Boolean(initialBarcode));
    const [exporting, setExporting] = useState(false);
    const [alertMessage, setAlertMessage] = useState(null);

    const loadTrace = useCallback(async (specimenId) => {
        if (!specimenId) {
            setTraceData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        setAlertMessage(null);
        try {
            const data = await fetchSampleOriginTrace(specimenId);
            setTraceData(data);
            if (!data) {
                setAlertMessage({ type: "warning", text: `Không tìm thấy dữ liệu truy xuất cho mã mẫu "${specimenId}".` });
            }
        } catch (err) {
            console.error("Failed to load specimen trace:", err);
            setTraceData(null);
            setAlertMessage({ type: "danger", text: "Không thể tải chuỗi hành trình mẫu bệnh phẩm." });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadRecent = async () => {
            const list = await fetchRecentTraceableSpecimens();
            setRecentSpecimens(Array.isArray(list) ? list : []);
        };
        loadRecent();
    }, []);

    useEffect(() => {
        loadTrace(currentSpecimenId);
    }, [currentSpecimenId, loadTrace]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmed = searchInput.trim();
        if (!trimmed) return;
        setCurrentSpecimenId(trimmed);
        setSearchParams({ specimenId: trimmed });
    };

    const handleExportPdf = async () => {
        if (!currentSpecimenId) return;
        setExporting(true);
        try {
            const pdfData = await exportTracePdf(currentSpecimenId);
            if (pdfData?.base64Data) {
                const byteCharacters = atob(pdfData.base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "text/html;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = pdfData.fileDownloadName || `BMS_TruyXuat_${currentSpecimenId}.html`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                setAlertMessage({
                    type: "success",
                    text: `Đã xuất báo cáo chuỗi hành trình mẫu thành công${pdfData.verificationHash ? ` (Mã kiểm chứng: ${pdfData.verificationHash.substring(0, 16)}...)` : "."}`
                });
            }
        } catch (err) {
            console.error("Export error:", err);
            setAlertMessage({
                type: "danger",
                text: "Không thể xuất báo cáo truy xuất nguồn gốc mẫu."
            });
        } finally {
            setExporting(false);
        }
    };

    const getNodeStyle = (badgeType) => {
        switch (badgeType) {
            case "patient":
                return { borderColor: "#6929c4", backgroundColor: "#f4f0fb", titleColor: "#6929c4" };
            case "doctor":
            case "order":
                return { borderColor: "#0f62fe", backgroundColor: "#edf5ff", titleColor: "#0f62fe" };
            case "warn":
                return { borderColor: "#f1c21b", backgroundColor: "#fcf8e3", titleColor: "#b28600" };
            case "err":
                return { borderColor: "#da1e28", backgroundColor: "#fff1f1", titleColor: "#da1e28" };
            case "ok":
                return { borderColor: "#24a148", backgroundColor: "#defbe6", titleColor: "#24a148" };
            default:
                return { borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", titleColor: "#475569" };
        }
    };

    const firstRowNodes = (traceData?.nodes || []).slice(0, 4);
    const secondRowNodes = (traceData?.nodes || []).slice(4);

    return (
        <div className="w-100 py-1">

            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">Truy xuất nguồn gốc mẫu bệnh phẩm</h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Kiểm tra toàn bộ chuỗi hành trình, thiết bị phân tích, lô hóa chất và lịch sử bảo quản mẫu.
                    </p>
                </div>
                <div className="bms-page-actions">
                    <Link
                        to="/lab/queue"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1 text-nowrap"
                    >
                        <TestTube2  size="1em"/> Hàng đợi mẫu
                    </Link>
                    {traceData && (
                        <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1 text-nowrap"
                            onClick={handleExportPdf}
                            disabled={exporting || loading}
                        >
                            <Download  size="1em"/>
                            {exporting ? "Đang tạo báo cáo..." : "Xuất báo cáo truy xuất"}
                        </button>
                    )}
                </div>
            </div>

            <form onSubmit={handleSearchSubmit} className="bms-filter-bar mb-3">
                <div className="bms-search-input-pill">
                    <Barcode className="bms-search-icon"  size="1em"/>
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
                            onClick={() => {
                                setSearchInput("");
                                setCurrentSpecimenId("");
                                setTraceData(null);
                                setSearchParams({});
                            }}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
                <button
                    className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1 text-nowrap"
                    style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                    type="submit"
                >
                    <LucideSearch  size="1em"/> Truy xuất
                </button>

                {recentSpecimens.length > 0 && (
                    <div className="d-flex align-items-center gap-1.5 flex-wrap">
                        <span className="text-muted small">Gần đây:</span>
                        {recentSpecimens.slice(0, 3).map((s) => (
                            <button
                                key={s.specimenId}
                                type="button"
                                className="btn btn-sm btn-outline-secondary py-0 px-2.5 font-monospace rounded-pill"
                                onClick={() => {
                                    setSearchInput(s.specimenId);
                                    setCurrentSpecimenId(s.specimenId);
                                    setSearchParams({ specimenId: s.specimenId });
                                }}
                            >
                                {s.specimenId}
                            </button>
                        ))}
                    </div>
                )}

                <span className="bms-filter-meta">
                    {currentSpecimenId ? <>Mã đang tra: <strong>{currentSpecimenId}</strong></> : "Chưa chọn mẫu"}
                </span>
            </form>

            {alertMessage && (
                <div className={`alert alert-${alertMessage.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4 rounded-3 shadow-sm`} role="alert">
                    {alertMessage.type === "success" ? <CheckCircle2  size="1em"/> : <AlertTriangle  size="1em"/>}
                    <div>{alertMessage.text}</div>
                    <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
                </div>
            )}

            {loading ? (
                <div className="card shadow-sm rounded-4 p-5 text-center" style={{ border: "1px solid #E2E8F0" }}>
                    <div className="spinner-border spinner-border-sm text-primary mx-auto mb-2" role="status"></div>
                    <div className="text-muted small">Đang tải sơ đồ truy xuất nguồn gốc mẫu bệnh phẩm...</div>
                </div>
            ) : !traceData ? (
                <div className="card shadow-sm rounded-4 p-5 text-center" style={{ border: "1px solid #E2E8F0" }}>
                    <FlaskConical className="text-muted opacity-50 fs-1 mx-auto mb-3"  size="1em"/>
                    <h5 className="fw-bold text-secondary mb-2">Chưa có dữ liệu truy xuất mẫu</h5>
                    <p className="text-muted small mb-0">
                        Vui lòng quét mã vạch hoặc nhập mã mẫu bệnh phẩm ở thanh tìm kiếm phía trên để xem sơ đồ hành trình và chuỗi bảo quản.
                    </p>
                </div>
            ) : (
                <div className="row g-4">

                    <div className="col-lg-8">
                        <div className="card shadow-sm h-100 rounded-4" style={{ border: "1px solid #E2E8F0" }}>
                            <div className="card-header py-3 px-4 border-bottom d-flex align-items-center justify-content-between" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                                <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                                    <FlaskConical className="text-primary"  size="1em"/>
                                    Sơ đồ hành trình mẫu — <span className="font-monospace text-primary">{traceData.specimenId || currentSpecimenId}</span>
                                </h5>
                                {traceData.orderId && (
                                    <span className="badge bg-light text-secondary border rounded-pill px-3 py-1.5 font-monospace">
                                        Phiếu chỉ định: {traceData.orderId}
                                    </span>
                                )}
                            </div>

                            <div className="card-body p-4">

                                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
                                    {firstRowNodes.map((node, index) => {
                                        const style = getNodeStyle(node.badgeType);
                                        return (
                                            <React.Fragment key={index}>
                                                <div
                                                    className="p-3 text-center rounded-3 shadow-sm"
                                                    style={{
                                                        minWidth: 140,
                                                        flex: 1,
                                                        border: `1px solid ${style.borderColor}`,
                                                        backgroundColor: style.backgroundColor
                                                    }}
                                                >
                                                    <div className="text-uppercase fw-bold" style={{ fontSize: 10, color: style.titleColor }}>
                                                        {node.nodeType}
                                                    </div>
                                                    <div className="fw-bold text-dark mt-1 text-truncate" style={{ fontSize: 13 }}>
                                                        {node.title}
                                                    </div>
                                                    <div className="text-muted font-monospace text-truncate" style={{ fontSize: 11 }}>
                                                        {node.subtitle}
                                                    </div>
                                                </div>
                                                {index < firstRowNodes.length - 1 && (
                                                    <ArrowRight className="text-muted d-none d-md-block" style={{ fontSize: 14 }}  size="1em"/>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>

                                {secondRowNodes.length > 0 && (
                                    <>
                                        <div className="text-center py-2 text-muted">
                                            <ArrowDown style={{ fontSize: 18 }}  size="1em"/>
                                        </div>

                                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
                                            {secondRowNodes.map((node, index) => {
                                                const style = getNodeStyle(node.badgeType);
                                                return (
                                                    <React.Fragment key={index}>
                                                        <div
                                                            className="p-3 text-center rounded-3 shadow-sm"
                                                            style={{
                                                                minWidth: 140,
                                                                flex: 1,
                                                                border: `1px solid ${style.borderColor}`,
                                                                backgroundColor: style.backgroundColor
                                                            }}
                                                        >
                                                            <div className="text-uppercase fw-bold" style={{ fontSize: 10, color: style.titleColor }}>
                                                                {node.nodeType}
                                                            </div>
                                                            <div className="fw-bold text-dark mt-1 text-truncate" style={{ fontSize: 13 }}>
                                                                {node.title}
                                                            </div>
                                                            <div className="text-muted font-monospace text-truncate" style={{ fontSize: 11 }}>
                                                                {node.subtitle}
                                                            </div>
                                                        </div>
                                                        {index < secondRowNodes.length - 1 && (
                                                            <ArrowRight className="text-muted d-none d-md-block" style={{ fontSize: 14 }}  size="1em"/>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card shadow-sm h-100 rounded-4" style={{ border: "1px solid #E2E8F0" }}>
                            <div className="card-header py-3 px-4 border-bottom" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                                <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                                    <CheckCircle2 className="text-primary"  size="1em"/>
                                    Chuỗi bảo quản &amp; Kiểm soát mẫu
                                </h5>
                            </div>

                            <div className="card-body p-4">
                                <ul className="list-group list-group-flush small">
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Tính toàn vẹn</span>
                                        <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 rounded-pill fw-semibold">
                                            {CUSTODY_INTEGRITY_LABELS[traceData.custody?.integrity] || traceData.custody?.integrity || "Đã xác thực"}
                                        </span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Số lượt quét mã vạch</span>
                                        <span className="fw-bold font-monospace">{traceData.custody?.barcodeScansCount ?? 0} sự kiện</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Vận chuyển mẫu</span>
                                        <span className="fw-bold text-end">{String(traceData.custody?.transportDuration || "—").replace(/\u2192/g, "đến")}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Máy phân tích</span>
                                        <span className="fw-semibold text-dark">{traceData.custody?.analyzerModel || "—"}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Lô hóa chất</span>
                                        <span className="font-monospace fw-semibold">{traceData.custody?.reagentLot || "—"}</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Trạng thái nội kiểm QC</span>
                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1 rounded-pill fw-semibold">
                                            {traceData.custody?.qcStatus || "Đạt chuẩn"}
                                        </span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Số lần chạy lại</span>
                                        <span className="fw-bold">{traceData.custody?.rerunCount ?? 0} lần</span>
                                    </li>
                                    <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                        <span className="text-muted">Ghi chú kỹ thuật</span>
                                        <span className="fw-bold">{traceData.custody?.notesCount ?? 0} bản ghi</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="card-footer bg-light p-3 border-top">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary w-100 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2"
                                    onClick={handleExportPdf}
                                    disabled={exporting || loading}
                                >
                                    <Download  size="1em"/>
                                    {exporting ? "Đang tạo chứng thư..." : "Xuất báo cáo truy xuất (PDF)"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
