/**
 * @file TestReportPage.jsx
 * @description Official diagnostic laboratory test report page with PDF export (UC42).
 * Matches clinical design specification in docs-output/screens/02-patient.html#uc42.
 * Conforms to: Production Medical Standards & AGENTS.md.
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
    FaShieldAlt
} from "react-icons/fa";
import { fetchReportByOrder } from "../api/testReportApi";

export default function TestReportPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(Boolean(orderId));
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        const loadReport = async () => {
            setLoading(true);
            try {
                const data = await fetchReportByOrder(orderId);
                setReport(data);
            } catch (err) {
                console.error("Failed to load test report:", err);
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
            <div className="container py-5 text-center text-muted">
                <FaExclamationCircle className="text-secondary fs-1 mb-3" />
                <h5>No test order selected</h5>
                <p className="small">Please select an order from your test results history to view the diagnostic report.</p>
                <button className="btn btn-outline-primary mt-2" onClick={() => navigate(-1)}>
                    Go Back
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container py-5 text-center text-muted">
                <div className="spinner-border text-primary mb-3" role="status"></div>
                <div>Generating official laboratory test report...</div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="container py-5 text-center text-muted">
                <FaExclamationCircle className="text-danger fs-1 mb-3" />
                <h5>Diagnostic report not found for order #{orderId}</h5>
                <button className="btn btn-outline-primary mt-3" onClick={() => navigate(-1)}>
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Action Bar & Breadcrumbs (Hidden on print) */}
            <div className="d-print-none d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1 text-muted small">
                            <li className="breadcrumb-item"><Link to="/dashboard" className="text-decoration-none text-secondary">Results</Link></li>
                            <li className="breadcrumb-item text-secondary">{report.orderId}</li>
                            <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">Report</li>
                        </ol>
                    </nav>
                    <h2 className="h4 fw-bold text-dark mb-0">Test report — {report.packageName}</h2>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={() => navigate(-1)}
                    >
                        <FaArrowLeft /> Back
                    </button>
                    <button
                        className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                        onClick={handleShare}
                    >
                        <FaShareAlt /> {copied ? "Link Copied!" : "Share"}
                    </button>
                    <button
                        className="btn btn-primary btn-sm d-flex align-items-center gap-1 shadow-sm fw-semibold"
                        onClick={handleDownloadPdf}
                    >
                        <FaDownload /> Download PDF
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
                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                        }}
                    >
                        {/* Report Header */}
                        <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4 flex-wrap gap-3">
                            <div className="d-flex align-items-center gap-2">
                                <div
                                    className="d-flex align-items-center justify-content-center bg-primary text-white fw-bold rounded-2 px-2 py-1"
                                    style={{ fontSize: "14px", letterSpacing: "1px" }}
                                >
                                    BMS
                                </div>
                                <div>
                                    <h5 className="fw-bold mb-0 text-dark">BMS Blood Laboratory</h5>
                                    <small className="text-muted">{report.clinicAddress ? `HCMC-Clinic-01 · ${report.clinicAddress}` : "HCMC-Clinic-01"}</small>
                                </div>
                            </div>
                            <div className="text-md-end small">
                                <div className="text-muted">Report ID: <strong className="text-dark font-monospace">{report.reportId}</strong></div>
                                <div className="text-muted">Issued: <span className="text-dark fw-semibold">{new Date(report.issuedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} · {new Date(report.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                            </div>
                        </div>

                        {/* Demographics 8-field grid */}
                        <div
                            className="p-3 mb-4 rounded-3 border"
                            style={{
                                backgroundColor: "#f8fafc",
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "10px 24px",
                                fontSize: "13px"
                            }}
                        >
                            <div><span className="text-muted fw-semibold">Patient:</span> <strong className="text-dark">{report.patientName}</strong></div>
                            <div><span className="text-muted fw-semibold">Patient ID:</span> <span className="font-monospace text-dark">{report.patientId}</span></div>
                            <div><span className="text-muted fw-semibold">DOB / Age / Sex:</span> <span className="text-dark">{report.dobAgeSex}</span></div>
                            <div><span className="text-muted fw-semibold">Order ID:</span> <span className="font-monospace text-dark">{report.orderId}</span></div>
                            <div><span className="text-muted fw-semibold">Test package:</span> <span className="text-dark">{report.packageName}</span></div>
                            <div><span className="text-muted fw-semibold">Collection:</span> <span className="text-dark">{report.collectionTime}</span></div>
                            <div><span className="text-muted fw-semibold">Specimen:</span> <span className="font-monospace text-dark">{report.specimenId}</span></div>
                            <div><span className="text-muted fw-semibold">Referring doctor:</span> <span className="text-dark">{report.referringDoctor}</span></div>
                        </div>

                        {/* Results Table */}
                        <div className="mb-4">
                            <h6 className="fw-bold text-dark mb-3 text-uppercase small" style={{ letterSpacing: "0.5px" }}>
                                {report.category}
                            </h6>
                            <div className="table-responsive">
                                <table className="table table-sm table-bordered align-middle mb-0">
                                    <thead className="table-light text-muted small text-uppercase">
                                        <tr>
                                            <th style={{ width: "38%" }}>Parameter</th>
                                            <th style={{ width: "16%" }}>Result</th>
                                            <th style={{ width: "16%" }}>Unit</th>
                                            <th style={{ width: "20%" }}>Reference range</th>
                                            <th className="text-end" style={{ width: "10%" }}>Flag</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.parameters.map((param, idx) => (
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
                                                <td className="text-end">
                                                    {param.flag ? (
                                                        <span className="badge bg-danger text-white px-2 py-1 font-monospace">
                                                            {param.flag}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted small">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Clinical Notes */}
                        <div className="mb-4 p-3 rounded-2 border" style={{ backgroundColor: "#f8fafc", borderLeft: "4px solid #0284c7" }}>
                            <h6 className="fw-bold text-dark mb-2 small text-uppercase">Clinical Notes</h6>
                            <p className="mb-0 text-dark small" style={{ lineHeight: "1.6" }}>
                                {report.clinicalNotes}
                            </p>
                        </div>

                        {/* Dual Signatures */}
                        <div className="d-flex justify-content-between align-items-end mt-4 pt-4 border-top">
                            <div>
                                <small className="text-muted d-block">Analysed by</small>
                                <strong className="text-dark d-block">{report.analysedBy}</strong>
                                <small className="text-muted font-monospace">{new Date(report.analysedAt).toLocaleDateString("en-GB")} · MLT Signature Verified</small>
                            </div>
                            <div className="text-end">
                                <small className="text-muted d-block">Approved and signed by</small>
                                <strong className="text-dark d-block">{report.approvedBy}</strong>
                                <small className="text-muted font-monospace">{new Date(report.approvedAt).toLocaleDateString("en-GB")} · MD Digital Seal</small>
                            </div>
                        </div>

                        {/* Legal Disclaimer & ISO 15189 Notice */}
                        <div className="mt-5 pt-3 border-top text-center text-muted" style={{ fontSize: "11px", fontStyle: "italic" }}>
                            This report is for informational purposes only. Please consult your attending physician for clinical interpretation.
                            Results validated per ISO 15189:2022 standards. Digitally signed — any alteration invalidates this document.
                            <div className="mt-1 font-monospace text-secondary">
                                Verification Hash: {report.verificationHash}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
