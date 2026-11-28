/**
 * @file SampleRerunPage.jsx
 * @description Laboratory sample rerun requisition and comparison page (UC47).
 * Matches clinical design specification in docs-output/screens/05-lab-user.html#uc47.
 * Conforms to: Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { RotateCw, ArrowLeft, AlertTriangle, CheckCircle2, Info, TestTube2, Microscope, Stethoscope, X } from 'lucide-react';
import TablePagination, { usePagination } from '../../../components/ui/TablePagination';
import {
    fetchOpenReruns,
    fetchSampleRerunDetails,
    submitSampleRerun
} from "../api/sampleRerunApi";

const RERUN_STATUS_LABELS = {
    New: "Mới tạo",
    Pending: "Chờ xử lý",
    InProgress: "Đang chạy máy",
    Completed: "Hoàn thành",
    RerunRequested: "Yêu cầu chạy lại"
};

const RERUN_REASON_LABELS = {
    "Delta check failed vs. previous result": "Chênh lệch Delta vượt ngưỡng so với lần đo trước",
    "QC flag triggered": "Cảnh báo nội kiểm QC",
    "Panic / critical value verification": "Kiểm chứng giá trị nguy kịch",
    "Instrument alert": "Cảnh báo kỹ thuật từ máy phân tích",
    "Sample integrity concern": "Nghi ngờ chất lượng mẫu bệnh phẩm",
    "Physician request": "Yêu cầu từ bác sĩ lâm sàng"
};

export default function SampleRerunPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetSampleId = searchParams.get("sampleId") || "";

    const currentUser = React.useMemo(() => {
        try {
            const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user") || localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    const requestedBy = currentUser?.fullName || currentUser?.name || currentUser?.username || "";

    const [sampleDetails, setSampleDetails] = useState(null);

    const [reason, setReason] = useState("Delta check failed vs. previous result");
    const [selectedParameters, setSelectedParameters] = useState(new Set());
    const [analyzerTarget, setAnalyzerTarget] = useState("Same analyzer");
    const [priority, setPriority] = useState("Routine rerun");
    const [notes, setNotes] = useState("");

    const [openReruns, setOpenReruns] = useState([]);
    const rerunPag = usePagination(openReruns, 8);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const [reruns, details] = await Promise.all([
                    fetchOpenReruns(),
                    targetSampleId ? fetchSampleRerunDetails(targetSampleId) : Promise.resolve(null)
                ]);
                setOpenReruns(Array.isArray(reruns) ? reruns : []);
                if (details) {
                    setSampleDetails(details);
                    if (details.availableParameters?.length > 0) {
                        setSelectedParameters(new Set([details.availableParameters[0]]));
                    }
                } else {
                    setSampleDetails(null);
                }
            } catch (err) {
                console.error("Failed to load rerun workstation data from backend:", err);
                setErrorMessage("Không thể kết nối cơ sở dữ liệu phòng xét nghiệm. Vui lòng kiểm tra máy chủ.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [targetSampleId]);

    const handleToggleParam = (param) => {
        const next = new Set(selectedParameters);
        if (next.has(param)) {
            next.delete(param);
        } else {
            next.add(param);
        }
        setSelectedParameters(next);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!sampleDetails) {
            setErrorMessage("Chưa có mẫu bệnh phẩm hợp lệ để tạo yêu cầu chạy lại.");
            return;
        }

        if (!requestedBy) {
            setErrorMessage("Yêu cầu đăng nhập tài khoản kỹ thuật viên xét nghiệm.");
            return;
        }

        if (selectedParameters.size === 0) {
            setErrorMessage("Vui lòng chọn ít nhất một chỉ số cần chạy lại.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const payload = {
                reason: reason,
                requestedBy: requestedBy,
                notes: notes,
                analyzer: analyzerTarget,
                priority: priority,
                parameters: Array.from(selectedParameters)
            };

            await submitSampleRerun(sampleDetails.sampleId, payload);
            setSuccessMessage(`Đã gửi yêu cầu chạy lại cho mẫu ${sampleDetails.barcode || sampleDetails.sampleId}. Trạng thái mẫu đã chuyển sang chờ phân tích lại.`);

            const updatedReruns = await fetchOpenReruns();
            setOpenReruns(Array.isArray(updatedReruns) ? updatedReruns : []);
        } catch (err) {
            console.error("Rerun submission failed:", err);
            setErrorMessage("Không thể gửi yêu cầu chạy lại mẫu. Vui lòng thử lại.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="w-100 py-1">

            <div className="bms-page-header-card mb-4">
                <div className="bms-page-header-content flex-column align-items-start">
                    <div className="bms-page-title-row">
                        <h1 className="bms-page-title">Yêu cầu chạy lại mẫu xét nghiệm</h1>
                    </div>
                    <p className="text-muted small m-0 mt-1">
                        Lập phiếu phân tích lại mẫu bệnh phẩm và đối chiếu chênh lệch kết quả giữa các lần đo.
                    </p>
                </div>
                <div className="bms-page-actions">
                    <Link
                        to="/lab/queue"
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 rounded-pill px-3 text-nowrap"
                    >
                        <TestTube2  size="1em"/> Hàng đợi mẫu
                    </Link>
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-1 rounded-pill px-3 text-nowrap"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft  size="1em"/> Quay lại
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
                    <div className="d-flex align-items-center gap-2">
                        <CheckCircle2 className="text-success fs-5 flex-shrink-0"  size="1em"/>
                        <div>{successMessage}</div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-success rounded-pill px-3 text-nowrap"
                        onClick={() => setSuccessMessage("")}
                    >
                        Đóng
                    </button>
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-3">
                    <AlertTriangle className="text-danger fs-5 flex-shrink-0"  size="1em"/>
                    <div>{errorMessage}</div>
                </div>
            )}

            {loading ? (
                <div className="card border-0 shadow-sm rounded-4 p-4 text-center my-4" style={{ border: "1px solid #E2E8F0" }}>
                    <div className="spinner-border spinner-border-sm text-primary mx-auto mb-2" role="status"></div>
                    <p className="text-muted small mb-0">Đang tải thông tin mẫu bệnh phẩm và danh sách yêu cầu chạy lại...</p>
                </div>
            ) : (
                <div className="row g-4">

                    <div className="col-lg-7">
                        {!sampleDetails ? (
                            <div className="card shadow-sm rounded-4 p-5 text-center h-100 d-flex flex-column justify-content-center" style={{ border: "1px solid #E2E8F0" }}>
                                <AlertTriangle className="text-warning fs-1 mx-auto mb-3 opacity-75"  size="1em"/>
                                <h5 className="fw-bold text-dark">Không tìm thấy mẫu bệnh phẩm</h5>
                                <p className="text-muted small mb-4">
                                    {targetSampleId
                                        ? `Không tìm thấy hồ sơ mẫu bệnh phẩm khớp với mã "${targetSampleId}" trong cơ sở dữ liệu.`
                                        : "Chưa chọn mẫu bệnh phẩm cụ thể để lập phiếu chạy lại. Vui lòng chọn mẫu từ hàng đợi phòng xét nghiệm."}
                                </p>
                                <div>
                                    <Link to="/lab/queue" className="btn btn-primary btn-sm rounded-pill px-4 d-inline-flex align-items-center gap-2 text-nowrap" style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}>
                                        <TestTube2  size="1em"/> Mở hàng đợi mẫu xét nghiệm
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="card shadow-sm rounded-4" style={{ border: "1px solid #E2E8F0" }}>
                                <div className="card-header py-3 px-4 border-bottom" style={{ backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }}>
                                    <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                                        <RotateCw style={{ color: "#1E60E6" }}  size="1em"/> Phiếu yêu cầu chạy lại mẫu — <span className="font-monospace" style={{ color: "#1E60E6" }}>{sampleDetails.barcode || sampleDetails.sampleId}</span>
                                    </h5>
                                </div>
                                <div className="card-body p-4">

                                    <div
                                        className="p-3 mb-4 rounded-4 border"
                                        style={{
                                            backgroundColor: "#F8FAFC",
                                            borderColor: "#E2E8F0",
                                            display: "grid",
                                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                            gap: "8px 16px",
                                            fontSize: "13px"
                                        }}
                                    >
                                        <div>
                                            <span className="text-muted fw-semibold">Bệnh nhân:</span>{" "}
                                            <strong className="text-dark">{sampleDetails.patientName}</strong> · <span className="text-secondary font-monospace">{sampleDetails.patientId}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted fw-semibold">Kết quả hiện tại:</span>{" "}
                                            <strong className="text-danger font-monospace" style={{ fontVariantNumeric: "tabular-nums" }}>{sampleDetails.currentResult}</strong>{" "}
                                            {sampleDetails.flag && (
                                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-0.5 rounded-pill font-monospace">{sampleDetails.flag}</span>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-muted fw-semibold">Máy phân tích:</span>{" "}
                                            <span className="text-dark font-monospace">{sampleDetails.analyzer}</span>
                                        </div>
                                        <div>
                                            <span className="text-muted fw-semibold">Lần đo đầu:</span>{" "}
                                            <span className="text-dark font-monospace">{sampleDetails.firstRunTime}</span>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark small">
                                            Lý do yêu cầu chạy lại <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            className="form-select"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                        >
                                            <option value="Delta check failed vs. previous result">Chênh lệch Delta vượt ngưỡng so với kết quả trước</option>
                                            <option value="QC flag triggered">Cảnh báo nội kiểm QC</option>
                                            <option value="Panic / critical value verification">Kiểm chứng giá trị nguy kịch</option>
                                            <option value="Instrument alert">Cảnh báo kỹ thuật từ máy phân tích</option>
                                            <option value="Sample integrity concern">Nghi ngờ chất lượng mẫu bệnh phẩm</option>
                                            <option value="Physician request">Yêu cầu từ bác sĩ lâm sàng</option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold text-dark small">Chỉ số cần phân tích lại</label>
                                        <div className="d-flex gap-3 flex-wrap p-3 border rounded-3 bg-light">
                                            {(sampleDetails.availableParameters || []).map((param) => (
                                                <div key={param} className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input"
                                                        id={`param-${param}`}
                                                        checked={selectedParameters.has(param)}
                                                        onChange={() => handleToggleParam(param)}
                                                    />
                                                    <label className="form-check-label small text-dark" htmlFor={`param-${param}`}>
                                                        {param}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-dark small">Thiết bị thực hiện chạy lại</label>
                                            <select
                                                className="form-select"
                                                value={analyzerTarget}
                                                onChange={(e) => setAnalyzerTarget(e.target.value)}
                                            >
                                                <option value="Same analyzer">Cùng máy phân tích ban đầu</option>
                                                <option value="Backup analyzer">Máy phân tích dự phòng</option>
                                                <option value="Reference instrument">Thiết bị đối chiếu chuẩn</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold text-dark small">Mức độ ưu tiên</label>
                                            <select
                                                className="form-select"
                                                value={priority}
                                                onChange={(e) => setPriority(e.target.value)}
                                            >
                                                <option value="Routine rerun">Chạy lại thường quy</option>
                                                <option value="High (delta verification)">Ưu tiên cao (kiểm chứng Delta)</option>
                                                <option value="STAT (critical flag)">Cấp cứu khẩn (kiểm chứng giá trị nguy kịch)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="form-label fw-semibold text-dark small">Ghi chú kỹ thuật cho vận hành viên</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Nhập lý do chuyên môn, chi tiết đối chiếu Delta hoặc ghi chú cảnh báo QC..."
                                        />
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn d-inline-flex align-items-center gap-2 fw-semibold px-4 shadow-sm text-white rounded-pill text-nowrap"
                                            style={{ backgroundColor: "#1E60E6", borderColor: "#1E60E6" }}
                                            disabled={submitting}
                                            onClick={handleSubmit}
                                        >
                                            <RotateCw  size="1em"/> {submitting ? "Đang gửi yêu cầu..." : "Gửi yêu cầu chạy lại"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary rounded-pill px-4 text-nowrap"
                                            onClick={() => navigate(-1)}
                                        >
                                            Hủy bỏ
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="col-lg-5">

                        <section className="bms-table-standalone-section mb-4">
                            <div className="bms-table-standalone-header">
                                <div>
                                    <h2 className="bms-table-standalone-title">Yêu cầu chạy lại đang mở</h2>
                                    <p className="bms-table-standalone-subtitle">Các mẫu đang chờ phân tích kiểm chứng tại phòng xét nghiệm</p>
                                </div>
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1">
                                    {openReruns.length} đang xử lý
                                </span>
                            </div>
                            <div className="bms-table-standalone-body">
                                <table className="table table-hover align-middle mb-0 table-sm">
                                    <thead className="table-light text-muted small text-uppercase">
                                        <tr>
                                            <th className="ps-3">Mã mẫu</th>
                                            <th>Bệnh nhân</th>
                                            <th>Chỉ số</th>
                                            <th>Lý do</th>
                                            <th className="text-end pe-3">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {openReruns.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4 text-muted small">
                                                    Hiện không có yêu cầu chạy lại nào đang chờ xử lý.
                                                </td>
                                            </tr>
                                        ) : (
                                            rerunPag.paginatedItems.map((r, idx) => (
                                                <tr key={idx}>
                                                    <td className="ps-3">
                                                        <code className="text-primary fw-semibold small bg-light px-1.5 py-0.5 rounded">
                                                            {r.specimenId}
                                                        </code>
                                                    </td>
                                                    <td className="fw-semibold text-dark small">{r.patientName}</td>
                                                    <td><span className="badge bg-light text-dark border rounded-pill">{r.parameter}</span></td>
                                                    <td className="text-secondary small">{RERUN_REASON_LABELS[r.reason] || r.reason}</td>
                                                    <td className="text-end pe-3">
                                                        <span className={`badge rounded-pill ${
                                                            r.status === "New"
                                                                ? "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                                                                : "bg-info-subtle text-info-emphasis border border-info-subtle"
                                                        }`}>
                                                            {RERUN_STATUS_LABELS[r.status] || r.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                <TablePagination
                                    page={rerunPag.page}
                                    totalPages={rerunPag.totalPages}
                                    totalItems={rerunPag.totalItems}
                                    pageSize={rerunPag.pageSize}
                                    onPageChange={rerunPag.setPage}
                                    onPageSizeChange={rerunPag.setPageSize}
                                    pageSizeOptions={[8, 15, 30]}
                                    itemLabel="yêu cầu chạy lại"
                                    compact
                                />
                            </div>
                        </section>

                        {sampleDetails && (
                            <section className="bms-table-standalone-section">
                                <div className="bms-table-standalone-header">
                                    <div>
                                        <h2 className="bms-table-standalone-title">Đối chiếu kết quả gốc và chạy lại</h2>
                                        <p className="bms-table-standalone-subtitle">Kết quả chạy lại sẽ tự động cập nhật sau khi máy phân tích hoàn tất</p>
                                    </div>
                                </div>
                                <div className="bms-table-standalone-body">
                                    <table className="table table-sm align-middle mb-0">
                                        <thead className="table-light text-muted small text-uppercase">
                                            <tr>
                                                <th className="ps-3">Chỉ số</th>
                                                <th className="text-end">Lần đầu</th>
                                                <th className="text-end">Chạy lại</th>
                                                <th className="text-end pe-3">Chênh lệch</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const matchedReq = (rerunRequests || []).find((r) =>
                                                    r.specimenId === sampleDetails.specimenId || r.specimenId === specimenIdInput
                                                );
                                                const origStr = matchedReq?.originalValue || sampleDetails.currentResult?.split("=")[1]?.trim() || "—";
                                                const rerunStr = matchedReq?.rerunValue || "";
                                                const n1 = parseFloat(String(origStr).replace(",", "."));
                                                const n2 = parseFloat(String(rerunStr).replace(",", "."));
                                                const diffText = rerunStr
                                                    ? (!Number.isNaN(n1) && !Number.isNaN(n2)
                                                        ? `${(n2 - n1) >= 0 ? "+" : ""}${(n2 - n1).toFixed(2)}`
                                                        : "Đã đối chiếu")
                                                    : "Chờ chạy lại";
                                                return (
                                                    <tr>
                                                        <td className="ps-3 fw-semibold text-dark">
                                                            {matchedReq?.parameter || sampleDetails.currentResult?.split("=")[0]?.trim() || "—"}
                                                        </td>
                                                        <td className="text-end font-monospace">{origStr}</td>
                                                        <td className="text-end font-monospace fw-bold text-primary">
                                                            {rerunStr || "—"}
                                                        </td>
                                                        <td className="text-end text-muted small pe-3 font-monospace">{diffText}</td>
                                                    </tr>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
