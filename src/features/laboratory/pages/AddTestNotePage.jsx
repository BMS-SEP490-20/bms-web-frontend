/**
 * @file AddTestNotePage.jsx
 * @description Laboratory test notes management page (UC52 / Add Test Notes).
 * Matches clinical design specification in docs-output/screens/05-lab-user.html#uc52.
 * Conforms to: ISO 15189 Quality Standards, Production Engineering & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaSave,
    FaArrowLeft,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaVial,
    FaUser,
    FaBox,
    FaTag,
    FaBold,
    FaItalic,
    FaUnderline,
    FaListUl,
    FaPaperclip,
    FaClock,
    FaTimes,
    FaSearch
} from "react-icons/fa";
import {
    fetchSpecimenContext,
    fetchNotesBySpecimen,
    createTestNote,
    fetchAvailableSpecimens
} from "../api/testNoteApi";

export default function AddTestNotePage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialSpecimenId = searchParams.get("specimenId") || searchParams.get("sampleId") || "";

    // Current authenticated staff
    const currentUser = useMemo(() => {
        try {
            const raw = localStorage.getItem("user") || localStorage.getItem("bms_user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    // Specimen context and selector state
    const [specimenInput, setSpecimenInput] = useState(initialSpecimenId);
    const [selectedSpecimenId, setSelectedSpecimenId] = useState(initialSpecimenId);
    const [specimenContext, setSpecimenContext] = useState(null);
    const [availableSpecimens, setAvailableSpecimens] = useState([]);
    const [existingNotes, setExistingNotes] = useState([]);

    // Form inputs
    const [noteType, setNoteType] = useState("Technical observation");
    const [visibility, setVisibility] = useState("Internal"); // "Internal" | "Report"
    const [tags, setTags] = useState("");
    const [content, setContent] = useState("");

    // Status states
    const [loadingContext, setLoadingContext] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Load available specimens on mount
    useEffect(() => {
        let isMounted = true;
        const loadSpecimens = async () => {
            const list = await fetchAvailableSpecimens();
            if (isMounted) {
                setAvailableSpecimens(Array.isArray(list) ? list : []);
            }
        };
        loadSpecimens();
        return () => { isMounted = false; };
    }, []);

    // Load specimen context when selectedSpecimenId changes
    useEffect(() => {
        if (!selectedSpecimenId) {
            setSpecimenContext(null);
            setExistingNotes([]);
            return;
        }

        let isMounted = true;
        setLoadingContext(true);
        setErrorMessage("");

        const loadContext = async () => {
            try {
                const ctx = await fetchSpecimenContext(selectedSpecimenId);
                if (isMounted) {
                    if (ctx) {
                        setSpecimenContext(ctx);
                        setExistingNotes(ctx.existingNotes || []);
                    } else {
                        // Fallback: fetch notes directly
                        const notes = await fetchNotesBySpecimen(selectedSpecimenId);
                        setExistingNotes(notes);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setErrorMessage("Failed to load specimen context from database.");
                }
            } finally {
                if (isMounted) {
                    setLoadingContext(false);
                }
            }
        };

        loadContext();
        return () => { isMounted = false; };
    }, [selectedSpecimenId]);

    // Handle lookup button or select change
    const handleLookup = (e) => {
        e?.preventDefault();
        const cleaned = specimenInput.trim();
        if (cleaned) {
            setSelectedSpecimenId(cleaned);
        }
    };

    // Quick formatting toolbar buttons
    const handleFormat = (wrapperPrefix, wrapperSuffix = wrapperPrefix) => {
        setContent((prev) => `${prev}${wrapperPrefix}note text${wrapperSuffix}`);
    };

    // Submit handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage("");
        setErrorMessage("");

        const targetSpecimen = selectedSpecimenId.trim();
        if (!targetSpecimen) {
            setErrorMessage("Please enter or select a specimen barcode / identifier.");
            return;
        }

        if (!content.trim()) {
            setErrorMessage("Note content cannot be empty.");
            return;
        }

        const tagList = tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);

        setSubmitting(true);
        try {
            const payload = {
                specimenId: targetSpecimen,
                noteType,
                visibility,
                isInternalOnly: visibility === "Internal",
                printOnReport: visibility === "Report",
                tags: tagList,
                content: content.trim()
            };

            const response = await createTestNote(payload);

            if (response?.success) {
                setSuccessMessage("Test note successfully recorded to specimen audit trail.");
                setContent("");
                setTags("");

                // Refresh notes timeline
                const refreshedNotes = await fetchNotesBySpecimen(targetSpecimen);
                setExistingNotes(refreshedNotes);
            } else {
                setErrorMessage(response?.message || "Failed to record test note.");
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Failed to submit test note.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 px-md-4" style={{ maxWidth: "1400px" }}>
            {/* Top Breadcrumb & Page Actions */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1 text-muted small">
                            <li className="breadcrumb-item">
                                <Link to="/lab/queue" className="text-decoration-none text-muted">
                                    Laboratory
                                </Link>
                            </li>
                            <li className="breadcrumb-item">
                                <Link to="/laboratory/samples" className="text-decoration-none text-muted">
                                    Specimen
                                </Link>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                Add test note
                            </li>
                        </ol>
                    </nav>
                    <h2 className="h4 fw-bold text-dark mb-0">Add Test Note</h2>
                </div>

                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-outline-secondary btn-sm px-3"
                    >
                        <FaArrowLeft className="me-1" /> Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="btn btn-primary btn-sm px-4 fw-semibold"
                    >
                        <FaSave className="me-1" />
                        {submitting ? "Saving..." : "Add Note"}
                    </button>
                </div>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="alert alert-success alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
                    <FaCheckCircle className="flex-shrink-0 me-2" size={18} />
                    <div>{successMessage}</div>
                    <button type="button" className="btn-close" onClick={() => setSuccessMessage("")} aria-label="Close"></button>
                </div>
            )}

            {errorMessage && (
                <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
                    <FaExclamationTriangle className="flex-shrink-0 me-2" size={18} />
                    <div>{errorMessage}</div>
                    <button type="button" className="btn-close" onClick={() => setErrorMessage("")} aria-label="Close"></button>
                </div>
            )}

            <div className="row g-4">
                {/* Left Column: Note Context Card */}
                <div className="col-lg-5">
                    <div className="card shadow-sm border-0 h-100">
                        <div className="card-header bg-white py-3 border-bottom">
                            <h5 className="card-title mb-0 fw-bold text-dark">
                                Note Context
                            </h5>
                        </div>
                        <div className="card-body">
                            {/* Specimen Barcode Selector / Input */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-muted">
                                    Specimen Identifier / Barcode <span className="text-danger">*</span>
                                </label>
                                <div className="input-group mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. SPC-261006-A1-0089"
                                        value={specimenInput}
                                        onChange={(e) => setSpecimenInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleLookup(e)}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleLookup}
                                        disabled={loadingContext}
                                        className="btn btn-outline-primary"
                                    >
                                        <FaSearch className="me-1" /> {loadingContext ? "Loading..." : "Load"}
                                    </button>
                                </div>

                                {availableSpecimens.length > 0 && (
                                    <select
                                        className="form-select form-select-sm"
                                        value={selectedSpecimenId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setSelectedSpecimenId(val);
                                            setSpecimenInput(val);
                                        }}
                                    >
                                        <option value="">-- Or choose from active laboratory queue --</option>
                                        {availableSpecimens.map((s, idx) => (
                                            <option key={s.id || s.barcode || idx} value={s.barcode || s.id}>
                                                {s.barcode || s.id} — {s.patientName || "Unknown"} ({s.testPackageName || s.sampleType || "Specimen"})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Specimen Metadata Display */}
                            {specimenContext ? (
                                <div className="p-3 mb-4 rounded border bg-light">
                                    <div className="row g-2 small">
                                        <div className="col-4 text-muted fw-semibold">Specimen:</div>
                                        <div className="col-8 font-monospace fw-bold text-primary">
                                            {specimenContext.sampleBarcode || specimenContext.specimenId}
                                        </div>

                                        <div className="col-4 text-muted fw-semibold">Patient:</div>
                                        <div className="col-8 fw-semibold text-dark">
                                            {specimenContext.patientName || "—"}
                                        </div>

                                        <div className="col-4 text-muted fw-semibold">Package:</div>
                                        <div className="col-8 text-dark">
                                            {specimenContext.testPackageName || "General Analysis"}
                                        </div>

                                        <div className="col-4 text-muted fw-semibold">Status:</div>
                                        <div className="col-8">
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">
                                                {specimenContext.status || "Received"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : selectedSpecimenId ? (
                                <div className="p-3 mb-4 rounded border bg-light text-muted small">
                                    <FaInfoCircle className="me-1 text-info" />
                                    Loaded context for specimen barcode: <strong className="font-monospace text-dark">{selectedSpecimenId}</strong>
                                </div>
                            ) : (
                                <div className="p-3 mb-4 rounded border bg-light text-muted small">
                                    <FaInfoCircle className="me-1 text-secondary" />
                                    Enter or select a specimen to view diagnostic context.
                                </div>
                            )}

                            {/* Note Type Dropdown */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-muted">
                                    Note Type <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select"
                                    value={noteType}
                                    onChange={(e) => setNoteType(e.target.value)}
                                >
                                    <option value="Technical observation">Technical observation</option>
                                    <option value="Specimen condition">Specimen condition</option>
                                    <option value="Analyzer instrument note">Analyzer instrument note</option>
                                    <option value="Reagent note">Reagent note</option>
                                    <option value="QC concern">QC concern</option>
                                    <option value="Communication log">Communication log</option>
                                </select>
                            </div>

                            {/* Visibility Radio Options */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-muted d-block">
                                    Visibility
                                </label>
                                <div className="form-check mb-1">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="noteVisibility"
                                        id="visInternal"
                                        value="Internal"
                                        checked={visibility === "Internal"}
                                        onChange={(e) => setVisibility(e.target.value)}
                                    />
                                    <label className="form-check-label text-dark small" htmlFor="visInternal">
                                        Internal only (lab team)
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="noteVisibility"
                                        id="visReport"
                                        value="Report"
                                        checked={visibility === "Report"}
                                        onChange={(e) => setVisibility(e.target.value)}
                                    />
                                    <label className="form-check-label text-dark small" htmlFor="visReport">
                                        Print on final report
                                    </label>
                                </div>
                            </div>

                            {/* Tags Input */}
                            <div className="mb-3">
                                <label className="form-label fw-semibold small text-muted">
                                    Tags
                                </label>
                                <div className="input-group">
                                    <span className="input-group-text bg-white text-muted">
                                        <FaTag size={12} />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="rerun, delta, LDL, hemolyzed"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                    />
                                </div>
                                <div className="form-text small text-muted">
                                    Separate tags with commas.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Content & Timeline */}
                <div className="col-lg-7">
                    {/* Note Content Card */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0 fw-bold text-dark">
                                Note Content <span className="text-danger">*</span>
                            </h5>
                            <span className="badge bg-light text-muted border">
                                Author: {currentUser?.fullName || currentUser?.name || "Lab Staff"}
                            </span>
                        </div>
                        <div className="card-body">
                            {/* Toolbar */}
                            <div className="btn-toolbar p-1 mb-2 bg-light rounded border gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleFormat("**")}
                                    className="btn btn-sm btn-outline-secondary border-0"
                                    title="Bold"
                                >
                                    <FaBold size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFormat("*")}
                                    className="btn btn-sm btn-outline-secondary border-0"
                                    title="Italic"
                                >
                                    <FaItalic size={12} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleFormat("<u>", "</u>")}
                                    className="btn btn-sm btn-outline-secondary border-0"
                                    title="Underline"
                                >
                                    <FaUnderline size={12} />
                                </button>
                                <span className="border-start mx-1 my-1"></span>
                                <button
                                    type="button"
                                    onClick={() => handleFormat("\n- ")}
                                    className="btn btn-sm btn-outline-secondary border-0"
                                    title="Bullet list"
                                >
                                    <FaListUl size={12} />
                                </button>
                            </div>

                            <textarea
                                className="form-control"
                                rows={8}
                                placeholder="Describe technical observations, sample integrity conditions, instrument alerts, repeat confirmations or QC concerns..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                style={{ resize: "vertical" }}
                            />
                        </div>
                    </div>

                    {/* Existing Notes on this Specimen Card */}
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="card-title mb-0 fw-bold text-dark">
                                Existing Notes on this Specimen
                            </h5>
                            <span className="badge bg-secondary-subtle text-secondary border">
                                {existingNotes.length} record{existingNotes.length === 1 ? "" : "s"}
                            </span>
                        </div>
                        <div className="card-body p-3">
                            {existingNotes.length === 0 ? (
                                <div className="text-center py-4 text-muted small">
                                    <FaClock className="mb-2 d-block mx-auto text-secondary" size={24} />
                                    No previous notes recorded for this specimen.
                                </div>
                            ) : (
                                <div className="timeline-list">
                                    {existingNotes.map((item, idx) => (
                                        <div key={item.id || idx} className="border-start border-2 border-primary ps-3 pb-3 position-relative mb-2">
                                            <div
                                                className="position-absolute bg-primary rounded-circle"
                                                style={{ width: "8px", height: "8px", left: "-5px", top: "5px" }}
                                            />
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="badge bg-light text-dark border small fw-semibold">
                                                    {item.noteType || "Observation"}
                                                </span>
                                                <small className="text-muted">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Just now"}
                                                </small>
                                            </div>

                                            <div className="text-dark small mb-1" style={{ whiteSpace: "pre-wrap" }}>
                                                {item.content}
                                            </div>

                                            <div className="d-flex flex-wrap align-items-center gap-1 text-muted small" style={{ fontSize: "0.8rem" }}>
                                                <span>By: <strong>{item.createdByUserName || "Lab Technician"}</strong></span>
                                                {item.printOnReport && (
                                                    <span className="badge bg-info-subtle text-info border border-info-subtle ms-2">
                                                        Print on report
                                                    </span>
                                                )}
                                                {item.tags?.map((t, tIdx) => (
                                                    <span key={tIdx} className="badge bg-secondary-subtle text-secondary">
                                                        #{t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
