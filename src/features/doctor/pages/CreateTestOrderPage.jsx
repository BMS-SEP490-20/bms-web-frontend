/**
 * @file CreateTestOrderPage.jsx
 * @description Physician test order creation page (UC32).
 * Matches clinical design specification in docs-output/screens/04-doctor.html#uc32.
 * Conforms to: Production Medical Standards & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaSearch,
    FaClipboardList,
    FaExclamationTriangle,
    FaCheckCircle,
    FaSave,
    FaVial,
    FaUserInjured,
    FaCalendarAlt,
    FaArrowLeft,
    FaClock,
    FaInfoCircle,
    FaFileInvoiceDollar
} from "react-icons/fa";
import { fetchTestCatalog, createTestOrder } from "../api/testOrderApi";

export default function CreateTestOrderPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Catalog & filter states
    const [catalog, setCatalog] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedCodes, setSelectedCodes] = useState(new Set());

    // Current logged-in doctor info
    const currentUser = useMemo(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }, []);

    const doctorId = currentUser?.id || currentUser?._id || "";
    const doctorName = currentUser?.fullName || currentUser?.name || "";

    // Form details
    const queryPatientName = searchParams.get("patientName");
    const queryPatientId = searchParams.get("patientId");

    const [patient, setPatient] = useState({
        id: queryPatientId || "",
        name: queryPatientName || "",
        gender: "",
        age: 0,
        bloodType: "",
        allergies: "",
        lastVisit: "",
        lastCbc: "",
        activeOrders: 0
    });

    const [clinicalIndication, setClinicalIndication] = useState("");
    const [priority, setPriority] = useState("Routine");
    const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
    const [specialInstructions, setSpecialInstructions] = useState("");

    // Status & feedback
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [orderSuccess, setOrderSuccess] = useState(null);

    // Load catalog from backend
    useEffect(() => {
        const loadCatalog = async () => {
            setLoading(true);
            try {
                const items = await fetchTestCatalog();
                setCatalog(items);
            } catch (err) {
                console.error("Failed to load catalog:", err);
            } finally {
                setLoading(false);
            }
        };
        loadCatalog();
    }, []);

    // Toggle test selection
    const handleToggleTest = (code) => {
        const next = new Set(selectedCodes);
        if (next.has(code)) {
            next.delete(code);
        } else {
            next.add(code);
        }
        setSelectedCodes(next);
    };

    // Filter catalog
    const filteredCatalog = useMemo(() => {
        return catalog.filter((item) => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCat = selectedCategory === "All" || item.category === selectedCategory;
            return matchesSearch && matchesCat;
        });
    }, [catalog, searchTerm, selectedCategory]);

    // Selected tests calculation
    const selectedTests = useMemo(() => {
        return catalog.filter((item) => selectedCodes.has(item.code));
    }, [catalog, selectedCodes]);

    const totalAmount = useMemo(() => {
        return selectedTests.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }, [selectedTests]);

    // Fasting calculation
    const fastingInfo = useMemo(() => {
        const fastingTests = selectedTests.filter(
            (t) => t.fastingRequired || (t.preparationNotes && t.preparationNotes.toLowerCase().includes("fast"))
        );
        if (fastingTests.length === 0) return { required: false, maxHours: 0 };
        const maxHours = Math.max(...fastingTests.map((t) => t.fastingHours || 8));
        return { required: true, maxHours };
    }, [selectedTests]);

    // Tube breakdown calculation
    const tubeBreakdown = useMemo(() => {
        const tubeCounts = {};
        selectedTests.forEach((t) => {
            const tube = t.tubeType || "Tube";
            tubeCounts[tube] = (tubeCounts[tube] || 0) + 1;
        });
        const distinctTubes = Object.keys(tubeCounts);
        return {
            count: distinctTubes.length,
            labels: distinctTubes.join(" + ")
        };
    }, [selectedTests]);

    // Submit handler
    const handleSubmitOrder = async (isDraft = false) => {
        if (!doctorId) {
            setErrorMessage("Vui lòng đăng nhập với tài khoản bác sĩ để tạo chỉ định.");
            return;
        }
        if (!patient.id) {
            setErrorMessage("Thiếu thông tin bệnh nhân (patientId). Vui lòng chọn bệnh nhân.");
            return;
        }
        if (selectedTests.length === 0) {
            setErrorMessage("Please select at least one laboratory test or package.");
            return;
        }
        if (!clinicalIndication.trim()) {
            setErrorMessage("Clinical indication / reason for test is mandatory.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");

        try {
            const payload = {
                patientId: patient.id,
                patientName: patient.name,
                patientGender: patient.gender,
                patientAge: patient.age,
                doctorId: doctorId,
                doctorName: doctorName,
                priority: priority,
                clinicalIndication: clinicalIndication,
                specialInstructions: specialInstructions,
                scheduledDate: scheduledDate,
                saveAsDraft: isDraft,
                items: selectedTests.map((t) => ({
                    testCode: t.code,
                    testName: t.name,
                    category: t.category,
                    tubeType: t.tubeType,
                    volumeMl: t.volumeMl,
                    turnaroundTime: t.turnaroundTime,
                    preparationNotes: t.preparationNotes,
                    price: t.price
                }))
            };

            const response = await createTestOrder(payload);
            setOrderSuccess(response.data);
        } catch (err) {
            console.error("Order submission failed:", err);
            setErrorMessage(err.response?.data?.message || "Failed to create test order. Please check inputs.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 px-md-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
            {/* Header Breadcrumbs */}
            <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-1 text-muted small">
                            <li className="breadcrumb-item"><Link to="/dashboard" className="text-decoration-none text-secondary">Clinical</Link></li>
                            <li className="breadcrumb-item text-secondary">Test orders</li>
                            <li className="breadcrumb-item active text-primary fw-semibold" aria-current="page">Create</li>
                        </ol>
                    </nav>
                    <h2 className="h4 fw-bold text-dark mb-0">Create test order</h2>
                </div>
                <button
                    className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
                    onClick={() => navigate(-1)}
                >
                    <FaArrowLeft /> Back
                </button>
            </div>

            {/* Success Banner / Modal */}
            {orderSuccess && (
                <div className="alert alert-success border-0 shadow-sm d-flex align-items-center justify-content-between p-3 mb-4 rounded-3">
                    <div className="d-flex align-items-center gap-3">
                        <FaCheckCircle className="text-success fs-2" />
                        <div>
                            <div className="fw-bold fs-6">
                                Test Requisition #{orderSuccess.orderNumber} successfully created!
                            </div>
                            <small className="text-muted">
                                Patient: {orderSuccess.patientName} ({orderSuccess.patientId}) · Status: {orderSuccess.status} · Priority: {orderSuccess.priority}
                            </small>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setOrderSuccess(null)}
                        >
                            Create Another
                        </button>
                        <Link to="/laboratory/samples" className="btn btn-sm btn-success">
                            View Lab Samples
                        </Link>
                    </div>
                </div>
            )}

            {/* Error alert */}
            {errorMessage && (
                <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center gap-2 p-3 mb-4 rounded-3">
                    <FaExclamationTriangle className="text-danger fs-5" />
                    <div>{errorMessage}</div>
                </div>
            )}

            {/* Patient Demographic Banner */}
            <div className="card border-0 shadow-sm rounded-3 mb-4 p-3" style={{ borderLeft: "5px solid #0284c7" }}>
                <div className="row align-items-center">
                    <div className="col-auto">
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                            style={{ width: "52px", height: "52px", background: "linear-gradient(135deg, #0369a1, #0284c7)" }}
                        >
                            {(patient.name || "BN")
                                .split(" ")
                                .filter(Boolean)
                                .map((w) => w[0])
                                .slice(-2)
                                .join("")
                                .toUpperCase()}
                        </div>
                    </div>
                    <div className="col">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            <h5 className="mb-0 fw-bold text-dark">{patient.name}</h5>
                            <span className="badge bg-light text-secondary border">{patient.id}</span>
                            <span className="badge bg-light text-secondary border">{patient.gender} · {patient.age}y</span>
                            <span className="badge bg-danger-subtle text-danger border border-danger-subtle">{patient.bloodType}</span>
                            <span className="badge bg-success-subtle text-success border border-success-subtle">{patient.allergies}</span>
                        </div>
                        <div className="d-flex gap-4 mt-2 text-muted small flex-wrap">
                            <div><span className="fw-semibold text-secondary">Last visit:</span> {patient.lastVisit}</div>
                            <div><span className="fw-semibold text-secondary">Last CBC:</span> <span className="text-warning fw-bold">{patient.lastCbc}</span></div>
                            <div><span className="fw-semibold text-secondary">Active orders:</span> {patient.activeOrders}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="row g-4">
                {/* Left Form: Test Selection & Clinical Details */}
                <div className="col-lg-8">
                    {/* Card 1: Select Tests */}
                    <div className="card border-0 shadow-sm rounded-3 mb-4">
                        <div className="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                                <FaClipboardList className="text-primary" /> Select tests & packages
                            </h5>
                            <div className="d-flex gap-2">
                                <div className="input-group input-group-sm" style={{ width: "260px" }}>
                                    <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                                    <input
                                        type="text"
                                        className="form-control bg-light border-start-0"
                                        placeholder="Search tests by name or code..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category filter pills */}
                        <div className="px-3 pt-3 pb-1 d-flex gap-2 border-bottom overflow-auto">
                            {["All", "Biochemistry", "Hematology", "Immunology"].map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    className={`btn btn-sm rounded-pill px-3 py-1 ${selectedCategory === cat ? "btn-primary" : "btn-light text-secondary"}`}
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th style={{ width: "40px" }}></th>
                                        <th>Test / Package</th>
                                        <th>Code</th>
                                        <th>Specimen Tube</th>
                                        <th>TAT</th>
                                        <th>Prep</th>
                                        <th className="text-end">Price (₫)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted">
                                                Loading clinical catalog...
                                            </td>
                                        </tr>
                                    ) : filteredCatalog.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted">
                                                No tests found matching search criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredCatalog.map((item) => {
                                            const isSelected = selectedCodes.has(item.code);
                                            return (
                                                <tr
                                                    key={item.code}
                                                    style={{
                                                        cursor: "pointer",
                                                        backgroundColor: isSelected ? "rgba(2, 132, 199, 0.06)" : "transparent"
                                                    }}
                                                    onClick={() => handleToggleTest(item.code)}
                                                >
                                                    <td onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleTest(item.code)}
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                    </td>
                                                    <td className="fw-semibold text-dark">
                                                        {item.name}
                                                    </td>
                                                    <td>
                                                        <code className="text-secondary bg-light px-2 py-1 rounded small">
                                                            {item.code}
                                                        </code>
                                                    </td>
                                                    <td>
                                                        <span className={`badge px-2 py-1 rounded-pill ${
                                                            item.tubeType.includes("EDTA")
                                                                ? "bg-purple-subtle text-purple border"
                                                                : item.tubeType.includes("NaF")
                                                                ? "bg-success-subtle text-success border border-success-subtle"
                                                                : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"
                                                        }`}>
                                                            <FaVial className="me-1" />
                                                            {item.tubeType}
                                                        </span>
                                                    </td>
                                                    <td className="text-muted small">
                                                        <FaClock className="me-1 text-secondary" />
                                                        {item.turnaroundTime}
                                                    </td>
                                                    <td>
                                                        {item.preparationNotes && item.preparationNotes.toLowerCase().includes("fast") ? (
                                                            <span className="badge bg-warning-subtle text-danger border border-warning">
                                                                {item.preparationNotes}
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-light text-secondary border">
                                                                None
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="text-end fw-bold text-dark font-monospace">
                                                        {Number(item.price).toLocaleString("vi-VN")}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Card 2: Clinical Details */}
                    <div className="card border-0 shadow-sm rounded-3">
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                                <FaUserInjured className="text-primary" /> Clinical details
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            <div className="mb-3">
                                <label className="form-label fw-semibold text-dark">
                                    Reason for test / Clinical indication <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={clinicalIndication}
                                    onChange={(e) => setClinicalIndication(e.target.value)}
                                    placeholder="Enter primary diagnosis, symptoms, or clinical indication for lab testing..."
                                    required
                                />
                            </div>

                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold text-dark">Priority</label>
                                    <select
                                        className="form-select"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <option value="Routine">Routine (Standard TAT)</option>
                                        <option value="Urgent">Urgent (Priority processing)</option>
                                        <option value="STAT">STAT (Immediate life-critical)</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label fw-semibold text-dark">Scheduled collection date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={scheduledDate}
                                        onChange={(e) => setScheduledDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="mb-0">
                                <label className="form-label fw-semibold text-dark">Special instructions for laboratory</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Repeat LDL from same analyzer if possible, notify physician if panic value..."
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sticky Column: Order Summary */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-3 position-sticky" style={{ top: "24px" }}>
                        <div className="card-header bg-white border-bottom py-3">
                            <h5 className="mb-0 fw-bold d-flex align-items-center gap-2 text-dark">
                                <FaFileInvoiceDollar className="text-primary" /> Order summary
                            </h5>
                        </div>
                        <div className="card-body p-4">
                            {/* Selected Tests List */}
                            <div className="mb-3">
                                <div className="text-muted small fw-semibold text-uppercase mb-2">Selected Tests ({selectedTests.length})</div>
                                {selectedTests.length === 0 ? (
                                    <div className="text-muted small py-3 text-center bg-light rounded-2">
                                        No tests selected yet.
                                    </div>
                                ) : (
                                    <div className="list-group list-group-flush border-top border-bottom">
                                        {selectedTests.map((t) => (
                                            <div key={t.code} className="list-group-item px-0 py-2 d-flex justify-content-between align-items-center small">
                                                <div>
                                                    <div className="fw-semibold text-dark">{t.name}</div>
                                                    <span className="text-muted font-monospace">{t.code}</span>
                                                </div>
                                                <span className="font-monospace fw-semibold text-dark">
                                                    {Number(t.price).toLocaleString("vi-VN")} ₫
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Tube Breakdown & Fasting */}
                            <div className="d-flex justify-content-between align-items-center py-2 mb-3">
                                <div>
                                    <div className="fw-bold text-dark">{selectedTests.length} tests</div>
                                    <small className="text-muted">
                                        {tubeBreakdown.count > 0 ? `${tubeBreakdown.count} tubes (${tubeBreakdown.labels})` : "0 tubes"}
                                        {fastingInfo.required ? ` · Fast ${fastingInfo.maxHours}h` : ""}
                                    </small>
                                </div>
                                <div className="text-end">
                                    <div className="fs-4 fw-bold text-primary font-monospace">
                                        {totalAmount.toLocaleString("vi-VN")} ₫
                                    </div>
                                </div>
                            </div>

                            {/* Fasting Warning Alert */}
                            {fastingInfo.required && (
                                <div className="alert alert-warning border-0 d-flex gap-2 p-3 mb-4 rounded-3 small">
                                    <FaExclamationTriangle className="text-warning-emphasis flex-shrink-0 mt-1" />
                                    <div>
                                        <strong>Fasting required.</strong> Patient must fast {fastingInfo.maxHours} hours before specimen collection.
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="d-grid gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-lg fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                                    disabled={submitting || selectedTests.length === 0 || !doctorId || !patient.id}
                                    onClick={() => handleSubmitOrder(false)}
                                >
                                    <FaCheckCircle /> {submitting ? "Creating order..." : "Create order"}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary fw-semibold d-flex align-items-center justify-content-center gap-2"
                                    disabled={submitting || selectedTests.length === 0 || !doctorId || !patient.id}
                                    onClick={() => handleSubmitOrder(true)}
                                >
                                    <FaSave /> Save as draft
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
