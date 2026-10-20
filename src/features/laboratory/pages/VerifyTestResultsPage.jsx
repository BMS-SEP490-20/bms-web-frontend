/**
 * @file VerifyTestResultsPage.jsx
 * @description Technical laboratory verification interface (UC72 / Verify Test Results / Issue I3-074).
 * Matches clinical design specification in docs-output/screens/05-lab-user.html#uc72.
 * Conforms to: ISO 15189 Quality Standards, Production Engineering & AGENTS.md.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
    FaUndo
} from "react-icons/fa";
import {
    fetchVerificationQueue,
    fetchVerificationDetails,
    verifyTestResult,
    returnTestResult
} from "../api/testResultVerificationApi";

export default function VerifyTestResultsPage() {
    const navigate = useNavigate();
    const { specimenId: routeSpecimenId } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();

    const activeSpecimenId = routeSpecimenId || searchParams.get("specimenId") || "SPC-261006-A1-0089";

    // Authenticated user
    const currentUser = useMemo(() => {
        try {
            const raw = localStorage.getItem("user") || localStorage.getItem("bms_user");
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

    // Form inputs
    const [verifierComment, setVerifierComment] = useState(
        "Results verified. LDL confirmed on repeat at 3.95. QC flag QCF-1142 under investigation but does not affect this specimen's validity — Levey-Jennings within control for HDL/TC/TG. Ready for doctor approval."
    );

    // Modal state for Return for correction
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnReason, setReturnReason] = useState("");
    const [returnError, setReturnError] = useState("");

    // Load queue
    const loadQueue = useCallback(async () => {
        const items = await fetchVerificationQueue();
        setQueue(items);
    }, []);

    // Load details for current specimen
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
            console.error("Failed to load verification details:", err);
            setAlertMessage({ type: "danger", text: "Failed to load verification checklist." });
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

    // Handle Verify and Send to Doctor
    const handleVerify = async () => {
        if (!verifierComment || verifierComment.trim().length < 10) {
            setAlertMessage({
                type: "warning",
                text: "Verifier comment must be at least 10 characters long before approving."
            });
            return;
        }

        setSubmitting(true);
        setAlertMessage(null);
        try {
            const res = await verifyTestResult(selectedSpecimenId, {
                verifierComment: verifierComment.trim()
            });

            setVerificationData(res.data);
            setAlertMessage({
                type: "success",
                text: "Results technically verified! Specimen forwarded to doctor approval."
            });
            await loadQueue();
        } catch (err) {
            console.error("Verification error:", err);
            setAlertMessage({
                type: "danger",
                text: err.response?.data?.message || "Failed to submit verification. Please try again."
            });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Return for correction
    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        if (!returnReason || returnReason.trim().length < 10) {
            setReturnError("Please specify a reason of at least 10 characters.");
            return;
        }

        setSubmitting(true);
        setReturnError("");
        try {
            const res = await returnTestResult(selectedSpecimenId, {
                returnReason: returnReason.trim()
            });

            setVerificationData(res.data);
            setShowReturnModal(false);
            setReturnReason("");
            setAlertMessage({
                type: "info",
                text: "Specimen returned to laboratory technician for correction."
            });
            await loadQueue();
        } catch (err) {
            console.error("Return error:", err);
            setReturnError(err.response?.data?.message || "Failed to return specimen. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Format badge style for checklist status
    const renderStatusBadge = (status, statusType) => {
        const s = (status || "").toLowerCase();
        if (s === "flag" || statusType === "warn") {
            return (
                <span className="badge bg-warning text-dark px-2 py-1 rounded-pill fw-semibold">
                    <span className="me-1">●</span> Flag
                </span>
            );
        }
        if (s === "ok") {
            return (
                <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill fw-semibold">
                    <span className="me-1">●</span> OK
                </span>
            );
        }
        if (s === "confirmed") {
            return (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 rounded-pill fw-semibold">
                    <span className="me-1">●</span> Confirmed
                </span>
            );
        }
        return (
            <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded-pill fw-semibold">
                <span className="me-1">●</span> {status || "None"}
            </span>
        );
    };

    return (
        <div className="container-fluid py-4 px-md-5" style={{ maxWidth: 1400 }}>
            {/* Top Navigation & Breadcrumb */}
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="d-flex align-items-center gap-2 text-muted small">
                    <Link to="/laboratory" className="text-decoration-none text-muted">Laboratory</Link>
                    <span>/</span>
                    <span className="text-secondary">Workflow</span>
                    <span>/</span>
                    <span className="fw-semibold text-primary">Verify · {selectedSpecimenId}</span>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className="badge bg-light text-dark border px-3 py-2 d-flex align-items-center gap-2">
                        <span className="rounded-circle bg-success" style={{ width: 8, height: 8 }}></span>
                        <span>Shift AM · Verifier: <strong>{currentUser?.fullName || "Trần Minh Tuấn"}</strong></span>
                    </div>
                </div>
            </div>

            {/* Header */}
            <div className="row align-items-center mb-4">
                <div className="col-lg-8">
                    <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
                        <FaClipboardCheck className="text-primary" />
                        Verify test results
                    </h2>
                    <p className="text-muted mb-0">
                        Technical verification protocol before final doctor approval (ISO 15189 compliance)
                    </p>
                </div>
                <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                    <div className="d-inline-flex align-items-center gap-2 bg-white p-2 rounded border shadow-sm">
                        <label className="text-muted small fw-semibold mb-0">Specimen:</label>
                        <select
                            className="form-select form-select-sm border-0 bg-light"
                            style={{ width: "auto", minWidth: 200 }}
                            value={selectedSpecimenId}
                            onChange={(e) => handleSelectSpecimen(e.target.value)}
                        >
                            <option value="SPC-261006-A1-0089">SPC-261006-A1-0089 (Lipid Profile)</option>
                            {queue
                                .filter((q) => q.specimenId !== "SPC-261006-A1-0089")
                                .map((q) => (
                                    <option key={q.specimenId} value={q.specimenId}>
                                        {q.specimenId} — {q.packageName || "Specimen"} ({q.patientName || "Patient"})
                                    </option>
                                ))}
                        </select>
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            title="Refresh"
                            onClick={() => loadVerificationDetails(selectedSpecimenId)}
                        >
                            <FaSyncAlt />
                        </button>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {alertMessage && (
                <div className={`alert alert-${alertMessage.type} alert-dismissible fade show d-flex align-items-center gap-2 mb-4 shadow-sm`} role="alert">
                    {alertMessage.type === "success" ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    <div>{alertMessage.text}</div>
                    <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
                </div>
            )}

            {/* Specimen Metadata Banner */}
            <div className="card shadow-sm border-0 mb-4 bg-light">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-3 border-end">
                            <span className="text-muted small d-block">Specimen ID</span>
                            <span className="fw-bold font-monospace text-primary fs-6">{verificationData?.specimenId || selectedSpecimenId}</span>
                        </div>
                        <div className="col-md-3 border-end">
                            <span className="text-muted small d-block">Order & Package</span>
                            <span className="fw-semibold text-dark">{verificationData?.orderId || "ORD-261006-0187"} · {verificationData?.packageName || "Lipid Profile"}</span>
                        </div>
                        <div className="col-md-3 border-end">
                            <span className="text-muted small d-block">Patient</span>
                            <span className="fw-semibold text-dark">{verificationData?.patientName || "Nguyễn Văn An"}</span>
                            <span className="text-muted small ms-1">({verificationData?.patientId || "PT-2026-004523"})</span>
                        </div>
                        <div className="col-md-3">
                            <span className="text-muted small d-block">Workflow Status</span>
                            {verificationData?.status === "Verified" ? (
                                <span className="badge bg-success px-3 py-1">
                                    <FaCheckCircle className="me-1" /> Technically Verified
                                </span>
                            ) : verificationData?.status === "ReturnedForCorrection" ? (
                                <span className="badge bg-warning text-dark px-3 py-1">
                                    <FaExclamationTriangle className="me-1" /> Returned For Correction
                                </span>
                            ) : (
                                <span className="badge bg-info text-dark px-3 py-1">
                                    Pending Technical Verification
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Verification Card */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
                    <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                        <FaShieldAlt className="text-primary" />
                        Verification checklist — {verificationData?.specimenId || selectedSpecimenId} · {verificationData?.packageName || "Lipid Profile"}
                    </h5>
                    {verificationData?.flagCount > 0 && (
                        <span className="badge bg-warning text-dark border px-2 py-1">
                            <FaExclamationTriangle className="me-1" /> {verificationData.flagCount} flags require review
                        </span>
                    )}
                </div>

                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5 text-muted">
                            <div className="spinner-border text-primary mb-2" role="status"></div>
                            <div>Loading verification checklist items...</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ width: "30%" }} className="ps-4">Check</th>
                                        <th style={{ width: "15%" }}>Status</th>
                                        <th className="pe-4">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(verificationData?.checklist || []).map((item, idx) => (
                                        <tr key={idx} className={item.status === "Flag" ? "table-warning bg-opacity-25" : ""}>
                                            <td className="ps-4 fw-medium text-dark">{item.checkName}</td>
                                            <td>{renderStatusBadge(item.status, item.statusType)}</td>
                                            <td className="pe-4 text-muted small">{item.details}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Sign-off & Actions Footer */}
                <div className="card-footer bg-light p-4 border-top">
                    <div className="row g-4 align-items-end">
                        <div className="col-lg-8">
                            <label className="form-label fw-bold text-dark d-flex align-items-center justify-content-between">
                                <span>Verifier comment</span>
                                <span className="text-muted small fw-normal">Min 10 characters · Audit-logged</span>
                            </label>
                            <textarea
                                className="form-control"
                                rows="3"
                                placeholder="Enter verifier clinical comment regarding QC flags, repeat runs, or verification rationale..."
                                value={verifierComment}
                                onChange={(e) => setVerifierComment(e.target.value)}
                                disabled={submitting || verificationData?.status === "Verified"}
                            ></textarea>
                            <small className="text-muted mt-1 d-block">
                                Document analytical integrity, Levey-Jennings QC trend resolution, or Delta check notes.
                            </small>
                        </div>
                        <div className="col-lg-4 d-flex flex-column gap-2 justify-content-end">
                            <button
                                type="button"
                                className="btn btn-success btn-lg d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                onClick={handleVerify}
                                disabled={submitting || verificationData?.status === "Verified"}
                            >
                                <FaCheckCircle />
                                {verificationData?.status === "Verified"
                                    ? "Verified & Sent to Doctor"
                                    : "Verify and send to doctor"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-outline-warning text-dark d-flex align-items-center justify-content-center gap-2"
                                onClick={() => {
                                    setReturnReason("");
                                    setReturnError("");
                                    setShowReturnModal(true);
                                }}
                                disabled={submitting || verificationData?.status === "Verified"}
                            >
                                <FaUndo className="text-warning" />
                                Return to lab tech for correction
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Return to Lab Tech */}
            {showReturnModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow border-0">
                            <div className="modal-header bg-warning bg-opacity-25 border-bottom">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaExclamationTriangle className="text-warning" />
                                    Return Specimen for Correction
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowReturnModal(false)}></button>
                            </div>
                            <form onSubmit={handleReturnSubmit}>
                                <div className="modal-body p-4">
                                    <p className="text-muted small mb-3">
                                        Returning specimen <strong>{selectedSpecimenId}</strong> to the laboratory technician. Please detail the required corrective action or re-measurement instructions.
                                    </p>

                                    {returnError && (
                                        <div className="alert alert-danger py-2 small mb-3">
                                            {returnError}
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">
                                            Reason for correction <span className="text-danger">*</span>
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="e.g., Delta check difference exceeds 20% without clinical note; please repeat assay on analyzer HM-01..."
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            required
                                        ></textarea>
                                        <div className="form-text">Minimum 10 characters required.</div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light border-top">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowReturnModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-warning text-dark fw-semibold"
                                        disabled={submitting}
                                    >
                                        {submitting ? "Returning..." : "Confirm Return"}
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
