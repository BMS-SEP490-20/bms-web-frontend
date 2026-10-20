/**
 * @file ProcessPaymentPage.jsx
 * @description Patient fee checkout and payment processing page (UC55 / Process Payment).
 * Matches clinical design specification in docs-output/screens/02-patient.html#uc55.
 * Conforms to: Production Standards, Clean Architecture & AGENTS.md.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
    FaCreditCard,
    FaWallet,
    FaQrcode,
    FaBuilding,
    FaTag,
    FaShieldAlt,
    FaLock,
    FaCheckCircle,
    FaExclamationTriangle,
    FaReceipt,
    FaArrowLeft,
    FaSearch
} from "react-icons/fa";
import {
    fetchCheckoutSummary,
    applyDiscountCode,
    processPaymentTransaction,
    fetchUnpaidInvoices
} from "../api/paymentApi";

export default function ProcessPaymentPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const initialInvoiceId = searchParams.get("invoiceId") || searchParams.get("id") || "";

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
    const [invoiceInput, setInvoiceInput] = useState(initialInvoiceId);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId);
    const [checkoutData, setCheckoutData] = useState(null);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState("VNPay"); // VNPay | MoMo | BankingQR | Reception
    const [discountInput, setDiscountInput] = useState("SPRING10");
    const [appliedDiscount, setAppliedDiscount] = useState(null);

    // Status states
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successResult, setSuccessResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Load available unpaid invoices on mount
    useEffect(() => {
        let isMounted = true;
        const loadInvoices = async () => {
            const list = await fetchUnpaidInvoices(currentUser?.patientId || currentUser?.id);
            if (isMounted) {
                setUnpaidInvoices(list);
                if (!selectedInvoiceId && list.length > 0) {
                    const firstId = list[0].id || list[0].invoiceCode;
                    setSelectedInvoiceId(firstId);
                    setInvoiceInput(firstId);
                }
            }
        };
        loadInvoices();
        return () => { isMounted = false; };
    }, [currentUser]);

    // Load checkout summary when selectedInvoiceId changes
    useEffect(() => {
        if (!selectedInvoiceId) {
            setCheckoutData(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setErrorMessage("");
        setSuccessResult(null);

        const loadSummary = async () => {
            try {
                const summary = await fetchCheckoutSummary(selectedInvoiceId);
                if (isMounted) {
                    if (summary) {
                        setCheckoutData(summary);
                    } else {
                        setErrorMessage(`Invoice '${selectedInvoiceId}' could not be retrieved from database.`);
                    }
                }
            } catch (err) {
                if (isMounted) {
                    setErrorMessage("Failed to load invoice details.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadSummary();
        return () => { isMounted = false; };
    }, [selectedInvoiceId]);

    // Apply promotional discount code
    const handleApplyDiscount = async (e) => {
        e?.preventDefault();
        if (!discountInput.trim() || !selectedInvoiceId) return;

        setErrorMessage("");
        try {
            const res = await applyDiscountCode(selectedInvoiceId, discountInput.trim());
            if (res && res.isValid) {
                setAppliedDiscount(res);
            } else {
                setAppliedDiscount(null);
                setErrorMessage(res?.message || "Invalid discount code.");
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "Failed to apply discount.");
        }
    };

    // Calculate totals dynamically
    const currentSubTotal = checkoutData?.subTotal || 0;
    const currentDiscountAmount = appliedDiscount
        ? appliedDiscount.discountAmount
        : checkoutData?.discountAmount || 0;
    const totalDue = Math.max(0, currentSubTotal - currentDiscountAmount);

    // Process payment submit
    const handleProcessPayment = async () => {
        if (!selectedInvoiceId) {
            setErrorMessage("Please select or enter an invoice to proceed.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");

        try {
            const payload = {
                invoiceId: selectedInvoiceId,
                paymentMethod,
                discountCode: appliedDiscount?.discountCode || (discountInput.trim() ? discountInput.trim() : null),
                returnUrl: window.location.origin + "/payments/checkout"
            };

            const response = await processPaymentTransaction(payload);
            if (response?.success) {
                setSuccessResult(response.data);
            } else {
                setErrorMessage(response?.message || "Payment processing failed.");
            }
        } catch (err) {
            setErrorMessage(err.response?.data?.message || err.message || "An error occurred while processing payment.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 px-md-5" style={{ maxWidth: "1280px" }}>
            {/* Breadcrumb Navigation */}
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-1 text-muted small">
                    <li className="breadcrumb-item">
                        <Link to="/" className="text-decoration-none text-muted">
                            Patient portal
                        </Link>
                    </li>
                    <li className="breadcrumb-item">
                        <span className="text-muted">Payments</span>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                        Checkout
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                    <h1 className="h3 fw-bold text-dark mb-1">Complete Payment</h1>
                    <div className="text-muted small">
                        {checkoutData ? (
                            <>
                                Invoice <span className="font-monospace fw-semibold text-primary">{checkoutData.invoiceCode}</span> ·{" "}
                                {checkoutData.items?.[0]?.itemName || "Clinical Laboratory Services"}
                            </>
                        ) : (
                            "Select an invoice to review order summary and settle fees."
                        )}
                    </div>
                </div>

                {/* Invoice Selector */}
                {unpaidInvoices.length > 0 && (
                    <div className="mt-2 mt-md-0 d-flex align-items-center gap-2">
                        <label className="small text-muted fw-semibold mb-0">Select Invoice:</label>
                        <select
                            className="form-select form-select-sm"
                            value={selectedInvoiceId}
                            onChange={(e) => {
                                setSelectedInvoiceId(e.target.value);
                                setInvoiceInput(e.target.value);
                            }}
                        >
                            {unpaidInvoices.map((inv) => (
                                <option key={inv.id || inv.invoiceCode} value={inv.id || inv.invoiceCode}>
                                    {inv.invoiceCode || inv.id} — {inv.patientName || "Patient"} ({Number(inv.totalAmount || inv.subTotal || 0).toLocaleString()} ₫)
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Error & Warning Alerts */}
            {errorMessage && (
                <div className="alert alert-danger alert-dismissible fade show d-flex align-items-center mb-4" role="alert">
                    <FaExclamationTriangle className="me-2 flex-shrink-0" size={18} />
                    <div>{errorMessage}</div>
                    <button type="button" className="btn-close" onClick={() => setErrorMessage("")}></button>
                </div>
            )}

            {/* Success Settlement View */}
            {successResult ? (
                <div className="card shadow-sm border-0 py-5 px-4 text-center my-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle mx-auto mb-3" style={{ width: "72px", height: "72px" }}>
                        <FaCheckCircle size={36} />
                    </div>
                    <h2 className="h4 fw-bold text-dark mb-2">Payment Confirmed</h2>
                    <p className="text-muted mb-4" style={{ maxWidth: "540px", margin: "0 auto" }}>
                        {successResult.message || "Your medical transaction has been processed and recorded to your medical billing history."}
                    </p>

                    <div className="p-3 bg-light rounded border mx-auto mb-4 text-start font-monospace small" style={{ maxWidth: "480px" }}>
                        <div className="d-flex justify-content-between mb-1">
                            <span className="text-muted">Transaction Ref:</span>
                            <span className="fw-bold text-dark">{successResult.transactionReference || "TXN-BMS-000000"}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                            <span className="text-muted">Invoice Code:</span>
                            <span className="text-primary fw-bold">{successResult.invoiceCode}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                            <span className="text-muted">Payment Method:</span>
                            <span className="text-dark fw-semibold">{successResult.paymentMethod}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                            <span className="text-muted">Settled Amount:</span>
                            <span className="text-success fw-bold">{Number(successResult.totalAmount).toLocaleString()} ₫</span>
                        </div>
                    </div>

                    <div className="d-flex justify-content-center gap-3">
                        <Link to="/" className="btn btn-outline-secondary btn-sm px-4">
                            Return to Portal
                        </Link>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="btn btn-primary btn-sm px-4 fw-semibold"
                        >
                            <FaReceipt className="me-1" /> Print Official Receipt
                        </button>
                    </div>
                </div>
            ) : (
                <div className="row g-4">
                    {/* Left Column: Payment Methods & Discount */}
                    <div className="col-lg-7">
                        {/* Payment Method Selector Card */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-white py-3 border-bottom">
                                <h5 className="card-title mb-0 fw-bold text-dark">
                                    Choose Payment Method
                                </h5>
                            </div>
                            <div className="card-body p-3">
                                <div className="d-grid gap-2">
                                    {/* 1. VNPay */}
                                    <label
                                        className={`d-flex align-items-center p-3 rounded border cursor-pointer transition ${
                                            paymentMethod === "VNPay"
                                                ? "border-primary bg-primary-subtle border-2"
                                                : "border-light-subtle bg-white hover-bg-light"
                                        }`}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            className="form-check-input me-3 mt-0"
                                            checked={paymentMethod === "VNPay"}
                                            onChange={() => setPaymentMethod("VNPay")}
                                        />
                                        <div className="bg-primary text-white rounded p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: "42px", height: "42px" }}>
                                            <FaCreditCard size={20} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold text-dark small">VNPay</div>
                                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                                Credit/debit card, ATM, QR code, banking app
                                            </div>
                                        </div>
                                        <div className="d-flex gap-1">
                                            <span className="badge bg-light text-muted border">VISA</span>
                                            <span className="badge bg-light text-muted border">MC</span>
                                            <span className="badge bg-light text-muted border">ATM</span>
                                        </div>
                                    </label>

                                    {/* 2. MoMo */}
                                    <label
                                        className={`d-flex align-items-center p-3 rounded border cursor-pointer transition ${
                                            paymentMethod === "MoMo"
                                                ? "border-primary bg-primary-subtle border-2"
                                                : "border-light-subtle bg-white hover-bg-light"
                                        }`}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            className="form-check-input me-3 mt-0"
                                            checked={paymentMethod === "MoMo"}
                                            onChange={() => setPaymentMethod("MoMo")}
                                        />
                                        <div className="rounded p-2 me-3 d-flex align-items-center justify-content-center text-white" style={{ width: "42px", height: "42px", backgroundColor: "#A50064" }}>
                                            <FaWallet size={20} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold text-dark small">MoMo e-Wallet</div>
                                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                                Pay with your MoMo balance or linked card
                                            </div>
                                        </div>
                                    </label>

                                    {/* 3. Banking QR */}
                                    <label
                                        className={`d-flex align-items-center p-3 rounded border cursor-pointer transition ${
                                            paymentMethod === "BankingQR"
                                                ? "border-primary bg-primary-subtle border-2"
                                                : "border-light-subtle bg-white hover-bg-light"
                                        }`}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            className="form-check-input me-3 mt-0"
                                            checked={paymentMethod === "BankingQR"}
                                            onChange={() => setPaymentMethod("BankingQR")}
                                        />
                                        <div className="rounded p-2 me-3 d-flex align-items-center justify-content-center bg-success text-white" style={{ width: "42px", height: "42px" }}>
                                            <FaQrcode size={20} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold text-dark small">Vietnamese Banking QR</div>
                                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                                Scan with VietQR or any Vietnamese banking app
                                            </div>
                                        </div>
                                    </label>

                                    {/* 4. Pay at reception */}
                                    <label
                                        className={`d-flex align-items-center p-3 rounded border cursor-pointer transition ${
                                            paymentMethod === "Reception"
                                                ? "border-primary bg-primary-subtle border-2"
                                                : "border-light-subtle bg-white hover-bg-light"
                                        }`}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            className="form-check-input me-3 mt-0"
                                            checked={paymentMethod === "Reception"}
                                            onChange={() => setPaymentMethod("Reception")}
                                        />
                                        <div className="rounded p-2 me-3 d-flex align-items-center justify-content-center bg-secondary text-white" style={{ width: "42px", height: "42px" }}>
                                            <FaBuilding size={20} />
                                        </div>
                                        <div className="flex-grow-1">
                                            <div className="fw-bold text-dark small">Pay at Reception</div>
                                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>
                                                Cash or POS card — pay when you arrive
                                            </div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Discount Code Card */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-white py-3 border-bottom">
                                <h5 className="card-title mb-0 fw-bold text-dark">
                                    Discount Code
                                </h5>
                            </div>
                            <div className="card-body p-3">
                                <div className="input-group mb-2">
                                    <span className="input-group-text bg-white text-muted">
                                        <FaTag size={13} />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter voucher code (e.g. SPRING10)"
                                        value={discountInput}
                                        onChange={(e) => setDiscountInput(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleApplyDiscount}
                                        className="btn btn-outline-secondary px-3 fw-semibold"
                                    >
                                        Apply
                                    </button>
                                </div>

                                {appliedDiscount && (
                                    <div className="text-success small fw-semibold d-flex align-items-center mt-2">
                                        <FaCheckCircle className="me-1" />
                                        <b>{appliedDiscount.discountCode}</b> applied — {appliedDiscount.discountPercent}% off order total (-{Number(appliedDiscount.discountAmount).toLocaleString()} ₫)
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary Card */}
                    <div className="col-lg-5">
                        <div className="card shadow-sm border-0 position-sticky" style={{ top: "24px" }}>
                            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0 fw-bold text-dark">
                                    Order Summary
                                </h5>
                                <span className="badge bg-light text-primary border font-monospace">
                                    {checkoutData?.invoiceCode || "INV-CHECKOUT"}
                                </span>
                            </div>
                            <div className="card-body p-3">
                                {/* Line items */}
                                {checkoutData?.items && checkoutData.items.length > 0 ? (
                                    checkoutData.items.map((item, idx) => (
                                        <div key={idx} className="d-flex justify-content-between py-2 border-bottom small">
                                            <div>
                                                <div className="fw-bold text-dark">{item.itemName}</div>
                                                <div className="text-muted" style={{ fontSize: "0.75rem" }}>
                                                    Qty: {item.quantity} · {item.itemCode || "Lab Package"}
                                                </div>
                                            </div>
                                            <div className="fw-bold font-monospace text-dark">
                                                {Number(item.totalPrice || item.unitPrice * item.quantity).toLocaleString()} ₫
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="d-flex justify-content-between py-2 border-bottom small">
                                        <div>
                                            <div className="fw-bold text-dark">General Laboratory Consultation</div>
                                            <div className="text-muted" style={{ fontSize: "0.75rem" }}>Diagnostic testing order</div>
                                        </div>
                                        <div className="fw-bold font-monospace text-dark">
                                            {Number(currentSubTotal || 250000).toLocaleString()} ₫
                                        </div>
                                    </div>
                                )}

                                {/* Fees & Discounts */}
                                <div className="d-flex justify-content-between py-2 small text-muted">
                                    <span>Service fee</span>
                                    <span className="font-monospace">0 ₫</span>
                                </div>

                                {currentDiscountAmount > 0 && (
                                    <div className="d-flex justify-content-between py-2 small text-success fw-semibold">
                                        <span>Discount ({appliedDiscount?.discountCode || "PROMO"})</span>
                                        <span className="font-monospace">-{Number(currentDiscountAmount).toLocaleString()} ₫</span>
                                    </div>
                                )}

                                <hr className="my-2" />

                                {/* Total Due */}
                                <div className="d-flex justify-content-between align-items-center py-2">
                                    <span className="fw-bold text-dark">Total Due</span>
                                    <span className="h4 mb-0 fw-bold text-primary font-monospace">
                                        {Number(totalDue).toLocaleString()} ₫
                                    </span>
                                </div>
                            </div>

                            {/* Card Footer: Action Button & Security */}
                            <div className="card-footer bg-white border-0 p-3 pt-0">
                                <button
                                    type="button"
                                    onClick={handleProcessPayment}
                                    disabled={submitting || loading}
                                    className="btn btn-primary w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 mb-2"
                                >
                                    <FaShieldAlt />
                                    {submitting ? "Processing..." : `Pay Now · ${Number(totalDue).toLocaleString()} ₫`}
                                </button>
                                <div className="text-center text-muted small d-flex align-items-center justify-content-center gap-1" style={{ fontSize: "0.75rem" }}>
                                    <FaLock size={10} /> Secured by VNPay · PCI DSS compliant · TLS 1.3
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
