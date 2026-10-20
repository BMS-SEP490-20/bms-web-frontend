/**
 * @file SampleListPage.jsx
 * @description Laboratory sample collection list intake page (UC37).
 * Matches clinical design specification in docs-output/screens/05-lab-user.html#uc37.
 * Conforms to: Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    FaSearch,
    FaVial,
    FaCheckCircle,
    FaPrint,
    FaBarcode,
    FaArrowLeft,
    FaClock,
    FaMapMarkerAlt,
    FaExclamationCircle,
    FaClipboardList,
    FaTimes
} from "react-icons/fa";
import {
    fetchCheckedInAppointments,
    createCollectionBatch,
    fetchBatchBarcodes
} from "../api/sampleListApi";

export default function SampleListPage() {
    const navigate = useNavigate();

    // Checked-in appointments state
    const [appointments, setAppointments] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    // Collection batch settings
    const [location, setLocation] = useState("Phlebotomy Station 1");
    const [targetTime, setTargetTime] = useState("08:30");
    const [batchCode, setBatchCode] = useState("");

    // Current logged-in collector
    const currentUser = useMemo(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    const collectorId = currentUser?.id || currentUser?._id || "";
    const collectorName = currentUser?.fullName || currentUser?.name || "";

    // Feedback & actions
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Barcode modal state
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [barcodeData, setBarcodeData] = useState(null);
    const [loadingBarcodes, setLoadingBarcodes] = useState(false);

    // Load checked-in appointments on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const list = await fetchCheckedInAppointments();
                setAppointments(list);
            } catch (err) {
                console.error("Failed to load appointments:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter appointments
    const filteredAppointments = useMemo(() => {
        return appointments.filter(
            (apt) =>
                apt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.appointmentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.packageName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [appointments, searchTerm]);

    // Toggle select
    const handleToggleSelect = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    // Toggle select all
    const handleToggleSelectAll = () => {
        if (selectedIds.size === filteredAppointments.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAppointments.map((a) => a.appointmentId)));
        }
    };

    // Selected items computed list
    const selectedAppointments = useMemo(() => {
        return appointments.filter((apt) => selectedIds.has(apt.appointmentId));
    }, [appointments, selectedIds]);

    // Confirm list handler
    const handleConfirmList = async () => {
        if (selectedAppointments.length === 0) {
            setErrorMessage("Please select at least one appointment for the collection run.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const payload = {
                appointmentIds: Array.from(selectedIds),
                location: location,
                targetTime: targetTime,
                collectorId: collectorId,
                collectorName: collectorName
            };

            const response = await createCollectionBatch(payload);
            setBatchCode(response.data.batchCode);
            setSuccessMessage(`Sample collection batch ${response.data.batchCode} confirmed successfully with ${response.data.totalSpecimens} specimens.`);
        } catch (err) {
            console.error("Failed to confirm collection list:", err);
            setErrorMessage("Error confirming collection list. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Print Barcodes handler
    const handlePrintBarcodes = async () => {
        setLoadingBarcodes(true);
        setShowBarcodeModal(true);
        try {
            const data = await fetchBatchBarcodes(batchCode);
            setBarcodeData(data);
        } catch (err) {
            console.error("Failed to fetch barcodes:", err);
        } finally {
            setLoadingBarcodes(false);
        }
    };

    return (
        <div className="container-fluid py-4 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Breadcrumb & Header */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1 text-muted small">
                            <li className="breadcrumb-item"><Link to="/lab/queue" className="text-decoration-none text-secondary">Sample intake</Link></li>
                            <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">Create list</li>
                        </ol>
                    </nav>
                    <h2 className="h4 fw-bold text-dark mb-0">Create sample collection list</h2>
                    <small className="text-muted">Select checked-in patients for today's phlebotomy run</small>
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
                        onClick={handlePrintBarcodes}
                    >
                        <FaBarcode className="me-1" /> Print Labels Now
                    </button>
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-3">
                    <FaExclamationCircle className="text-danger fs-5" />
                    <div>{errorMessage}</div>
                </div>
            )}

            {/* Two Column Layout Matching Screen Specs */}
            <div className="row g-4">
                {/* Left Column: Checked-in Appointments Table */}
                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm rounded-3 h-100">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <h5 className="mb-0 fw-bold fs-6 text-dark">
                                Checked-in appointments · Today
                            </h5>
                            <div className="input-group input-group-sm" style={{ width: "160px" }}>
                                <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                                <input
                                    type="text"
                                    className="form-control bg-light border-start-0"
                                    placeholder="Filter..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="table-responsive flex-grow-1">
                            <table className="table table-hover align-middle mb-0 table-sm">
                                <thead className="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th style={{ width: "36px" }}>
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={filteredAppointments.length > 0 && selectedIds.size === filteredAppointments.length}
                                                onChange={handleToggleSelectAll}
                                            />
                                        </th>
                                        <th>Appt</th>
                                        <th>Patient</th>
                                        <th>Package</th>
                                        <th className="text-end">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-muted">
                                                Loading checked-in patients...
                                            </td>
                                        </tr>
                                    ) : filteredAppointments.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-muted">
                                                No checked-in patients found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAppointments.map((apt) => {
                                            const isSelected = selectedIds.has(apt.appointmentId);
                                            return (
                                                <tr
                                                    key={apt.appointmentId}
                                                    style={{
                                                        cursor: "pointer",
                                                        backgroundColor: isSelected ? "rgba(2, 132, 199, 0.08)" : "transparent"
                                                    }}
                                                    onClick={() => handleToggleSelect(apt.appointmentId)}
                                                >
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(apt.appointmentId)}
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <code className="text-secondary bg-light px-1 py-0.5 rounded small">
                                                            {apt.appointmentId}
                                                        </code>
                                                    </td>
                                                    <td className="fw-semibold text-dark">
                                                        {apt.patientName}
                                                    </td>
                                                    <td className="text-secondary small">
                                                        {apt.packageName}
                                                    </td>
                                                    <td className="text-end font-monospace small">
                                                        {apt.time}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="card-footer bg-white border-top py-2 px-3 text-muted small">
                            <span className="fw-semibold text-dark">{selectedAppointments.length}</span> of {appointments.length} selected
                        </div>
                    </div>
                </div>

                {/* Right Column: Sample List Batch & Collection Settings */}
                <div className="col-lg-7">
                    {/* Card 1: Sample List Table */}
                    <div className="card border-0 shadow-sm rounded-3 mb-4">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                            <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                                <FaClipboardList className="text-primary" /> Sample list — <span className="font-monospace text-primary">{batchCode}</span>
                            </h5>
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                {selectedAppointments.length} specimens
                            </span>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0 table-sm">
                                <thead className="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th style={{ width: "30px" }}>#</th>
                                        <th>Specimen ID</th>
                                        <th>Patient</th>
                                        <th>Tubes</th>
                                        <th>Collector</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedAppointments.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-4 text-muted">
                                                No patients selected for this batch yet. Select from left table.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedAppointments.map((apt, index) => {
                                            const specimenId = `SPC-261020-A1-${String(89 + index).padStart(4, "0")}`;
                                            return (
                                                <tr key={apt.appointmentId}>
                                                    <td className="text-muted small">{index + 1}</td>
                                                    <td>
                                                        <code className="text-primary fw-semibold small bg-light px-1 py-0.5 rounded">
                                                            {specimenId}
                                                        </code>
                                                    </td>
                                                    <td className="fw-semibold text-dark">
                                                        {apt.patientName}
                                                    </td>
                                                    <td>
                                                        <div className="d-flex gap-1 flex-wrap">
                                                            {apt.tubes.map((tube, tIdx) => (
                                                                <span
                                                                    key={tIdx}
                                                                    className={`badge px-2 py-0.5 rounded-pill ${
                                                                        tube === "EDTA"
                                                                            ? "bg-purple-subtle text-purple border"
                                                                            : tube === "NaF"
                                                                            ? "bg-success-subtle text-success border border-success-subtle"
                                                                            : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                                                                    }`}
                                                                >
                                                                    <FaVial className="me-1 small" />
                                                                    {tube}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="text-secondary small">
                                                        {collectorName}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Card 2: Collection Settings */}
                    <div className="card border-0 shadow-sm rounded-3">
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                                <FaMapMarkerAlt className="text-primary" /> Collection settings
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-3 mb-4">
                                <div className="col-md-7">
                                    <label className="form-label fw-semibold text-dark small">Phlebotomy Location</label>
                                    <select
                                        className="form-select"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    >
                                        <option value="Phlebotomy Station 1">Phlebotomy Station 1</option>
                                        <option value="Lab Room 01 — Emergency Intake">Lab Room 01 — Emergency Intake</option>
                                        <option value="Inpatient Ward 3 — Bedside">Inpatient Ward 3 — Bedside</option>
                                    </select>
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label fw-semibold text-dark small">Target Collection Time</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light"><FaClock className="text-muted" /></span>
                                        <input
                                            type="time"
                                            className="form-control"
                                            value={targetTime}
                                            onChange={(e) => setTargetTime(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons Matching 05-lab-user.html#uc37 */}
                            <div className="d-flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    className="btn btn-primary d-flex align-items-center gap-2 fw-semibold px-4"
                                    disabled={submitting || selectedAppointments.length === 0}
                                    onClick={handleConfirmList}
                                >
                                    <FaCheckCircle /> {submitting ? "Confirming..." : "Confirm list"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary d-flex align-items-center gap-2 fw-semibold"
                                    onClick={() => window.print()}
                                >
                                    <FaPrint /> Print list
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary d-flex align-items-center gap-2 fw-semibold"
                                    onClick={handlePrintBarcodes}
                                >
                                    <FaBarcode /> Print barcodes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Printable Barcodes Modal */}
            {showBarcodeModal && (
                <div
                    className="modal show d-block"
                    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg rounded-3">
                            <div className="modal-header border-bottom py-3">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <FaBarcode className="text-primary" /> Specimen Barcode Labels (Code 128) — {batchCode}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowBarcodeModal(false)}
                                />
                            </div>
                            <div className="modal-body p-4" style={{ maxHeight: "65vh", overflowY: "auto" }}>
                                {loadingBarcodes ? (
                                    <div className="text-center py-4 text-muted">
                                        Generating barcode labels...
                                    </div>
                                ) : !barcodeData || !barcodeData.labels || barcodeData.labels.length === 0 ? (
                                    <div className="text-center py-4 text-muted">
                                        No barcode labels available for this batch.
                                    </div>
                                ) : (
                                    <div className="row g-3">
                                        {barcodeData.labels.map((lbl, idx) => (
                                            <div key={idx} className="col-md-6">
                                                <div className="p-3 border rounded-3 bg-white shadow-sm text-center">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <span className="fw-bold text-dark small">{lbl.patientName}</span>
                                                        <span className="badge bg-secondary">{lbl.tube}</span>
                                                    </div>
                                                    <div className="text-muted small mb-2">{lbl.packageName}</div>
                                                    <div
                                                        dangerouslySetInnerHTML={{ __html: lbl.svgBarcode }}
                                                        className="d-flex justify-content-center"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer border-top py-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => setShowBarcodeModal(false)}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary d-flex align-items-center gap-1"
                                    onClick={() => window.print()}
                                >
                                    <FaPrinter /> Print All Labels
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
