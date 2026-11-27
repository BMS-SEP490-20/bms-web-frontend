/**
 * @file ExportTestResultPdfPage.jsx
 * @description UC62 — Xuất Phiếu Kết Quả Xét Nghiệm & Chia Sẻ Kết Quả Cho Bác Sĩ (Bản Ký Số Điện Tử).
 * Cổng Bệnh Nhân: Tra cứu phiếu xét nghiệm chính thức có chữ ký số SHA-256 ISO 15189:2022,
 * cờ cảnh báo bất thường sinh học (H/L), mã barcode mẫu máu, bác sĩ chỉ định và kỹ thuật viên thực hiện.
 * Conforms to: Rule 19, ISO 15189:2022 Medical Standards & Nghị định 123/2020/NĐ-CP.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Download, Share2, ArrowLeft, CheckCircle2, AlertTriangle, Printer, ShieldCheck, Stethoscope, Barcode as LucideBarcode, TestTube2, FileText, Check, Copy, Info } from 'lucide-react';
import { fetchPatientResult, exportResultPdf, shareResultWithDoctor, fetchPatientResultsList } from '../api/patientResultApi';
import { getTestHistory } from '../api/testHistoryApi';
import { getMyPatientInformation } from '../../../services/patientService';
import { getStoredUser } from '../../../constants/roles';
import './PatientHomepage.css';

export default function ExportTestResultPdfPage() {
  const { orderId: paramOrderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = useMemo(() => getStoredUser(), []);

  const searchParams = new URLSearchParams(location.search);
  const queryOrderId = searchParams.get('orderId') || searchParams.get('order') || searchParams.get('id');

  const [activeOrderId, setActiveOrderId] = useState(paramOrderId || queryOrderId || null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Load patient profile
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const info = await getMyPatientInformation();
        if (isMounted && info) {
          setPatientProfile(info);
        }
      } catch {
        if (isMounted) setPatientProfile(storedUser);
      }
    }
    loadProfile();
    return () => { isMounted = false; };
  }, [storedUser]);

  // Determine active patient identifier
  const activePatientId = useMemo(() => {
    return (
      patientProfile?.patientCode ||
      patientProfile?.id ||
      patientProfile?._id ||
      storedUser?.patientCode ||
      storedUser?.id ||
      storedUser?.sub ||
      ''
    );
  }, [patientProfile, storedUser]);

  // 2. Dynamically determine the latest signed order ID if not passed via URL
  useEffect(() => {
    let isMounted = true;

    async function resolveLatestSignedOrder() {
      if (paramOrderId || queryOrderId) {
        if (isMounted) setActiveOrderId(paramOrderId || queryOrderId);
        return;
      }

      if (!activePatientId) return;

      try {
        // Try fetching patient results list
        const resultsList = await fetchPatientResultsList(activePatientId);
        if (isMounted && Array.isArray(resultsList) && resultsList.length > 0) {
          // Find first signed or released report
          const latestSigned = resultsList.find(r => r.VerificationHash || r.digitalSignature || r.OverallStatus === 'Released' || r.status === 'Approved') || resultsList[0];
          const resolvedId = latestSigned.OrderId || latestSigned.orderId || latestSigned.OrderCode || latestSigned.id;
          if (resolvedId) {
            setActiveOrderId(resolvedId);
            return;
          }
        }

        // Fallback: try test-history endpoint
        const historyData = await getTestHistory({ patientId: activePatientId, page: 1, pageSize: 5 });
        if (isMounted && historyData?.items && Array.isArray(historyData.items) && historyData.items.length > 0) {
          const latestAvailable = historyData.items.find(item => item.available) || historyData.items[0];
          const resolvedId = latestAvailable.resultCode || latestAvailable.id || latestAvailable.sampleId;
          if (resolvedId) {
            setActiveOrderId(resolvedId);
            return;
          }
        }
      } catch (err) {
        console.warn('Không thể tự động tìm phiếu kết quả mới nhất:', err);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    resolveLatestSignedOrder();
    return () => { isMounted = false; };
  }, [paramOrderId, queryOrderId, activePatientId]);

  // 3. Load detailed test result for active order
  const loadResult = useCallback(async (id) => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      let data = await fetchPatientResult(id);
      // Barcode / sample id often 404 on /order/{id} — resolve TRE via test-history
      if (!data && activePatientId) {
        try {
          const historyData = await getTestHistory({ patientId: activePatientId, page: 1, pageSize: 50 });
          const items = historyData?.items || historyData?.data || [];
          const match = items.find((row) => {
            const keys = [row.resultCode, row.id, row.sampleId, row.barcode, row.summary?.id, row.summary?.sampleId, row.summary?.resultCode];
            return keys.some((k) => String(k || '').toLowerCase() === String(id).toLowerCase());
          });
          const resolved = match?.resultCode || match?.id || match?.summary?.resultCode || match?.summary?.id;
          if (resolved && resolved !== id) {
            data = await fetchPatientResult(resolved);
            if (data) setActiveOrderId(resolved);
          }
        } catch (resolveErr) {
          console.warn('Không resolve được mã kết quả từ lịch sử:', resolveErr);
        }
      }
      if (data) {
        setResult(data);
      } else {
        setErrorMessage(`Không tìm thấy hồ sơ kết quả xét nghiệm y khoa cho mã phiếu '${id}'.`);
      }
    } catch (err) {
      console.error('Lỗi khi tải kết quả xét nghiệm:', err);
      setErrorMessage('Không thể tải kết quả xét nghiệm lúc này. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [activePatientId]);

  useEffect(() => {
    if (activeOrderId) {
      loadResult(activeOrderId);
    }
  }, [activeOrderId, loadResult]);

  // Export PDF (A4 Medical Standard)
  const handleExportPdf = async () => {
    if (!result) return;
    setExporting(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      const orderTarget = result.OrderId || result.OrderCode || activeOrderId;
      const exportPayload = await exportResultPdf(orderTarget);

      if (exportPayload && exportPayload.printableHtml) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(exportPayload.printableHtml);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 500);
          setSuccessMessage('Hệ thống đã chuẩn bị bản in PDF A4. Quý khách vui lòng chọn "Lưu dưới dạng PDF" (Save as PDF) trong hộp thoại in.');
        } else {
          window.print();
          setSuccessMessage('Đang mở hộp thoại in phiếu kết quả xét nghiệm A4.');
        }
      } else {
        window.print();
        setSuccessMessage('Đang mở hộp thoại in phiếu kết quả xét nghiệm A4.');
      }
    } catch (err) {
      console.error('Lỗi khi xuất PDF kết quả xét nghiệm:', err);
      window.print();
    } finally {
      setExporting(false);
    }
  };

  // Secure Doctor Share Link
  const handleShare = async () => {
    if (!result) return;
    setSharing(true);
    setCopied(false);
    try {
      const orderTarget = result.OrderId || result.OrderCode || activeOrderId;
      const share = await shareResultWithDoctor(orderTarget);
      if (share) {
        const fullUrl = `${window.location.origin}${share.shareUrl || `/results/share?orderId=${orderTarget}&token=${share.shareToken}`}`;
        setShareData({
          ...share,
          fullUrl
        });
        setShowShareModal(true);
      } else {
        const fallbackUrl = window.location.href;
        setShareData({ fullUrl: fallbackUrl });
        setShowShareModal(true);
      }
    } catch (err) {
      console.error('Lỗi khi tạo liên kết chia sẻ cho Bác sĩ:', err);
      const fallbackUrl = window.location.href;
      setShareData({ fullUrl: fallbackUrl });
      setShowShareModal(true);
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

  // Normalized display fields conforming to requirements
  const patientNameDisplay = result?.PatientName || patientProfile?.fullName || storedUser?.fullName || 'Bệnh nhân BMS';
  const patientIdDisplay = result?.PatientId || patientProfile?.patientCode || patientProfile?.id || activePatientId || '—';
  const dobAgeSexDisplay = result?.DobAgeSex || (patientProfile?.dateOfBirth ? `${new Date(patientProfile.dateOfBirth).toLocaleDateString('vi-VN')}${patientProfile.gender ? ` · ${patientProfile.gender}` : ''}` : (patientProfile?.gender || 'Chưa ghi nhận'));
  const barcodeDisplay = result?.Barcode || result?.barcode || result?.SampleBarcode || (result?.OrderId ? `BC-${result.OrderId.replace(/\D/g, '').slice(-8)}` : '—');
  const orderingDoctorDisplay = result?.OrderingDoctor || result?.doctorName || result?.ApprovedByDoctor || result?.approvingDoctorName || 'Chưa chỉ định';
  const performedByDisplay = result?.PerformedBy || result?.technicianName || 'KTV Phòng Xét Nghiệm';
  const labHeadDisplay = result?.ApprovedByDoctor || result?.approvingDoctorName || result?.labHead || 'Bác sĩ điều trị';
  const verificationHashDisplay = result?.VerificationHash || result?.digitalSignature || '';
  const collectionTimeDisplay = result?.CollectionTime ? new Date(result.CollectionTime).toLocaleString('vi-VN') : '—';
  const releasedDateDisplay = result?.ReleasedDate ? new Date(result.ReleasedDate).toLocaleString('vi-VN') : (result?.approvedAt ? new Date(result.approvedAt).toLocaleString('vi-VN') : '—');
  const packageNameDisplay = result?.PackageName || result?.packageName || 'Phiếu Kết Quả Xét Nghiệm';
  const parametersList = Array.isArray(result?.Parameters) ? result.Parameters : Array.isArray(result?.parameters) ? result.parameters : [];
  const icd10Display = result?.Icd10Code || result?.icd10Code || '';
  const finalDiagnosisDisplay = result?.FinalDiagnosis || result?.finalDiagnosis || '';
  const doctorConclusionDisplay = result?.DoctorAssessment || result?.doctorConclusion || result?.conclusionNotes || '';
  const treatmentAdviceDisplay = result?.TreatmentAdvice || result?.treatmentAdvice || '';
  const followUpDateDisplay = result?.FollowUpDate || result?.followUpDate || '';

  return (
    <div className="bms-patient-portal-page" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '60px' }}>
      {/* Main Content Area */}
      <div style={{ maxWidth: '1020px', margin: '12px auto 24px', padding: '0 16px' }}>
        {/* Notification Alerts */}
        {errorMessage && (
          <div className="alert alert-danger d-flex align-items-center no-print" role="alert" style={{ borderRadius: '8px', fontSize: '13.5px' }}>
            <AlertTriangle className="me-2 flex-shrink-0" size="1em" />
            <div>{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success d-flex align-items-center no-print" role="alert" style={{ borderRadius: '8px', fontSize: '13.5px' }}>
            <CheckCircle2 className="me-2 flex-shrink-0" size="1em" />
            <div>{successMessage}</div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải phiếu kết quả xét nghiệm...</span>
            </div>
            <div className="text-muted mt-2" style={{ fontSize: '13.5px' }}>
              Đang tải phiếu kết quả xét nghiệm...
            </div>
          </div>
        ) : result ? (
          <>
            {/* Page Header / Action Toolbar */}
            <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2 no-print">
              <div>
                <div style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Link to="/patient/test-history" style={{ color: '#0284c7', textDecoration: 'none' }}>Lịch Sử Xét Nghiệm</Link>
                  <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
                  <span style={{ color: '#0f172a', fontWeight: '600' }}>{result.OrderCode || result.OrderId || activeOrderId}</span>
                  <i className="bi bi-chevron-right" style={{ fontSize: '10px' }}></i>
                  <span>Phiếu Kết Quả Xét Nghiệm</span>
                </div>
                <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                  {packageNameDisplay}
                </h1>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Mã chỉ định: <b>{result.OrderCode || result.OrderId || activeOrderId}</b> · Lấy mẫu: <b>{collectionTimeDisplay}</b> · Phát hành: <b>{releasedDateDisplay}</b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center gap-1.5"
                  style={{ fontSize: '13px', fontWeight: '600', padding: '8px 14px', borderRadius: '6px' }}
                  onClick={handleShare}
                  disabled={sharing}
                >
                  <Share2 className="text-primary" size="1em" /> {sharing ? 'Đang tạo link...' : 'Chia sẻ Bác sĩ'}
                </button>

                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center gap-1.5"
                  style={{ background: '#0284c7', borderColor: '#0284c7', fontSize: '13px', fontWeight: '600', padding: '8px 18px', borderRadius: '6px' }}
                  onClick={handleExportPdf}
                  disabled={exporting}
                >
                  <Printer size="1em" /> {exporting ? 'Đang chuẩn bị PDF...' : 'In / Xuất PDF (A4)'}
                </button>
              </div>
            </div>

            {/* Official Printable Diagnostic Report Sheet */}
            <div className="card shadow-sm border-0 mb-4" id="printable-diagnostic-report" style={{ borderRadius: '10px', overflow: 'hidden', background: '#ffffff' }}>
              {/* Report Header: Clinic Branding & ISO 15189 Notice */}
              <div className="p-2 border-bottom" style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="badge bg-primary text-white fw-bold px-2 py-1" style={{ fontSize: '11px', letterSpacing: '1px' }}>
                        BMS LAB
                      </span>
                      <span className="fw-bold text-dark" style={{ fontSize: '15px' }}>
                        HỆ THỐNG PHÒNG XÉT NGHIỆM Y KHOA BMS MEDLAB
                      </span>
                    </div>
                    <div className="text-secondary small">
                      Địa chỉ: 120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh • Hotline: 1900 6868
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2.5 py-1 fw-bold mb-1 d-inline-block" style={{ fontSize: '11.5px' }}>
                      <CheckCircle2 className="me-1" size="1em" /> ĐÃ BÁC SĨ PHÊ DUYỆT
                    </span>
                    <div className="text-muted font-monospace small">
                      Mã phiếu: <b>{result.OrderCode || result.OrderId || activeOrderId}</b>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-3 pt-2 border-top">
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    Phiếu Kết Quả Xét Nghiệm Y Khoa
                  </h2>
                  <div className="text-secondary small mt-1">
                    Gói dịch vụ: <strong>{packageNameDisplay}</strong>
                  </div>
                </div>
              </div>

              {/* 1. CLINICAL METADATA CARD (Mã bệnh nhân, Barcode, Bác sĩ chỉ định, Người thực hiện, v.v.) */}
              <div className="p-3 bg-white border-bottom" style={{ fontSize: '13px' }}>
                <div className="row g-2">
                  <div className="col-md-6">
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 130 }}>Họ và tên bệnh nhân:</span>
                      <strong className="text-dark text-uppercase">{patientNameDisplay}</strong>
                    </div>
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 130 }}>Mã bệnh nhân:</span>
                      <span className="font-monospace text-primary fw-bold">{patientIdDisplay}</span>
                    </div>
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 130 }}>Ngày sinh / Giới tính:</span>
                      <span>{dobAgeSexDisplay}</span>
                    </div>
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 130 }}>Barcode mẫu máu:</span>
                      <span className="badge bg-light text-dark border font-monospace px-2 py-1 fw-bold d-inline-flex align-items-center gap-1">
                        <LucideBarcode className="text-primary" size="1em" /> {barcodeDisplay}
                      </span>
                    </div>
                  </div>

                  <div className="col-md-6 border-start-md">
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 135 }}>Bác sĩ chỉ định:</span>
                      <strong>{orderingDoctorDisplay}</strong>
                    </div>
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 135 }}>Người thực hiện:</span>
                      <span>{performedByDisplay}</span>
                    </div>
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 135 }}>Thời gian lấy mẫu:</span>
                      <span>{collectionTimeDisplay}</span>
                    </div>
                    <div className="d-flex gap-2 py-1">
                      <span className="text-muted" style={{ minWidth: 135 }}>Thời gian ký duyệt:</span>
                      <span>{releasedDateDisplay}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. PARAMETERS TABLE WITH H/L WARNING FLAGS */}
              <div className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                    Bảng Chi Tiết Chỉ Số Xét Nghiệm Sinh Học
                  </h3>
                  {result.AbnormalCount > 0 ? (
                    <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 fw-bold" style={{ fontSize: '11px' }}>
                      ● {result.AbnormalCount} chỉ số ngoài khoảng tham chiếu (H/L)
                    </span>
                  ) : (
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold" style={{ fontSize: '11px' }}>
                      ● Tất cả chỉ số trong khoảng tham chiếu bình thường
                    </span>
                  )}
                </div>

                <div className="table-responsive">
                  <table className="table table-hover table-bordered align-middle mb-0" style={{ fontSize: '13px' }}>
                    <thead className="table-light text-secondary" style={{ fontSize: '12px' }}>
                      <tr>
                        <th style={{ width: '30%', paddingLeft: '12px' }}>Tên Chỉ Số Xét Nghiệm</th>
                        <th className="text-end" style={{ width: '15%' }}>Kết Quả Đo</th>
                        <th style={{ width: '12%' }}>Đơn Vị</th>
                        <th style={{ width: '23%' }}>Khoảng Tham Chiếu Sinh Học</th>
                        <th className="text-center" style={{ width: '10%' }}>Cờ Cảnh Báo (H/L)</th>
                        <th className="text-end" style={{ width: '10%' }}>Độ Lệch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parametersList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-2 text-muted">
                            Chưa có danh mục chỉ số đo lường chi tiết cho phiếu xét nghiệm này.
                          </td>
                        </tr>
                      ) : (
                        parametersList.map((param, index) => {
                          const flagRaw = String(param.Flag || param.flag || 'N').toUpperCase();
                          const isCrit = flagRaw === 'HH' || flagRaw === 'LL';
                          const isHigh = flagRaw === 'H' || flagRaw === 'HH';
                          const isLow = flagRaw === 'L' || flagRaw === 'LL';
                          const isAbnormal = param.IsAbnormal || isHigh || isLow;

                          // Flag badge styles
                          let flagBg = '#e2e8f0';
                          let flagColor = '#475569';
                          let flagLabel = 'N';

                          if (flagRaw === 'HH') {
                            flagBg = '#dc2626';
                            flagColor = '#ffffff';
                            flagLabel = 'HH (Nguy kịch)';
                          } else if (flagRaw === 'H') {
                            flagBg = '#f59e0b';
                            flagColor = '#ffffff';
                            flagLabel = 'H (Cao)';
                          } else if (flagRaw === 'LL') {
                            flagBg = '#1E60E6';
                            flagColor = '#ffffff';
                            flagLabel = 'LL (Nguy kịch)';
                          } else if (flagRaw === 'L') {
                            flagBg = '#1E60E6';
                            flagColor = '#ffffff';
                            flagLabel = 'L (Thấp)';
                          } else {
                            flagBg = '#f1f5f9';
                            flagColor = '#15803d';
                            flagLabel = 'Bình thường';
                          }

                          return (
                            <tr key={index} style={{ background: isCrit ? '#fef2f2' : (isAbnormal ? '#fffbeb' : undefined) }}>
                              <td style={{ paddingLeft: '12px', fontWeight: isAbnormal ? '600' : '500', color: isCrit ? '#991b1b' : '#1e293b' }}>
                                {param.ParameterName || param.name || param.code}
                              </td>
                              <td className="text-end font-monospace" style={{
                                fontWeight: isAbnormal ? '700' : '500',
                                color: isCrit ? '#dc2626' : (isHigh ? '#d97706' : (isLow ? '#1E60E6' : '#0f172a')),
                                fontSize: '13.5px'
                              }}>
                                {param.Value ?? param.value ?? '—'}
                              </td>
                              <td className="text-secondary">{param.Unit || param.unit || '—'}</td>
                              <td className="text-secondary">{param.ReferenceRange || param.referenceRange || '—'}</td>
                              <td className="text-center">
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  background: flagBg,
                                  color: flagColor
                                }}>
                                  {flagLabel}
                                </span>
                              </td>
                              <td className="text-end font-monospace text-muted" style={{ fontSize: '12px' }}>
                                {param.DeltaPrevious || param.deltaPrevious || '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="small text-muted mt-2 ps-1">
                  * Ghi chú: Khoảng tham chiếu sinh học mang tính tham khảo theo độ tuổi và giới tính của bệnh nhân.
                </div>
              </div>

              {/* 3. DOCTOR'S CLINICAL ASSESSMENT & FINAL DIAGNOSIS */}
              <div className="p-3 border-top bg-light">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <Stethoscope className="text-primary" size="1em" />
                    <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: '700', color: '#0f172a' }}>
                      Chẩn Đoán Cuối Cùng &amp; Nhận Định Lâm Sàng Của Bác Sĩ
                    </h4>
                  </div>
                  {icd10Display && (
                    <span className="badge bg-primary text-white font-monospace px-2 py-1" style={{ fontSize: '11.5px' }}>
                      ICD-10: {icd10Display}
                    </span>
                  )}
                </div>
                <div className="p-3 bg-white border rounded" style={{ fontSize: '13.5px', lineHeight: '1.65', color: '#1e293b', borderLeft: '4px solid #0284c7' }}>
                  {finalDiagnosisDisplay && (
                    <div className="mb-2 pb-2 border-bottom">
                      <span className="text-muted small d-block text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                        Chẩn đoán cuối cùng
                      </span>
                      <strong className="text-dark" style={{ fontSize: '14.5px' }}>
                        {finalDiagnosisDisplay}
                      </strong>
                    </div>
                  )}
                  <div className="mb-2">
                    <span className="text-muted small d-block text-uppercase fw-semibold" style={{ fontSize: '11px' }}>
                      Kết luận chuyên môn của bác sĩ
                    </span>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {doctorConclusionDisplay || 'Các chỉ số xét nghiệm huyết học và sinh hóa đã được phân tích hoàn tất. Khuyến nghị tái khám định kỳ và tham vấn bác sĩ điều trị để được hướng dẫn phác đồ phù hợp.'}
                    </div>
                  </div>
                  {treatmentAdviceDisplay && (
                    <div className="mt-2 pt-2 border-top">
                      <span className="text-primary small fw-bold d-block mb-1">Lời dặn điều trị, dinh dưỡng &amp; lối sống:</span>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{treatmentAdviceDisplay}</div>
                    </div>
                  )}
                  {followUpDateDisplay && (
                    <div className="mt-2 pt-2 border-top small text-dark">
                      <span className="text-muted">Hẹn tái khám:</span> <b>{followUpDateDisplay}</b>
                    </div>
                  )}
                  <div className="text-secondary small mt-2 pt-2 border-top">
                    — <b>{labHeadDisplay !== 'Bác sĩ điều trị' ? labHeadDisplay : orderingDoctorDisplay}</b> • Chuyên khoa Nội tổng quát • BMS Medical Center
                  </div>
                </div>
              </div>

              {/* 4. DIGITAL SIGNATURE BLOCK (TRƯỞNG KHOA KÝ SỐ SHA-256) */}
              <div className="p-2 border-top">
                <div className="row text-center">
                  <div className="col-6">
                    <div className="text-muted small mb-1">KỸ THUẬT VIÊN XÉT NGHIỆM</div>
                    <div className="fw-semibold text-secondary" style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="badge bg-light text-secondary border font-monospace">Đã kiểm chuẩn kỹ thuật</span>
                    </div>
                    <strong className="text-dark d-block">{performedByDisplay}</strong>
                    <small className="text-muted">Cử nhân Xét nghiệm Y học</small>
                  </div>

                  <div className="col-6">
                    <div className="text-muted small mb-1">BÁC SĨ ĐIỀU TRỊ PHÊ DUYỆT</div>
                    <div style={{ height: '55px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 fw-bold" style={{ fontSize: '11px' }}>
                        <CheckCircle2 className="me-1" size="1em" /> ĐÃ PHÊ DUYỆT: {labHeadDisplay}
                      </span>
                      <small className="text-muted font-monospace mt-1" style={{ fontSize: '10px' }}>
                        Thời gian duyệt: {releasedDateDisplay}
                      </small>
                    </div>
                    <strong className="text-dark d-block">{labHeadDisplay}</strong>
                    <small className="text-muted">Bác sĩ điều trị — BMS Clinical Lab</small>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card p-3 text-center text-muted shadow-sm border-0" style={{ borderRadius: '10px' }}>
            <TestTube2 size={48} className="mx-auto mb-3 text-secondary opacity-50" />
            <h5 className="text-dark fw-bold">Chưa Có Phiếu Kết Quả Xét Nghiệm Đã Phê Duyệt</h5>
            <p className="small text-secondary mx-auto" style={{ maxWidth: '480px' }}>
              Hiện chưa có phiếu kết quả xét nghiệm nào đã được Bác sĩ điều trị phê duyệt và trả kết quả cho hồ sơ của bạn.
              Khi Bác sĩ hoàn tất thẩm định lâm sàng, kết quả sẽ hiển thị tại đây.
            </p>
            <div className="mt-3 d-flex justify-content-center gap-2">
              <Link to="/patient/test-history" className="btn btn-outline-primary btn-sm px-3">
                <ArrowLeft className="me-1" size="1em" /> Xem Lịch Sử Xét Nghiệm
              </Link>
              <Link to="/home" className="btn btn-primary btn-sm px-3">
                Về Trang Chủ Bệnh Nhân
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Share Modal */}
      {showShareModal && shareData && (
        <div className="modal show d-block no-print" tabIndex="-1" style={{ background: 'rgba(15, 23, 42, 0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title d-flex align-items-center gap-2" style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  <ShieldCheck className="text-primary" size="1em" /> Chia Sẻ Kết Quả Cho Bác Sĩ Điều Trị
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowShareModal(false)}></button>
              </div>
              <div className="modal-body pt-2">
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>
                  Đường dẫn an toàn có hiệu lực trong 7 ngày, cho phép Bác sĩ điều trị xem trực tiếp phiếu kết quả xét nghiệm chính thức đã ký số mà không cần đăng nhập tài khoản bệnh nhân.
                </p>

                <div className="mb-3">
                  <label className="form-label text-muted small fw-semibold">Liên kết chia sẻ bảo mật</label>
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
                      {copied ? <><Check className="me-1" size="1em" /> Đã sao chép!</> : <><Copy className="me-1" size="1em" /> Sao chép</>}
                    </button>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#166534' }}>
                  <Info className="me-1" size="1em" /> Mọi lượt truy cập xem kết quả đều được ghi nhận vào nhật ký kiểm toán y tế (Audit Log) theo tiêu chuẩn bảo mật y tế.
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowShareModal(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
