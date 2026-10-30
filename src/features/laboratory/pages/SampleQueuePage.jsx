/**
 * @file SampleQueuePage.jsx
 * @description Laboratory Specimen Queue, Record Sample Time, and Update Sample Status management page.
 * @issue I2-062 | BR-123 | Assignee: Hứa Khánh Duy | Reviewer: Võ Gia Huy (UC40 - Record Sample Time)
 * Connects to:
 * - GET  /api/laboratory/samples/queue
 * - GET  /api/laboratory/samples/{id}
 * - POST /api/laboratory/samples/{id}/collection-time (Record Sample Time for existing sample)
 * - POST /api/laboratory/samples/record-collection    (Record Sample Time / create & associate sample)
 * - PUT  /api/laboratory/samples/{id}/status           (Update Sample Status with ISO 15189 transition validation)
 * - POST /api/laboratory/samples/{id}/rerun            (Request Sample Rerun)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Badge, Button, Form, Row, Col,
  Modal, Spinner, InputGroup, Alert
} from 'react-bootstrap';
import {
  FaVial, FaClock, FaExchangeAlt, FaRedoAlt, FaSearch,
  FaSyncAlt, FaBarcode, FaCheckCircle, FaExclamationTriangle,
  FaHistory, FaUserInjured, FaFlask
} from 'react-icons/fa';
import api from '../../../config/api';
import { searchPatients } from '../../../services/patientService';
import { ROLES, hasRole, getStoredUser } from '../../../constants/roles';

/**
 * ISO 15189 Permitted Sample Status Transitions (matches LabQueueService.AllowedStatusTransitions in BE).
 */
const ALLOWED_TRANSITIONS = {
  PendingCollection: ['Collected', 'Rejected'],
  Collected: ['Collected', 'InTransit', 'Received', 'Processing', 'Testing', 'Rejected'],
  InTransit: ['Received', 'Processing', 'Testing', 'Rejected'],
  Received: ['Processing', 'Testing', 'Completed', 'Rejected'],
  Processing: ['Testing', 'Completed', 'RerunRequested', 'Rejected'],
  Testing: ['Processing', 'Completed', 'RerunRequested', 'Rejected'],
  RerunRequested: ['Processing', 'Testing', 'Completed', 'Rejected'],
  Completed: ['RerunRequested'],
  Rejected: []
};

const STATUS_META = {
  PendingCollection: { label: 'Chờ lấy mẫu', bg: 'secondary' },
  Collected: { label: 'Đã lấy mẫu', bg: 'info' },
  InTransit: { label: 'Đang vận chuyển', bg: 'primary' },
  Received: { label: 'Đã tiếp nhận Lab', bg: 'primary' },
  Processing: { label: 'Đang xử lý / Ly tâm', bg: 'warning', text: 'dark' },
  Testing: { label: 'Đang chạy máy XN', bg: 'warning', text: 'dark' },
  Completed: { label: 'Hoàn thành KQ', bg: 'success' },
  RerunRequested: { label: 'Yêu cầu chạy lại', bg: 'danger' },
  Rejected: { label: 'Từ chối mẫu', bg: 'dark' }
};

const TUBE_PRESETS = [
  { color: 'Purple', label: 'Ống nắp Tím (EDTA)', anticoagulant: 'K2-EDTA', sampleType: 'Blood' },
  { color: 'Green', label: 'Ống nắp Xanh lá (Heparin)', anticoagulant: 'Lithium Heparin', sampleType: 'Plasma' },
  { color: 'Red', label: 'Ống nắp Đỏ (Serum)', anticoagulant: 'Không chất chống đông', sampleType: 'Serum' },
  { color: 'Blue', label: 'Ống nắp Xanh dương (Citrate)', anticoagulant: 'Sodium Citrate 3.2%', sampleType: 'Plasma' },
  { color: 'Yellow', label: 'Ống nắp Vàng (Gel SST)', anticoagulant: 'Clot Activator & Gel', sampleType: 'Serum' }
];

function toLocalDateTimeInput(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeVN(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function extractApiError(err, fallback = 'Không thể thực hiện thao tác trên mẫu xét nghiệm.') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.errors && typeof data.errors === 'object') {
    const msgs = Object.values(data.errors).flat().filter(Boolean);
    if (msgs.length > 0) return msgs.join(' ');
  }
  return data.detail || data.message || data.title || fallback;
}

const SampleQueuePage = () => {
  const [samples, setSamples] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [labRoomFilter, setLabRoomFilter] = useState('');

  // Patients, Appointments & Lab Rooms from DB for dynamic lookup in Record Sample Time & Update Sample Status
  const [patientOptions, setPatientOptions] = useState([]);
  const [appointmentOptions, setAppointmentOptions] = useState([]);
  const [labRooms, setLabRooms] = useState([]);

  const storedUser = React.useMemo(() => getStoredUser(), []);
  // WHY: UC40 Record Sample Time & UC47 Request Rerun are Lab-only; UC45 Update Sample Status is Lab + Manager (ROLE-PERMISSION-MATRIX §1).
  const canRecordSampleTime = React.useMemo(() => hasRole(storedUser, ROLES.LAB), [storedUser]);
  const canUpdateSampleStatus = React.useMemo(() => hasRole(storedUser, [ROLES.LAB, ROLES.MANAGER]), [storedUser]);
  const defaultOperatorName = storedUser?.fullName || storedUser?.username || 'KTV Xét Nghiệm';
  const defaultOperatorId = storedUser?.id || storedUser?.username || 'LAB-001';

  // =========================================================================
  // MODAL 1: RECORD SAMPLE TIME (Ghi nhận thời gian lấy mẫu)
  // =========================================================================
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [collectionTargetSample, setCollectionTargetSample] = useState(null);
  const [collectionForm, setCollectionForm] = useState({
    sampleId: '',
    barcode: '',
    rfidTag: '',
    patientId: '',
    appointmentId: '',
    collectedAt: toLocalDateTimeInput(),
    collectorName: 'ĐD. Hoàng Mai Lan',
    collectedBy: 'NURSE-01',
    sampleType: 'Blood',
    tubeColor: 'Purple',
    anticoagulant: 'K2-EDTA',
    volumeMl: 3.0,
    priority: 'Normal',
    labRoom: 'LAB-ROOM-01',
    notes: ''
  });
  const [collectionError, setCollectionError] = useState('');
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);

  // =========================================================================
  // MODAL 2: UPDATE SAMPLE STATUS (Cập nhật trạng thái vòng đời mẫu ISO 15189)
  // =========================================================================
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTargetSample, setStatusTargetSample] = useState(null);
  const [statusDetailLoading, setStatusDetailLoading] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: '',
    technicianName: 'CN.XN Phạm Minh Tuấn',
    technicianId: 'LAB-001',
    labRoom: 'LAB-ROOM-01',
    timestamp: toLocalDateTimeInput(),
    rejectionReason: '',
    notes: ''
  });
  const [statusError, setStatusError] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // =========================================================================
  // MODAL 3: RERUN REQUEST (UC47)
  // =========================================================================
  const [showRerunModal, setShowRerunModal] = useState(false);
  const [selectedSample, setSelectedSample] = useState(null);
  const [rerunReason, setRerunReason] = useState('');
  const [rerunLoading, setRerunLoading] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/laboratory/samples/queue', {
        params: {
          search: searchTerm.trim() || undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined,
          labRoom: labRoomFilter.trim() || undefined,
          page: 1,
          pageSize: 50
        }
      });
      if (res.data?.success) {
        const list = res.data.data || [];
        setSamples(list);
        setTotalCount(res.data.total ?? list.length);
      } else {
        setSamples([]);
        setErrorMsg(res.data?.message || 'Không thể tải hàng đợi xét nghiệm.');
      }
    } catch (err) {
      setSamples([]);
      setErrorMsg(extractApiError(err, 'Không thể kết nối máy chủ phòng xét nghiệm.'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, priorityFilter, labRoomFilter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Load real Lab Rooms from DB (/api/shifts/rooms)
  useEffect(() => {
    api.get('/shifts/rooms')
      .then((res) => {
        const list = res.data?.data || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setLabRooms(list);
        }
      })
      .catch(() => {
        // Non-blocking
      });
  }, []);

  // Load patient and appointment options from DB for the Record Sample Time modal
  const loadPatientsForLookup = async () => {
    if (patientOptions.length === 0) {
      try {
        const res = await searchPatients({ page: 1, pageSize: 50 });
        const items = res?.items || res?.Items || [];
        setPatientOptions(items);
      } catch {
        // Non-blocking
      }
    }
    if (appointmentOptions.length === 0) {
      try {
        const res = await api.get('/appointments', { params: { page: 1, pageSize: 50 } });
        const items = res.data?.items || res.data?.Items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setAppointmentOptions(items);
      } catch {
        // Non-blocking
      }
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  // =========================================================================
  // HANDLERS: RECORD SAMPLE TIME MODAL
  // =========================================================================
  const openRecordCollectionModal = (sample = null) => {
    loadPatientsForLookup();
    setCollectionTargetSample(sample);
    setCollectionError('');

    if (sample) {
      setCollectionForm({
        sampleId: sample.id || '',
        barcode: sample.barcode || '',
        rfidTag: sample.rfidTag || '',
        patientId: sample.patientId || '',
        appointmentId: sample.appointmentId || sample.testOrderId || '',
        collectedAt: toLocalDateTimeInput(sample.collectedAt || new Date()),
        collectorName: sample.collectorName || defaultOperatorName,
        collectedBy: sample.collectedBy || defaultOperatorId,
        sampleType: sample.sampleType || 'Blood',
        tubeColor: sample.tubeColor || 'Purple',
        anticoagulant: sample.anticoagulant || 'K2-EDTA',
        volumeMl: sample.volumeMl || 3.0,
        priority: sample.priority || 'Normal',
        labRoom: sample.labRoom || (labRooms[0]?.id || 'LAB-ROOM-01'),
        notes: sample.notes || ''
      });
    } else {
      const rand = Math.floor(100000 + Math.random() * 900000);
      setCollectionForm({
        sampleId: '',
        barcode: `SMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${rand}`,
        rfidTag: `RFID-E280-${rand}`,
        patientId: '',
        appointmentId: '',
        collectedAt: toLocalDateTimeInput(new Date()),
        collectorName: defaultOperatorName,
        collectedBy: defaultOperatorId,
        sampleType: 'Blood',
        tubeColor: 'Purple',
        anticoagulant: 'K2-EDTA',
        volumeMl: 3.0,
        priority: 'Normal',
        labRoom: labRooms[0]?.id || 'LAB-ROOM-01',
        notes: ''
      });
    }
    setShowCollectionModal(true);
  };

  const handleTubePresetChange = (tubeColor) => {
    const preset = TUBE_PRESETS.find(t => t.color === tubeColor);
    setCollectionForm(prev => ({
      ...prev,
      tubeColor,
      anticoagulant: preset ? preset.anticoagulant : prev.anticoagulant,
      sampleType: preset ? preset.sampleType : prev.sampleType
    }));
  };

  const handleSubmitCollectionTime = async (e) => {
    e.preventDefault();
    setCollectionError('');

    // Validate timestamp
    const parsedDate = collectionForm.collectedAt ? new Date(collectionForm.collectedAt) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      setCollectionError('Thời điểm lấy mẫu không hợp lệ.');
      return;
    }
    const now = new Date();
    if (parsedDate.getTime() > now.getTime() + 2 * 60 * 1000) {
      setCollectionError('Thời điểm lấy mẫu (CollectedAt) không được vượt quá thời gian hiện tại.');
      return;
    }

    const vol = Number(collectionForm.volumeMl);
    if (!Number.isFinite(vol) || vol < 0.1 || vol > 50) {
      setCollectionError('Thể tích mẫu (VolumeMl) phải từ 0.1 đến 50 ml.');
      return;
    }

    if (!collectionTargetSample && !collectionForm.sampleId.trim() && !collectionForm.patientId.trim() && !collectionForm.appointmentId.trim()) {
      setCollectionError('Vui lòng chọn Bệnh nhân (PatientId), Mã lịch hẹn (AppointmentId) hoặc nhập Mã mẫu (SampleId/Barcode).');
      return;
    }

    const payload = {
      sampleId: collectionForm.sampleId.trim() || undefined,
      barcode: collectionForm.barcode.trim() || undefined,
      rfidTag: collectionForm.rfidTag.trim() || undefined,
      patientId: collectionForm.patientId.trim() || undefined,
      appointmentId: collectionForm.appointmentId.trim() || undefined,
      collectedAt: parsedDate.toISOString(),
      collectedBy: collectionForm.collectedBy.trim() || undefined,
      collectorName: collectionForm.collectorName.trim() || undefined,
      sampleType: collectionForm.sampleType,
      tubeColor: collectionForm.tubeColor,
      anticoagulant: collectionForm.anticoagulant.trim() || undefined,
      volumeMl: vol,
      priority: collectionForm.priority,
      labRoom: collectionForm.labRoom.trim() || undefined,
      notes: collectionForm.notes.trim() || undefined
    };

    setCollectionSubmitting(true);
    try {
      let res;
      if (collectionTargetSample?.id) {
        res = await api.post(`/laboratory/samples/${encodeURIComponent(collectionTargetSample.id)}/collection-time`, payload);
      } else if (collectionForm.sampleId.trim()) {
        res = await api.post(`/laboratory/samples/${encodeURIComponent(collectionForm.sampleId.trim())}/collection-time`, payload);
      } else {
        res = await api.post('/laboratory/samples/record-collection', payload);
      }

      const updatedSample = res.data?.data;
      setSuccessMsg(
        res.data?.message ||
        `Đã ghi nhận thời gian lấy mẫu thành công cho Barcode ${updatedSample?.barcode || payload.barcode}.`
      );
      setShowCollectionModal(false);
      await fetchQueue();
    } catch (err) {
      setCollectionError(extractApiError(err, 'Không thể ghi nhận thời gian lấy mẫu.'));
    } finally {
      setCollectionSubmitting(false);
    }
  };

  // =========================================================================
  // HANDLERS: UPDATE SAMPLE STATUS MODAL
  // =========================================================================
  const openStatusUpdateModal = async (sample) => {
    const allowed = ALLOWED_TRANSITIONS[sample.status] || [];
    const defaultNext = allowed.find(st => st !== 'Rejected' && st !== sample.status) || allowed[0] || sample.status;

    setStatusTargetSample(sample);
    setStatusError('');
    setStatusForm({
      status: defaultNext,
      technicianName: sample.assignedTechnicianName || 'CN.XN Phạm Minh Tuấn',
      technicianId: sample.assignedTechnicianId || 'LAB-001',
      labRoom: sample.labRoom || 'LAB-ROOM-01',
      timestamp: toLocalDateTimeInput(new Date()),
      rejectionReason: sample.rejectionReason || '',
      notes: ''
    });
    setShowStatusModal(true);

    // Fetch full sample details including statusHistory
    setStatusDetailLoading(true);
    try {
      const res = await api.get(`/laboratory/samples/${encodeURIComponent(sample.id)}`);
      if (res.data?.success && res.data?.data) {
        setStatusTargetSample(res.data.data);
      }
    } catch {
      // Keep row item if detail call fails
    } finally {
      setStatusDetailLoading(false);
    }
  };

  const handleSubmitStatusUpdate = async (e) => {
    e.preventDefault();
    if (!statusTargetSample) return;
    setStatusError('');

    if (!statusForm.status) {
      setStatusError('Vui lòng chọn trạng thái mẫu tiếp theo.');
      return;
    }

    if (statusForm.status === 'Rejected' && !statusForm.rejectionReason.trim()) {
      setStatusError('Vui lòng nhập lý do từ chối mẫu bệnh phẩm (VD: Mẫu tán huyết, đông máu, không đủ thể tích...).');
      return;
    }

    const parsedTs = statusForm.timestamp ? new Date(statusForm.timestamp) : new Date();
    if (Number.isNaN(parsedTs.getTime())) {
      setStatusError('Thời gian cập nhật trạng thái không hợp lệ.');
      return;
    }

    const payload = {
      status: statusForm.status,
      technicianId: statusForm.technicianId.trim() || undefined,
      technicianName: statusForm.technicianName.trim() || undefined,
      labRoom: statusForm.labRoom.trim() || undefined,
      rejectionReason: statusForm.status === 'Rejected' ? statusForm.rejectionReason.trim() : undefined,
      notes: statusForm.notes.trim() || undefined,
      timestamp: parsedTs.toISOString()
    };

    setStatusSubmitting(true);
    try {
      const res = await api.put(`/laboratory/samples/${encodeURIComponent(statusTargetSample.id)}/status`, payload);
      setSuccessMsg(
        res.data?.message ||
        `Đã chuyển trạng thái mẫu ${statusTargetSample.barcode} sang "${STATUS_META[statusForm.status]?.label || statusForm.status}".`
      );
      setShowStatusModal(false);
      await fetchQueue();
    } catch (err) {
      setStatusError(extractApiError(err, 'Không thể cập nhật trạng thái mẫu xét nghiệm.'));
    } finally {
      setStatusSubmitting(false);
    }
  };

  // =========================================================================
  // HANDLERS: RERUN MODAL
  // =========================================================================
  const openRerunModal = (sample) => {
    setSelectedSample(sample);
    setRerunReason('');
    setShowRerunModal(true);
  };

  const handleConfirmRerun = async (e) => {
    e.preventDefault();
    if (!rerunReason.trim() || !selectedSample) return;

    setRerunLoading(true);
    try {
      await api.post(`/laboratory/samples/${encodeURIComponent(selectedSample.id)}/rerun`, {
        reason: rerunReason.trim(),
        requestedBy: 'CN.XN Phạm Minh Tuấn'
      });
      setSuccessMsg(`Đã gửi yêu cầu chạy lại (Rerun) cho mẫu ${selectedSample.barcode}.`);
      setShowRerunModal(false);
      await fetchQueue();
    } catch (err) {
      setErrorMsg(extractApiError(err, 'Không thể gửi yêu cầu chạy lại mẫu.'));
    } finally {
      setRerunLoading(false);
    }
  };

  const getStatusBadge = (st) => {
    const meta = STATUS_META[st] || { label: st || 'Unknown', bg: 'secondary' };
    return (
      <Badge bg={meta.bg} text={meta.text} className="px-2 py-1">
        {meta.label}
      </Badge>
    );
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'Stat':
        return <Badge bg="danger" className="px-2 py-1 fw-bold">STAT (Cấp cứu)</Badge>;
      case 'Urgent':
        return <Badge bg="warning" text="dark" className="px-2 py-1 fw-bold">Khẩn (Urgent)</Badge>;
      default:
        return <Badge bg="light" text="dark" className="border px-2 py-1">Thường</Badge>;
    }
  };

  // Summary counts
  const collectedCount = samples.filter(s => ['Collected', 'InTransit', 'Received'].includes(s.status)).length;
  const processingCount = samples.filter(s => ['Processing', 'Testing', 'RerunRequested'].includes(s.status)).length;
  const completedCount = samples.filter(s => s.status === 'Completed').length;

  return (
    <div className="w-100 py-1">
      {/* Page Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 pb-2 border-bottom">
        <div>
          <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FaVial className="text-primary" />
            <span>Quản Lý Mẫu Bệnh Phẩm & Hàng Đợi Xét Nghiệm (ISO 15189)</span>
          </h3>
          <p className="text-muted small mb-0">
            Ghi nhận thời gian lấy mẫu (Record Sample Time), cập nhật vòng đời mẫu (Update Sample Status) và kiểm soát TAT phòng Lab.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <Button variant="outline-secondary" size="sm" onClick={fetchQueue} disabled={loading} className="d-flex align-items-center gap-1 px-3 py-2">
            <FaSyncAlt className={loading ? 'fa-spin' : ''} /> Làm mới
          </Button>
          {canRecordSampleTime && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openRecordCollectionModal(null)}
              className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
            >
              <FaClock /> Ghi Nhận Thời Gian Lấy Mẫu Mới (UC40)
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="rounded-3 shadow-sm">
          <FaCheckCircle className="me-2" />
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="rounded-3 shadow-sm">
          <FaExclamationTriangle className="me-2" />
          {errorMsg}
        </Alert>
      )}

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col xs={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex justify-content-between align-items-center p-3">
              <div>
                <div className="text-muted small">Tổng Mẫu Trong Hàng Đợi</div>
                <div className="fs-4 fw-bold text-dark">{totalCount}</div>
              </div>
              <div className="rounded-3 bg-primary-subtle text-primary p-3 fs-4"><FaVial /></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex justify-content-between align-items-center p-3">
              <div>
                <div className="text-muted small">Đã Lấy Mẫu / Tiếp Nhận</div>
                <div className="fs-4 fw-bold text-info">{collectedCount}</div>
              </div>
              <div className="rounded-3 bg-info-subtle text-info-emphasis p-3 fs-4"><FaClock /></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex justify-content-between align-items-center p-3">
              <div>
                <div className="text-muted small">Đang Xử Lý / Chạy Máy</div>
                <div className="fs-4 fw-bold text-warning">{processingCount}</div>
              </div>
              <div className="rounded-3 bg-warning-subtle text-warning-emphasis p-3 fs-4"><FaFlask /></div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex justify-content-between align-items-center p-3">
              <div>
                <div className="text-muted small">Đã Hoàn Thành Kết Quả</div>
                <div className="fs-4 fw-bold text-success">{completedCount}</div>
              </div>
              <div className="rounded-3 bg-success-subtle text-success p-3 fs-4"><FaCheckCircle /></div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body className="p-3">
          <Form onSubmit={handleSearch}>
            <Row className="g-2 align-items-center">
              <Col xs={12} md={4}>
                <InputGroup size="sm">
                  <InputGroup.Text className="bg-white"><FaSearch className="text-muted" /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Tìm theo Barcode, Mã mẫu, Mã BN hoặc Tên bệnh nhân..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button variant="primary" type="submit">Tìm</Button>
                </InputGroup>
              </Col>

              <Col xs={6} md={3}>
                <Form.Select size="sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="All">Tất cả trạng thái mẫu</option>
                  <option value="PendingCollection">Chờ lấy mẫu (PendingCollection)</option>
                  <option value="Collected">Đã lấy mẫu (Collected)</option>
                  <option value="InTransit">Đang vận chuyển (InTransit)</option>
                  <option value="Received">Đã tiếp nhận Lab (Received)</option>
                  <option value="Processing">Đang xử lý / Ly tâm (Processing)</option>
                  <option value="Testing">Đang chạy máy XN (Testing)</option>
                  <option value="Completed">Hoàn thành (Completed)</option>
                  <option value="RerunRequested">Yêu cầu chạy lại (RerunRequested)</option>
                  <option value="Rejected">Từ chối mẫu (Rejected)</option>
                </Form.Select>
              </Col>

              <Col xs={6} md={2}>
                <Form.Select size="sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="All">Mọi mức độ ưu tiên</option>
                  <option value="Normal">Bình thường (Normal)</option>
                  <option value="Urgent">Khẩn cấp (Urgent)</option>
                  <option value="Stat">Cấp cứu (STAT)</option>
                </Form.Select>
              </Col>

              <Col xs={8} md={2}>
                <Form.Control
                  size="sm"
                  type="text"
                  placeholder="Phòng Lab (VD: LAB-ROOM-01)"
                  value={labRoomFilter}
                  onChange={(e) => setLabRoomFilter(e.target.value)}
                />
              </Col>

              <Col xs={4} md={1} className="text-end">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="w-100"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setLabRoomFilter('');
                  }}
                >
                  Xoá lọc
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Samples Queue Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              <span className="text-muted">Đang tải danh sách mẫu bệnh phẩm...</span>
            </div>
          ) : samples.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaVial className="fs-1 text-secondary opacity-50 mb-2" />
              <div className="fw-semibold">Không tìm thấy mẫu bệnh phẩm nào trong hàng đợi</div>
              <div className="small mb-3">Bạn có thể ghi nhận mẫu mới bằng nút &ldquo;Ghi Nhận Thời Gian Lấy Mẫu Mới&rdquo;.</div>
              {canRecordSampleTime && (
                <Button variant="primary" size="sm" onClick={() => openRecordCollectionModal(null)}>
                  <FaClock className="me-1" /> Ghi Nhận Lấy Mẫu Ngay (UC40)
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'hidden' }}>
              <Table hover className="mb-0 align-middle table-sm" style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Barcode / Mã Mẫu</th>
                    <th>Bệnh Nhân</th>
                    <th>Chỉ Định / Ống Mẫu</th>
                    <th>Thời Gian Lấy Mẫu</th>
                    <th>Ưu Tiên</th>
                    <th>Phòng Lab</th>
                    <th>Trạng Thái</th>
                    <th className="text-end pe-3">Thao Tác (Popup)</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.id}>
                      <td className="ps-3">
                        <div className="fw-bold font-monospace text-primary d-flex align-items-center gap-1" style={{ fontSize: '0.82rem' }}>
                          <FaBarcode />
                          <span>{s.barcode}</span>
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          ID: <code>{s.id}</code>
                          {s.rfidTag ? ` • ${s.rfidTag}` : ''}
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark" style={{ fontSize: '0.84rem', wordBreak: 'break-word' }}>
                          {s.patientName || s.patientId || 'Bệnh nhân'}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.74rem' }}>
                          Mã BN: <code>{s.patientId || '—'}</code>
                          {s.patientGender ? ` • ${s.patientGender}` : ''}
                          {s.patientAge ? `, ${s.patientAge} tuổi` : ''}
                        </div>
                      </td>

                      <td>
                        <div className="fw-medium text-dark" style={{ fontSize: '0.82rem', wordBreak: 'break-word', lineHeight: 1.25 }}>
                          {s.testPackageName || 'Xét nghiệm lâm sàng'}
                        </div>
                        <div className="small text-muted d-flex flex-wrap gap-1 align-items-center mt-1">
                          <Badge bg="secondary" className="fw-normal" style={{ fontSize: '0.7rem' }}>{s.sampleType || 'Blood'}</Badge>
                          {s.tubeColor && <Badge bg="light" text="dark" className="border" style={{ fontSize: '0.7rem' }}>{s.tubeColor}</Badge>}
                          {s.volumeMl ? <span style={{ fontSize: '0.72rem' }}>{s.volumeMl} ml</span> : null}
                        </div>
                        {s.rejectionReason && (
                          <div className="text-danger small mt-1" style={{ fontSize: '0.72rem', wordBreak: 'break-word' }}>
                            <FaExclamationTriangle className="me-1" />
                            Từ chối: {s.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="fw-semibold text-dark" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {formatDateTimeVN(s.collectedAt)}
                        </div>
                        <div className="text-muted text-truncate" style={{ fontSize: '0.72rem' }} title={s.collectorName || s.collectedBy || 'KTV Lấy mẫu'}>
                          Người lấy: {s.collectorName || s.collectedBy || 'KTV Lấy mẫu'}
                        </div>
                      </td>

                      <td>{getPriorityBadge(s.priority)}</td>

                      <td>
                        <span className="badge bg-light text-dark border text-truncate d-inline-block" style={{ maxWidth: '100%', fontSize: '0.75rem' }} title={s.labRoom || 'LAB-ROOM-01'}>
                          {s.labRoom || 'LAB-ROOM-01'}
                        </span>
                      </td>

                      <td>{getStatusBadge(s.status)}</td>

                      <td className="text-end pe-3">
                        <div className="d-flex gap-1 justify-content-end align-items-center">
                          {canRecordSampleTime && (
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="px-2 py-1 text-nowrap d-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem' }}
                              title="Ghi nhận / Cập nhật thời gian lấy mẫu (Record Sample Time - UC40)"
                              onClick={() => openRecordCollectionModal(s)}
                            >
                              <FaClock />
                              <span>Giờ lấy</span>
                            </Button>
                          )}

                          {canUpdateSampleStatus && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="px-2 py-1 text-nowrap d-flex align-items-center gap-1"
                              style={{ fontSize: '0.75rem' }}
                              title="Cập nhật trạng thái vòng đời mẫu (Update Sample Status - UC45)"
                              onClick={() => openStatusUpdateModal(s)}
                            >
                              <FaExchangeAlt />
                              <span>Trạng thái</span>
                            </Button>
                          )}

                          {canRecordSampleTime && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="px-2 py-1"
                              style={{ fontSize: '0.75rem' }}
                              title="Yêu cầu chạy lại mẫu (Rerun)"
                              onClick={() => openRerunModal(s)}
                            >
                              <FaRedoAlt />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* =====================================================================
          MODAL 1: RECORD SAMPLE TIME POPUP (Ghi nhận thời gian lấy mẫu)
         ===================================================================== */}
      <Modal
        show={showCollectionModal}
        onHide={() => !collectionSubmitting && setShowCollectionModal(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Form onSubmit={handleSubmitCollectionTime}>
          <Modal.Header closeButton={!collectionSubmitting} className="bg-light">
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <FaClock className="text-primary" />
              <span>
                {collectionTargetSample
                  ? `Ghi Nhận Thời Gian Lấy Mẫu — ${collectionTargetSample.barcode}`
                  : 'Ghi Nhận Thời Gian Lấy Mẫu Mới (Record Sample Time)'}
              </span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {collectionError && (
              <Alert variant="danger" className="py-2 small">
                <FaExclamationTriangle className="me-2" />
                {collectionError}
              </Alert>
            )}

            {!collectionTargetSample && patientOptions.length > 0 && (
              <div className="p-3 rounded-3 bg-light border mb-3">
                <Form.Label className="small fw-bold text-secondary mb-1">
                  <FaUserInjured className="me-1" />
                  Chọn nhanh bệnh nhân từ danh sách tiếp đón (tự động điền Patient ID)
                </Form.Label>
                <Form.Select
                  size="sm"
                  defaultValue=""
                  onChange={(e) => {
                    const pid = e.target.value;
                    if (pid) {
                      setCollectionForm(prev => ({ ...prev, patientId: pid }));
                    }
                  }}
                >
                  <option value="">-- Chọn bệnh nhân để liên kết mẫu bệnh phẩm --</option>
                  {patientOptions.map(p => (
                    <option key={p.id || p.patientCode} value={p.patientCode || p.id}>
                      [{p.patientCode || p.id}] {p.fullName} — SĐT: {p.phoneNumber || p.phone || '—'}
                    </option>
                  ))}
                </Form.Select>
              </div>
            )}

            {!collectionTargetSample && appointmentOptions.length > 0 && (
              <div className="p-3 rounded-3 bg-light border mb-3">
                <Form.Label className="small fw-bold text-secondary mb-1">
                  Chọn nhanh Lịch hẹn / Phiếu chỉ định từ hệ thống (tự động điền Appointment ID & Patient ID)
                </Form.Label>
                <Form.Select
                  size="sm"
                  defaultValue=""
                  onChange={(e) => {
                    const aid = e.target.value;
                    const apt = appointmentOptions.find(a => (a.id || a.appointmentId) === aid);
                    if (apt) {
                      setCollectionForm(prev => ({
                        ...prev,
                        appointmentId: apt.id || apt.appointmentId,
                        patientId: apt.patientId || prev.patientId
                      }));
                    }
                  }}
                >
                  <option value="">-- Chọn lịch hẹn / chỉ định xét nghiệm từ CSDL --</option>
                  {appointmentOptions.map(a => {
                    const aid = a.id || a.appointmentId;
                    return (
                      <option key={aid} value={aid}>
                        [{aid}] {a.patientName || a.patientId || 'Bệnh nhân'} — {a.status || 'Active'}
                      </option>
                    );
                  })}
                </Form.Select>
              </div>
            )}

            <Row className="g-3">
              <Col md={4}>
                <Form.Label className="small fw-semibold">Mã Barcode Ống Mẫu</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="VD: SMP-20261018-001"
                  value={collectionForm.barcode}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, barcode: e.target.value }))}
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">
                  Mã Bệnh Nhân (Patient ID) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="VD: PAT-079095001234"
                  value={collectionForm.patientId}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, patientId: e.target.value }))}
                  required={!collectionTargetSample}
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Mã Lịch Hẹn / Chỉ Định</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="VD: APP-20260529-01"
                  value={collectionForm.appointmentId}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, appointmentId: e.target.value }))}
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold">
                  Thời Điểm Lấy Mẫu Thực Tế (CollectedAt) <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="datetime-local"
                    value={collectionForm.collectedAt}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, collectedAt: e.target.value }))}
                    required
                  />
                  <Button
                    variant="outline-primary"
                    type="button"
                    onClick={() => setCollectionForm(prev => ({ ...prev, collectedAt: toLocalDateTimeInput(new Date()) }))}
                  >
                    Bây giờ
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">
                  Hệ thống kiểm tra không vượt quá thời điểm hiện tại và không quá 30 ngày trước.
                </Form.Text>
              </Col>

              <Col md={3}>
                <Form.Label className="small fw-semibold">Người Lấy Mẫu</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Họ tên ĐD/KTV"
                  value={collectionForm.collectorName}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, collectorName: e.target.value }))}
                />
              </Col>

              <Col md={3}>
                <Form.Label className="small fw-semibold">Mã Nhân Viên Lấy Mẫu</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="VD: NURSE-01"
                  value={collectionForm.collectedBy}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, collectedBy: e.target.value }))}
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Loại Ống Nghiệm (Tube Color)</Form.Label>
                <Form.Select
                  value={collectionForm.tubeColor}
                  onChange={(e) => handleTubePresetChange(e.target.value)}
                >
                  {TUBE_PRESETS.map(t => (
                    <option key={t.color} value={t.color}>{t.label}</option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Loại Bệnh Phẩm (Sample Type)</Form.Label>
                <Form.Select
                  value={collectionForm.sampleType}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, sampleType: e.target.value }))}
                >
                  <option value="Blood">Máu toàn phần (Whole Blood)</option>
                  <option value="Serum">Huyết thanh (Serum)</option>
                  <option value="Plasma">Huyết tương (Plasma)</option>
                  <option value="Urine">Nước tiểu (Urine)</option>
                </Form.Select>
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Chất Chống Đông (Anticoagulant)</Form.Label>
                <Form.Control
                  type="text"
                  value={collectionForm.anticoagulant}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, anticoagulant: e.target.value }))}
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Thể Tích Mẫu (ml) <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={collectionForm.volumeMl}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, volumeMl: e.target.value }))}
                  required
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Mức Độ Ưu Tiên</Form.Label>
                <Form.Select
                  value={collectionForm.priority}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="Normal">Bình thường (Normal)</option>
                  <option value="Urgent">Khẩn cấp (Urgent)</option>
                  <option value="Stat">Cấp cứu (STAT)</option>
                </Form.Select>
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">Phòng Lab Tiếp Nhận (CSDL)</Form.Label>
                {labRooms.length > 0 ? (
                  <Form.Select
                    value={collectionForm.labRoom}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, labRoom: e.target.value }))}
                  >
                    {labRooms.map(r => (
                      <option key={r.id || r.roomNumber} value={r.id || r.roomNumber}>
                        {r.name ? `${r.id || r.roomNumber} — ${r.name}` : (r.id || r.roomNumber)}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    type="text"
                    placeholder="VD: LAB-ROOM-01"
                    value={collectionForm.labRoom}
                    onChange={(e) => setCollectionForm(prev => ({ ...prev, labRoom: e.target.value }))}
                  />
                )}
              </Col>

              <Col xs={12}>
                <Form.Label className="small fw-semibold">Ghi Chú Khi Lấy Mẫu</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ghi chú tình trạng tĩnh mạch, thời gian nhịn ăn của bệnh nhân..."
                  value={collectionForm.notes}
                  onChange={(e) => setCollectionForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowCollectionModal(false)} disabled={collectionSubmitting}>
              Huỷ
            </Button>
            <Button variant="primary" type="submit" disabled={collectionSubmitting}>
              {collectionSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang ghi nhận...
                </>
              ) : (
                'Xác Nhận Ghi Nhận Thời Gian Lấy Mẫu'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* =====================================================================
          MODAL 2: UPDATE SAMPLE STATUS POPUP (Cập nhật trạng thái mẫu ISO 15189)
         ===================================================================== */}
      <Modal
        show={showStatusModal}
        onHide={() => !statusSubmitting && setShowStatusModal(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Form onSubmit={handleSubmitStatusUpdate}>
          <Modal.Header closeButton={!statusSubmitting} className="bg-light">
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <FaExchangeAlt className="text-primary" />
              <span>Cập Nhật Trạng Thái Mẫu Bệnh Phẩm (ISO 15189)</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {statusError && (
              <Alert variant="danger" className="py-2 small">
                <FaExclamationTriangle className="me-2" />
                {statusError}
              </Alert>
            )}

            {statusTargetSample && (
              <>
                {/* Sample Summary Header */}
                <div className="p-3 rounded-3 bg-primary-subtle border border-primary-subtle mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div>
                    <div className="fw-bold text-dark fs-6">
                      Barcode: <span className="font-monospace text-primary">{statusTargetSample.barcode}</span> • {statusTargetSample.patientName}
                    </div>
                    <div className="small text-secondary">
                      Mã BN: <code>{statusTargetSample.patientId}</code> • Loại mẫu: <strong>{statusTargetSample.sampleType}</strong> ({statusTargetSample.tubeColor || 'Purple'}) • Giờ lấy mẫu: <strong>{formatDateTimeVN(statusTargetSample.collectedAt)}</strong>
                    </div>
                  </div>
                  <div>
                    <div className="small text-muted mb-1">Trạng thái hiện tại:</div>
                    {getStatusBadge(statusTargetSample.status)}
                  </div>
                </div>

                {/* Permitted Transitions Selector */}
                <div className="mb-3">
                  <Form.Label className="small fw-bold text-secondary">
                    Chọn Trạng Thái Chuyển Tiếp Hợp Lệ (Permitted Status Transitions) <span className="text-danger">*</span>
                  </Form.Label>
                  {(() => {
                    const permitted = ALLOWED_TRANSITIONS[statusTargetSample.status] || [];
                    if (permitted.length === 0) {
                      return (
                        <Alert variant="secondary" className="py-2 small mb-0">
                          Mẫu đang ở trạng thái kết thúc (<strong>{statusTargetSample.status}</strong>) nên không thể chuyển tiếp thêm.
                        </Alert>
                      );
                    }
                    return (
                      <div className="d-flex flex-wrap gap-2">
                        {permitted.map((nextSt) => {
                          const meta = STATUS_META[nextSt] || { label: nextSt };
                          const isSelected = statusForm.status === nextSt;
                          return (
                            <Button
                              key={nextSt}
                              type="button"
                              size="sm"
                              variant={isSelected ? (nextSt === 'Rejected' ? 'danger' : 'primary') : 'outline-secondary'}
                              className="px-3 py-2 fw-semibold"
                              onClick={() => setStatusForm(prev => ({ ...prev, status: nextSt }))}
                            >
                              {isSelected && <FaCheckCircle className="me-1" />}
                              {meta.label} ({nextSt})
                            </Button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="small fw-semibold">
                      Thời Gian Ghi Nhận Chuyển Trạng Thái <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={statusForm.timestamp}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, timestamp: e.target.value }))}
                      required
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Phòng Lab Xử Lý</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="VD: LAB-ROOM-01"
                      value={statusForm.labRoom}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, labRoom: e.target.value }))}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Kỹ Thuật Viên Thực Hiện</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Họ và tên KTV"
                      value={statusForm.technicianName}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, technicianName: e.target.value }))}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Mã Kỹ Thuật Viên</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="VD: LAB-001"
                      value={statusForm.technicianId}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, technicianId: e.target.value }))}
                    />
                  </Col>

                  {statusForm.status === 'Rejected' && (
                    <Col xs={12}>
                      <Form.Label className="small fw-bold text-danger">
                        Lý Do Từ Chối Mẫu Bệnh Phẩm (Bắt buộc khi chọn Rejected) <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="VD: Mẫu máu bị tán huyết nặng / Đông cục / Không đủ thể tích chạy máy..."
                        value={statusForm.rejectionReason}
                        onChange={(e) => setStatusForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                        required
                      />
                    </Col>
                  )}

                  <Col xs={12}>
                    <Form.Label className="small fw-semibold">Ghi Chú Chuyên Môn</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Ghi chú tình trạng huyết thanh, máy phân tích Cobas / Sysmex..."
                      value={statusForm.notes}
                      onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </Col>
                </Row>

                {/* Status History Audit Trail */}
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="small fw-bold text-secondary d-flex align-items-center gap-1">
                      <FaHistory /> Lịch Sử Chuyển Trạng Thái Mẫu (Audit Trail)
                    </span>
                    {statusDetailLoading && <Spinner animation="border" size="sm" variant="primary" />}
                  </div>

                  {Array.isArray(statusTargetSample.statusHistory) && statusTargetSample.statusHistory.length > 0 ? (
                    <div className="border rounded-3 p-2 bg-light" style={{ maxHeight: 170, overflowY: 'auto' }}>
                      {statusTargetSample.statusHistory.map((h, i) => (
                        <div key={i} className="small py-1 border-bottom last-border-0 d-flex justify-content-between gap-2">
                          <div>
                            <Badge bg="secondary" className="me-1">{h.fromStatus || 'Khởi tạo'}</Badge>
                            <span>→</span>
                            <Badge bg="primary" className="ms-1 me-2">{h.toStatus}</Badge>
                            <span className="text-dark">{h.notes || ''}</span>
                          </div>
                          <div className="text-muted text-nowrap">
                            {h.operatorName || h.changedBy || 'KTV'} • {formatDateTimeVN(h.changedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="small text-muted fst-italic">Chưa có lịch sử chuyển trạng thái chi tiết.</div>
                  )}
                </div>
              </>
            )}
          </Modal.Body>

          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)} disabled={statusSubmitting}>
              Đóng
            </Button>
            <Button
              variant={statusForm.status === 'Rejected' ? 'danger' : 'primary'}
              type="submit"
              disabled={statusSubmitting || (ALLOWED_TRANSITIONS[statusTargetSample?.status] || []).length === 0}
            >
              {statusSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang cập nhật...
                </>
              ) : (
                'Xác Nhận Cập Nhật Trạng Thái'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* =====================================================================
          MODAL 3: RERUN REQUEST POPUP (UC47)
         ===================================================================== */}
      <Modal show={showRerunModal} onHide={() => setShowRerunModal(false)} centered>
        <Modal.Header closeButton className="bg-danger-subtle text-danger">
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
            <FaRedoAlt />
            <span>Yêu Cầu Chạy Lại Mẫu Xét Nghiệm (Rerun)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedSample && (
            <div className="mb-3 p-3 bg-light rounded-3 border small">
              <div><strong>Mã Barcode:</strong> <code>{selectedSample.barcode}</code></div>
              <div><strong>Bệnh nhân:</strong> {selectedSample.patientName}</div>
              <div><strong>Chỉ định:</strong> {selectedSample.testPackageName}</div>
            </div>
          )}
          <Form onSubmit={handleConfirmRerun}>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold small">
                Lý do yêu cầu chạy lại <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="VD: Chỉ số bất thường vượt ngưỡng sinh học, cần chạy kiểm chứng lần 2..."
                value={rerunReason}
                onChange={(e) => setRerunReason(e.target.value)}
                required
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="outline-secondary" onClick={() => setShowRerunModal(false)}>Hủy</Button>
              <Button variant="danger" type="submit" disabled={rerunLoading}>
                {rerunLoading ? <Spinner animation="border" size="sm" /> : 'Xác Nhận Yêu Cầu Rerun'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default SampleQueuePage;
