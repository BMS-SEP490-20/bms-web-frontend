/**
 * Quality Control (QC) Flags Management Page
 * 
 * Allows Laboratory Users and Clinic Managers to configure, inspect,
 * and resolve Quality Control (QC) flags triggered by laboratory analyzers
 * or system out-of-bound threshold rules.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Badge, Button, Form, 
  InputGroup, Modal, Spinner, Alert 
} from 'react-bootstrap';
import { FlaskConical, AlertTriangle, CheckCircle2, Plus, Trash2, RefreshCw, Search, TestTube2, Wrench, Check, Info, X as LucideX } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { qcFlagService } from '../../../services/qcFlagService';
import { fetchQcFlags as fetchIqcWestgardFlags } from '../api/qcApi';

/** Map IQC Westgard run violations (/qc/flags) → shape dùng bởi QcFlagsPage. */
function mapIqcRunToFlag(run) {
  const rules = Array.isArray(run.violatedRules) ? run.violatedRules : [];
  const primaryRule = rules.find((r) => r !== '1_2s') || rules[0] || '1_3s';
  const isReject = String(run.status || '').startsWith('REJECT') || !!run.isLocked;
  return {
    flagId: run.runId || run.id || `IQC-${run.lotId}-${run.runNumber}`,
    flagCode: run.runId || `IQC-${run.runNumber}`,
    analyzerId: run.instrumentId || run.lotId || 'ANL-IQC',
    analyzerName: run.instrumentId || run.lotId || 'Máy IQC',
    parameter: run.analyteName || run.lotId || 'IQC',
    ruleType: `Westgard_${primaryRule}`,
    severity: isReject ? 'CRITICAL' : 'HIGH',
    status: isReject ? 'ACTIVE' : (String(run.status || '').includes('WARNING') ? 'ACTIVE' : 'RESOLVED'),
    observedValue: Number(run.measuredValue ?? 0),
    targetValue: Number(run.targetMean ?? 0),
    lowerLimit: Number(run.lowerLimit ?? 0),
    upperLimit: Number(run.upperLimit ?? 0),
    unit: run.unit || '',
    sampleBarcode: run.lotId || '',
    triggeredAt: run.evaluatedAt,
    triggeredBy: run.operatorName || 'IQC Westgard Engine',
    resolutionNotes: run.message || null,
    source: 'iqc-run',
  };
}

const QcFlagsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Live state bound directly to MongoDB collection 'QcFlags' via backend service.
  const [flags, setFlags] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Filters are applied server-side by the MongoDB aggregation pipeline in Testorder-service.
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [analyzerFilter, setAnalyzerFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');


  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    flagCode: '',
    analyzerId: 'ANL-SYS-01',
    analyzerName: 'Máy phân tích huyết học Sysmex XN-1000',
    parameter: 'WBC (Bạch cầu)',
    ruleType: 'Westgard_1_3s',
    severity: 'HIGH',
    status: 'ACTIVE',
    observedValue: '',
    targetValue: '',
    lowerLimit: '',
    upperLimit: '',
    unit: '10^9/L',
    sampleBarcode: '',
    resolutionNotes: ''
  });

  // Edit/Resolve Form State
  const [editForm, setEditForm] = useState({
    status: 'RESOLVED',
    severity: 'HIGH',
    resolutionNotes: '',
    resolvedBy: user?.fullName || user?.username || 'KTV Lab'
  });

  const fetchFlags = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [flagsRes, statsRes, iqcRuns] = await Promise.all([
        qcFlagService.getFlags({
          status: statusFilter,
          severity: severityFilter,
          analyzerId: analyzerFilter,
          parameter: searchTerm.trim()
        }),
        qcFlagService.getStatistics(),
        fetchIqcWestgardFlags().catch(() => [])
      ]);

      const manualListRaw = flagsRes?.data ?? flagsRes?.items ?? flagsRes;
      const manualList = Array.isArray(manualListRaw)
        ? manualListRaw
        : (Array.isArray(flagsRes?.data) ? flagsRes.data : []);

      const iqcList = (Array.isArray(iqcRuns) ? iqcRuns : []).map(mapIqcRunToFlag);
      const manualIds = new Set(manualList.map((f) => f.flagId || f.id).filter(Boolean));
      const merged = [
        ...manualList,
        ...iqcList.filter((f) => !manualIds.has(f.flagId))
      ];

      // Client-side filter for IQC-sourced rows (manual API already filtered server-side)
      const filtered = merged.filter((f) => {
        if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
        if (severityFilter !== 'ALL' && f.severity !== severityFilter) return false;
        if (analyzerFilter !== 'ALL' && f.analyzerId !== analyzerFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase();
          const hay = `${f.parameter || ''} ${f.flagCode || ''} ${f.ruleType || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      setFlags(filtered);
      if (statsRes?.success || statsRes?.data) {
        const base = statsRes.data || statsRes || {};
        const totalVal = filtered.length;
        const activeVal = filtered.filter((f) => f.status === 'ACTIVE').length;
        const invVal = filtered.filter((f) => f.status === 'INVESTIGATING').length;
        const resVal = filtered.filter((f) => f.status === 'RESOLVED' || f.status === 'DISMISSED').length;
        setStatistics({
          ...base,
          total: totalVal,
          totalFlags: totalVal,
          active: activeVal,
          activeFlags: activeVal,
          investigating: invVal,
          investigatingFlags: invVal,
          resolved: resVal,
          resolvedFlags: resVal,
        });
      } else {
        const totalVal = filtered.length;
        const activeVal = filtered.filter((f) => f.status === 'ACTIVE').length;
        const invVal = filtered.filter((f) => f.status === 'INVESTIGATING').length;
        const resVal = filtered.filter((f) => f.status === 'RESOLVED' || f.status === 'DISMISSED').length;
        setStatistics({
          total: totalVal,
          totalFlags: totalVal,
          active: activeVal,
          activeFlags: activeVal,
          investigating: invVal,
          investigatingFlags: invVal,
          resolved: resVal,
          resolvedFlags: resVal,
        });
      }
    } catch (e) {
      console.error(e);
      setFlags([]);
      setLoadError(e?.message || 'Không tải được danh sách cờ QC.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, analyzerFilter, searchTerm]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Handle Create Flag
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...createForm,
        observedValue: parseFloat(createForm.observedValue) || 0,
        targetValue: parseFloat(createForm.targetValue) || 0,
        lowerLimit: parseFloat(createForm.lowerLimit) || 0,
        upperLimit: parseFloat(createForm.upperLimit) || 0,
        triggeredBy: user?.fullName || 'KTV. ' + (user?.username || 'Phòng Lab')
      };

      const res = await qcFlagService.createFlag(payload);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Tạo cờ kiểm chuẩn QC thành công!' });
        setShowCreateModal(false);
        fetchFlags();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi tạo cờ QC' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit/Resolve Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFlag) return;
    try {
      setSubmitting(true);
      const res = await qcFlagService.updateFlag(selectedFlag.flagId, editForm);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Cập nhật và xử lý cờ QC thành công!' });
        setShowEditModal(false);
        fetchFlags();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi cập nhật cờ QC' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Flag
  const handleDeleteSubmit = async () => {
    if (!selectedFlag) return;
    try {
      setSubmitting(true);
      const res = await qcFlagService.deleteFlag(selectedFlag.flagId);
      if (res.success) {
        setAlertMsg({ type: 'success', text: 'Đã xóa cờ kiểm chuẩn QC thành công!' });
        setShowDeleteModal(false);
        fetchFlags();
      } else {
        setAlertMsg({ type: 'danger', text: res.message || 'Lỗi xóa cờ QC' });
      }
    } catch (err) {
      setAlertMsg({ type: 'danger', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (flag) => {
    setSelectedFlag(flag);
    setEditForm({
      status: flag.status === 'ACTIVE' ? 'RESOLVED' : flag.status,
      severity: flag.severity,
      resolutionNotes: flag.resolutionNotes || '',
      resolvedBy: user?.fullName || user?.username || 'Kỹ thuật viên Lab'
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (flag) => {
    setSelectedFlag(flag);
    setShowDeleteModal(true);
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge bg="danger" className="px-2 py-1"><AlertTriangle className="me-1"  size="1em"/>NGUY HIỂM</Badge>;
      case 'HIGH':
        return <Badge bg="warning" text="dark" className="px-2 py-1"><AlertTriangle className="me-1"  size="1em"/>MỨC CAO</Badge>;
      case 'MEDIUM':
        return <Badge bg="info" className="px-2 py-1">TRUNG BÌNH</Badge>;
      case 'LOW':
      default:
        return <Badge bg="secondary" className="px-2 py-1">THẤP</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge bg="danger" className="px-3 py-2 rounded-pill">Đang cảnh báo (Active)</Badge>;
      case 'INVESTIGATING':
        return <Badge bg="warning" text="dark" className="px-3 py-2 rounded-pill">Đang điều tra</Badge>;
      case 'RESOLVED':
        return <Badge bg="success" className="px-3 py-2 rounded-pill"><Check className="me-1"  size="1em"/>Đã giải quyết</Badge>;
      case 'DISMISSED':
        return <Badge bg="secondary" className="px-3 py-2 rounded-pill">Bỏ qua / Đóng</Badge>;
      default:
        return <Badge bg="light" text="dark" className="border px-3 py-2 rounded-pill">{status}</Badge>;
    }
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || severityFilter !== 'ALL' || analyzerFilter !== 'ALL';

  return (
    <div className="w-100">
      {/* Top Banner */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Cảnh báo vi phạm Westgard (IQC)</h1>
        </div>
        <div className="bms-page-actions">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => navigate('/laboratory/qc')}
                className="d-flex align-items-center gap-2 rounded-pill px-3 py-2"
              >
                <FlaskConical  size="1em"/>
                <span>Mở nội kiểm IQC</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 shadow-sm"
                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                title="Chỉ dùng khi ghi tay sự cố — bình thường cờ sinh từ trang IQC"
              >
                <Plus  size="1em"/>
                <span>Ghi tay sự cố</span>
              </Button>
              <Button
                variant="light"
                size="sm"
                onClick={fetchFlags}
                disabled={loading}
                className="d-flex align-items-center gap-2 border rounded-pill px-3 py-2"
                style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}
              >
                <RefreshCw className={loading ? 'fa-spin' : ''}  size="1em"/>
                <span>Làm mới</span>
              </Button>
        </div>
      </header>

      <Alert variant="light" className="border rounded-3 shadow-sm mb-3 d-flex align-items-start gap-2">
        <Info className="text-primary mt-1 flex-shrink-0"  size="1em"/>
        <div className="small mb-0">
          <strong>Không thuộc luồng BN chính.</strong> Đây là bảng sự cố nội kiểm máy (IQC / Westgard) —
          khi QC ngoài giới hạn thì xem/xử lý tại đây. Demo E2E: BN → lấy mẫu → nhập KQ → BS duyệt
          <strong> không bắt buộc</strong> vào màn này.
        </div>
      </Alert>

      {loadError && (
        <Alert variant="danger" dismissible onClose={() => setLoadError(null)} className="rounded-3">
          {loadError}
        </Alert>
      )}

      {alertMsg && (
        <Alert variant={alertMsg.type} dismissible onClose={() => setAlertMsg(null)} className="rounded-4">
          {alertMsg.text}
        </Alert>
      )}

      {/* CẢNH BÁO KHÓA MÁY (WESTGARD 1_3s) */}
      {Array.isArray(flags) && flags.some(f => f.status === 'ACTIVE' && (f.ruleType?.includes('1_3s') || f.severity === 'CRITICAL')) && (
        <Alert variant="danger" className="rounded-4 mb-4 d-flex align-items-center gap-3" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
          <AlertTriangle className="fs-3 text-danger flex-shrink-0"  size="1em"/>
          <div>
            <strong className="d-block">Cảnh báo khóa máy phân tích: Phát hiện cờ nguy hiểm / vi phạm Westgard 1_3s</strong>
            <span className="small">
              Có cờ kiểm chuẩn QC mức độ nghiêm trọng (CRITICAL) hoặc vi phạm quy tắc Westgard 1_3s đang kích hoạt. Máy phân tích tương ứng đang tạm dừng chạy mẫu bệnh nhân cho đến khi hoàn tất khắc phục.
            </span>
          </div>
        </Alert>
      )}

      {/* KPI Quad Cards */}
      {statistics && (
        <Row className="g-3 mb-4">
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Tổng Số Cờ QC</h6>
                <div className="bms-kpi-value">{statistics.totalFlags}</div>
                <div className="bms-kpi-sub text-muted">Toàn bộ cờ kiểm chuẩn ghi nhận</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
                <TestTube2  size="1em"/>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Đang Cảnh Báo (Active)</h6>
                <div className="bms-kpi-value text-danger">{statistics.activeFlags}</div>
                <div className="bms-kpi-sub text-muted">Cần kiểm tra thiết bị ngay</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
                <AlertTriangle  size="1em"/>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Đang Điều Tra / Xử Lý</h6>
                <div className="bms-kpi-value" style={{ color: '#B45309' }}>{statistics.investigatingFlags}</div>
                <div className="bms-kpi-sub text-muted">Đang hiệu chuẩn hoặc thay hóa chất</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-amber">
                <Wrench  size="1em"/>
              </div>
            </div>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <div className="bms-kpi-quad-card">
              <div>
                <h6 className="bms-kpi-label">Đã Khắc Phục</h6>
                <div className="bms-kpi-value text-success">{statistics.resolvedFlags}</div>
                <div className="bms-kpi-sub text-muted">Đã xác nhận ổn định trở lại</div>
              </div>
              <div className="bms-kpi-icon-badge bms-kpi-icon-green">
                <CheckCircle2  size="1em"/>
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* Single-Line Flat Filter Bar */}
      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill">
          <Search className="bms-search-icon"  size="1em"/>
          <input
            type="text"
            placeholder="Tìm theo chỉ số (WBC, RBC, Glucose...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="bms-search-clear" onClick={() => setSearchTerm('')} title="Xóa tìm kiếm">
              <LucideX size={12} />
            </button>
          )}
        </div>

        <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang cảnh báo (Active)</option>
          <option value="INVESTIGATING">Đang điều tra</option>
          <option value="RESOLVED">Đã giải quyết</option>
          <option value="DISMISSED">Đã đóng</option>
        </Form.Select>

        <Form.Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">Tất cả mức độ</option>
          <option value="CRITICAL">Nguy hiểm (Critical)</option>
          <option value="HIGH">Mức cao (High)</option>
          <option value="MEDIUM">Trung bình (Medium)</option>
          <option value="LOW">Thấp (Low)</option>
        </Form.Select>

        <Form.Select value={analyzerFilter} onChange={(e) => setAnalyzerFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="ALL">Tất cả máy phân tích</option>
          <option value="ANL-SYS-01">Sysmex XN-1000</option>
          <option value="ANL-COB-02">Cobas 6000</option>
          <option value="ANL-MIN-03">Mindray BC-6800</option>
        </Form.Select>

        {hasActiveFilters && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setSeverityFilter('ALL');
              setAnalyzerFilter('ALL');
            }}
          >
            Đặt lại
          </Button>
        )}

        <span className="bms-filter-meta">
          Hiển thị <strong>{Array.isArray(flags) ? flags.length : 0}</strong> cờ QC
        </span>
      </div>

      {/* QC Flags Cards List (No Thick Left Border) */}
      {loading && (!Array.isArray(flags) || flags.length === 0) ? (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted small">Đang tải danh sách cờ kiểm chuẩn QC...</p>
        </div>
      ) : (Array.isArray(flags) && flags.length > 0) ? (
        <div className="d-flex flex-column gap-3">
          {(Array.isArray(flags) ? flags : []).map((flag) => {
            const isOutOfRange = flag.observedValue < flag.lowerLimit || flag.observedValue > flag.upperLimit;
            return (
              <Card 
                key={flag.flagId} 
                className="rounded-4 overflow-hidden bg-white"
                style={{ border: '1px solid #E2E8F0' }}
              >
                <Card.Body className="p-3">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div className="d-flex align-items-start gap-3">
                      <div 
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1"
                        style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: flag.status === 'ACTIVE' ? '#fee2e2' : flag.status === 'INVESTIGATING' ? '#fef3c7' : '#dcfce7',
                          color: flag.status === 'ACTIVE' ? '#dc2626' : flag.status === 'INVESTIGATING' ? '#d97706' : '#16a34a'
                        }}
                      >
                        <FlaskConical className="fs-5"  size="1em"/>
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                          <h5 className="mb-0 fw-bold text-dark">{flag.parameter}</h5>
                          <span className="badge bg-light text-dark border font-monospace">{flag.flagCode}</span>
                          {getSeverityBadge(flag.severity)}
                          {getStatusBadge(flag.status)}
                        </div>
                        <div className="text-muted small mb-2">
                          Máy: <strong className="text-dark">{flag.analyzerName}</strong> | Quy tắc: <span className="text-danger fw-semibold">{flag.ruleType}</span>
                        </div>

                        {/* Measurement Range Stats */}
                        <div className="d-flex flex-wrap align-items-center gap-3 p-2 bg-light rounded-3 small mt-2">
                          <div>
                            <span className="text-muted">Giá trị đo:</span>{' '}
                            <strong className={isOutOfRange ? 'text-danger fs-6' : 'text-success fs-6'}>
                              {flag.observedValue} {flag.unit}
                            </strong>
                          </div>
                          <div className="border-start ps-3">
                            <span className="text-muted">Giá trị mục tiêu (Target):</span>{' '}
                            <strong className="text-dark">{flag.targetValue} {flag.unit}</strong>
                          </div>
                          <div className="border-start ps-3">
                            <span className="text-muted">Khoảng kiểm chuẩn cho phép:</span>{' '}
                            <strong className="text-secondary">[{flag.lowerLimit} - {flag.upperLimit}] {flag.unit}</strong>
                          </div>
                          {flag.sampleBarcode && (
                            <div className="border-start ps-3 font-monospace text-primary">
                              Mẫu: #{flag.sampleBarcode}
                            </div>
                          )}
                        </div>

                        {/* Resolution Notes if Resolved */}
                        {flag.resolutionNotes && (
                          <div className="mt-3 p-3 bg-success-subtle border border-success-subtle rounded-3 small">
                            <div className="fw-bold text-success-emphasis mb-1 d-flex align-items-center gap-1">
                              <CheckCircle2  size="1em"/> Biện pháp khắc phục đã ghi nhận:
                            </div>
                            <div className="text-dark">{flag.resolutionNotes}</div>
                            {flag.resolvedBy && (
                              <div className="text-muted mt-1" style={{ fontSize: '0.75rem' }}>
                                Xử lý bởi: <strong>{flag.resolvedBy}</strong> lúc {new Date(flag.resolvedAt || flag.updatedAt).toLocaleString('vi-VN')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-flex align-items-center gap-2">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="rounded-pill px-3 py-2 d-flex align-items-center gap-1"
                        style={{ color: '#1E60E6', borderColor: '#1E60E6' }}
                        onClick={() => openEditModal(flag)}
                      >
                        <Wrench  size="1em"/>
                        <span>Xử lý / Cập nhật</span>
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="rounded-circle p-2"
                        onClick={() => openDeleteModal(flag)}
                        title="Xóa cờ QC"
                      >
                        <Trash2  size="1em"/>
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-0 shadow-sm rounded-4 text-center py-4 bg-white">
          <Card.Body>
            <CheckCircle2 className="text-secondary mb-3" style={{ fontSize: '2.5rem', opacity: 0.45 }}  size="1em"/>
            <h5 className="text-dark fw-bold">Chưa có cờ vi phạm Westgard</h5>
            <p className="text-muted small mx-auto mb-3" style={{ maxWidth: 520 }}>
              Danh sách trống = chưa ghi nhận sự cố IQC (hoặc đã lọc hết). Không đồng nghĩa mọi máy
              đang chạy — chỉ nghĩa chưa có bản ghi cờ trong bộ lọc hiện tại.
            </p>
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-pill px-3"
              onClick={() => navigate('/laboratory/qc')}
            >
              Ghi nhận nội kiểm tại trang IQC
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <FlaskConical className="text-warning"  size="1em"/>
            Thiết Lập / Kích Hoạt Cờ Kiểm Chuẩn QC Mới
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateSubmit}>
          <Modal.Body className="pt-3">
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Máy phân tích thiết bị</Form.Label>
                  <Form.Select
                    value={createForm.analyzerId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const name = id === 'ANL-SYS-01' ? 'Máy phân tích huyết học Sysmex XN-1000' :
                                   id === 'ANL-COB-02' ? 'Máy phân tích sinh hóa tự động Cobas 6000' :
                                   'Máy huyết học tự động Mindray BC-6800';
                      setCreateForm({ ...createForm, analyzerId: id, analyzerName: name });
                    }}
                  >
                    <option value="ANL-SYS-01">Sysmex XN-1000 (Huyết học)</option>
                    <option value="ANL-COB-02">Cobas 6000 (Sinh hóa)</option>
                    <option value="ANL-MIN-03">Mindray BC-6800 (Huyết học)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Chỉ số xét nghiệm (Parameter)</Form.Label>
                  <Form.Control
                    required
                    placeholder="VD: WBC (Bạch cầu), Hemoglobin, Glucose..."
                    value={createForm.parameter}
                    onChange={(e) => setCreateForm({ ...createForm, parameter: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Quy tắc sai số (QC Rule)</Form.Label>
                  <Form.Select
                    value={createForm.ruleType}
                    onChange={(e) => setCreateForm({ ...createForm, ruleType: e.target.value })}
                  >
                    <option value="Westgard_1_3s">Westgard 1_3s (Vượt ngưỡng 3SD)</option>
                    <option value="Westgard_2_2s">Westgard 2_2s (2 lần liên tiếp vượt 2SD)</option>
                    <option value="Westgard_R_4s">Westgard R_4s (Chênh lệch 4SD trong lượt chạy)</option>
                    <option value="Calibration_Drift">Calibration Drift (Trôi đường chuẩn &gt; 5%)</option>
                    <option value="Threshold_Out_Of_Bounds">Threshold Out Of Bounds (Vượt ngưỡng trên/dưới)</option>
                    <option value="Temperature_Alert">Temperature Alert (Lỗi nhiệt độ buồng ủ)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mức độ nghiêm trọng (Severity)</Form.Label>
                  <Form.Select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                  >
                    <option value="CRITICAL">Nguy hiểm (Critical - Dừng máy)</option>
                    <option value="HIGH">Mức cao (High)</option>
                    <option value="MEDIUM">Trung bình (Medium)</option>
                    <option value="LOW">Thấp (Low)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Giá trị đo quan sát</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    required
                    placeholder="VD: 16.8"
                    value={createForm.observedValue}
                    onChange={(e) => setCreateForm({ ...createForm, observedValue: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Giá trị mục tiêu (Target)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    required
                    placeholder="VD: 7.5"
                    value={createForm.targetValue}
                    onChange={(e) => setCreateForm({ ...createForm, targetValue: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Giới hạn dưới (Min)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    required
                    placeholder="VD: 4.0"
                    value={createForm.lowerLimit}
                    onChange={(e) => setCreateForm({ ...createForm, lowerLimit: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Giới hạn trên (Max)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    required
                    placeholder="VD: 10.0"
                    value={createForm.upperLimit}
                    onChange={(e) => setCreateForm({ ...createForm, upperLimit: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Đơn vị đo (Unit)</Form.Label>
                  <Form.Control
                    placeholder="VD: 10^9/L, g/dL, mmol/L..."
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Mã vạch mẫu liên quan (tùy chọn)</Form.Label>
                  <Form.Control
                    placeholder="VD: SMP-2026-091"
                    value={createForm.sampleBarcode}
                    onChange={(e) => setCreateForm({ ...createForm, sampleBarcode: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" className="rounded-pill px-3" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <Button className="rounded-pill px-3" style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }} type="submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Kích hoạt cờ QC'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit / Resolve Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center gap-2">
            <Wrench className="text-primary"  size="1em"/>
            Cập Nhật & Xử Lý Cờ Kiểm Chuẩn QC
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSubmit}>
          <Modal.Body className="pt-3">
            {selectedFlag && (
              <div className="p-3 bg-light rounded-3 mb-3">
                <div className="fw-bold text-dark">{selectedFlag.parameter} - {selectedFlag.analyzerName}</div>
                <div className="small text-muted mt-1">
                  Mã cờ: <span className="font-monospace text-primary">{selectedFlag.flagCode}</span> | Quy tắc: {selectedFlag.ruleType}
                </div>
                <div className="small text-muted">
                  Giá trị đo: <strong className="text-danger">{selectedFlag.observedValue} {selectedFlag.unit}</strong> (Khoảng chuẩn: {selectedFlag.lowerLimit} - {selectedFlag.upperLimit})
                </div>
              </div>
            )}
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Cập nhật trạng thái</Form.Label>
                  <Form.Select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="ACTIVE">Đang cảnh báo (Active)</option>
                    <option value="INVESTIGATING">Đang điều tra / kiểm tra máy</option>
                    <option value="RESOLVED">Đã giải quyết (Resolved)</option>
                    <option value="DISMISSED">Bỏ qua / Hủy cảnh báo</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Người xử lý</Form.Label>
                  <Form.Control
                    value={editForm.resolvedBy}
                    onChange={(e) => setEditForm({ ...editForm, resolvedBy: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Biện pháp khắc phục / Ghi chú kiểm chuẩn (Resolution Notes)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    required
                    placeholder="Mô tả cụ thể hành động: vệ sinh sensor, căn chỉnh lại quang học, thay hóa chất mới, chạy lại mẫu Control chuẩn..."
                    value={editForm.resolutionNotes}
                    onChange={(e) => setEditForm({ ...editForm, resolutionNotes: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="secondary" className="rounded-pill px-3" onClick={() => setShowEditModal(false)}>Hủy</Button>
            <Button variant="success" className="rounded-pill px-3 text-white" style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: '#FFFFFF' }} type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu kết quả xử lý'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2">
            <Trash2  size="1em"/>
            Xác Nhận Xóa Cờ QC
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-3">
          Bạn có chắc chắn muốn xóa bản ghi cờ kiểm chuẩn QC <strong>{selectedFlag?.flagCode}</strong> ({selectedFlag?.parameter}) khỏi hệ thống không?
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="secondary" className="rounded-pill px-3" onClick={() => setShowDeleteModal(false)}>Hủy</Button>
          <Button variant="danger" className="rounded-pill px-3" onClick={handleDeleteSubmit} disabled={submitting}>
            {submitting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default QcFlagsPage;
