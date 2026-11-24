/**
 * @file LookupBiochemicalResultsPage.jsx
 * @description Clinical Laboratory Results Review, Diagnosis Conclusion & Digital Signature Page (UC75 / BR-227 / BR-228).
 * Worklist-first minimalist clinical layout: Status filter pills, separated Package & Status columns,
 * inline clinical conclusion editor, SHA-256 digital approval and Lab rerun request integration.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Table, Badge, Button, Form, Alert, Spinner
} from 'react-bootstrap';
import {
  FaSearch, FaBarcode, FaUserInjured, FaCheckCircle,
  FaExclamationTriangle, FaPrint, FaHistory, FaBell,
  FaSync, FaShieldAlt, FaMicroscope, FaTimes, FaUndo, FaFileSignature
} from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { lookupTestResults, getTestResultById } from '../api/biochemicalResultsApi';
import { ROLES, getStoredUser, hasRole } from '../../../constants/roles';
import api from '../../../config/api';

const isResultApproved = (r) => {
  const st = String(r?.status || r?.validationStatus || '').toUpperCase();
  return st.includes('APPROVED') || st.includes('SIGNED') || st === '3';
};

const isResultAbnormalOrPanic = (r) => {
  if (r?.isPanic || r?.hasPanic) return true;
  const params = Array.isArray(r?.parameters) && r.parameters.length
    ? r.parameters
    : (Array.isArray(r?.items) ? r.items : []);
  return params.some((p) => {
    const fl = String(p?.flag || '').toUpperCase();
    return p?.isAbnormal || fl.includes('PANIC') || fl.includes('CRIT') || fl.includes('HIGH') || fl.includes('LOW') || fl === 'H' || fl === 'L';
  });
};

export default function LookupBiochemicalResultsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getStoredUser();
  const canNotify = hasRole(currentUser, ROLES.LAB, ROLES.MANAGER);
  const canApprove = hasRole(currentUser, ROLES.DOCTOR, ROLES.MANAGER);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Search & Filter states
  const initialQuery = searchParams.get('barcode') || searchParams.get('sampleId') || searchParams.get('patientId') || searchParams.get('search') || '';
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'ABNORMAL' | 'APPROVED'
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Selected single test result state & clinical conclusion draft
  const [currentResult, setCurrentResult] = useState(null);
  const [conclusionInput, setConclusionInput] = useState('');
  const [rerunReasonInput, setRerunReasonInput] = useState('');
  const [showRerunBox, setShowRerunBox] = useState(false);

  // Recent results list state
  const [recentResults, setRecentResults] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Sync default conclusion when selecting a result
  useEffect(() => {
    if (!currentResult) {
      setConclusionInput('');
      setShowRerunBox(false);
      setRerunReasonInput('');
      return;
    }
    const existing = currentResult.doctorConclusion || currentResult.conclusionNotes || currentResult.conclusion || currentResult.clinicalComment || '';
    if (existing) {
      setConclusionInput(existing);
    } else {
      const params = Array.isArray(currentResult.parameters) && currentResult.parameters.length
        ? currentResult.parameters
        : (Array.isArray(currentResult.items) ? currentResult.items : []);
      const abn = params.filter((p) => {
        const f = String(p.flag || '').toUpperCase();
        return p.isAbnormal || f.includes('HIGH') || f.includes('LOW') || f.includes('PANIC');
      });
      if (abn.length > 0) {
        setConclusionInput(`Ghi nhận ${abn.length}/${params.length} chỉ số ngoài khoảng tham chiếu (${abn.map((a) => a.code || a.abbreviation || a.name).join(', ')}). Đề nghị theo dõi lâm sàng và tái khám theo chỉ định.`);
      } else {
        setConclusionInput('Các chỉ số xét nghiệm cận lâm sàng nằm trong giới hạn tham chiếu sinh học bình thường.');
      }
    }
  }, [currentResult]);

  // Load recent results from MongoDB + enrich package/patient names
  const loadRecentResults = useCallback(async () => {
    setLoadingRecent(true);
    setErrorMsg('');
    try {
      const [res, samplesRes] = await Promise.all([
        lookupTestResults({}),
        canNotify
          ? api.get('/laboratory/samples/queue', { params: { page: 1, pageSize: 100 } }).catch(() => null)
          : Promise.resolve(null)
      ]);
      const items = Array.isArray(res?.data) ? res.data : [];
      const rawSamples = samplesRes?.data?.data?.items || samplesRes?.data?.data || [];

      const sampleMap = new Map();
      if (Array.isArray(rawSamples)) {
        rawSamples.forEach((s) => {
          if (s.id) sampleMap.set(String(s.id).toLowerCase(), s);
          if (s.barcode) sampleMap.set(String(s.barcode).toLowerCase(), s);
        });
      }

      const enriched = items.map((r) => {
        const sKey = String(r.barcode || r.sampleId || '').toLowerCase();
        const smp = sampleMap.get(sKey) || null;
        const cleanBarcode = (r.barcode && !r.barcode.includes('-4')) ? r.barcode : (smp?.barcode || r.barcode || r.sampleId || r.id);
        const cleanPkg = r.packageName || smp?.testPackageName || r.packageId || 'Xét nghiệm Huyết học & Sinh hóa';
        const cleanPatientName = (r.patientName && r.patientName !== 'Bệnh nhân')
          ? r.patientName
          : (smp?.patientName || r.patientId || 'Bệnh nhân');

        return {
          ...r,
          barcode: cleanBarcode,
          packageName: cleanPkg,
          patientName: cleanPatientName,
          approvedAt: r.approvedAt || r.reviewedAt || r.updatedAt || r.createdAt
        };
      });

      setRecentResults(enriched);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải danh sách kết quả xét nghiệm.');
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  const executeSearch = useCallback(async (keyword) => {
    const term = (keyword || '').trim();
    if (!term) {
      setCurrentResult(null);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setActionMsg('');

    try {
      const res = await lookupTestResults({ search: term });
      if (res?.data && !Array.isArray(res.data)) {
        setCurrentResult(res.data);
      } else if (Array.isArray(res?.data) && res.data.length > 0) {
        const first = res.data[0];
        if (first.id) {
          const detailRes = await getTestResultById(first.id);
          setCurrentResult({ ...first, ...(detailRes?.data || {}) });
        } else {
          setCurrentResult(first);
        }
      } else {
        setCurrentResult(null);
        setErrorMsg(`Không tìm thấy kết quả xét nghiệm khớp với từ khóa "${term}".`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tra cứu kết quả xét nghiệm.');
      setCurrentResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentResults();
    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [executeSearch, initialQuery, loadRecentResults]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchKeyword.trim()) {
      setCurrentResult(null);
      return;
    }
    setSearchParams({ search: searchKeyword.trim() });
    executeSearch(searchKeyword.trim());
  };

  const handleQuickSelect = async (item) => {
    const key = item.id || item.sampleId || item.barcode;
    setSearchKeyword(item.barcode || key);
    setSearchParams({ search: key });
    setLoading(true);
    setErrorMsg('');
    setActionMsg('');
    try {
      const detailRes = await getTestResultById(item.id);
      setCurrentResult({
        ...item,
        ...(detailRes?.data || {}),
        packageName: detailRes?.data?.packageName || item.packageName,
        patientName: (detailRes?.data?.patientName && detailRes?.data?.patientName !== 'Bệnh nhân')
          ? detailRes.data.patientName
          : item.patientName
      });
    } catch {
      executeSearch(key);
    } finally {
      setLoading(false);
    }
  };

  const renderFlagBadge = (flag, isAbnormal) => {
    const f = String(flag || '').toUpperCase();
    if (f.includes('PANIC') || f.includes('CRIT') || f === '3') {
      return <Badge bg="danger" className="px-2.5 py-1 rounded-pill">Nguy kịch (PANIC)</Badge>;
    }
    if (f.includes('HIGH') || f === 'H' || f === '2') {
      return <Badge bg="warning" text="dark" className="px-2.5 py-1 rounded-pill">&uarr; Tăng cao</Badge>;
    }
    if (f.includes('LOW') || f === 'L' || f === '1') {
      return <Badge bg="info" text="dark" className="px-2.5 py-1 rounded-pill">&darr; Giảm thấp</Badge>;
    }
    if (isAbnormal) {
      return <Badge bg="warning" text="dark" className="px-2.5 py-1 rounded-pill">Bất thường</Badge>;
    }
    return <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2.5 py-1 rounded-pill">Bình thường</Badge>;
  };

  const resultParameters = useMemo(() => {
    if (!currentResult) return [];
    if (Array.isArray(currentResult.parameters) && currentResult.parameters.length > 0) return currentResult.parameters;
    if (Array.isArray(currentResult.items) && currentResult.items.length > 0) return currentResult.items;
    return [];
  }, [currentResult]);

  const hasPanicValues = useMemo(() => {
    return resultParameters.some((p) =>
      String(p.flag || '').toUpperCase().includes('PANIC') ||
      (p.isAbnormal && String(p.flag || '').toUpperCase().includes('HIGH') && Number(p.value) > 20)
    ) || currentResult?.conclusionNotes?.toLowerCase().includes('cảnh báo');
  }, [resultParameters, currentResult]);

  // Counts & Filtered Worklist
  const counts = useMemo(() => {
    const all = recentResults.length;
    const approved = recentResults.filter(isResultApproved).length;
    const pending = all - approved;
    const abnormal = recentResults.filter(isResultAbnormalOrPanic).length;
    return { all, pending, abnormal, approved };
  }, [recentResults]);

  const filteredWorklist = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return recentResults.filter((r) => {
      if (statusFilter === 'PENDING' && isResultApproved(r)) return false;
      if (statusFilter === 'APPROVED' && !isResultApproved(r)) return false;
      if (statusFilter === 'ABNORMAL' && !isResultAbnormalOrPanic(r)) return false;
      if (!kw) return true;
      return (
        String(r.id || '').toLowerCase().includes(kw) ||
        String(r.barcode || '').toLowerCase().includes(kw) ||
        String(r.sampleId || '').toLowerCase().includes(kw) ||
        String(r.patientName || '').toLowerCase().includes(kw) ||
        String(r.patientId || '').toLowerCase().includes(kw) ||
        String(r.packageName || '').toLowerCase().includes(kw)
      );
    });
  }, [recentResults, statusFilter, searchKeyword]);

  const handleApproveResult = async () => {
    if (!currentResult) return;
    const resultId = currentResult.id || currentResult.testResultId;
    if (!resultId) {
      setActionMsg('Thiếu mã kết quả để phê duyệt.');
      return;
    }
    setActionBusy(true);
    setActionMsg('');
    try {
      await api.post(`/TestOrder/TestResult/${encodeURIComponent(resultId)}/approve`, {
        approverId: currentUser?.id || currentUser?.userId || 'dr_hoangnam',
        approverName: currentUser?.fullName || currentUser?.name || 'Bác sĩ điều trị',
        approverRole: 'Doctor',
        doctorConclusion: conclusionInput.trim(),
        notes: conclusionInput.trim() || 'Đã thẩm định lâm sàng và ký số phê duyệt kết quả.'
      });
      setActionMsg('Đã phê duyệt & ký số SHA-256 thành công. Kết quả đã được mở khóa trên Cổng Bệnh Nhân.');
      const detailRes = await getTestResultById(resultId).catch(() => null);
      if (detailRes?.data) {
        setCurrentResult((prev) => ({ ...prev, ...detailRes.data, status: 'APPROVED', conclusionNotes: conclusionInput.trim() }));
      } else {
        setCurrentResult((prev) => ({ ...prev, status: 'APPROVED', conclusionNotes: conclusionInput.trim() }));
      }
      await loadRecentResults();
    } catch (err) {
      setActionMsg(err?.response?.data?.message || err?.message || 'Phê duyệt thất bại.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestRerun = async () => {
    if (!currentResult) return;
    const specimenId = currentResult.barcode || currentResult.sampleId;
    if (!specimenId) {
      setActionMsg('Thiếu mã ống mẫu để yêu cầu chạy lại.');
      return;
    }
    setActionBusy(true);
    setActionMsg('');
    try {
      await api.post(`/laboratory/samples/${encodeURIComponent(specimenId)}/rerun`, {
        reason: rerunReasonInput.trim() || 'Bác sĩ nghi ngờ bất tương hợp lâm sàng, yêu cầu Lab kiểm tra và chạy lại mẫu.',
        requestedBy: currentUser?.fullName || currentUser?.name || 'Doctor',
        notes: `Result ${currentResult.id || currentResult.testResultId || ''}`
      });
      setActionMsg(`Đã gửi lệnh yêu cầu Phòng Lab chạy lại mẫu ${specimenId}.`);
      setShowRerunBox(false);
      await loadRecentResults();
    } catch (err) {
      setActionMsg(err?.response?.data?.message || err?.message || 'Gửi yêu cầu chạy lại thất bại.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="w-100 py-1">
      {/* Header Card đồng bộ Sidebar */}
      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Duyệt kết quả xét nghiệm &amp; ký số</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Thẩm định tính hợp lệ của chỉ số xét nghiệm từ Phòng Lab, ghi nhận nhận định cận lâm sàng và ký số SHA-256 phát hành kết quả (chẩn đoán bệnh &amp; kê đơn thực hiện tại Bệnh án EMR).
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={loadRecentResults}
            disabled={loadingRecent}
          >
            <FaSync className={loadingRecent ? 'fa-spin me-1' : 'me-1'} size={12} /> Làm mới
          </Button>
          {currentResult && (
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-pill px-3 text-nowrap"
              onClick={() => window.print()}
            >
              <FaPrint className="me-1" size={12} /> In phiếu KQ
            </Button>
          )}
          {canNotify && (
            <Button
              size="sm"
              className="rounded-pill px-3 fw-semibold text-white text-nowrap"
              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              onClick={() => navigate('/laboratory/notifications')}
            >
              <FaBell className="me-1" size={12} /> Thông báo
            </Button>
          )}
        </div>
      </div>

      {/* Single-Line Filter Bar: Search + Clinical Status Pills */}
      <div className="bms-filter-bar mb-3 flex-wrap">
        <Form onSubmit={handleSearchSubmit} className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: '280px' }}>
          <div className="bms-search-input-pill flex-grow-1">
            <FaBarcode className="bms-search-icon" />
            <input
              type="text"
              placeholder="Tìm mã ống mẫu (SMP-...), mã kết quả (TRE-...), tên hoặc mã bệnh nhân (PAT-...)..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button
                type="button"
                className="bms-search-clear"
                onClick={() => {
                  setSearchKeyword('');
                  setCurrentResult(null);
                  setSearchParams({});
                }}
              >
                <FaTimes size={12} />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={loading}
            className="rounded-pill px-3 fw-semibold text-white text-nowrap"
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
          >
            {loading ? <Spinner animation="border" size="sm" /> : <><FaSearch className="me-1" /> Tra cứu</>}
          </Button>
        </Form>

        {/* Status Quick Filter Pills */}
        <div className="d-flex align-items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: `Tất cả (${counts.all})` },
            { id: 'PENDING', label: `Chờ duyệt (${counts.pending})` },
            { id: 'ABNORMAL', label: `Bất thường / PANIC (${counts.abnormal})` },
            { id: 'APPROVED', label: `Đã ký số (${counts.approved})` }
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className="btn btn-sm rounded-pill px-3 fw-semibold transition-all"
                style={{
                  fontSize: '0.78rem',
                  backgroundColor: active ? '#1E60E6' : '#EEF2F6',
                  color: active ? '#FFFFFF' : '#475569',
                  border: 'none'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="py-2 mb-3 rounded-3">
          <FaExclamationTriangle className="me-2" />
          {errorMsg}
        </Alert>
      )}

      {/* Selected Result Detail & Signing Panel (Only visible when a row is clicked or searched) */}
      {currentResult && (
        <Card className="border-0 shadow-sm rounded-4 mb-3 overflow-hidden bg-white" style={{ border: '1px solid #E2E8F0' }}>
          <Card.Header className="py-2.5 px-3 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Badge bg="primary" className="font-monospace px-2.5 py-1.5 rounded-pill">
                {currentResult.id || currentResult.testResultId}
              </Badge>
              <span className="fw-bold text-dark">{currentResult.patientName}</span>
              <span className="text-muted small font-monospace">({currentResult.patientId})</span>
              <span className="text-muted">•</span>
              <span className="small fw-semibold text-primary">{currentResult.packageName || 'Xét nghiệm cận lâm sàng'}</span>
              <Badge bg={isResultApproved(currentResult) ? 'success' : 'warning'} text={isResultApproved(currentResult) ? 'white' : 'dark'} className="rounded-pill px-2.5 py-1">
                {isResultApproved(currentResult) ? '✓ Đã ký duyệt & phát hành' : '● Chờ bác sĩ ký duyệt'}
              </Badge>
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill px-2.5 py-0.5 small"
              onClick={() => setCurrentResult(null)}
            >
              <FaTimes className="me-1" size={11} /> Đóng chi tiết
            </Button>
          </Card.Header>

          <Card.Body className="p-3">
            {hasPanicValues && (
              <Alert variant="danger" className="py-2 px-3 mb-3 rounded-3 border-danger d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div className="small">
                  <FaExclamationTriangle className="me-2" />
                  <strong>CẢNH BÁO CHỈ SỐ NGUY KỊCH (PANIC VALUE):</strong> Phát hiện thông số vượt ngưỡng an toàn sinh mạng. Bác sĩ cần kiểm tra đối chiếu lâm sàng hoặc yêu cầu Lab chạy kiểm tra lại trước khi ký số.
                </div>
              </Alert>
            )}

            <Row className="g-3">
              {/* Left 4 Cols: Patient, Tube & Cryptographic Seal Metadata */}
              <Col xs={12} lg={4}>
                <div className="p-3 rounded-4 border h-100" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
                  <h6 className="fw-bold text-dark mb-2.5 d-flex align-items-center gap-2 small text-uppercase">
                    <FaUserInjured className="text-primary" /> Thông Tin Bệnh Phẩm &amp; Pháp Lý
                  </h6>
                  <div className="small mb-2 pb-2 border-bottom">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Người bệnh:</span>
                      <strong className="text-dark">{currentResult.patientName}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Mã bệnh nhân:</span>
                      <code className="text-primary fw-semibold">{currentResult.patientId}</code>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span className="text-muted">Mã vạch ống mẫu:</span>
                      <code className="fw-bold text-dark">{currentResult.barcode || currentResult.sampleId}</code>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Ống / Máy phân tích:</span>
                      <span>{currentResult.sampleType || 'Blood'} ({currentResult.tubeColor || 'EDTA/Serum'}) · <code>{currentResult.equipmentCode || 'EQ-BIO-01'}</code></span>
                    </div>
                  </div>

                  {/* Lab Interpretation & Approval Actions */}
                  <div className="mt-2">
                    <Form.Label className="small fw-bold text-dark mb-1">
                      Nhận định Cận Lâm Sàng (Lab Interpretation):
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={conclusionInput}
                      onChange={(e) => setConclusionInput(e.target.value)}
                      readOnly={isResultApproved(currentResult)}
                      className="small mb-2 bg-white"
                      placeholder="Nhập nhận định kỹ thuật & bất thường chỉ số xét nghiệm (nếu có)..."
                    />

                    {currentResult.digitalSignature && (
                      <div className="p-2 rounded-3 bg-white border mb-2 small">
                        <div className="fw-semibold text-success d-flex align-items-center gap-1">
                          <FaShieldAlt /> Chữ ký số SHA-256 (Đã khóa bất biến):
                        </div>
                        <code className="text-break text-muted" style={{ fontSize: '0.72rem' }}>
                          {currentResult.digitalSignature}
                        </code>
                      </div>
                    )}

                    {canApprove && !isResultApproved(currentResult) && (
                      <div className="d-flex flex-column gap-2 mt-2">
                        <div className="d-flex gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            disabled={actionBusy}
                            onClick={handleApproveResult}
                            className="rounded-pill px-3 py-1.5 fw-bold flex-grow-1 d-flex align-items-center justify-content-center gap-1.5 shadow-sm"
                          >
                            <FaFileSignature /> Phê Duyệt &amp; Ký Số SHA-256
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => setShowRerunBox((v) => !v)}
                            className="rounded-pill px-3 py-1.5 fw-semibold text-nowrap"
                          >
                            <FaUndo className="me-1" /> Chạy lại
                          </Button>
                        </div>

                        {showRerunBox && (
                          <div className="p-2.5 rounded-3 border border-danger bg-white mt-1">
                            <Form.Control
                              size="sm"
                              type="text"
                              placeholder="Nhập lý do yêu cầu Lab chạy lại mẫu..."
                              value={rerunReasonInput}
                              onChange={(e) => setRerunReasonInput(e.target.value)}
                              className="mb-2"
                            />
                            <div className="d-flex justify-content-end gap-1.5">
                              <Button size="sm" variant="light" className="rounded-pill px-2.5 py-0.5 small" onClick={() => setShowRerunBox(false)}>
                                Hủy
                              </Button>
                              <Button size="sm" variant="danger" className="rounded-pill px-3 py-0.5 small fw-semibold" onClick={handleRequestRerun} disabled={actionBusy}>
                                Xác nhận gửi Lab
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {actionMsg && (
                      <div className="small fw-semibold text-primary mt-2 p-2 rounded bg-primary-subtle">
                        {actionMsg}
                      </div>
                    )}
                  </div>
                </div>
              </Col>

              {/* Right 8 Cols: Parameter Table */}
              <Col xs={12} lg={8}>
                <div className="border rounded-4 overflow-hidden h-100 bg-white">
                  <div className="py-2 px-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                    <span className="fw-bold small text-dark d-flex align-items-center gap-1.5 text-uppercase">
                      <FaMicroscope className="text-primary" /> Bảng Chỉ Số Đo Cận Lâm Sàng
                    </span>
                    <Badge bg="primary" pill>{resultParameters.length} chỉ số</Badge>
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '340px' }}>
                    <Table hover className="mb-0 align-middle table-sm">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th className="ps-3">Mã</th>
                          <th>Tên Chỉ Số Xét Nghiệm</th>
                          <th className="text-end">Kết Quả Đo</th>
                          <th>Đơn Vị</th>
                          <th>Khoảng Tham Chiếu</th>
                          <th className="text-center pe-3">Đánh Giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultParameters.length > 0 ? (
                          resultParameters.map((p, idx) => {
                            const f = String(p.flag || '').toUpperCase();
                            const isPanic = f.includes('PANIC') || f.includes('CRIT') || f === '3';
                            const isHigh = f.includes('HIGH') || f === 'H' || f === '2';
                            const isLow = f.includes('LOW') || f === 'L' || f === '1';
                            return (
                              <tr key={idx} className={isPanic ? 'table-danger' : (p.isAbnormal || isHigh || isLow ? 'table-warning' : '')}>
                                <td className="ps-3 font-monospace fw-bold text-secondary small">
                                  {p.code || p.abbreviation || p.criteriaId || '—'}
                                </td>
                                <td className="fw-semibold text-dark small">
                                  {p.name || p.paramName || p.criterionName || '—'}
                                </td>
                                <td className="text-end font-monospace">
                                  <span className={`fw-bold ${isPanic ? 'text-danger' : (isHigh || isLow ? 'text-warning-emphasis' : 'text-dark')}`}>
                                    {p.value ?? p.measuredValue ?? '—'}
                                  </span>
                                </td>
                                <td className="text-muted small">{p.unit || '—'}</td>
                                <td className="text-muted small font-monospace">
                                  {typeof p.referenceRange === 'object' && p.referenceRange
                                    ? (p.referenceRange.display || `${p.referenceRange.low ?? ''}–${p.referenceRange.high ?? ''}` || '—')
                                    : (p.referenceRange || p.referenceInterval || p.normalRange || 'Theo chuẩn')}
                                </td>
                                <td className="text-center pe-3">
                                  {renderFlagBadge(p.flag, p.isAbnormal)}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="text-center py-4 text-muted small">
                              Chưa có dữ liệu chỉ số chi tiết cho bản ghi này.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Primary Worklist Table — Always Visible First without Giant Empty Box */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <Card.Header className="bg-white py-2.5 px-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <FaHistory className="text-primary" />
            <h6 className="fw-bold text-dark mb-0">Danh Sách Kết Quả Xét Nghiệm Cận Lâm Sàng</h6>
            <span className="text-muted small">• Bấm vào dòng bất kỳ để mở bảng chỉ số &amp; ký duyệt</span>
          </div>
          <Badge bg="light" text="dark" className="border rounded-pill px-3 py-1">
            Hiển thị {filteredWorklist.length} / {recentResults.length} hồ sơ
          </Badge>
        </Card.Header>

        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead className="table-light small text-uppercase text-muted">
              <tr>
                <th className="ps-3" style={{ width: '18%' }}>Mã Kết Quả / Ống Mẫu</th>
                <th style={{ width: '16%' }}>Bệnh Nhân</th>
                <th style={{ width: '22%' }}>Gói / Nhóm Xét Nghiệm</th>
                <th style={{ width: '13%' }}>Trạng Thái Duyệt</th>
                <th style={{ width: '13%' }}>Thời Gian</th>
                <th style={{ width: '18%' }}>Nhận Định Cận Lâm Sàng</th>
                <th className="text-end pe-3" style={{ width: '110px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorklist.length > 0 ? (
                filteredWorklist.map((r, idx) => {
                  const approved = isResultApproved(r);
                  const isSelected = currentResult && (currentResult.id === r.id || currentResult.testResultId === r.id);
                  return (
                    <tr
                      key={r.id || idx}
                      onClick={() => handleQuickSelect(r)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(30, 96, 230, 0.07)' : undefined
                      }}
                    >
                      <td className="ps-3">
                        <div className="fw-bold text-primary font-monospace small">{r.id}</div>
                        <div className="text-muted small">Ống: <code className="text-dark">{r.barcode || r.sampleId}</code></div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">{r.patientName}</div>
                        <div className="text-muted small font-monospace">{r.patientId}</div>
                      </td>
                      <td>
                        <div className="fw-medium text-dark small text-truncate" style={{ maxWidth: '250px' }} title={r.packageName}>
                          {r.packageName}
                        </div>
                      </td>
                      <td>
                        {approved ? (
                          <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill px-2.5 py-1">
                            ✓ Đã ký duyệt
                          </Badge>
                        ) : (
                          <Badge bg="warning-subtle" text="warning-emphasis" className="border border-warning-subtle rounded-pill px-2.5 py-1">
                            ● Chờ bác sĩ duyệt
                          </Badge>
                        )}
                      </td>
                      <td className="text-muted small">
                        {r.approvedAt ? new Date(r.approvedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                      </td>
                      <td>
                        <div className="text-truncate text-muted small" style={{ maxWidth: '210px' }} title={r.conclusion || r.doctorConclusion}>
                          {r.conclusion || r.doctorConclusion || (approved ? 'Các chỉ số trong giới hạn tham chiếu' : 'Chờ bác sĩ nhận định')}
                        </div>
                      </td>
                      <td className="text-end pe-3" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={isSelected ? 'primary' : (approved ? 'outline-primary' : 'success')}
                          size="sm"
                          className="rounded-pill px-2.5 py-1 small fw-semibold text-nowrap"
                          style={isSelected ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : undefined}
                          onClick={() => handleQuickSelect(r)}
                        >
                          {approved ? 'Xem KQ' : 'Thẩm định'}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted small">
                    {loadingRecent ? 'Đang tải danh sách kết quả xét nghiệm...' : 'Không có hồ sơ kết quả xét nghiệm nào khớp với bộ lọc hiện tại.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
