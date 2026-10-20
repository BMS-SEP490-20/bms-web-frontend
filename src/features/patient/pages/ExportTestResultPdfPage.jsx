import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchPatientResult, exportResultPdf, shareResultWithDoctor } from '../api/patientResultApi';
import './PatientHomepage.css';

/**
 * UC62 — Export Test Results (PDF)
 * Patient Portal diagnostic result inspection, doctor sharing, and official PDF export page.
 * Corresponds to issue I3-044, designed strictly following docs-output/screens/02-patient.html#uc62.
 */
export default function ExportTestResultPdfPage() {
    const { orderId: paramOrderId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // Query param support e.g. ?orderId=ORD-260927-0231
    const searchParams = new URLSearchParams(location.search);
    const activeOrderId = paramOrderId || searchParams.get('orderId') || 'ORD-260927-0231';

    const [orderId, setOrderId] = useState(activeOrderId);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareData, setShareData] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        loadResult(orderId);
    }, [orderId]);

    const loadResult = async (id) => {
        setLoading(true);
        setErrorMessage('');
        try {
            const data = await fetchPatientResult(id);
            if (data) {
                setResult(data);
            } else {
                setErrorMessage(`Could not find laboratory results for order '${id}'.`);
            }
        } catch (err) {
            console.error('Error fetching patient test result:', err);
            setErrorMessage('Unable to load test results. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        if (!result) return;
        setExporting(true);
        setSuccessMessage('');
        setErrorMessage('');
        try {
            const exportPayload = await exportResultPdf(result.OrderId || orderId);
            if (exportPayload && exportPayload.printableHtml) {
                // Open new window for formatted printable view
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.open();
                    printWindow.document.write(exportPayload.printableHtml);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                        printWindow.print();
                    }, 500);
                    setSuccessMessage('Print document prepared. Select "Save as PDF" in your print dialog.');
                } else {
                    // Fallback to iframe if popup blocked
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.srcdoc = exportPayload.printableHtml;
                    document.body.appendChild(iframe);
                    iframe.onload = () => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                        setTimeout(() => document.body.removeChild(iframe), 2000);
                    };
                    setSuccessMessage('Document ready for export.');
                }
            } else {
                setErrorMessage('Unable to prepare PDF printable payload.');
            }
        } catch (err) {
            console.error('PDF export error:', err);
            setErrorMessage('PDF export failed. Please check your network connection.');
        } finally {
            setExporting(false);
        }
    };

    const handleShare = async () => {
        if (!result) return;
        setSharing(true);
        setCopied(false);
        try {
            const share = await shareResultWithDoctor(result.OrderId || orderId);
            if (share) {
                const fullUrl = `${window.location.origin}${share.shareUrl || `/results/share?orderId=${result.OrderId}&token=${share.shareToken}`}`;
                setShareData({
                    ...share,
                    fullUrl
                });
                setShowShareModal(true);
            }
        } catch (err) {
            console.error('Error creating share link:', err);
            setErrorMessage('Failed to generate secure doctor share link.');
        } finally {
            setSharing(false);
        }
    };

    const handleCopyShareLink = () => {
        if (!shareData?.fullUrl) return;
        navigator.clipboard.writeText(shareData.fullUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        });
    };

    return (
        <div className="bms-patient-portal-page" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '60px' }}>
            {/* Top Navigation Bar matching 02-patient.html */}
            <nav style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/patient/dashboard')}>
                        <span style={{ background: '#0284c7', color: '#ffffff', fontWeight: '800', fontSize: '13px', padding: '4px 8px', borderRadius: '4px', letterSpacing: '1px' }}>BMS</span>
                        <div>
                            <span style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>BMS Health</span>
                            <small style={{ display: 'block', fontSize: '10px', color: '#64748b', marginTop: '-2px' }}>Patient portal</small>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '13.5px', fontWeight: '500' }}>
                        <a href="#home" onClick={(e) => { e.preventDefault(); navigate('/patient/dashboard'); }} style={{ color: '#64748b', textDecoration: 'none' }}>Home</a>
                        <a href="#appointments" onClick={(e) => { e.preventDefault(); navigate('/patient/appointments'); }} style={{ color: '#64748b', textDecoration: 'none' }}>Appointments</a>
                        <a href="#results" onClick={(e) => { e.preventDefault(); }} style={{ color: '#0284c7', fontWeight: '700', textDecoration: 'none', borderBottom: '2px solid #0284c7', paddingBottom: '4px' }}>Results</a>
                        <a href="#payments" onClick={(e) => { e.preventDefault(); navigate('/payments/checkout'); }} style={{ color: '#64748b', textDecoration: 'none' }}>Payments</a>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                        NA
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <div style={{ maxWidth: '980px', margin: '24px auto', padding: '0 16px' }}>
                {/* Notification Alerts */}
                {errorMessage && (
                    <div className="alert alert-danger d-flex align-items-center" role="alert" style={{ borderRadius: '8px', fontSize: '13.5px' }}>
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        <div>{errorMessage}</div>
                    </div>
                )}
                {successMessage && (
                    <div className="alert alert-success d-flex align-items-center" role="alert" style={{ borderRadius: '8px', fontSize: '13.5px' }}>
                        <i className="bi bi-check-circle-fill me-2"></i>
                        <div>{successMessage}</div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading test results...</span>
                        </div>
                        <div className="text-muted mt-2" style={{ fontSize: '13px' }}>Loading clinical test results and laboratory records...</div>
                    </div>
                ) : result ? (
                    <>
                        {/* Page Header matching 02-patient.html */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                    <span style={{ cursor: 'pointer' }} onClick={() => navigate('/patient/dashboard')}>Results</span>
                                    <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
                                    <span style={{ color: '#0f172a', fontWeight: '500' }}>{result.OrderCode || result.OrderId}</span>
                                    <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
                                    <span>{result.PackageName} results</span>
                                </div>
                                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>{result.PackageName} — Results</h1>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                    Order {result.OrderCode || result.OrderId} · Collected {result.CollectionTime} · Released {result.ReleasedDate}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    style={{ fontSize: '13px', fontWeight: '600', padding: '8px 14px', borderRadius: '6px' }}
                                    onClick={handleShare}
                                    disabled={sharing}
                                >
                                    <i className="bi bi-share me-1"></i> {sharing ? 'Generating...' : 'Share'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ background: '#0284c7', borderColor: '#0284c7', fontSize: '13px', fontWeight: '600', padding: '8px 16px', borderRadius: '6px' }}
                                    onClick={handleExportPdf}
                                    disabled={exporting}
                                >
                                    <i className="bi bi-download me-1"></i> {exporting ? 'Preparing PDF...' : 'Export PDF'}
                                </button>
                            </div>
                        </div>

                        {/* Patient & Collection Info Card */}
                        <div className="card shadow-sm mb-3" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center" style={{ fontSize: '13px' }}>
                                <div>
                                    <b>Patient:</b> {result.PatientName} · <span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: '600' }}>{result.PatientId}</span> · {result.DobAgeSex}
                                </div>
                                <div>
                                    <b>Collection:</b> <span style={{ fontFamily: 'monospace' }}>{result.CollectionTime}</span> · <b>Approved by:</b> {result.ApprovedByDoctor}
                                </div>
                            </div>
                        </div>

                        {/* Results Summary Card */}
                        <div className="card shadow-sm mb-3" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <div className="card-header bg-white py-2 px-3 d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Results summary</h3>
                                {result.AbnormalCount > 0 ? (
                                    <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px' }}>
                                        ● {result.AbnormalCount} abnormal
                                    </span>
                                ) : (
                                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '12px' }}>
                                        ● Normal range
                                    </span>
                                )}
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0" style={{ fontSize: '13px' }}>
                                    <thead style={{ background: '#f8fafc', color: '#475569', fontSize: '12px' }}>
                                        <tr>
                                            <th style={{ width: '32%', paddingLeft: '16px' }}>Parameter</th>
                                            <th>Value</th>
                                            <th>Unit</th>
                                            <th>Reference range</th>
                                            <th>Delta vs. Previous</th>
                                            <th className="text-center">Flag</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.Parameters.map((param, index) => {
                                            const isCrit = param.Flag === 'HH' || param.Flag === 'LL';
                                            const isWarn = param.Flag === 'H' || param.Flag === 'L';
                                            return (
                                                <tr key={index} style={{ background: isCrit ? '#fef2f2' : undefined }}>
                                                    <td style={{ paddingLeft: '16px', fontWeight: isCrit ? '700' : '500', color: isCrit ? '#991b1b' : '#1e293b' }}>
                                                        {param.ParameterName}
                                                    </td>
                                                    <td style={{
                                                        fontWeight: (isCrit || isWarn) ? '700' : '400',
                                                        color: isCrit ? '#dc2626' : (isWarn ? '#d97706' : '#1e293b'),
                                                        fontFamily: 'monospace'
                                                    }}>
                                                        {param.Value}
                                                    </td>
                                                    <td style={{ color: '#64748b' }}>{param.Unit}</td>
                                                    <td style={{ color: '#64748b' }}>{param.ReferenceRange}</td>
                                                    <td style={{
                                                        fontFamily: 'monospace',
                                                        fontWeight: '600',
                                                        color: param.DeltaPrevious && param.DeltaPrevious.includes('+') ? (isCrit ? '#dc2626' : '#d97706') : '#64748b'
                                                    }}>
                                                        {param.DeltaPrevious || '—'}
                                                    </td>
                                                    <td className="text-center">
                                                        <span style={{
                                                            display: 'inline-block',
                                                            minWidth: '28px',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '10.5px',
                                                            fontWeight: '700',
                                                            background: param.Flag === 'HH' ? '#dc2626' :
                                                                (param.Flag === 'H' ? '#f59e0b' :
                                                                    (param.Flag === 'LL' ? '#1d4ed8' :
                                                                        (param.Flag === 'L' ? '#3b82f6' : '#e2e8f0'))),
                                                            color: param.Flag === 'N' ? '#475569' : '#ffffff'
                                                        }}>
                                                            {param.Flag}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="card-footer bg-light py-2 px-3" style={{ borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b' }}>
                                Reference intervals: {result.ReferenceIntervalNotes}
                            </div>
                        </div>

                        {/* Doctor's Assessment Card */}
                        <div className="card shadow-sm mb-3" style={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                            <div className="card-header bg-white py-2 px-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Doctor's assessment</h3>
                            </div>
                            <div className="card-body p-3">
                                <p style={{ margin: 0, fontSize: '13.5px', lineHeight: '1.65', color: '#1e293b' }}>
                                    {result.DoctorAssessment}
                                </p>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
                                    — {result.ApprovedByDoctor} · {result.DoctorSpecialty} · {result.ReleasedDate}
                                </div>
                            </div>
                        </div>

                        {/* Security Verification Footer */}
                        <div className="text-center text-muted mt-4" style={{ fontSize: '11px' }}>
                            <div>Digital diagnostic integrity verified per ISO 15189 standard</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '2px', color: '#94a3b8' }}>
                                Security Hash: {result.VerificationHash}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="card p-5 text-center text-muted" style={{ borderRadius: '8px' }}>
                        <h5>No Results Available</h5>
                        <p>No verified diagnostic report could be located for order <b>{orderId}</b>.</p>
                        <div className="mt-2">
                            <button className="btn btn-outline-primary btn-sm" onClick={() => loadResult('ORD-260927-0231')}>
                                Load Standard Lipid Profile Demo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Doctor Share Modal */}
            {showShareModal && shareData && (
                <div className="modal show d-block" tabIndex="-1" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title" style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                    <i className="bi bi-shield-check text-primary me-2"></i> Share Results with Doctor
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowShareModal(false)}></button>
                            </div>
                            <div className="modal-body pt-2">
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                                    This unique, time-limited link allows your consulting physician to securely inspect your verified laboratory results without needing a patient account.
                                </p>

                                <div className="mb-3">
                                    <label className="form-label text-muted" style={{ fontSize: '12px', fontWeight: '600' }}>Secure Link (Valid for 7 days)</label>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            readOnly
                                            value={shareData.fullUrl}
                                            style={{ fontSize: '12.5px', fontFamily: 'monospace', background: '#f8fafc' }}
                                        />
                                        <button
                                            className={`btn ${copied ? 'btn-success' : 'btn-outline-primary'}`}
                                            type="button"
                                            onClick={handleCopyShareLink}
                                            style={{ fontSize: '12.5px', fontWeight: '600' }}
                                        >
                                            {copied ? <><i className="bi bi-check2"></i> Copied!</> : <><i className="bi bi-clipboard"></i> Copy</>}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#166534' }}>
                                    <i className="bi bi-lock-fill me-1"></i> End-to-end access audit logged. You can revoke this link anytime from your security settings.
                                </div>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShareModal(false)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
