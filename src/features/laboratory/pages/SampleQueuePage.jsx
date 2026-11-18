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
import { useNavigate } from 'react-router-dom';
import {
  Card, Table, Badge, Button, Form, Row, Col,
  Modal, Spinner, InputGroup, Alert
} from 'react-bootstrap';
import {
  FaVial, FaClock, FaExchangeAlt, FaRedoAlt, FaSearch,
  FaSyncAlt, FaBarcode, FaCheckCircle, FaExclamationTriangle,
  FaHistory, FaUserInjured, FaFlask, FaTimes, FaEye, FaSave, FaInfoCircle
} from 'react-icons/fa';
import api from '../../../config/api';
import PageHeader from '../../../components/ui/PageHeader';
import StatRow from '../../../components/ui/StatRow';
import { searchPatients } from '../../../services/patientService';
import { getStoredUser, hasRole, ROLES } from '../../../constants/roles';
import {
  ALLOWED_SAMPLE_TRANSITIONS as ALLOWED_TRANSITIONS,
  canCollectSample,
  canEnterTestResults,
  canRejectSample,
  canStartTesting,
  canViewTestResults,
  normalizeSampleStatus,
  pathToTesting,
  primaryForwardAction
} from '../../../shared/workflow/sampleWorkflowGates';
import { resolveDutyAssignment } from '../../../shared/workflow/dutyAssignment';

/**
 * Standard Clinical Lab Test Parameters (Clean Human-Operated Routine Entry).
 */
const DEFAULT_TEST_PARAMS = [
  { code: 'WBC', name: 'WBC · Số lượng bạch cầu', value: '', unit: '10⁹/L', refLow: 4.0, refHigh: 10.0 },
  { code: 'RBC', name: 'RBC · Số lượng hồng cầu', value: '', unit: '10¹²/L', refLow: 4.0, refHigh: 5.5 },
  { code: 'HGB', name: 'HGB · Nồng độ Hemoglobin', value: '', unit: 'g/L', refLow: 120, refHigh: 165 },
  { code: 'HCT', name: 'HCT · Dung tích hồng cầu', value: '', unit: '%', refLow: 35.0, refHigh: 50.0 },
  { code: 'MCV', name: 'MCV · Thể tích TB hồng cầu', value: '', unit: 'fL', refLow: 80.0, refHigh: 100.0 },
  { code: 'PLT', name: 'PLT · Số lượng tiểu cầu', value: '', unit: '10⁹/L', refLow: 150, refHigh: 400 },
  { code: 'GLU', name: 'GLU · Đường huyết đói (Glucose)', value: '', unit: 'mmol/L', refLow: 3.9, refHigh: 6.4 },
  { code: 'UREA', name: 'UREA · Ure máu', value: '', unit: 'mmol/L', refLow: 2.5, refHigh: 7.5 },
  { code: 'CREA', name: 'CREA · Creatinine máu', value: '', unit: 'µmol/L', refLow: 53.0, refHigh: 106.0 },
  { code: 'AST', name: 'AST (GOT) · Men gan AST', value: '', unit: 'U/L', refLow: 10.0, refHigh: 40.0 },
  { code: 'ALT', name: 'ALT (GPT) · Men gan ALT', value: '', unit: 'U/L', refLow: 10.0, refHigh: 40.0 }
];

const STATUS_META = {
  PendingCollection: { label: 'Chờ lấy mẫu', bg: 'secondary' },
  Collected: { label: 'Đã lấy mẫu (Sẵn sàng nhập KQ)', bg: 'info' },
  InTransit: { label: 'Đã lấy mẫu', bg: 'info' },
  Received: { label: 'Đã tiếp nhận Lab', bg: 'primary' },
  Processing: { label: 'Đang xử lý', bg: 'warning', text: 'dark' },
  Testing: { label: 'Đang xét nghiệm', bg: 'warning', text: 'dark' },
  Completed: { label: 'Đã có kết quả (Chờ BS duyệt)', bg: 'success' },
  RerunRequested: { label: 'Yêu cầu làm lại', bg: 'danger' },
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
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const canRecordSampleTime = hasRole(currentUser, ROLES.LAB);
  const canUpdateSampleStatus = hasRole(currentUser, ROLES.LAB, ROLES.MANAGER);
  const defaultOperatorName = currentUser?.fullName || currentUser?.name || currentUser?.username || 'Kỹ thuật viên trực ca';
  const defaultOperatorId = currentUser?.id || currentUser?.username || '';

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

  // Dynamic lookups from backend APIs
  const [patientOptions, setPatientOptions] = useState([]);
  const [appointmentOptions, setAppointmentOptions] = useState([]);
  const [labRooms, setLabRooms] = useState(['LAB-ROOM-01', 'LAB-ROOM-02', 'LAB-BIOCHEM-01', 'LAB-HEMATOLOGY-01']);
  const [dutyRoomId, setDutyRoomId] = useState('LAB-ROOM-01');
  const [dutyRoomName, setDutyRoomName] = useState('Đang tải phòng phân công…');
  const [dutyTechName, setDutyTechName] = useState(defaultOperatorName);
  const [dutyTechId, setDutyTechId] = useState(defaultOperatorId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const duty = await resolveDutyAssignment();
      if (cancelled) return;
      setDutyRoomId(duty.roomId);
      setDutyRoomName(duty.roomName);
      setDutyTechName(duty.technicianName || defaultOperatorName);
      setDutyTechId(duty.technicianId || defaultOperatorId);
      setCollectionForm((prev) => ({
        ...prev,
        labRoom: duty.roomId,
        collectorName: duty.technicianName || prev.collectorName,
        collectedBy: duty.technicianId || prev.collectedBy
      }));
    })();
    return () => { cancelled = true; };
  }, [defaultOperatorName, defaultOperatorId]);

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
    collectorName: defaultOperatorName,
    collectedBy: defaultOperatorId,
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
    technicianName: defaultOperatorName,
    technicianId: defaultOperatorId,
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

  // =========================================================================
  // MODAL 4: NHẬP / XEM KẾT QUẢ XÉT NGHIỆM MÁU (Clean Human-Operated Entry)
  // =========================================================================
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultTargetSample, setResultTargetSample] = useState(null);
  const [resultParameters, setResultParameters] = useState([]);
  const [resultSubmitting, setResultSubmitting] = useState(false);
  const [resultError, setResultError] = useState('');
  const [viewOnlyResult, setViewOnlyResult] = useState(false);

  const evalFlag = (val, refLow, refHigh) => {
    if (val === '' || val === null || val === undefined) return { label: 'Chờ nhập', bg: 'secondary', text: 'white' };
    const n = Number(val);
    if (Number.isNaN(n)) return { label: 'Không hợp lệ', bg: 'warning', text: 'dark' };
    if (refLow != null && n < refLow) return { label: 'Thấp (Low)', bg: 'warning', text: 'dark' };
    if (refHigh != null && n > refHigh) return { label: 'Cao (High)', bg: 'danger', text: 'white' };
    return { label: 'Bình thường', bg: 'success', text: 'white' };
  };

  const handleParamChange = (index, val) => {
    setResultParameters(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], value: val };
      return copy;
    });
  };

  const openResultEntryModal = async (sample) => {
    setResultTargetSample(sample);
    setViewOnlyResult(false);
    setResultError('');

    let paramsToUse = DEFAULT_TEST_PARAMS.map(p => ({ ...p, value: '' }));

    try {
      if (sample.appointmentId) {
        const res = await api.get(`/TestOrder/TestResult/by-appointment/${encodeURIComponent(sample.appointmentId)}`).catch(() => null);
        const existingResults = res?.data?.data || res?.data;
        if (Array.isArray(existingResults) && existingResults.length > 0) {
          const latestResult = existingResults[0];
          if (Array.isArray(latestResult.parameters) && latestResult.parameters.length > 0) {
            paramsToUse = paramsToUse.map(defP => {
              const found = latestResult.parameters.find(ep => ep.criteriaId === defP.code || ep.paramName === defP.name || ep.abbreviation === defP.code);
              return found ? { ...defP, value: found.value ?? '' } : defP;
            });
          }
        }
      }
    } catch {
      // Keep defaults
    }

    setResultParameters(paramsToUse);
    setShowResultModal(true);
  };

  const openViewResultModal = async (sample) => {
    setResultTargetSample(sample);
    setViewOnlyResult(true);
    setResultError('');

    let paramsToUse = DEFAULT_TEST_PARAMS.map(p => ({ ...p, value: '' }));

    try {
      if (sample.appointmentId) {
        const res = await api.get(`/TestOrder/TestResult/by-appointment/${encodeURIComponent(sample.appointmentId)}`).catch(() => null);
        const existingResults = res?.data?.data || res?.data;
        if (Array.isArray(existingResults) && existingResults.length > 0) {
          const latestResult = existingResults[0];
          if (Array.isArray(latestResult.parameters) && latestResult.parameters.length > 0) {
            paramsToUse = latestResult.parameters.map(p => ({
              code: p.abbreviation || p.criteriaId,
              name: p.paramName,
              value: p.value,
              unit: p.unit || 'Đơn vị',
              refLow: p.refLow ?? 0,
              refHigh: p.refHigh ?? 100
            }));
          }
        }
      }
    } catch {
      // Keep defaults
    }

    setResultParameters(paramsToUse);
    setShowResultModal(true);
  };

  const handleSaveResultAndSendToDoctor = async () => {
    if (!resultTargetSample) return;
    if (!canEnterTestResults(resultTargetSample.status)) {
      setResultError(`Mẫu "${resultTargetSample.status}" không cho nhập/gửi lại (không quay bước).`);
      return;
    }
    setResultSubmitting(true);
    setResultError('');
    try {
      const enteredParams = resultParameters.filter(p => p.value !== '' && p.value !== null && p.value !== undefined);
      if (enteredParams.length === 0) {
        setResultError('Vui lòng nhập ít nhất một giá trị chỉ số xét nghiệm.');
        setResultSubmitting(false);
        return;
      }

      const payload = {
        sampleId: resultTargetSample.id || resultTargetSample.barcode,
        appointmentId: resultTargetSample.appointmentId,
        status: 'waiting_review',
        deviceId: 'Nhập thủ công (Manual Entry)',
        confirmRerunChecked: true,
        criticalNotified: true,
        doctorNotifiedName: 'BS. Lâm sàng điều trị',
        parameters: enteredParams.map(p => ({
          criteriaId: p.code,
          paramName: p.name,
          abbreviation: p.code,
          value: String(p.value ?? ''),
          flag: Number(p.value) < p.refLow ? 'Low' : Number(p.value) > p.refHigh ? 'High' : 'Normal'
        }))
      };

      await api.post('/TestOrder/TestResult', payload);
      setSuccessMsg(`✅ Đã lưu kết quả thành công cho mẫu ${resultTargetSample.barcode} và gửi Bác sĩ duyệt (WaitingReview)!`);
      setShowResultModal(false);
      await fetchQueue();
    } catch (err) {
      setResultError(extractApiError(err, 'Không thể lưu kết quả xét nghiệm.'));
    } finally {
      setResultSubmitting(false);
    }
  };

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

  // Load patient, appointment, and lab room options dynamically from backend APIs
  const loadLookups = useCallback(async () => {
    try {
      if (patientOptions.length === 0) {
        const res = await searchPatients({ page: 1, pageSize: 50 });
        const items = res?.items || res?.Items || [];
        if (items.length > 0) setPatientOptions(items);
      }
    } catch {
      // Non-blocking
    }

    try {
      if (appointmentOptions.length === 0) {
        const aptRes = await api.get('/appointments');
        const aptList = Array.isArray(aptRes.data?.data) ? aptRes.data.data : (Array.isArray(aptRes.data) ? aptRes.data : []);
        if (aptList.length > 0) setAppointmentOptions(aptList.slice(0, 30));
      }
    } catch {
      // Non-blocking
    }

    try {
      const roomRes = await api.get('/shifts/rooms');
      const rList = Array.isArray(roomRes.data?.data) ? roomRes.data.data : (Array.isArray(roomRes.data) ? roomRes.data : []);
      // Main Lab flow: only LAB / lấy mẫu rooms — never overwrite with ROOM-10x clinic rooms.
      const labOnly = rList.filter((r) => {
        const code = String(r?.id || r?.roomNumber || r?.code || r || '').toUpperCase();
        const name = String(r?.name || r?.roomName || '').toUpperCase();
        return code.startsWith('LAB') || name.includes('LAB') || name.includes('LẤY MẪU') || name.includes('XÉT NGHIỆM');
      });
      if (labOnly.length > 0) setLabRooms(labOnly);
    } catch {
      // Non-blocking — keep default LAB-ROOM-* list
    }
  }, [patientOptions.length, appointmentOptions.length]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchQueue();
  };

  // =========================================================================
  // HANDLERS: RECORD SAMPLE TIME MODAL
  // =========================================================================
  const openRecordCollectionModal = (sample = null) => {
    loadLookups();
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
        collectorName: dutyTechName || sample.collectorName || defaultOperatorName,
        collectedBy: dutyTechId || sample.collectedBy || defaultOperatorId,
        sampleType: sample.sampleType || 'Blood',
        tubeColor: sample.tubeColor || 'Purple',
        anticoagulant: sample.anticoagulant || 'K2-EDTA',
        volumeMl: sample.volumeMl || 3.0,
        priority: sample.priority || 'Normal',
        labRoom: dutyRoomId || sample.labRoom || 'LAB-ROOM-01',
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
        collectorName: dutyTechName || defaultOperatorName,
        collectedBy: dutyTechId || defaultOperatorId,
        sampleType: 'Blood',
        tubeColor: 'Purple',
        anticoagulant: 'K2-EDTA',
        volumeMl: 3.0,
        priority: 'Normal',
        labRoom: dutyRoomId || 'LAB-ROOM-01',
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
  /** Một nút: Collected/Received/Processing → Testing (chain PUT theo BE, không mở modal chọn trạng thái). */
  const handleStartTesting = async (sample) => {
    const steps = pathToTesting(sample?.status);
    if (!steps || steps.length === 0) {
      setErrorMsg('Mẫu không thể chuyển sang Đang xét nghiệm từ trạng thái hiện tại.');
      return;
    }
    setErrorMsg('');
    try {
      for (const nextStatus of steps) {
        await api.put(`/laboratory/samples/${encodeURIComponent(sample.id)}/status`, {
          status: nextStatus,
          technicianId: dutyTechId || defaultOperatorId || undefined,
          technicianName: dutyTechName || defaultOperatorName || undefined,
          labRoom: dutyRoomId || sample.labRoom || 'LAB-ROOM-01',
          timestamp: new Date().toISOString(),
          notes: `Chuyển ${nextStatus} (nút Đang xét nghiệm)`
        });
      }
      setSuccessMsg(`Mẫu ${sample.barcode || sample.id} → Đang xét nghiệm. Bấm Nhập KQ để nhập kết quả.`);
      await fetchQueue();
    } catch (err) {
      setErrorMsg(extractApiError(err, 'Không chuyển được sang Đang xét nghiệm.'));
    }
  };

  const openStatusUpdateModal = async (sample, targetStatus = null) => {
    const allowed = ALLOWED_TRANSITIONS[sample.status] || [];
    const defaultNext = (targetStatus && allowed.includes(targetStatus))
      ? targetStatus
      : (allowed.find(st => st !== 'Rejected') || allowed[0] || sample.status);

    setStatusTargetSample(sample);
    setStatusError('');
    setStatusForm({
      status: defaultNext,
      technicianName: dutyTechName || sample.assignedTechnicianName || defaultOperatorName,
      technicianId: dutyTechId || sample.assignedTechnicianId || defaultOperatorId,
      labRoom: dutyRoomId || sample.labRoom || 'LAB-ROOM-01',
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
      if (statusForm.status === 'Rejected' && /tán huyết|hemol/i.test(statusForm.rejectionReason)) {
        try {
          await api.post(`/laboratory/samples/${encodeURIComponent(statusTargetSample.id)}/rerun`, {
            reason: `Mẫu tán huyết (Hemolysis) - Khóa phân tích, yêu cầu lấy lại mẫu: ${statusForm.rejectionReason}`,
            requestedBy: statusForm.technicianName || 'KTV Lab'
          });
        } catch { }
      }
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
        requestedBy: defaultOperatorName
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
  const sampleListSafe = Array.isArray(samples) ? samples : [];
  const collectedCount = sampleListSafe.filter(s => ['Collected', 'InTransit', 'Received'].includes(s?.status)).length;
  const processingCount = sampleListSafe.filter(s => ['Processing', 'Testing', 'RerunRequested'].includes(s?.status)).length;
  const completedCount = sampleListSafe.filter(s => s?.status === 'Completed').length;

  return (
    <div className="w-100 py-1">
      {/* Page Header Card */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Hàng đợi mẫu bệnh phẩm</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Quản lý tiếp nhận, ghi nhận giờ lấy mẫu và cập nhật trạng thái xử lý tại phòng xét nghiệm.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button variant="outline-secondary" size="sm" onClick={fetchQueue} disabled={loading} className="rounded-pill px-3 text-nowrap">
            <FaSyncAlt className={loading ? 'fa-spin me-1' : 'me-1'} size={12} /> Làm mới
          </Button>
          {canRecordSampleTime && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openRecordCollectionModal(null)}
              className="rounded-pill px-3 fw-semibold text-white text-nowrap"
              style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
            >
              <FaClock className="me-1" /> Ghi nhận lấy mẫu mới
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="rounded-3">
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="rounded-3">
          {errorMsg}
        </Alert>
      )}

      {/* KPI Quad Cards */}
      <Row className="g-3 mb-4">
        <Col sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div className="bms-kpi-quad-top">
              <div className="bms-kpi-icon-badge bms-kpi-icon-blue"><FaVial size={18} /></div>
            </div>
            <div className="bms-kpi-quad-value">{totalCount}</div>
            <div className="bms-kpi-quad-title">Tổng mẫu trong hàng đợi</div>
          </div>
        </Col>
        <Col sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div className="bms-kpi-quad-top">
              <div className="bms-kpi-icon-badge bms-kpi-icon-cyan"><FaClock size={18} /></div>
            </div>
            <div className="bms-kpi-quad-value">{collectedCount}</div>
            <div className="bms-kpi-quad-title">Đã lấy mẫu / Tiếp nhận</div>
          </div>
        </Col>
        <Col sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div className="bms-kpi-quad-top">
              <div className="bms-kpi-icon-badge bms-kpi-icon-amber"><FaFlask size={18} /></div>
            </div>
            <div className="bms-kpi-quad-value">{processingCount}</div>
            <div className="bms-kpi-quad-title">Đang xử lý / Chạy máy</div>
          </div>
        </Col>
        <Col sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div className="bms-kpi-quad-top">
              <div className="bms-kpi-icon-badge bms-kpi-icon-green"><FaCheckCircle size={18} /></div>
            </div>
            <div className="bms-kpi-quad-value">{completedCount}</div>
            <div className="bms-kpi-quad-title">Đã hoàn thành kết quả</div>
          </div>
        </Col>
      </Row>

      {/* Filter and Search Bar */}
      <section className="bms-inventory-filter">
        <Form onSubmit={handleSearch} className="bms-field-grid">
          <label className="bms-field">
            Tìm mẫu
            <InputGroup size="sm">
              <InputGroup.Text><FaSearch /></InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Barcode, mã mẫu, mã BN"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </label>

          <label className="bms-field">
            Trạng thái
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
          </label>

          <label className="bms-field">
            Ưu tiên
            <Form.Select size="sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="All">Mọi mức độ ưu tiên</option>
              <option value="Normal">Bình thường (Normal)</option>
              <option value="Urgent">Khẩn cấp (Urgent)</option>
              <option value="Stat">Cấp cứu (STAT)</option>
            </Form.Select>
          </label>

          <label className="bms-field">
            Phòng lab
            <Form.Control
              size="sm"
              type="text"
              placeholder="LAB-ROOM-01"
              value={labRoomFilter}
              onChange={(e) => setLabRoomFilter(e.target.value)}
            />
          </label>

          <div className="bms-field-actions">
            <Button variant="primary" type="submit" style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}>Tìm</Button>
            <Button
              variant="outline-secondary"
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('All');
                setPriorityFilter('All');
                setLabRoomFilter('');
              }}
            >
              Xóa lọc
            </Button>
          </div>
        </Form>
      </section>

      {/* Samples Queue Table - Standalone Section */}
      <section className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <div>
            <h2 className="bms-table-standalone-title">Danh sách mẫu bệnh phẩm trong hàng đợi</h2>
            <p className="bms-table-standalone-subtitle">Theo dõi mã vạch, thời điểm lấy mẫu và vòng đời xử lý</p>
          </div>
        </div>
        <div className="bms-table-standalone-body">
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              <span className="text-muted">Đang tải danh sách mẫu bệnh phẩm...</span>
            </div>
          ) : sampleListSafe.length === 0 ? (
            <div className="text-center py-3 text-muted">
              <FaVial className="fs-1 text-secondary opacity-50 mb-2" />
              <div className="fw-semibold">Không tìm thấy mẫu bệnh phẩm nào trong hàng đợi</div>
              <div className="small mb-3">Bạn có thể ghi nhận mẫu mới bằng nút &ldquo;Ghi Nhận Thời Gian Lấy Mẫu Mới&rdquo;.</div>
              {canRecordSampleTime && (
                <Button variant="primary" size="sm" onClick={() => openRecordCollectionModal(null)}>
                  <FaClock className="me-1" /> Ghi Nhận Lấy Mẫu Ngay
                </Button>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle table-sm" style={{ tableLayout: 'auto', width: '100%' }}>
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Barcode / Mã Mẫu</th>
                    <th>Bệnh Nhân</th>
                    <th>Chỉ Định / Ống Mẫu</th>
                    <th>Thời Gian Lấy Mẫu</th>
                    <th>Ưu Tiên</th>
                    <th>Phòng Lab</th>
                    <th>Trạng Thái</th>
                    <th className="text-end pe-3">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleListSafe.map((s) => (
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
                        <span className="badge bg-light text-dark text-truncate d-inline-block" style={{ maxWidth: '135px', fontSize: '0.74rem' }} title={s.labRoom || 'LAB-ROOM-01'}>
                          {s.labRoom || 'LAB-ROOM-01'}
                        </span>
                      </td>

                      <td>{getStatusBadge(s.status)}</td>

                      <td className="text-end pe-3">
                        <div className="d-flex gap-1 justify-content-end align-items-center">
                          {(() => {
                            const st = normalizeSampleStatus(s.status);
                            const fwd = primaryForwardAction(st);
                            const btnStyle = { fontSize: '0.75rem', borderRadius: '9999px' };
                            const sampleKey = encodeURIComponent(s.barcode || s.sampleCode || s.id);

                            if (st === 'Rejected') {
                              return <Badge bg="dark" className="px-2.5 py-1" style={{ fontSize: '0.72rem' }}>Đã từ chối</Badge>;
                            }

                            // Queue chỉ 3 nút: Lấy Mẫu → Đang xét nghiệm → Nhập KQ (rồi Xem KQ)
                            return (
                              <>
                                {fwd.kind === 'collect' && canCollectSample(st) && canRecordSampleTime && (
                                  <Button
                                    variant="success"
                                    size="sm"
                                    className="px-2.5 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm"
                                    style={btnStyle}
                                    title="Ghi nhận lấy mẫu"
                                    onClick={() => openRecordCollectionModal(s)}
                                  >
                                    <FaClock />
                                    <span>Lấy Mẫu</span>
                                  </Button>
                                )}

                                {fwd.kind === 'toTesting' && canStartTesting(st) && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="px-2.5 py-1 text-nowrap d-flex align-items-center gap-1 shadow-sm"
                                    style={btnStyle}
                                    title="Chuyển mẫu sang Đang xét nghiệm — sau đó bấm Nhập KQ"
                                    onClick={() => void handleStartTesting(s)}
                                  >
                                    <FaFlask />
                                    <span>Đang xét nghiệm</span>
                                  </Button>
                                )}

                                {fwd.kind === 'enter' && canEnterTestResults(st) && (
                                  <Button
                                    variant="warning"
                                    size="sm"
                                    className="px-3 py-1 text-nowrap d-flex align-items-center gap-1 fw-bold text-white shadow-sm"
                                    style={{ ...btnStyle, backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
                                    title="Nhập kết quả"
                                    onClick={() => navigate(`/laboratory/enter-test-results?sampleId=${sampleKey}`)}
                                  >
                                    <FaFlask />
                                    <span>Nhập KQ</span>
                                  </Button>
                                )}

                                {fwd.kind === 'view' && canViewTestResults(st) && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="px-2.5 py-1 text-nowrap d-flex align-items-center gap-1"
                                    style={btnStyle}
                                    title="Xem kết quả đã nhập"
                                    onClick={() =>
                                      navigate(
                                        `/laboratory/enter-test-results?sampleId=${encodeURIComponent(sampleKey)}&mode=view`
                                      )
                                    }
                                  >
                                    <FaEye />
                                    <span>Xem KQ</span>
                                  </Button>
                                )}

                                {canRejectSample(st) && st === 'PendingCollection' && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="px-2 py-1"
                                    style={btnStyle}
                                    title="Từ chối / hủy lấy mẫu"
                                    onClick={() => openStatusUpdateModal(s, 'Rejected')}
                                  >
                                    <FaTimes />
                                  </Button>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      </section>

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
          <Modal.Header closeButton={!collectionSubmitting} style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
            <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
              <FaClock className="text-primary" />
              <span>
                {collectionTargetSample
                  ? `Ghi nhận thời gian lấy mẫu — ${collectionTargetSample.barcode}`
                  : 'Ghi nhận thời gian lấy mẫu mới'}
              </span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-3">
            {collectionError && (
              <Alert variant="danger" className="py-2 small">
                <FaExclamationTriangle className="me-2" />
                {collectionError}
              </Alert>
            )}

            {/* Thông tin đã gán từ hệ thống — chỉ xem, không nhập lại */}
            <div className="rounded-3 border bg-light p-3 mb-3">
              <div className="small text-secondary fw-semibold mb-2 text-uppercase">
                Thông tin đã gắn (không đổi)
              </div>
              <Row className="g-2 small">
                <Col md={6}>
                  <span className="text-muted">Barcode:</span>{' '}
                  <code className="fw-semibold text-dark">{collectionForm.barcode || '—'}</code>
                </Col>
                <Col md={6}>
                  <span className="text-muted">Mã BN:</span>{' '}
                  <strong>{collectionForm.patientId || '—'}</strong>
                </Col>
                <Col md={6}>
                  <span className="text-muted">Lịch hẹn / chỉ định:</span>{' '}
                  <span className="font-monospace" style={{ fontSize: '0.72rem' }}>
                    {collectionForm.appointmentId || '—'}
                  </span>
                </Col>
                <Col md={6}>
                  <span className="text-muted">Người lấy / mã NV:</span>{' '}
                  <strong>{collectionForm.collectorName || dutyTechName}</strong>
                  <span className="text-muted"> · </span>
                  <code>{collectionForm.collectedBy || dutyTechId}</code>
                </Col>
                <Col md={6}>
                  <span className="text-muted">Ống / bệnh phẩm:</span>{' '}
                  <strong>
                    {collectionForm.tubeColor} · {collectionForm.sampleType} · {collectionForm.anticoagulant}
                  </strong>
                </Col>
                <Col md={6}>
                  <span className="text-muted">Phòng (ca trực):</span>{' '}
                  <strong>{dutyRoomName}</strong>
                  <span className="text-muted"> ({collectionForm.labRoom || dutyRoomId})</span>
                </Col>
                <Col md={6}>
                  <span className="text-muted">Ưu tiên:</span> {collectionForm.priority || 'Normal'}
                </Col>
              </Row>
            </div>

            {!collectionTargetSample && (
              <Alert variant="info" className="py-2 small mb-3">
                Mẫu mới: chọn BN/lịch bên dưới rồi ghi nhận thời điểm. Barcode/phòng/KTV vẫn theo hệ thống &amp; ca trực.
              </Alert>
            )}

            {!collectionTargetSample && patientOptions.length > 0 && (
              <div className="mb-3">
                <Form.Label className="small fw-semibold">
                  <FaUserInjured className="me-1" /> Chọn bệnh nhân <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  size="sm"
                  value={collectionForm.patientId || ''}
                  required
                  onChange={(e) => {
                    const pid = e.target.value;
                    setCollectionForm((prev) => ({ ...prev, patientId: pid }));
                  }}
                >
                  <option value="">-- Chọn bệnh nhân --</option>
                  {(Array.isArray(patientOptions) ? patientOptions : []).map((p) => (
                    <option key={p.id || p.patientCode} value={p.patientCode || p.id}>
                      [{p.patientCode || p.id}] {p.fullName}
                    </option>
                  ))}
                </Form.Select>
              </div>
            )}

            {!collectionTargetSample && appointmentOptions.length > 0 && (
              <div className="mb-3">
                <Form.Label className="small fw-semibold">Gắn lịch hẹn / chỉ định</Form.Label>
                <Form.Select
                  size="sm"
                  value={collectionForm.appointmentId || ''}
                  onChange={(e) => {
                    const aid = e.target.value;
                    const apt = appointmentOptions.find((a) => (a.id || a.appointmentId) === aid);
                    if (apt) {
                      setCollectionForm((prev) => ({
                        ...prev,
                        appointmentId: apt.id || apt.appointmentId,
                        patientId: apt.patientId || prev.patientId
                      }));
                    } else {
                      setCollectionForm((prev) => ({ ...prev, appointmentId: aid }));
                    }
                  }}
                >
                  <option value="">-- Không gắn / chọn lịch --</option>
                  {appointmentOptions.map((a) => {
                    const aid = a.id || a.appointmentId;
                    return (
                      <option key={aid} value={aid}>
                        [{aid}] {a.patientName || a.patientId || 'BN'} — {a.status || 'Active'}
                      </option>
                    );
                  })}
                </Form.Select>
              </div>
            )}

            {/* Chỉ các trường nghiệp vụ cần nhập khi lấy mẫu */}
            <Row className="g-3">
              <Col md={7}>
                <Form.Label className="small fw-semibold">
                  Thời điểm lấy mẫu thực tế <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="datetime-local"
                    value={collectionForm.collectedAt}
                    onChange={(e) => setCollectionForm((prev) => ({ ...prev, collectedAt: e.target.value }))}
                    required
                  />
                  <Button
                    variant="outline-primary"
                    type="button"
                    onClick={() =>
                      setCollectionForm((prev) => ({ ...prev, collectedAt: toLocalDateTimeInput(new Date()) }))
                    }
                  >
                    Bây giờ
                  </Button>
                </InputGroup>
                <Form.Text className="text-muted">Không vượt hiện tại; không quá 30 ngày trước.</Form.Text>
              </Col>

              <Col md={5}>
                <Form.Label className="small fw-semibold">
                  Thể tích mẫu (ml) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={collectionForm.volumeMl}
                  onChange={(e) => setCollectionForm((prev) => ({ ...prev, volumeMl: e.target.value }))}
                  required
                />
              </Col>

              <Col xs={12}>
                <Form.Label className="small fw-semibold">Ghi chú khi lấy mẫu</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Tình trạng tĩnh mạch, nhịn ăn… (tuỳ chọn)"
                  value={collectionForm.notes}
                  onChange={(e) => setCollectionForm((prev) => ({ ...prev, notes: e.target.value }))}
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
          <Modal.Header closeButton={!statusSubmitting} style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
            <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
              <FaExchangeAlt className="text-primary" />
              <span>Cập nhật trạng thái mẫu bệnh phẩm</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-2">
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
                    <Form.Label className="small fw-semibold">Phòng Lab Xử Lý (theo ca)</Form.Label>
                    <Form.Control
                      readOnly
                      disabled
                      className="bg-light"
                      value={`${dutyRoomName} (${statusForm.labRoom || dutyRoomId})`}
                    />
                  </Col>

                  <Col md={6}>
                    <Form.Label className="small fw-semibold">Kỹ Thuật Viên Thực Hiện</Form.Label>
                    <Form.Control
                      readOnly
                      disabled
                      className="bg-light"
                      value={statusForm.technicianName || dutyTechName}
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
                      placeholder="Ghi chú chuyên môn phòng xét nghiệm (tình trạng mẫu huyết thanh, lý do nếu có)..."
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
                            <FaArrowRight size={10} className="mx-1 text-muted" />
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
          MODAL 3: RERUN REQUEST POPUP
         ===================================================================== */}
      <Modal show={showRerunModal} onHide={() => setShowRerunModal(false)} centered>
        <Modal.Header closeButton className="bg-danger-subtle text-danger">
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
            <FaRedoAlt />
            <span>Yêu Cầu Chạy Lại Mẫu Xét Nghiệm (Rerun)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-2">
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
      {/* ========================================================================= */}
      {/* MODAL 4: NHẬP / XEM KẾT QUẢ XÉT NGHIỆM MÁU (Clean Human-Operated Lab Entry) */}
      {/* ========================================================================= */}
      <Modal
        show={showResultModal}
        onHide={() => !resultSubmitting && setShowResultModal(false)}
        size="lg"
        centered
        backdrop={resultSubmitting ? 'static' : true}
      >
        <Modal.Header closeButton={!resultSubmitting} className="bg-light">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaFlask className="text-warning" />
            <span>{viewOnlyResult ? 'Chi Tiết Kết Quả Xét Nghiệm Máu' : 'Nhập Kết Quả Xét Nghiệm Máu'}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3">
          {resultError && (
            <Alert variant="danger" className="py-2 small">
              <FaExclamationTriangle className="me-2" />
              {resultError}
            </Alert>
          )}

          {resultTargetSample && (
            <>
              {/* Patient and Sample Summary Card */}
              <div className="p-3 rounded-3 bg-light border mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <div className="fw-bold text-dark fs-6">
                    Bệnh nhân: <span className="text-primary">{resultTargetSample.patientName}</span>
                    <span className="ms-2 badge bg-secondary">{resultTargetSample.patientId}</span>
                  </div>
                  <div className="small text-secondary mt-1">
                    Mã Barcode: <strong className="font-monospace text-dark">{resultTargetSample.barcode}</strong> •
                    Loại mẫu: <strong>{resultTargetSample.sampleType}</strong> ({resultTargetSample.tubeColor || 'Purple'}) •
                    Gói XN: <span className="badge bg-info text-dark">{resultTargetSample.testOrderName || 'Xét nghiệm máu tổng quát'}</span>
                  </div>
                </div>
                <div>
                  {getStatusBadge(resultTargetSample.status)}
                </div>
              </div>

              {!viewOnlyResult && (
                <div className="alert alert-info py-2 small d-flex align-items-center gap-2 mb-3">
                  <FaInfoCircle />
                  <span>
                    Kỹ thuật viên nhập các giá trị đo được vào bảng bên dưới. Hệ thống sẽ tự động đối soát với khoảng tham chiếu chuẩn.
                  </span>
                </div>
              )}

              {/* Parameters Table */}
              <div className="table-responsive border rounded-3">
                <Table hover className="mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '35%' }}>Chỉ Số Xét Nghiệm</th>
                      <th style={{ width: '25%' }}>Kết Quả Đo</th>
                      <th style={{ width: '15%' }}>Đơn Vị</th>
                      <th style={{ width: '25%' }}>Khoảng Chuẩn (Min - Max)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultParameters.map((param, idx) => {
                      const flag = evalFlag(param.value, param.refLow, param.refHigh);
                      return (
                        <tr key={param.code || idx}>
                          <td>
                            <div className="fw-bold text-dark">{param.name}</div>
                            <small className="text-muted font-monospace">{param.code}</small>
                          </td>
                          <td>
                            {viewOnlyResult ? (
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold fs-6">{param.value || 'Chưa có'}</span>
                                {param.value && <Badge bg={flag.bg} text={flag.text}>{flag.label}</Badge>}
                              </div>
                            ) : (
                              <div className="d-flex align-items-center gap-2">
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  step="0.01"
                                  placeholder="Nhập KQ..."
                                  value={param.value}
                                  onChange={(e) => handleParamChange(idx, e.target.value)}
                                  className="fw-bold"
                                  style={{ maxWidth: 120 }}
                                />
                                {param.value !== '' && (
                                  <Badge bg={flag.bg} text={flag.text} style={{ fontSize: '0.7rem' }}>
                                    {flag.label}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="small text-secondary font-monospace">{param.unit}</td>
                          <td className="small">
                            <span className="badge bg-light text-dark border">
                              {param.refLow} – {param.refHigh} {param.unit}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {!viewOnlyResult && (
                <div className="mt-3 p-2 rounded bg-light border text-muted small">
                  <strong>💡 Quy trình y khoa:</strong> Sau khi bấm <strong>"Lưu &amp; Gửi Bác Sĩ Duyệt"</strong>, kết quả sẽ chuyển trực tiếp tới Bàn khám Bác sĩ ở trạng thái <em>Chờ duyệt (WaitingReview)</em> để Bác sĩ thẩm định và kết luận chẩn đoán lâm sàng (ICD-10).
                </div>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-light d-flex justify-content-between align-items-center">
          <div>
            {!viewOnlyResult && (
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center gap-1 fw-semibold"
                onClick={() => {
                  setShowResultModal(false);
                  navigate(`/laboratory/enter-test-results?sampleId=${encodeURIComponent(resultTargetSample?.barcode || resultTargetSample?.id || '')}`);
                }}
              >
                <FaFlask /> Mở Trạm Nhập Chi Tiết
              </Button>
            )}
          </div>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={() => setShowResultModal(false)} disabled={resultSubmitting}>
              {viewOnlyResult ? 'Đóng' : 'Hủy Bỏ'}
            </Button>
            {!viewOnlyResult && canEnterTestResults(resultTargetSample?.status) && (
              <Button
                variant="primary"
                className="px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
                onClick={handleSaveResultAndSendToDoctor}
                disabled={resultSubmitting}
                style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              >
                {resultSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    <span>Đang Lưu &amp; Gửi...</span>
                  </>
                ) : (
                  <>
                    <FaSave />
                    <span>Lưu &amp; Gửi Bác Sĩ Duyệt</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SampleQueuePage;
