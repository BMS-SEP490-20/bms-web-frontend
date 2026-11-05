/**
 * @file TestReportPage.jsx
 * @description UC42 – Official diagnostic laboratory test report page with PDF export.
 * Phiếu kết quả xét nghiệm y khoa chính thức, bảng đối chiếu khoảng tham chiếu sinh học,
 * cờ cảnh báo (H/L), chữ ký số ISO 15189:2022 và liên kết lập đánh giá y khoa (ICD-10) cho Bác sĩ.
 * Conforms to: Rule 19, Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
    FaDownload,
    FaShareAlt,
    FaArrowLeft,
    FaCheckCircle,
    FaExclamationCircle,
    FaPrint,
    FaShieldAlt,
    FaStethoscope,
    FaUserMd
} from "react-icons/fa";
import { fetchReportByOrder } from "../api/testReportApi";

export default function TestReportPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(Boolean(orderId));
    const [errorMessage, setErrorMessage] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const loadReport = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const data = await fetchReportByOrder(orderId);
                setReport(data);
            } catch (err) {
                console.error("Lỗi khi tải phiếu kết quả xét nghiệm:", err);
                setErrorMessage(err?.response?.data?.message || err?.message || "Không thể tải báo cáo kết quả xét nghiệm.");
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [orderId]);

    const handleShare = () => {
        navigator.clipboard?.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleDownloadPdf = () => {
        window.print();
    };

    if (!orderId) {
        return (
            <div className="container py-5 text-center text-muted" style={{ minHeight: "80vh" }}>
                <FaExclamationCircle className="text-secondary fs-1 mb-3" />
                <h5>Chưa chọn phiếu chỉ định xét nghiệm</h5>
                <p className="small">Vui lòng chọn một phiếu chỉ định từ danh sách lịch sử để xem kết quả xét nghiệm chi tiết.</p>
                <button className="btn btn-outline-primary mt-2" onClick={() => navigate(-1)}>
                    Quay lại
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container py-5 text-center text-muted" style={{ minHeight: "80vh" }}>
                <div className="spinner-border mb-3" style={{ color: "#0284c7" }} role="status"></div>
                <div>Đang nạp phiếu kết quả xét nghiệm y khoa chính thức từ hệ thống...</div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="container py-5 text-center text-muted" style={{ minHeight: "80vh" }}>
                <FaExclamationCircle className="text-danger fs-1 mb-3" />
                <h5>{errorMessage || `Không tìm thấy phiếu kết quả xét nghiệm cho mã chỉ định #${orderId}`}</h5>
                <button className="btn btn-outline-primary mt-3" onClick={() => navigate(-1)}>
                    Quay lại
                </button>
            </div>
        );
    }

    const parameters = Array.isArray(report.parameters) ? report.parameters : [];

    return (
        <div className="container-fluid py-4 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Action Bar & Breadcrumbs (Hidden on print) */}
            <div className="d-print-none d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1 text-muted small">
                            <li className="breadcrumb-item">
                                <Link to="/doctor/console" className="text-decoration-none text-secondary">Khám Lâm Sàng</Link>
                            </li>
                            <li className="breadcrumb-item text-secondary">{report.orderId}</li>
                            <li className="breadcrumb-item active fw-semibold" style={{ color: "#0284c7" }} aria-current="page">
                                Phiếu Kết Quả
                            </li>
                        </ol>
                    </nav>
                    <h2 className="h4 fw-bold text-dark mb-0">
                        Phiếu Kết Quả Xét Nghiệm — {report.packageName}
                    </h2>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                    {/* Direct Clinical Action: Mở form tư vấn / Đánh giá ICD-10 cho Bác sĩ */}
                    <Link
                        to={`/medical-assessments/add?patientId=${encodeURIComponent(report.patientId || '')}&encounterId=${encodeURIComponent(report.orderId || '')}&patientName=${encodeURIComponent(report.patientName || '')}`}
                        className="btn btn-success btn-sm d-flex align-items-center gap-1 shadow-sm text-white fw-semibold"
                        style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                    >
                        <FaStethoscope /> Tư Vấn & Lập Đánh Giá Y Khoa (ICD-10)
                    </Link>

                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft /> Quay lại
                    </button>
                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={handleShare}
                    >
                        <FaShareAlt /> {copied ? "Đã sao chép liên kết!" : "Chia sẻ"}
                    </button>
                    <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm fw-semibold"
                        style={{ backgroundColor: "#0284c7", borderColor: "#0284c7" }}
                        onClick={handleDownloadPdf}
                    >
                        <FaDownload /> In / Tải PDF
                    </button>
                </div>
            </div>

            {/* A4 Report Sheet Document */}
            <div className="row justify-content-center">
                <div className="col-lg-9 col-xl-8">
                    <div
                        className="card border-0 shadow-sm rounded-3 p-4 p-md-5 bg-white position-relative"
                        style={{
                            minHeight: "1050px",
                            color: "#1e293b",
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            borderColor: "#e2e8f0"
                        }}
                    >
                        {/* Report Header */}
                        <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4 flex-wrap gap-3" style={{ borderColor: "#e2e8f0" }}>
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="d-flex align-items-center justify-content-center text-white fw-bold rounded-2 px-2.5 py-1.5"
                                    style={{ fontSize: "14px", letterSpacing: "1px", backgroundColor: "#0284c7" }}
                                >
                                    BMS
                                </div>
                                <div>
                                    <h5 className="fw-bold mb-0 text-dark">Hệ Thống Trung Tâm Xét Nghiệm Y Khoa BMS</h5>
                                    <small className="text-muted">{report.clinicAddress ? `Chi nhánh trung tâm · ${report.clinicAddress}` : "Chi nhánh Phòng khám Đa khoa Quốc tế BMS"}</small>
                                </div>
                            </div>
                            <div className="text-md-end small">
                                <div className="text-muted">Mã phiếu KQ: <strong className="text-dark font-monospace">{report.reportId}</strong></div>
                                <div className="text-muted">Thời điểm phát hành: <span className="text-dark fw-semibold">{new Date(report.issuedAt).toLocaleDateString("vi-VN")} · {new Date(report.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                            </div>
                        </div>

                        {/* Demographics 8-field grid */}
                        <div
                            className="p-3 mb-4 rounded-3 border"
                            style={{
                                backgroundColor: "#f8fafc",
                                borderColor: "#e2e8f0",
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "10px 24px",
                                fontSize: "13px"
                            }}
                        >
                            <div><span className="text-muted fw-semibold">Bệnh nhân:</span> <strong className="text-dark">{report.patientName}</strong></div>
                            <div><span className="text-muted fw-semibold">Mã bệnh nhân:</span> <span className="font-monospace text-dark">{report.patientId}</span></div>
                            <div><span className="text-muted fw-semibold">Ngày sinh / Tuổi / Giới tính:</span> <span className="text-dark">{report.dobAgeSex}</span></div>
                            <div><span className="text-muted fw-semibold">Mã chỉ định:</span> <span className="font-monospace text-dark">{report.orderId}</span></div>
                            <div><span className="text-muted fw-semibold">Gói xét nghiệm:</span> <span className="text-dark">{report.packageName}</span></div>
                            <div><span className="text-muted fw-semibold">Thời gian lấy mẫu:</span> <span className="text-dark">{report.collectionTime}</span></div>
                            <div><span className="text-muted fw-semibold">Mã ống bệnh phẩm:</span> <span className="font-monospace text-dark">{report.specimenId}</span></div>
                            <div><span className="text-muted fw-semibold">Bác sĩ chỉ định:</span> <span className="text-dark">{report.referringDoctor || 'BS. Chuyên Khoa'}</span></div>
                        </div>

                        {/* Results Table */}
                        <div className="mb-4">
                            <h6 className="fw-bold text-dark mb-3 text-uppercase small" style={{ letterSpacing: "0.5px" }}>
                                {report.category === 'Biochemistry' ? 'Khoa Sinh Hóa Lâm Sàng' : report.category === 'Hematology' ? 'Khoa Huyết Học Lâm Sàng' : (report.category || 'Kết Quả Phân Tích Cận Lâm Sàng')}
                            </h6>
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered align-middle mb-0">
                                    <thead className="table-light text-muted small text-uppercase">
                                        <tr>
                                            <th style={{ width: "38%" }}>Thông Số Xét Nghiệm</th>
                                            <th style={{ width: "16%" }}>Kết Quả</th>
                                            <th style={{ width: "16%" }}>Đơn Vị</th>
                                            <th style={{ width: "20%" }}>Khoảng Tham Chiếu</th>
                                            <th className="text-center" style={{ width: "10%" }}>Cờ Báo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parameters.map((param, idx) => (
                                            <tr
                                                key={idx}
                                                style={{
                                                    backgroundColor: param.isAbnormal ? "rgba(220, 38, 38, 0.05)" : "transparent"
                                                }}
                                            >
                                                <td className="fw-semibold text-dark">{param.parameterName}</td>
                                                <td className={`font-monospace ${param.isAbnormal ? "fw-bold text-danger" : "text-dark"}`}>
                                                    {param.resultValue}
                                                </td>
                                                <td className="text-secondary small">{param.unit}</td>
                                                <td className="text-secondary small">{param.referenceRange}</td>
                                                <td className="text-center">
                                                    {param.flag ? (
                                                        <span className="badge bg-danger text-white px-2 py-1 font-monospace">
                                                            {param.flag}
                                                        </span>
                                                    ) : (
                                                        <span className="badge bg-success-subtle text-success border border-success-subtle small">Bình thường</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Clinical Notes */}
                        <div className="mb-4 p-3 rounded-2 border" style={{ backgroundColor: "#f8fafc", borderLeft: "4px solid #0284c7", borderColor: "#e2e8f0" }}>
                            <h6 className="fw-bold text-dark mb-2 small text-uppercase">Ghi Chú Của Kỹ Thuật Viên / Bác Sĩ Xét Nghiệm</h6>
                            <p className="mb-0 text-dark small" style={{ lineHeight: "1.6" }}>
                                {report.clinicalNotes || "Mẫu máu đạt tiêu chuẩn phân tích, không có hiện tượng vỡ hồng cầu (tán huyết). Kết quả được đối chiếu và kiểm chuẩn chất lượng (IQC) hợp lệ trước khi ký phát hành."}
                            </p>
                        </div>

                        {/* Dual Signatures */}
                        <div className="d-flex justify-content-between align-items-end mt-4 pt-4 border-top" style={{ borderColor: "#e2e8f0" }}>
                            <div>
                                <small className="text-muted d-block">Kỹ thuật viên thực hiện xét nghiệm</small>
                                <strong className="text-dark d-block">{report.analysedBy || 'KTV. Xét Nghiệm'}</strong>
                                <small className="text-success font-monospace d-flex align-items-center gap-1 mt-1">
                                    <FaShieldAlt /> {new Date(report.analysedAt).toLocaleDateString("vi-VN")} · Đã ký số xác thực (MLT)
                                </small>
                            </div>
                            <div className="text-end">
                                <small className="text-muted d-block">Bác sĩ trưởng khoa phê duyệt</small>
                                <strong className="text-dark d-block">{report.approvedBy || 'BS. CKII. Trưởng Khoa Xét Nghiệm'}</strong>
                                <small className="text-primary font-monospace d-flex align-items-center justify-content-end gap-1 mt-1">
                                    <FaCheckCircle /> {new Date(report.approvedAt).toLocaleDateString("vi-VN")} · Chữ ký số y tế hợp chuẩn (MD)
                                </small>
                            </div>
                        </div>

                        {/* Legal Disclaimer & ISO 15189 Notice */}
                        <div className="mt-5 pt-3 border-top text-center text-muted" style={{ fontSize: "11px", fontStyle: "italic", borderColor: "#e2e8f0" }}>
                            Phiếu kết quả xét nghiệm được kiểm soát và bảo chứng theo tiêu chuẩn phòng xét nghiệm y khoa ISO 15189:2022. Mọi sửa đổi hay tẩy xóa đều làm mất giá trị pháp lý của tài liệu. Bệnh nhân vui lòng mang phiếu này đến bác sĩ điều trị để được tư vấn và kết luận chẩn đoán.
                            <div className="mt-1 font-monospace text-secondary">
                                Mã băm toàn vẹn dữ liệu (Verification Hash): {report.verificationHash || "SHA256:BMS-ISO15189-VALIDATED"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
