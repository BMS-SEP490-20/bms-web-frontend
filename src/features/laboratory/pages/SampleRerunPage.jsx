/**
 * @file SampleRerunPage.jsx
 * @description Laboratory sample rerun requisition and comparison page (UC47).
 * Matches clinical design specification in docs-output/screens/05-lab-user.html#uc47.
 * Conforms to: Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaRedo,
    FaArrowLeft,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaVial,
    FaMicroscope,
    FaUserMd,
    FaTimes
} from "react-icons/fa";
import {
    fetchOpenReruns,
    fetchSampleRerunDetails,
    submitSampleRerun
} from "../api/sampleRerunApi";

export default function SampleRerunPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetSampleId = searchParams.get("sampleId") || "SMP-004";

    // Specimen & rerun context state directly from DB
    const [sampleDetails, setSampleDetails] = useState(null);

    // Form states
    const [reason, setReason] = useState("Delta check failed vs. previous result");
    const [selectedParameters, setSelectedParameters] = useState(new Set(["LDL Cholesterol"]));
    const [analyzerTarget, setAnalyzerTarget] = useState("Same analyzer (BC-01)");
    const [priority, setPriority] = useState("High (delta verification)");
    const [notes, setNotes] = useState(
        "LDL value elevated vs. baseline. Requesting rerun to confirm before submitting for doctor approval."
    );

    // Open reruns state
    const [openReruns, setOpenReruns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Load initial data from real backend & MongoDB
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setErrorMessage("");
            try {
                const [reruns, details] = await Promise.all([
                    fetchOpenReruns(),
                    fetchSampleRerunDetails(targetSampleId)
                ]);
                setOpenReruns(reruns || []);
                if (details) {
                    setSampleDetails(details);
                    if (details.availableParameters?.length > 0) {
                        setSelectedParameters(new Set([details.availableParameters[0]]));
                    }
                }
            } catch (err) {
                console.error("Failed to load rerun workstation data from backend:", err);
                setErrorMessage("Unable to connect to laboratory database. Please ensure backend is running.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [targetSampleId]);

    // Toggle parameter checkbox
    const handleToggleParam = (param) => {
        const next = new Set(selectedParameters);
        if (next.has(param)) {
            next.delete(param);
        } else {
            next.add(param);
        }
        setSelectedParameters(next);
    };

    // Submit rerun
    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!sampleDetails) {
            setErrorMessage("No valid specimen loaded for rerun requisition.");
            return;
        }

        if (selectedParameters.size === 0) {
            setErrorMessage("Please select at least one parameter to rerun.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const payload = {
                reason: reason,
                requestedBy: "Phạm Thu Dung (MLT)",
                notes: notes,
                analyzer: analyzerTarget,
                priority: priority,
                parameters: Array.from(selectedParameters)
            };

            await submitSampleRerun(sampleDetails.sampleId, payload);
            setSuccessMessage(`Rerun requisition submitted for ${sampleDetails.barcode || sampleDetails.sampleId}. Specimen status updated to RerunRequested in database.`);

            // Refresh open reruns list directly from DB
            const updatedReruns = await fetchOpenReruns();
            setOpenReruns(updatedReruns || []);
        } catch (err) {
            console.error("Rerun submission failed:", err);
            setErrorMessage("Failed to submit rerun requisition to database. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header & Breadcrumb */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1 text-muted small">
                            <li className="breadcrumb-item"><Link to="/lab/queue" className="text-decoration-none text-secondary">Specimen</Link></li>
                            <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">Request rerun</li>
                        </ol>
                    </nav>
                    <h2 className="h4 fw-bold text-dark mb-0">Request sample rerun</h2>
                </div>
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate(-1)}
                >
                    <FaArrowLeft /> Back
                </button>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
                    <div className="d-flex align-items-center gap-2">
                        <FaCheckCircle className="text-success fs-5" />
                        <div>{successMessage}</div>
                    </div>
                    <button
                        className="btn btn-sm btn-outline-success"
                        onClick={() => setSuccessMessage("")}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-3">
                    <FaExclamationTriangle className="text-danger fs-5" />
                    <div>{errorMessage}</div>
                </div>
            )}

            {loading ? (
                <div className="card border-0 shadow-sm rounded-3 p-5 text-center my-4">
                    <div className="spinner-border text-primary mx-auto mb-3" role="status"></div>
                    <p className="text-muted mb-0">Connecting to database and loading specimen analytics...</p>
                </div>
            ) : !sampleDetails ? (
                <div className="card border-0 shadow-sm rounded-3 p-5 text-center my-4">
                    <FaExclamationTriangle className="text-warning fs-1 mx-auto mb-3" />
                    <h5 className="fw-bold text-dark">Specimen Not Found</h5>
                    <p className="text-muted mb-3">No active specimen record matching ID "{targetSampleId}" was found in the database.</p>
                    <Link to="/lab/queue" className="btn btn-primary d-inline-flex align-items-center gap-2 mx-auto">
                        <FaVial /> Return to Lab Queue
                    </Link>
                </div>
            ) : (
                /* Main Layout Grid */
                <div className="row g-4">
                    {/* Left Card: Rerun Request Form */}
                    <div className="col-lg-7">
                        <div className="card border-0 shadow-sm rounded-3">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                                    <FaRedo className="text-primary" /> Rerun request — <span className="font-monospace text-primary">{sampleDetails.barcode || sampleDetails.sampleId}</span>
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                {/* Specimen Key-Value Banner */}
                                <div
                                    className="p-3 mb-4 rounded-3 border"
                                    style={{
                                        backgroundColor: "#f8fafc",
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                        gap: "8px 16px",
                                        fontSize: "13px"
                                    }}
                                >
                                    <div>
                                        <span className="text-muted fw-semibold">Patient:</span>{" "}
                                        <strong className="text-dark">{sampleDetails.patientName}</strong> · <span className="text-secondary font-monospace">{sampleDetails.patientId}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted fw-semibold">Current result:</span>{" "}
                                        <strong className="text-danger">{sampleDetails.currentResult}</strong>{" "}
                                        <span className="badge bg-danger text-white px-1.5 py-0.5 font-monospace">{sampleDetails.flag}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted fw-semibold">Analyzer:</span>{" "}
                                        <span className="text-dark font-monospace">{sampleDetails.analyzer}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted fw-semibold">First run:</span>{" "}
                                        <span className="text-dark font-monospace">{sampleDetails.firstRunTime}</span>
                                    </div>
                                </div>

                                {/* Reason for Rerun Dropdown */}
                                <div className="mb-3">
                                    <label className="form-label fw-semibold text-dark small">
                                        Reason for rerun <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    >
                                        <option value="Delta check failed vs. previous result">Delta check failed vs. previous result</option>
                                        <option value="QC flag triggered">QC flag triggered</option>
                                        <option value="Panic / critical value verification">Panic / critical value verification</option>
                                        <option value="Instrument alert">Instrument alert</option>
                                        <option value="Sample integrity concern">Sample integrity concern</option>
                                        <option value="Physician request">Physician request</option>
                                    </select>
                                </div>

                                {/* Parameters to Rerun Checkboxes */}
                                <div className="mb-3">
                                    <label className="form-label fw-semibold text-dark small">Parameters to rerun</label>
                                    <div className="d-flex gap-3 flex-wrap p-2 border rounded-2 bg-light">
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

                                {/* Form Row: Target Analyzer & Priority */}
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-dark small">Rerun on</label>
                                        <select
                                            className="form-select"
                                            value={analyzerTarget}
                                            onChange={(e) => setAnalyzerTarget(e.target.value)}
                                        >
                                            <option value="Same analyzer (BC-01)">Same analyzer (BC-01)</option>
                                            <option value="Backup analyzer (BC-02)">Backup analyzer (BC-02)</option>
                                            <option value="Reference instrument (Sysmex XN-1000)">Reference instrument (Sysmex XN-1000)</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold text-dark small">Priority</label>
                                        <select
                                            className="form-select"
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                        >
                                            <option value="Routine rerun">Routine rerun</option>
                                            <option value="High (delta verification)">High (delta verification)</option>
                                            <option value="STAT (critical flag)">STAT (critical flag)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Clinical Notes */}
                                <div className="mb-4">
                                    <label className="form-label fw-semibold text-dark small">Notes for operator</label>
                                    <textarea
                                        className="form-control"
                                        rows="3"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Enter clinical rationale, delta comparison details, or QC alert notes..."
                                    />
                                </div>

                                {/* Actions */}
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-primary d-flex align-items-center gap-2 fw-semibold px-4 shadow-sm"
                                        disabled={submitting}
                                        onClick={handleSubmit}
                                    >
                                        <FaRedo /> {submitting ? "Submitting..." : "Submit rerun request"}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        onClick={() => navigate(-1)}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Open Rerun Requests & Comparison Preview */}
                    <div className="col-lg-5">
                        {/* Card 1: Open Rerun Requests */}
                        <div className="card border-0 shadow-sm rounded-3 mb-4">
                            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold fs-6 text-dark">
                                    Open rerun requests
                                </h5>
                                <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                    {openReruns.length} active
                                </span>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0 table-sm">
                                    <thead className="table-light text-muted small text-uppercase">
                                        <tr>
                                            <th>Specimen</th>
                                            <th>Patient</th>
                                            <th>Param</th>
                                            <th>Reason</th>
                                            <th className="text-end">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {openReruns.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-4 text-muted small">
                                                    No active rerun requests found in database.
                                                </td>
                                            </tr>
                                        ) : (
                                            openReruns.map((r, idx) => (
                                                <tr key={idx}>
                                                    <td>
                                                        <code className="text-primary fw-semibold small bg-light px-1 py-0.5 rounded">
                                                            {r.specimenId}
                                                        </code>
                                                    </td>
                                                    <td className="fw-semibold text-dark small">{r.patientName}</td>
                                                    <td><span className="badge bg-light text-dark border">{r.parameter}</span></td>
                                                    <td className="text-secondary small">{r.reason}</td>
                                                    <td className="text-end">
                                                        <span className={`badge ${
                                                            r.status === "New" ? "bg-warning-subtle text-warning-emphasis border border-warning-subtle" : "bg-info-subtle text-info border border-info-subtle"
                                                        }`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Card 2: Original vs. Rerun Comparison */}
                        <div className="card border-0 shadow-sm rounded-3">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="mb-0 fw-bold fs-6 text-dark">
                                    Original vs. rerun comparison
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                <table className="table table-sm align-middle mb-2">
                                    <thead className="table-light text-muted small text-uppercase">
                                        <tr>
                                            <th>Param</th>
                                            <th className="text-end">Original</th>
                                            <th className="text-end">Rerun</th>
                                            <th className="text-end">Diff</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="fw-semibold text-dark">
                                                {sampleDetails.currentResult?.split("=")[0]?.trim() || "Analysis"}
                                            </td>
                                            <td className="text-end font-monospace">
                                                {sampleDetails.currentResult?.split("=")[1]?.trim() || "Pending"}
                                            </td>
                                            <td className="text-end font-monospace fw-bold">—</td>
                                            <td className="text-end text-muted small">Pending rerun</td>
                                        </tr>
                                    </tbody>
                                </table>
                                <small className="text-muted d-block mt-2">
                                    Rerun value will appear here automatically upon analyzer release in database.
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
