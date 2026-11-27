/**
 * @file ReviewBiochemicalResultPage.jsx
 * @description Dedicated Full-Page Clinical Laboratory Result Review & Approval Screen.
 * Reached via "Duyệt kết quả" / "Xem kết quả" from the worklist table (/laboratory/biochemical-results/:resultId).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Badge, Button, Form, Alert, Spinner } from 'react-bootstrap';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  Microscope,
  Undo2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatTubeColorVi, formatSampleTypeVi } from '../../../shared/workflow/labConsumables';
import { getTestResultById, lookupTestResults } from '../api/biochemicalResultsApi';
import { ROLES, getStoredUser, hasRole } from '../../../constants/roles';
import api from '../../../config/api';
import './LookupBiochemicalResultsPage.css';

const CLINICAL_TEMPLATES = [
  {
    label: '+ Bình thường',
    text: 'Các chỉ số xét nghiệm cận lâm sàng nằm trong giới hạn tham chiếu sinh học bình thường.'
  },
  {
    label: '+ Theo dõi & tái khám',
    text: 'Ghi nhận biến đổi chỉ số cận lâm sàng ngoài khoảng tham chiếu. Đề nghị theo dõi lâm sàng và xét nghiệm kiểm tra lại theo lịch hẹn.'
  },
  {
    label: '+ Cần đối chiếu lâm sàng',
    text: 'Chỉ số bất thường có ý nghĩa lâm sàng. Đề nghị đối chiếu triệu chứng thực thể, bệnh sử và hội chẩn điều trị tại Bệnh án EMR.'
  }
];

const RERUN_PRESETS = [
  'Nghi ngờ bất tương hợp lâm sàng, đề nghị chạy kiểm tra lại',
  'Kiểm tra lại chỉ số vượt ngưỡng bất thường / PANIC',
  'Nghi ngờ mẫu tán huyết / sai số tiền phân tích'
];

const getParams = (r) => {
  if (!r) return [];
  if (Array.isArray(r.parameters) && r.parameters.length > 0) return r.parameters;
  if (Array.isArray(r.items) && r.items.length > 0) return r.items;
  return [];
};

const isResultApproved = (r) => {
  const st = String(r?.status || r?.validationStatus || r?.approvalStatus || '').toUpperCase();
  return st.includes('APPROVED') || st.includes('SIGNED') || st === '3' || r?.isOfficialRelease === true;
};

const classifyParam = (p) => {
  const f = String(p?.flag || '').toUpperCase();
  const isPanic = f.includes('PANIC') || f.includes('CRIT') || f === '3';
  const isHigh = !isPanic && (f.includes('HIGH') || f === 'H' || f === '2');
  const isLow = !isPanic && (f.includes('LOW') || f === 'L' || f === '1');
  const isAbnormal = isPanic || isHigh || isLow || Boolean(p?.isAbnormal);
  const severity = isPanic ? 3 : isAbnormal ? 2 : 0;
  return { isPanic, isHigh, isLow, isAbnormal, severity };
};

const formatDateTimeVi = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const buildAutoSuggestion = (result) => {
  const params = getParams(result);
  const abn = params.filter((p) => classifyParam(p).isAbnormal);
  if (abn.length > 0) {
    const codes = abn.map((a) => a.code || a.abbreviation || a.name).join(', ');
    return `Ghi nhận ${abn.length}/${params.length} chỉ số ngoài khoảng tham chiếu (${codes}). Đề nghị theo dõi lâm sàng và tái khám theo chỉ định.`;
  }
  return 'Các chỉ số xét nghiệm cận lâm sàng nằm trong giới hạn tham chiếu sinh học bình thường.';
};

export default function ReviewBiochemicalResultPage() {
  const { resultId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const canApprove = hasRole(currentUser, ROLES.DOCTOR);

  const previewResult = location.state?.previewResult || null;
  const [result, setResult] = useState(previewResult);
  const [loading, setLoading] = useState(!previewResult);
  const [errorMsg, setErrorMsg] = useState('');

  const [conclusionInput, setConclusionInput] = useState('');
  const [paramFilter, setParamFilter] = useState('ALL');
  const [abnormalFirst, setAbnormalFirst] = useState(true);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showRerunBox, setShowRerunBox] = useState(false);
  const [rerunReasonInput, setRerunReasonInput] = useState('');

  const loadDetail = useCallback(async () => {
    if (!resultId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const detailRes = await getTestResultById(resultId);
      if (detailRes?.data) {
        setResult((prev) => ({
          ...(prev || {}),
          ...detailRes.data,
          packageName: detailRes.data.packageName || prev?.packageName || 'Xét nghiệm Huyết học & Sinh hóa',
          patientName:
            detailRes.data.patientName && detailRes.data.patientName !== 'Bệnh nhân'
              ? detailRes.data.patientName
              : prev?.patientName || detailRes.data.patientId || 'Bệnh nhân'
        }));
      } else {
        const searchRes = await lookupTestResults({ search: resultId });
        const found = Array.isArray(searchRes?.data) ? searchRes.data[0] : searchRes?.data;
        if (found) setResult(found);
        else setErrorMsg(`Không tìm thấy hồ sơ kết quả xét nghiệm "${resultId}".`);
      }
    } catch (err) {
      try {
        const searchRes = await lookupTestResults({ search: resultId });
        const found = Array.isArray(searchRes?.data) ? searchRes.data[0] : searchRes?.data;
        if (found) {
          setResult(found);
        } else {
          setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết kết quả xét nghiệm.');
        }
      } catch {
        setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải chi tiết kết quả xét nghiệm.');
      }
    } finally {
      setLoading(false);
    }
  }, [resultId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!result) return;
    const existing =
      result.doctorConclusion ||
      result.conclusionNotes ||
      result.conclusion ||
      result.clinicalComment ||
      '';
    setConclusionInput(existing || buildAutoSuggestion(result));
  }, [result]);

  const resultParameters = useMemo(() => getParams(result), [result]);

  const { abnormalParams, panicParams } = useMemo(() => {
    const abn = [];
    const pan = [];
    resultParameters.forEach((p) => {
      const c = classifyParam(p);
      if (c.isPanic) pan.push(p);
      if (c.isAbnormal) abn.push(p);
    });
    return { abnormalParams: abn, panicParams: pan };
  }, [resultParameters]);

  const displayedParameters = useMemo(() => {
    let list = resultParameters.map((p, idx) => ({ p, idx, meta: classifyParam(p) }));
    if (paramFilter === 'ABNORMAL') {
      list = list.filter((x) => x.meta.isAbnormal);
    }
    if (abnormalFirst) {
      list.sort((a, b) => {
        if (b.meta.severity !== a.meta.severity) return b.meta.severity - a.meta.severity;
        return a.idx - b.idx;
      });
    }
    return list;
  }, [resultParameters, paramFilter, abnormalFirst]);

  const approved = isResultApproved(result);
  const hasPanicValues = panicParams.length > 0 || Boolean(result?.isPanic || result?.hasPanic);

  const handleApproveResult = async () => {
    if (!result) return;
    const targetId = result.id || result.testResultId || resultId;
    setActionBusy(true);
    setActionFeedback(null);
    try {
      await api.post(`/TestOrder/TestResult/${encodeURIComponent(targetId)}/approve`, {
        approverId: currentUser?.id || currentUser?.userId || 'dr_hoangnam',
        approverName: currentUser?.fullName || currentUser?.name || 'Bác sĩ điều trị',
        approverRole: 'Doctor',
        doctorConclusion: conclusionInput.trim(),
        notes: conclusionInput.trim() || 'Đã thẩm định lâm sàng và phê duyệt kết quả.'
      });

      const detailRes = await getTestResultById(targetId).catch(() => null);
      setResult((prev) => ({
        ...prev,
        ...(detailRes?.data || {}),
        status: 'APPROVED',
        approvalStatus: 'Approved',
        isOfficialRelease: true,
        doctorConclusion: conclusionInput.trim(),
        conclusionNotes: conclusionInput.trim(),
        approvingDoctorName: currentUser?.fullName || currentUser?.name || prev?.approvingDoctorName,
        approvedAt: new Date().toISOString()
      }));
      setActionFeedback({
        type: 'success',
        text: 'Đã phê duyệt và phát hành kết quả xét nghiệm thành công cho bệnh nhân.'
      });
    } catch (err) {
      setActionFeedback({
        type: 'danger',
        text: err?.response?.data?.message || err?.message || 'Phê duyệt kết quả thất bại.'
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestRerun = async () => {
    if (!result) return;
    const specimenId = result.barcode || result.sampleId;
    if (!specimenId) {
      setActionFeedback({ type: 'danger', text: 'Thiếu mã ống mẫu để yêu cầu chạy lại.' });
      return;
    }
    setActionBusy(true);
    setActionFeedback(null);
    try {
      await api.post(`/laboratory/samples/${encodeURIComponent(specimenId)}/rerun`, {
        reason: rerunReasonInput.trim() || 'Bác sĩ nghi ngờ bất tương hợp lâm sàng, yêu cầu Lab kiểm tra và chạy lại mẫu.',
        requestedBy: currentUser?.fullName || currentUser?.name || 'Doctor',
        notes: `Result ${result.id || result.testResultId || resultId}`
      });
      setShowRerunBox(false);
      setRerunReasonInput('');
      setActionFeedback({
        type: 'info',
        text: `Đã gửi lệnh yêu cầu Phòng Lab kiểm tra và chạy lại ống mẫu ${specimenId}.`
      });
    } catch (err) {
      setActionFeedback({
        type: 'danger',
        text: err?.response?.data?.message || err?.message || 'Gửi yêu cầu chạy lại thất bại.'
      });
    } finally {
      setActionBusy(false);
    }
  };

  const renderFlagBadge = (p) => {
    const { isPanic, isHigh, isLow, isAbnormal } = classifyParam(p);
    if (isPanic) {
      return <Badge bg="danger" className="px-2.5 py-1 rounded-pill fw-semibold">Nguy kịch (PANIC)</Badge>;
    }
    if (isHigh) {
      return <Badge bg="warning" text="dark" className="px-2.5 py-1 rounded-pill fw-semibold">↑ Cao</Badge>;
    }
    if (isLow) {
      return <Badge bg="info" text="dark" className="px-2.5 py-1 rounded-pill fw-semibold">↓ Thấp</Badge>;
    }
    if (isAbnormal) {
      return <Badge bg="warning" text="dark" className="px-2.5 py-1 rounded-pill fw-semibold">Bất thường</Badge>;
    }
    return (
      <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2.5 py-1 rounded-pill fw-medium">
        Bình thường
      </Badge>
    );
  };

  return (
    <div className="w-100 py-1">
      {/* Top Action Header */}
      <div className="bms-page-header-card mb-3 bms-no-print">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1"
              onClick={() => navigate('/laboratory/biochemical-results')}
            >
              <ArrowLeft size={14} /> Danh sách kết quả
            </Button>
            <h1 className="bms-page-title mb-0 ms-1">Chi tiết &amp; duyệt kết quả xét nghiệm</h1>
            {result && (
              approved ? (
                <Badge bg="success" className="rounded-pill px-2.5 py-1 fw-semibold">
                  Đã duyệt &amp; phát hành
                </Badge>
              ) : (
                <Badge bg="warning" text="dark" className="rounded-pill px-2.5 py-1 fw-semibold">
                  Chờ bác sĩ duyệt
                </Badge>
              )
            )}
          </div>
          <p className="text-muted small m-0 mt-1">
            Đối chiếu từng chỉ số cận lâm sàng với khoảng tham chiếu sinh học, ghi nhận định và ký phê duyệt phát hành.
          </p>
        </div>

        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={loadDetail}
            disabled={loading}
          >
            <RefreshCw className={loading ? 'fa-spin me-1' : 'me-1'} size={13} /> Tải lại
          </Button>
          {result && (
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-pill px-3 fw-semibold text-nowrap"
              onClick={() => window.print()}
            >
              <Printer className="me-1" size={13} /> In phiếu KQ
            </Button>
          )}
        </div>
      </div>

      {errorMsg && (
        <Alert variant="danger" className="rounded-3 py-2.5 px-3 mb-3 small">
          <AlertTriangle className="me-2" size={15} />
          {errorMsg}
        </Alert>
      )}

      {loading && !result ? (
        <div className="bms-review-card py-5 text-center text-muted">
          <Spinner animation="border" variant="primary" className="mb-2" />
          <div className="small">Đang tải chi tiết kết quả xét nghiệm...</div>
        </div>
      ) : result ? (
        <div className="bms-review-card">
          {/* 1. Patient & Specimen Summary Strip (4 Spacious Cards) */}
          <div className="bms-review-info-grid">
            <div className="bms-review-info-box">
              <span className="bms-review-info-label">Người bệnh</span>
              <span className="bms-review-info-main">{result.patientName}</span>
              <span className="bms-review-info-sub font-monospace">
                {result.patientId}
                {result.patientGender
                  ? ` · ${result.patientGender === 'Male' ? 'Nam' : result.patientGender === 'Female' ? 'Nữ' : result.patientGender}`
                  : ''}
                {result.patientDob ? ` · ${result.patientDob}` : ''}
              </span>
            </div>

            <div className="bms-review-info-box">
              <span className="bms-review-info-label">Mã kết quả</span>
              <span className="bms-review-info-main font-monospace text-primary">
                {result.id || result.testResultId || resultId}
              </span>
              <span className="bms-review-info-sub">
                {Number(result.analysisRun) > 1 ? `Lần phân tích #${result.analysisRun} (Chạy lại)` : 'Lần phân tích #1'}
              </span>
            </div>

            <div className="bms-review-info-box">
              <span className="bms-review-info-label">Bệnh phẩm &amp; Ống mẫu</span>
              <span className="bms-review-info-main font-monospace">
                {result.barcode || result.sampleId}
              </span>
              <span className="bms-review-info-sub">
                {formatSampleTypeVi(result.sampleType || 'Blood')} · {formatTubeColorVi(result.tubeColor || 'EDTA')}
              </span>
            </div>

            <div className="bms-review-info-box">
              <span className="bms-review-info-label">Gói xét nghiệm &amp; Thời gian</span>
              <span className="bms-review-info-main text-truncate" title={result.packageName}>
                {result.packageName || 'Xét nghiệm Huyết học & Sinh hóa'}
              </span>
              <span className="bms-review-info-sub">
                {formatDateTimeVi(result.approvedAt || result.createdAt || result.updatedAt || result.displayTime)}
              </span>
            </div>
          </div>

          {/* 2. Zero-Scroll Abnormal / PANIC Summary Strip */}
          {resultParameters.length > 0 && (
            <div
              className={`bms-triage-strip ${
                hasPanicValues ? 'is-panic' : abnormalParams.length > 0 ? 'is-abnormal' : 'is-normal'
              }`}
            >
              {hasPanicValues ? (
                <div className="d-flex align-items-center gap-2 small fw-bold text-danger">
                  <AlertTriangle size={16} className="flex-shrink-0" />
                  <span>
                    CẢNH BÁO CHỈ SỐ NGUY KỊCH (PANIC VALUE): Phát hiện {panicParams.length} thông số vượt ngưỡng an toàn — bác sĩ cần đối chiếu lâm sàng hoặc yêu cầu Lab chạy lại trước khi duyệt.
                  </span>
                </div>
              ) : abnormalParams.length > 0 ? (
                <div className="d-flex align-items-center gap-2 small fw-bold text-warning-emphasis">
                  <AlertTriangle size={15} className="flex-shrink-0" />
                  <span>
                    Phát hiện {abnormalParams.length}/{resultParameters.length} chỉ số ngoài khoảng tham chiếu:
                  </span>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2 small fw-semibold text-success">
                  <CheckCircle2 size={15} className="flex-shrink-0" />
                  <span>
                    Tất cả {resultParameters.length}/{resultParameters.length} chỉ số nằm trong giới hạn tham chiếu sinh học bình thường.
                  </span>
                </div>
              )}

              {abnormalParams.length > 0 && (
                <div className="bms-abnormal-chip-row">
                  {abnormalParams.map((p, i) => {
                    const c = classifyParam(p);
                    const refText =
                      typeof p.referenceRange === 'object' && p.referenceRange
                        ? p.referenceRange.display || `${p.referenceRange.low ?? ''}–${p.referenceRange.high ?? ''}`
                        : p.referenceRange || p.referenceInterval || p.normalRange || '';
                    return (
                      <span key={i} className={`bms-abnormal-chip ${c.isPanic ? 'is-panic' : ''}`}>
                        <strong className="font-monospace">{p.code || p.abbreviation || p.name}</strong>
                        <span className="fw-bold font-monospace">
                          {p.value ?? p.measuredValue} {p.unit || ''}
                        </span>
                        <span>{c.isPanic ? 'PANIC' : c.isHigh ? '↑ Cao' : c.isLow ? '↓ Thấp' : 'Bất thường'}</span>
                        {refText && <span className="opacity-75">(TC: {refText})</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Full-Width Parameter Table (No Cramped Scroll Box) */}
          <div className="bms-param-toolbar">
            <div className="d-flex align-items-center gap-2">
              <Microscope size={16} className="text-primary" />
              <span className="fw-bold text-dark small text-uppercase">Bảng Chỉ Số Đo Cận Lâm Sàng</span>
              <Badge bg="primary-subtle" text="primary" className="rounded-pill px-2.5">
                {displayedParameters.length} / {resultParameters.length} chỉ số
              </Badge>
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap bms-no-print">
              <Form.Check
                type="checkbox"
                id="review-abnormal-first"
                label={<span className="small text-secondary fw-medium">Đưa bất thường lên đầu</span>}
                checked={abnormalFirst}
                onChange={(e) => setAbnormalFirst(e.target.checked)}
                className="mb-0"
              />
              <div className="bms-seg-group">
                <button
                  type="button"
                  className={`bms-seg-btn ${paramFilter === 'ALL' ? 'is-active' : ''}`}
                  onClick={() => setParamFilter('ALL')}
                >
                  Tất cả ({resultParameters.length})
                </button>
                <button
                  type="button"
                  className={`bms-seg-btn ${paramFilter === 'ABNORMAL' ? 'is-active' : ''}`}
                  onClick={() => setParamFilter('ABNORMAL')}
                >
                  <Filter size={11} className="me-1" />
                  Bất thường ({abnormalParams.length})
                </button>
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="bms-param-table">
              <thead>
                <tr>
                  <th style={{ width: '11%' }}>Mã</th>
                  <th style={{ width: '32%' }}>Tên Chỉ Số Xét Nghiệm</th>
                  <th className="text-end" style={{ width: '14%' }}>Kết Quả Đo</th>
                  <th style={{ width: '9%' }}>Đơn Vị</th>
                  <th style={{ width: '20%' }}>Khoảng Tham Chiếu</th>
                  <th className="text-center" style={{ width: '14%' }}>Đánh Giá</th>
                </tr>
              </thead>
              <tbody>
                {displayedParameters.length > 0 ? (
                  displayedParameters.map(({ p, idx, meta }) => {
                    const rangeText =
                      typeof p.referenceRange === 'object' && p.referenceRange
                        ? p.referenceRange.display || `${p.referenceRange.low ?? ''}–${p.referenceRange.high ?? ''}` || '—'
                        : p.referenceRange || p.referenceInterval || p.normalRange || 'Theo chuẩn';

                    return (
                      <tr
                        key={idx}
                        className={meta.isPanic ? 'is-row-panic' : meta.isAbnormal ? 'is-row-abnormal' : ''}
                      >
                        <td className="font-monospace fw-bold text-secondary">
                          {p.code || p.abbreviation || p.criteriaId || '—'}
                        </td>
                        <td className="fw-semibold text-dark">
                          {p.name || p.paramName || p.criterionName || '—'}
                        </td>
                        <td className="text-end">
                          <span
                            className={`bms-param-value d-inline-flex align-items-center gap-1 ${
                              meta.isPanic ? 'text-danger' : meta.isAbnormal ? 'text-warning-emphasis' : 'text-dark'
                            }`}
                          >
                            {meta.isHigh && <ArrowUp size={13} />}
                            {meta.isLow && <ArrowDown size={13} />}
                            {p.value ?? p.measuredValue ?? '—'}
                          </span>
                        </td>
                        <td className="text-muted small">{p.unit || '—'}</td>
                        <td className="font-monospace small text-muted">{rangeText}</td>
                        <td className="text-center">{renderFlagBadge(p)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-muted small">
                      {paramFilter === 'ABNORMAL'
                        ? 'Không có chỉ số bất thường trong hồ sơ này.'
                        : 'Chưa có dữ liệu chỉ số chi tiết cho bản ghi này.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 4. Full-Width Clinical Conclusion & Approval Section */}
          <div className="bms-signoff-section">
            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <Form.Label className="fw-bold text-dark mb-0 small text-uppercase">
                Nhận định Cận Lâm Sàng (Lab Interpretation)
              </Form.Label>
              {canApprove && !approved && (
                <div className="bms-template-chips bms-no-print">
                  {CLINICAL_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      className="bms-template-chip"
                      onClick={() => setConclusionInput(tpl.text)}
                    >
                      {tpl.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="bms-template-chip"
                    onClick={() => setConclusionInput(buildAutoSuggestion(result))}
                  >
                    <Sparkles size={12} className="me-1" /> Gợi ý tự động
                  </button>
                </div>
              )}
            </div>

            <Form.Control
              as="textarea"
              rows={3}
              value={conclusionInput}
              onChange={(e) => setConclusionInput(e.target.value)}
              readOnly={approved || !canApprove}
              className="bg-white"
              style={{ fontSize: '0.88rem', borderRadius: '12px', borderColor: '#cbd5e1' }}
              placeholder="Nhập nhận định kỹ thuật & bất thường chỉ số xét nghiệm (nếu có)..."
            />

            {actionFeedback && (
              <Alert
                variant={actionFeedback.type}
                dismissible
                onClose={() => setActionFeedback(null)}
                className="py-2.5 px-3 mb-0 rounded-3 small fw-medium"
              >
                {actionFeedback.text}
              </Alert>
            )}

            {approved ? (
              <div className="bms-verified-seal">
                <div className="d-flex align-items-center gap-2 small">
                  <ShieldCheck size={18} className="text-success flex-shrink-0" />
                  <div>
                    <strong>Đã thẩm định &amp; phát hành kết quả</strong>
                    {result.approvingDoctorName ? ` · BS. ${result.approvingDoctorName}` : ''}
                    {result.approvedAt ? ` · ${formatDateTimeVi(result.approvedAt)}` : ''}
                    {result.digitalSignature && (
                      <span className="ms-2 font-monospace opacity-75">
                        (SHA-256: {String(result.digitalSignature).slice(0, 12)}…)
                      </span>
                    )}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap bms-no-print">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="rounded-pill px-3 fw-semibold bg-white"
                    onClick={() => navigate('/laboratory/biochemical-results')}
                  >
                    ← Về danh sách
                  </Button>
                  {canApprove && (
                    <Button
                      variant="success"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold"
                      onClick={() =>
                        navigate(
                          `/doctor/emr${
                            result.patientId ? `?patientId=${encodeURIComponent(result.patientId)}` : ''
                          }`
                        )
                      }
                    >
                      Mở Bệnh án EMR →
                    </Button>
                  )}
                </div>
              </div>
            ) : canApprove ? (
              <>
                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap bms-no-print">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="rounded-pill px-3 py-1.5 fw-semibold"
                    onClick={() => navigate('/laboratory/biochemical-results')}
                  >
                    <ArrowLeft className="me-1" size={14} /> Quay lại danh sách
                  </Button>

                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Button
                      variant="outline-danger"
                      size="sm"
                      disabled={actionBusy}
                      onClick={() => setShowRerunBox((v) => !v)}
                      className="rounded-pill px-3 py-1.5 fw-semibold text-nowrap"
                    >
                      <Undo2 className="me-1" size={14} /> Yêu cầu Lab chạy lại
                    </Button>
                    <Button
                      size="sm"
                      disabled={actionBusy}
                      onClick={handleApproveResult}
                      className="rounded-pill px-4 py-1.5 fw-bold text-white d-inline-flex align-items-center gap-1.5 text-nowrap"
                      style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    >
                      {actionBusy ? <Spinner animation="border" size="sm" /> : <CheckCircle2 size={15} />}
                      <span>Phê Duyệt Kết Quả</span>
                    </Button>
                  </div>
                </div>

                {showRerunBox && (
                  <div className="p-3 rounded-3 border border-danger-subtle bg-white bms-no-print">
                    <div className="small fw-bold text-danger mb-2">
                      Lý do yêu cầu Phòng Lab kiểm tra &amp; chạy lại ống mẫu <code>{result.barcode || result.sampleId}</code>:
                    </div>
                    <div className="bms-template-chips mb-2">
                      {RERUN_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className="bms-template-chip"
                          onClick={() => setRerunReasonInput(preset)}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      <Form.Control
                        size="sm"
                        type="text"
                        placeholder="Nhập lý do cụ thể gửi về Phòng Lab..."
                        value={rerunReasonInput}
                        onChange={(e) => setRerunReasonInput(e.target.value)}
                        className="flex-grow-1"
                        style={{ minWidth: '240px' }}
                      />
                      <Button
                        size="sm"
                        variant="light"
                        className="rounded-pill px-3"
                        onClick={() => setShowRerunBox(false)}
                      >
                        Hủy
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        className="rounded-pill px-3 fw-semibold"
                        onClick={handleRequestRerun}
                        disabled={actionBusy}
                      >
                        Xác nhận gửi Lab
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap bms-no-print">
                <span className="small text-muted">Hồ sơ đang chờ Bác sĩ thẩm định và phê duyệt phát hành.</span>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="rounded-pill px-3 fw-semibold"
                  onClick={() => navigate('/laboratory/biochemical-results')}
                >
                  ← Quay lại danh sách
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
