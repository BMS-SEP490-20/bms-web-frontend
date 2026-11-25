/**
 * @file MedicalRecordPage.jsx
 * @description UC33 – Worklist-Driven Electronic Medical Records (EMR) & Clinical Conclusion Workspace.
 *
 * Quy trình chuẩn y tế (Thông tư 46/2018/TT-BYT):
 *  1. Nạp danh sách lượt khám thực tế từ Bàn khám & Hàng đợi (`currentServing`, `waitingList`), Lịch hẹn (`InProgress`/`CheckedIn`/`Confirmed`/`Completed`),
 *     Y lệnh xét nghiệm (`fetchTestOrders`) và Kết quả xét nghiệm đã duyệt (`biochemical-results`) — TUYỆT ĐỐI KHÔNG fallback danh sách user test.
 *  2. Hiển thị Worklist Table kèm trạng thái Cận lâm sàng (Lab) và trạng thái Bệnh án (Chưa lập | Còn hạn sửa 24h | Đã khóa >24h).
 *  3. Bấm nút thao tác mở Modal Bệnh Án & Kết Luận (`size="xl"`):
 *     - Tự động nạp lịch sử đợt khám trước + kết quả xét nghiệm đã duyệt của bệnh nhân để Bác sĩ đối chiếu trực tiếp.
 *     - Nhập/cập nhật sinh hiệu (tự tính BMI, kiểm tra Tâm thu > Tâm trương + 15 mmHg), mã WHO ICD-10, chẩn đoán xác định và phác đồ điều trị.
 *     - Tuân thủ khóa sửa sau 24 giờ (`canEdit`) và giải trình bắt buộc (>= 15 ký tự) khi hủy/xóa mềm hồ sơ.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  Button,
  Badge,
  Row,
  Col,
  Table,
  Form,
  Spinner,
  Alert,
  Modal
} from 'react-bootstrap';
import { FileText, HeartPulse, Stethoscope, Plus, SquarePen, Trash2, Search, Lock, CheckCircle2, AlertTriangle, User, Pill, TestTube2, ClipboardList, RefreshCw, Eye, Megaphone, History as LucideHistory } from 'lucide-react';
import { medicalRecordApi } from '../api/medicalRecordApi';
import { fetchTestOrders } from '../api/testOrderApi';
import { receptionApi } from '../../reception/api/receptionApi';
import { getAppointments } from '../../appointment/api/appointmentApi';
import api from '../../../config/api';

const COMMON_ICD10 = [
  { code: 'E11.9', name: 'Đái tháo đường typ 2 không biến chứng' },
  { code: 'I10', name: 'Tăng huyết áp vô căn (nguyên phát)' },
  { code: 'E78.5', name: 'Rối loạn chuyển hóa lipid máu (Tăng mỡ máu)' },
  { code: 'D50.9', name: 'Thiếu máu do thiếu sắt' },
  { code: 'K29.7', name: 'Viêm dạ dày tá tràng' },
  { code: 'K76.0', name: 'Gan nhiễm mỡ / Tăng men gan' },
  { code: 'E03.9', name: 'Suy giáp không đặc hiệu' },
  { code: 'M10.9', name: 'Bệnh Gút (Gout)' },
  { code: 'N18.9', name: 'Bệnh thận mạn / Đánh giá chức năng thận' },
  { code: 'J00', name: 'Viêm mũi họng cấp (Cảm lạnh)' },
  { code: 'J20.9', name: 'Viêm phế quản cấp' },
  { code: 'N39.0', name: 'Nhiễm trùng đường tiết niệu' },
  { code: 'R50.9', name: 'Sốt không rõ nguyên nhân' },
  { code: 'Z00.0', name: 'Khám sức khỏe tổng quát định kỳ' }
];

const ICD10_REGEX = /^[A-Z][0-9]{2}(\.[0-9]{1,2})?$/;

const INITIAL_FORM = {
  chiefComplaint: '',
  clinicalSymptoms: '',
  heartRate: 75,
  systolicBp: 120,
  diastolicBp: 80,
  temperature: 36.5,
  spo2: 98,
  heightCm: 170,
  weightKg: 65,
  icd10Code: 'E11.9',
  icd10Name: 'Đái tháo đường typ 2 không biến chứng',
  diagnosis: '',
  treatmentPlan: '',
  prescriptionNotes: ''
};

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  return [];
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const isTodayIso = (val) => {
  if (!val) return false;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

export default function MedicalRecordPage() {
  const [searchParams] = useSearchParams();
  const queryPatientId = searchParams.get('patientId') || searchParams.get('patientCode') || '';
  const queryAppointmentId = searchParams.get('appointmentId') || '';

  const canWriteEmr = useMemo(() => {
    try {
      const user = JSON.parse(
        localStorage.getItem('bms_user') ||
          sessionStorage.getItem('bms_user') ||
          localStorage.getItem('user') ||
          'null'
      );
      return (user?.role || user?.roleName || '').toLowerCase() === 'doctor';
    } catch {
      return false;
    }
  }, []);

  // Worklist states
  const [worklist, setWorklist] = useState([]);
  const [loadingWorklist, setLoadingWorklist] = useState(false);
  const [worklistError, setWorklistError] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageBanner, setPageBanner] = useState(null);

  // Modal & EMR states
  const [showModal, setShowModal] = useState(false);
  const [activeEncounter, setActiveEncounter] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [labResults, setLabResults] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'view'

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(null);
  const [bypassPendingLab, setBypassPendingLab] = useState(false);

  // Soft Delete Audit Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [autoOpenedQuery, setAutoOpenedQuery] = useState(false);

  // Auto-calculated BMI & Category
  const { bmi, bmiCategory, bmiColor } = useMemo(() => {
    const h = Number(form.heightCm);
    const w = Number(form.weightKg);
    if (!h || h <= 0 || !w || w <= 0) {
      return { bmi: 0, bmiCategory: 'Chưa tính', bmiColor: 'secondary' };
    }
    const hMeters = h / 100.0;
    const calculated = (w / (hMeters * hMeters)).toFixed(2);
    const numBmi = parseFloat(calculated);

    let cat = 'Bình thường';
    let color = 'success';
    if (numBmi < 18.5) {
      cat = 'Thiếu cân';
      color = 'info';
    } else if (numBmi <= 22.9) {
      cat = 'Bình thường';
      color = 'success';
    } else if (numBmi <= 24.9) {
      cat = 'Thừa cân';
      color = 'warning';
    } else {
      cat = 'Béo phì';
      color = 'danger';
    }
    return { bmi: calculated, bmiCategory: cat, bmiColor: color };
  }, [form.heightCm, form.weightKg]);

  // Blood pressure invariant: Systolic > Diastolic + 15
  const bpValidation = useMemo(() => {
    const sys = Number(form.systolicBp);
    const dia = Number(form.diastolicBp);
    if (!sys || !dia) return { valid: true };
    if (sys <= dia + 15) {
      return {
        valid: false,
        message: 'Huyết áp tâm thu phải lớn hơn huyết áp tâm trương ít nhất 15 mmHg.'
      };
    }
    return { valid: true };
  }, [form.systolicBp, form.diastolicBp]);

  // Load real clinical worklist (NO synthetic patient fallback)
  const loadWorklist = useCallback(async () => {
    setLoadingWorklist(true);
    setWorklistError(null);
    try {
      const [queueRes, apptRes, ordersRes, labRes] = await Promise.all([
        receptionApi.getQueueStatus().catch(() => null),
        getAppointments().catch(() => null),
        fetchTestOrders().catch(() => null),
        api.get('/biochemical-results', { params: { pageSize: 50 } }).catch(() => null)
      ]);

      const appointments = extractArray(apptRes);
      const orders = extractArray(ordersRes);
      const labRecords = extractArray(labRes?.data || labRes);

      const apptById = new Map();
      const apptByPatient = new Map();
      appointments.forEach((a) => {
        if (a.id) apptById.set(String(a.id), a);
        if (a.appointmentCode) apptById.set(String(a.appointmentCode), a);
        const pKey = String(a.patientCode || a.patientId || '').trim();
        if (pKey && !apptByPatient.has(pKey)) {
          apptByPatient.set(pKey, a);
        }
      });

      // Map orders by appointmentId and patientId
      const orderByAppt = new Map();
      const orderByPatient = new Map();
      orders.forEach((o) => {
        if (o.appointmentId) orderByAppt.set(String(o.appointmentId), o);
        const pKey = String(o.patientCode || o.patientId || '').trim();
        if (pKey && !orderByPatient.has(pKey)) {
          orderByPatient.set(pKey, o);
        }
      });

      // Map approved lab results by patientCode/patientId & orderNumber
      const labByPatient = new Map();
      labRecords.forEach((r) => {
        const pKey = String(r.patientCode || r.patientId || '').trim();
        if (pKey) {
          const prev = labByPatient.get(pKey) || [];
          prev.push(r);
          labByPatient.set(pKey, prev);
        }
      });

      const merged = [];
      const seenKeys = new Set();

      const pushEncounter = (raw, sourceTag) => {
        const patId = String(raw.patientCode || raw.patientId || '').trim();
        if (!patId) return;
        const apptId = raw.appointmentId || raw.id || '';
        const dedupeKey = apptId ? `APT:${apptId}` : `PAT:${patId}`;
        if (seenKeys.has(dedupeKey)) return;
        seenKeys.add(dedupeKey);

        const matchedOrder =
          (apptId && orderByAppt.get(String(apptId))) || orderByPatient.get(patId) || null;
        const matchedLabs = labByPatient.get(patId) || [];
        const hasApprovedLab = matchedLabs.some(
          (x) => String(x.status || '').toUpperCase() === 'APPROVED' || Boolean(x.approvedAt)
        );
        const hasPanicOrAbnormal = matchedLabs.some(
          (x) => Boolean(x.hasPanic || x.isCritical || Number(x.abnormalCount || 0) > 0)
        );

        merged.push({
          key: dedupeKey,
          appointmentId: apptId,
          appointmentCode: raw.appointmentCode || (apptId ? `APT-${String(apptId).slice(-6)}` : ''),
          queueNumber: raw.queueNumber || raw.ticketNumber || null,
          patientId: patId,
          patientRawId: raw.patientRawId || raw.patientId || patId,
          patientName: raw.patientName || raw.fullName || 'Bệnh nhân',
          phone: raw.phoneNumber || raw.phone || '',
          gender: raw.gender === 'Female' || raw.gender === 'Nữ' ? 'Nữ' : raw.gender === 'Male' || raw.gender === 'Nam' ? 'Nam' : '',
          packageName: raw.packageName || matchedOrder?.packageName || '',
          appointmentStatus: raw.status || 'InProgress',
          sourceTag,
          order: matchedOrder,
          labCount: matchedLabs.length,
          hasApprovedLab,
          hasPanicOrAbnormal,
          latestRecord: null // populated lazily or via patient records cache below
        });
      };

      // 1. Bệnh nhân đang được gọi số tại Bàn Khám (ưu tiên cao nhất)
      if (queueRes?.currentServing) {
        const cs = queueRes.currentServing;
        const appt = apptById.get(String(cs.appointmentId || '')) || {};
        pushEncounter(
          {
            ...appt,
            ...cs,
            id: cs.appointmentId || appt.id,
            patientCode: cs.patientCode || appt.patientCode || cs.patientId,
            patientName: cs.patientName || appt.patientName,
            status: 'InProgress'
          },
          'Đang gọi số'
        );
      }

      // 2. Hàng đợi đang chờ khám
      const waitingList = Array.isArray(queueRes?.waitingList) ? queueRes.waitingList : [];
      waitingList.forEach((w) => {
        const appt = apptById.get(String(w.appointmentId || '')) || {};
        pushEncounter(
          {
            ...appt,
            ...w,
            id: w.appointmentId || appt.id,
            patientCode: w.patientCode || appt.patientCode || w.patientId,
            patientName: w.patientName || appt.patientName,
            status: w.status || appt.status || 'CheckedIn'
          },
          'Hàng đợi'
        );
      });

      // 3. Lịch hẹn hợp lệ trong luồng khám (InProgress / CheckedIn / Confirmed / Completed)
      const validStatuses = new Set(['InProgress', 'CheckedIn', 'Confirmed', 'Completed']);
      appointments.forEach((a) => {
        if (validStatuses.has(a.status)) {
          pushEncounter(a, a.status === 'Completed' ? 'Đã hoàn tất khám' : 'Lịch hẹn hôm nay');
        }
      });

      // 4. Nạp trước trạng thái EMR cho danh sách bệnh nhân thực tế trong worklist (tối đa 20 BN đầu)
      const uniquePatientIds = [...new Set(merged.map((m) => m.patientId))].slice(0, 20);
      const emrMap = new Map();
      await Promise.all(
        uniquePatientIds.map(async (pid) => {
          try {
            const res = await medicalRecordApi.getPatientRecords(pid);
            const list = extractArray(res);
            if (list.length > 0) {
              emrMap.set(pid, list);
            }
          } catch {
            // ignore individual lookup error
          }
        })
      );

      const enriched = merged.map((item) => {
        const recs = emrMap.get(item.patientId) || [];
        const latest = recs[0] || null;
        return {
          ...item,
          recordsCount: recs.length,
          latestRecord: latest,
          hasTodayEmr: latest ? isTodayIso(latest.createdAt || latest.visitDate) : false
        };
      });

      setWorklist(enriched);
    } catch (err) {
      console.error('Failed to load EMR worklist:', err);
      setWorklistError('Không thể tải danh sách lượt khám & hồ sơ bệnh án.');
    } finally {
      setLoadingWorklist(false);
    }
  }, []);

  useEffect(() => {
    loadWorklist();
  }, [loadWorklist]);

  // Helper: fill form from an existing record
  const populateFormFromRecord = useCallback((record) => {
    if (!record) {
      setForm(INITIAL_FORM);
      return;
    }
    setForm({
      chiefComplaint: record.chiefComplaint || '',
      clinicalSymptoms: record.clinicalSymptoms || '',
      heartRate: record.vitals?.heartRate ?? 75,
      systolicBp: record.vitals?.systolicBp ?? 120,
      diastolicBp: record.vitals?.diastolicBp ?? 80,
      temperature: record.vitals?.temperature ?? 36.5,
      spo2: record.vitals?.spo2 ?? 98,
      heightCm: record.vitals?.heightCm ?? 170,
      weightKg: record.vitals?.weightKg ?? 65,
      icd10Code: record.icd10Code || 'E11.9',
      icd10Name: record.icd10Name || '',
      diagnosis: record.diagnosis || '',
      treatmentPlan: record.treatmentPlan || '',
      prescriptionNotes: record.prescriptionNotes || ''
    });
  }, []);

  // Open EMR & Clinical Conclusion Modal for an encounter
  const handleOpenEncounterModal = useCallback(
    async (encounter) => {
      setActiveEncounter(encounter);
      setShowModal(true);
      setModalError(null);
      setModalSuccess(null);
      setBypassPendingLab(false);
      setLoadingModalData(true);

      try {
        const [recRes, labRes] = await Promise.all([
          medicalRecordApi.getPatientRecords(encounter.patientId).catch(() => null),
          medicalRecordApi.getPatientLabResults(encounter.patientId).catch(() => null)
        ]);

        const recs = extractArray(recRes);
        const labs = extractArray(labRes);

        setPatientRecords(recs);
        setLabResults(labs);

        const latest = recs[0] || null;
        if (latest && isTodayIso(latest.createdAt || latest.visitDate)) {
          setSelectedRecord(latest);
          populateFormFromRecord(latest);
          setModalMode(latest.canEdit && canWriteEmr ? 'edit' : 'view');
        } else {
          setSelectedRecord(null);
          setForm(INITIAL_FORM);
          setModalMode(canWriteEmr ? 'create' : 'view');
        }
      } catch (err) {
        console.error('Error loading encounter EMR modal:', err);
        setModalError('Không thể tải chi tiết bệnh án hoặc kết quả xét nghiệm.');
      } finally {
        setLoadingModalData(false);
      }
    },
    [canWriteEmr, populateFormFromRecord]
  );

  // Auto-open modal if navigated directly with ?patientId=... or ?appointmentId=...
  useEffect(() => {
    if (autoOpenedQuery || loadingWorklist) return;
    if (!queryPatientId && !queryAppointmentId) return;

    const match = worklist.find(
      (w) =>
        (queryAppointmentId && String(w.appointmentId) === String(queryAppointmentId)) ||
        (queryPatientId && String(w.patientId).toLowerCase() === queryPatientId.toLowerCase())
    );

    if (match) {
      setAutoOpenedQuery(true);
      handleOpenEncounterModal(match);
    } else if (queryPatientId) {
      setAutoOpenedQuery(true);
      handleOpenEncounterModal({
        key: `PAT:${queryPatientId}`,
        appointmentId: queryAppointmentId || '',
        appointmentCode: queryAppointmentId ? `APT-${String(queryAppointmentId).slice(-6)}` : '',
        patientId: queryPatientId,
        patientName: 'Bệnh nhân theo hồ sơ',
        sourceTag: 'Điều hướng trực tiếp'
      });
    }
  }, [
    autoOpenedQuery,
    loadingWorklist,
    queryPatientId,
    queryAppointmentId,
    worklist,
    handleOpenEncounterModal
  ]);

  // Switch between history records inside modal
  const handleSelectHistoryRecord = (record) => {
    setModalError(null);
    setModalSuccess(null);
    if (!record) {
      setSelectedRecord(null);
      setForm(INITIAL_FORM);
      setModalMode(canWriteEmr ? 'create' : 'view');
      return;
    }
    setSelectedRecord(record);
    populateFormFromRecord(record);
    setModalMode(record.canEdit && canWriteEmr ? 'edit' : 'view');
  };

  // Explicit search for an old patient by exact PAT-... code when not in today's queue
  const handleExplicitPatientLookup = async () => {
    const term = searchKeyword.trim();
    if (term.length < 3) return;
    const existing = worklist.find(
      (w) =>
        w.patientId.toLowerCase() === term.toLowerCase() ||
        w.appointmentCode.toLowerCase() === term.toLowerCase()
    );
    if (existing) {
      handleOpenEncounterModal(existing);
      return;
    }
    if (term.toUpperCase().startsWith('PAT-')) {
      handleOpenEncounterModal({
        key: `PAT:${term.toUpperCase()}`,
        appointmentId: '',
        appointmentCode: '',
        patientId: term.toUpperCase(),
        patientName: `Hồ sơ ${term.toUpperCase()}`,
        sourceTag: 'Tra cứu mã BN'
      });
    }
  };

  // Save (Create or Update) Medical Record
  const handleSubmitEmr = async (e) => {
    e.preventDefault();
    if (!activeEncounter || modalMode === 'view') return;

    if (!bpValidation.valid) {
      setModalError(bpValidation.message);
      return;
    }

    const upperIcd = form.icd10Code.trim().toUpperCase();
    if (!ICD10_REGEX.test(upperIcd)) {
      setModalError(`Mã ICD-10 "${upperIcd}" không đúng định dạng chuẩn WHO (Ví dụ: E11.9, I10).`);
      return;
    }

    if (!form.chiefComplaint.trim() || !form.diagnosis.trim()) {
      setModalError('Vui lòng nhập đầy đủ Lý do khám và Chẩn đoán xác định.');
      return;
    }

    setSubmitLoading(true);
    setModalError(null);
    setModalSuccess(null);

    const payload = {
      patientId: activeEncounter.patientId,
      chiefComplaint: form.chiefComplaint.trim(),
      clinicalSymptoms: form.clinicalSymptoms?.trim() || '',
      vitals: {
        heartRate: Number(form.heartRate),
        systolicBp: Number(form.systolicBp),
        diastolicBp: Number(form.diastolicBp),
        temperature: Number(form.temperature),
        spo2: Number(form.spo2),
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg)
      },
      icd10Code: upperIcd,
      icd10Name: form.icd10Name?.trim() || '',
      diagnosis: form.diagnosis.trim(),
      treatmentPlan: form.treatmentPlan?.trim() || '',
      prescriptionNotes: form.prescriptionNotes?.trim() || ''
    };

    try {
      let saved;
      if (modalMode === 'create') {
        saved = await medicalRecordApi.createRecord(payload);
        setModalSuccess(
          `Đã lập bệnh án & chốt chẩn đoán thành công! Mã hồ sơ: ${saved.recordCode || saved.id}`
        );
        setPageBanner(
          `Đã lưu hồ sơ bệnh án ${saved.recordCode || ''} cho bệnh nhân ${activeEncounter.patientName} (${upperIcd}).`
        );
      } else if (modalMode === 'edit' && selectedRecord) {
        saved = await medicalRecordApi.updateRecord(selectedRecord.id, payload);
        setModalSuccess(
          `Đã cập nhật hồ sơ ${saved.recordCode || selectedRecord.recordCode} thành công!`
        );
        setPageBanner(
          `Đã cập nhật hồ sơ bệnh án ${saved.recordCode || selectedRecord.recordCode} cho bệnh nhân ${activeEncounter.patientName}.`
        );
      }

      // Refresh modal history & main worklist
      const recRes = await medicalRecordApi.getPatientRecords(activeEncounter.patientId).catch(() => null);
      const recs = extractArray(recRes);
      setPatientRecords(recs);
      const targetRec = recs.find((r) => r.id === saved?.id) || recs[0] || saved;
      if (targetRec) {
        setSelectedRecord(targetRec);
        populateFormFromRecord(targetRec);
        setModalMode(targetRec.canEdit && canWriteEmr ? 'edit' : 'view');
      }
      await loadWorklist();
    } catch (err) {
      console.error('Error saving medical record:', err);
      setModalError(err.message || 'Lỗi khi lưu bệnh án điện tử.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Soft delete confirmation
  const handleDeleteConfirm = async () => {
    if (!recordToDelete || deleteReason.trim().length < 15) {
      setModalError('Lý do xóa bắt buộc tối thiểu 15 ký tự theo quy định kiểm toán y tế.');
      return;
    }

    setSubmitLoading(true);
    setModalError(null);
    try {
      await medicalRecordApi.deleteRecord(recordToDelete.id, deleteReason.trim());
      setShowDeleteModal(false);
      setRecordToDelete(null);
      setDeleteReason('');
      setModalSuccess(`Đã hủy hồ sơ bệnh án ${recordToDelete.recordCode} theo quy trình kiểm toán.`);

      if (activeEncounter) {
        const recRes = await medicalRecordApi.getPatientRecords(activeEncounter.patientId).catch(() => null);
        const recs = extractArray(recRes);
        setPatientRecords(recs);
        setSelectedRecord(null);
        setForm(INITIAL_FORM);
        setModalMode(canWriteEmr ? 'create' : 'view');
      }
      await loadWorklist();
    } catch (err) {
      console.error('Delete error:', err);
      setModalError(err.message || 'Không thể xóa hồ sơ bệnh án.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filtered worklist
  const filteredWorklist = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return worklist.filter((item) => {
      if (kw) {
        const hay = `${item.patientName} ${item.patientId} ${item.appointmentCode} ${item.latestRecord?.icd10Code || ''} ${item.latestRecord?.recordCode || ''}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (statusFilter === 'PENDING_EMR') {
        return !item.hasTodayEmr;
      }
      if (statusFilter === 'LAB_READY') {
        return item.hasApprovedLab;
      }
      if (statusFilter === 'EDITABLE_24H') {
        return Boolean(item.latestRecord && item.latestRecord.canEdit);
      }
      if (statusFilter === 'LOCKED') {
        return Boolean(item.latestRecord && !item.latestRecord.canEdit);
      }
      return true;
    });
  }, [worklist, searchKeyword, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: worklist.length,
      pending: worklist.filter((w) => !w.hasTodayEmr).length,
      labReady: worklist.filter((w) => w.hasApprovedLab).length,
      editable: worklist.filter((w) => w.latestRecord && w.latestRecord.canEdit).length,
      locked: worklist.filter((w) => w.latestRecord && !w.latestRecord.canEdit).length
    };
  }, [worklist]);

  const isReadOnlyModal = modalMode === 'view';
  const hasPendingLabGate = Boolean(
    activeEncounter?.order &&
      !activeEncounter?.hasApprovedLab &&
      labResults.length === 0
  );

  return (
    <div className="w-100 py-1">
      {/* Header Card */}
      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Bệnh án &amp; kết luận chẩn đoán</h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Chọn bệnh nhân để xem kết quả xét nghiệm, cập nhật chẩn đoán ICD-10 và lưu bệnh án.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 text-nowrap"
            onClick={loadWorklist}
            disabled={loadingWorklist}
          >
            <RefreshCw className={loadingWorklist ? 'fa-spin me-1' : 'me-1'} size={11} /> Làm mới
          </Button>
        </div>
      </div>

      {pageBanner && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setPageBanner(null)}
          className="rounded-4 border-0 shadow-sm mb-3 d-flex align-items-center gap-2"
        >
          <CheckCircle2  size="1em"/>
          <span className="fw-semibold">{pageBanner}</span>
        </Alert>
      )}

      {worklistError && (
        <Alert variant="danger" className="rounded-4 border-0 shadow-sm mb-3">
          {worklistError}
        </Alert>
      )}

      {/* Filter Bar & Status Pills */}
      <div className="bms-filter-bar mb-3 flex-wrap">
        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: '260px' }}>
          <Search className="bms-search-icon"  size="1em"/>
          <input
            type="text"
            placeholder="Tìm theo mã BN (PAT-...), tên bệnh nhân, mã hẹn (APT-...) hoặc mã ICD-10..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleExplicitPatientLookup();
            }}
          />
          {searchKeyword.trim().toUpperCase().startsWith('PAT-') && (
            <Button
              size="sm"
              variant="primary"
              className="rounded-pill px-3 py-1 ms-2"
              onClick={handleExplicitPatientLookup}
            >
              Mở hồ sơ
            </Button>
          )}
        </div>

        <div className="d-flex flex-wrap gap-2">
          {[
            { key: 'ALL', label: `Tất cả (${counts.all})` },
            { key: 'PENDING_EMR', label: `Chờ lập bệnh án (${counts.pending})` },
            { key: 'LAB_READY', label: `Đã có KQ Lab (${counts.labReady})` },
            { key: 'EDITABLE_24H', label: `Còn hạn 24h (${counts.editable})` },
            { key: 'LOCKED', label: `Đã khóa (>24h) (${counts.locked})` }
          ].map((pill) => (
            <Button
              key={pill.key}
              size="sm"
              variant={statusFilter === pill.key ? 'primary' : 'light'}
              className={`rounded-pill px-3 fw-semibold ${
                statusFilter === pill.key ? 'text-white shadow-sm' : 'text-secondary border'
              }`}
              onClick={() => setStatusFilter(pill.key)}
            >
              {pill.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Worklist Table */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Header className="bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <ClipboardList className="text-primary"  size="1em"/>
            <h6 className="fw-bold text-dark mb-0">
              Danh Sách Bệnh Nhân Khám &amp; Kết Luận Bệnh Án
            </h6>
          </div>
          <span className="small text-muted">
            Hiển thị <strong>{filteredWorklist.length}</strong> lượt khám thực tế
          </span>
        </Card.Header>

        <Card.Body className="p-0">
          {loadingWorklist ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              <span className="text-muted small">Đang đồng bộ hàng đợi khám, kết quả Lab &amp; hồ sơ EMR...</span>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="bg-light text-muted small text-uppercase">
                  <tr>
                    <th className="ps-4 py-3">STT / Mã Hẹn</th>
                    <th>Bệnh Nhân</th>
                    <th>Cận Lâm Sàng (Lab)</th>
                    <th>Hồ Sơ Bệnh Án (EMR)</th>
                    <th className="text-end pe-4">Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorklist.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5">
                        <User size={34} className="text-muted opacity-25 mb-2" />
                        <div className="fw-semibold text-dark">
                          {searchKeyword
                            ? 'Không tìm thấy bệnh nhân khớp với từ khóa'
                            : 'Chưa có lượt khám nào trong danh sách hôm nay'}
                        </div>
                        <div className="small text-muted mt-1">
                          Bác sĩ có thể gọi bệnh nhân tại Bàn khám hoặc gõ mã <code>PAT-...</code> vào thanh tìm kiếm rồi nhấn Enter để tra cứu hồ sơ cũ.
                        </div>
                        <div className="mt-3">
                          <Link
                            to="/doctor/console"
                            className="btn btn-outline-primary btn-sm rounded-pill px-3"
                          >
                            <Megaphone className="me-1"  size="1em"/> Mở Bàn Khám &amp; Gọi Số
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWorklist.map((item, idx) => {
                      const latest = item.latestRecord;
                      const isLocked = latest && !latest.canEdit;
                      const isEditable = latest && latest.canEdit;

                      return (
                        <tr key={item.key}>
                          <td className="ps-4">
                            <div className="fw-bold text-dark">
                              {item.queueNumber ? `#${item.queueNumber}` : `#${idx + 1}`}
                              {item.appointmentCode ? ` · ${item.appointmentCode}` : ''}
                            </div>
                            <Badge
                              bg={item.sourceTag === 'Đang gọi số' ? 'primary' : 'light'}
                              text={item.sourceTag === 'Đang gọi số' ? 'white' : 'dark'}
                              className="border rounded-pill mt-1 fw-normal"
                            >
                              {item.sourceTag}
                            </Badge>
                          </td>

                          <td>
                            <div className="fw-bold text-dark">{item.patientName}</div>
                            <div className="small text-muted">
                              <code>{item.patientId}</code>
                              {item.gender ? ` · ${item.gender}` : ''}
                              {item.phone ? ` · ${item.phone}` : ''}
                            </div>
                          </td>

                          <td>
                            {item.hasApprovedLab ? (
                              <div className="d-flex flex-column gap-1 align-items-start">
                                <Badge bg="success" className="rounded-pill px-2 py-1">
                                  <CheckCircle2 className="me-1"  size="1em"/> Đã có KQ Lab duyệt
                                </Badge>
                                {item.hasPanicOrAbnormal && (
                                  <Badge bg="danger" className="rounded-pill px-2 py-1">
                                    <AlertTriangle className="me-1"  size="1em"/> Có chỉ số bất thường
                                  </Badge>
                                )}
                              </div>
                            ) : item.order ? (
                              <Badge bg="warning" text="dark" className="rounded-pill px-2 py-1">
                                <TestTube2 className="me-1"  size="1em"/> Đang chờ Lab ({item.order.status})
                              </Badge>
                            ) : (
                              <span className="small text-muted">Chưa có chỉ định Lab</span>
                            )}
                          </td>

                          <td>
                            {!latest ? (
                              <Badge bg="secondary" className="rounded-pill px-2 py-1 bg-opacity-75">
                                Chưa lập bệnh án
                              </Badge>
                            ) : isLocked ? (
                              <div className="d-flex flex-column align-items-start gap-1">
                                <Badge bg="dark" className="rounded-pill px-2 py-1">
                                  <Lock className="me-1"  size="1em"/> Đã khóa (&gt; 24h)
                                </Badge>
                                <span className="small text-muted">
                                  {latest.recordCode} · ICD-10: <strong>{latest.icd10Code}</strong>
                                </span>
                              </div>
                            ) : (
                              <div className="d-flex flex-column align-items-start gap-1">
                                <Badge bg="info" text="dark" className="rounded-pill px-2 py-1">
                                  <SquarePen className="me-1"  size="1em"/> Đã lập · Còn hạn sửa 24h
                                </Badge>
                                <span className="small text-muted">
                                  {latest.recordCode} · ICD-10: <strong>{latest.icd10Code}</strong>
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="text-end pe-4">
                            {!item.hasTodayEmr && canWriteEmr ? (
                              <Button
                                size="sm"
                                variant="primary"
                                className="rounded-pill px-3 fw-semibold shadow-sm"
                                onClick={() => handleOpenEncounterModal(item)}
                              >
                                <FileText className="me-1"  size="1em"/> Lập bệnh án &amp; Kết luận
                              </Button>
                            ) : isEditable && canWriteEmr ? (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="rounded-pill px-3 fw-semibold"
                                onClick={() => handleOpenEncounterModal(item)}
                              >
                                <SquarePen className="me-1"  size="1em"/> Xem / Cập nhật (24h)
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline-secondary"
                                className="rounded-pill px-3 fw-semibold"
                                onClick={() => handleOpenEncounterModal(item)}
                              >
                                <Eye className="me-1"  size="1em"/> Xem hồ sơ
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Clinical EMR & Diagnosis Conclusion Modal */}
      <Modal
        show={showModal}
        onHide={() => !submitLoading && setShowModal(false)}
        size="xl"
        backdrop="static"
        scrollable
      >
        <Modal.Header closeButton className="bg-light border-bottom px-4 py-3">
          <div className="d-flex flex-column">
            <Modal.Title className="fs-5 fw-bold text-dark d-flex align-items-center gap-2">
              <Stethoscope className="text-primary"  size="1em"/>
              <span>Bệnh Án Điện Tử &amp; Kết Luận Chẩn Đoán</span>
              {selectedRecord && (
                <Badge bg="primary" className="rounded-pill fs-6 fw-normal px-3">
                  {selectedRecord.recordCode}
                </Badge>
              )}
              {isReadOnlyModal && selectedRecord && (
                <Badge bg="dark" className="rounded-pill fs-6 fw-normal px-3">
                  <Lock className="me-1"  size="1em"/> Khóa pháp lý (&gt; 24h)
                </Badge>
              )}
            </Modal.Title>
            {activeEncounter && (
              <div className="small text-muted mt-1">
                Bệnh nhân: <strong className="text-dark">{activeEncounter.patientName}</strong> · Mã:{' '}
                <code>{activeEncounter.patientId}</code>
                {activeEncounter.appointmentCode ? ` · Lượt khám: ${activeEncounter.appointmentCode}` : ''}
              </div>
            )}
          </div>
        </Modal.Header>

        <Modal.Body className="p-4 bg-white">
          {loadingModalData ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <div className="small text-muted mt-2">
                Đang nạp lịch sử bệnh án và kết quả xét nghiệm từ Phòng Lab...
              </div>
            </div>
          ) : (
            <Form id="emr-conclusion-form" onSubmit={handleSubmitEmr}>
              {modalError && (
                <Alert variant="danger" dismissible onClose={() => setModalError(null)} className="rounded-3">
                  <AlertTriangle className="me-2"  size="1em"/>
                  {modalError}
                </Alert>
              )}

              {modalSuccess && (
                <Alert variant="success" dismissible onClose={() => setModalSuccess(null)} className="rounded-3">
                  <CheckCircle2 className="me-2"  size="1em"/>
                  {modalSuccess}
                </Alert>
              )}

              {hasPendingLabGate && !isReadOnlyModal && (
                <Alert variant="warning" className="rounded-3 border-warning">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div className="small">
                      <AlertTriangle className="me-2 text-warning"  size="1em"/>
                      <strong>Ràng buộc liên thông Phòng Lab:</strong> Bệnh nhân đang có y lệnh{' '}
                      <code>{activeEncounter?.order?.orderNumber || activeEncounter?.order?.id}</code>{' '}
                      ({activeEncounter?.order?.status}) nhưng <strong>chưa có kết quả được ký duyệt SHA-256</strong>.
                    </div>
                    <Link
                      to="/laboratory/biochemical-results"
                      className="btn btn-sm btn-outline-dark rounded-pill px-3 fw-semibold"
                    >
                      Mở Duyệt KQ Lab
                    </Link>
                  </div>
                  <Form.Check
                    type="checkbox"
                    id="bypass-pending-lab-check"
                    className="mt-2 small fw-semibold text-dark"
                    label="Xác nhận chốt bệnh án lâm sàng ngay (không chờ kết quả xét nghiệm Lab)"
                    checked={bypassPendingLab}
                    onChange={(e) => setBypassPendingLab(e.target.checked)}
                  />
                </Alert>
              )}

              {/* History Switcher Bar */}
              <div className="bg-light rounded-3 p-3 mb-4 border">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="small fw-bold text-dark d-flex align-items-center gap-2">
                    <LucideHistory className="text-primary"  size="1em"/>
                    <span>Lịch sử bệnh án của bệnh nhân ({patientRecords.length} hồ sơ):</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {canWriteEmr && (
                      <Button
                        size="sm"
                        variant={!selectedRecord ? 'primary' : 'outline-primary'}
                        className="rounded-pill px-3"
                        onClick={() => handleSelectHistoryRecord(null)}
                      >
                        <Plus className="me-1"  size="1em"/> Lập bệnh án đợt mới
                      </Button>
                    )}
                    {patientRecords.map((rec) => (
                      <Button
                        key={rec.id}
                        size="sm"
                        variant={selectedRecord?.id === rec.id ? 'dark' : 'outline-secondary'}
                        className="rounded-pill px-3"
                        onClick={() => handleSelectHistoryRecord(rec)}
                      >
                        {rec.recordCode} ({rec.icd10Code}){' '}
                        {rec.canEdit ? '· 24h' : '· Khóa'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Row className="g-4">
                {/* Left Column: Lab Results Reference + Vitals */}
                <Col lg={5}>
                  {/* Read-only Lab Results Summary */}
                  <Card className="border rounded-4 mb-4">
                    <Card.Header className="bg-light border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold small text-dark">
                        <TestTube2 className="text-primary me-2"  size="1em"/>
                        Kết Quả Xét Nghiệm Cận Lâm Sàng (Lab)
                      </span>
                      <Badge bg="secondary" className="rounded-pill">
                        {labResults.length} phiếu
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                      {labResults.length === 0 ? (
                        <div className="small text-muted text-center py-3">
                          Chưa có kết quả xét nghiệm nào được Phòng Lab phát hành cho bệnh nhân này.
                        </div>
                      ) : (
                        labResults.map((res, idx) => {
                          const params = res.parameters || res.items || res.details || [];
                          return (
                            <div key={res.id || idx} className="border-bottom pb-2 mb-2 last-no-border">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="small text-primary">
                                  {res.packageName || res.testName || res.orderNumber || `Phiếu KQ #${idx + 1}`}
                                </strong>
                                <span className="small text-muted">
                                  {formatDateTime(res.approvedAt || res.createdAt)}
                                </span>
                              </div>
                              {params.length > 0 ? (
                                <div className="d-flex flex-wrap gap-1">
                                  {params.slice(0, 8).map((p, pIdx) => {
                                    const flag = String(p.flag || p.status || '').toUpperCase();
                                    const isAbnormal = flag === 'HIGH' || flag === 'LOW' || flag === 'PANIC' || flag === 'CRITICAL';
                                    return (
                                      <Badge
                                        key={pIdx}
                                        bg={isAbnormal ? 'danger' : 'light'}
                                        text={isAbnormal ? 'white' : 'dark'}
                                        className="border fw-normal"
                                      >
                                        {p.criterionName || p.parameterName || p.testName || p.name || p.criterionCode || p.code || p.abbreviation || 'Chỉ số'}:{' '}
                                        <strong>
                                          {p.value ?? p.resultValue} {p.unit || ''}
                                        </strong>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="small text-muted">
                                  {res.conclusion || res.doctorNote || 'Đã có kết quả xét nghiệm.'}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </Card.Body>
                  </Card>

                  {/* Vitals & BMI */}
                  <Card className="border rounded-4">
                    <Card.Header className="bg-light border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                      <span className="fw-bold small text-dark">
                        <HeartPulse className="text-danger me-2"  size="1em"/>
                        Dấu Hiệu Sinh Tồn &amp; Chỉ Số BMI
                      </span>
                      <Badge bg={bmiColor} className="rounded-pill">
                        BMI: {bmi} ({bmiCategory})
                      </Badge>
                    </Card.Header>
                    <Card.Body className="p-3">
                      <Row className="g-2">
                        <Col xs={6}>
                          <Form.Label className="small fw-semibold mb-1">Mạch (bpm)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            disabled={isReadOnlyModal}
                            value={form.heartRate}
                            onChange={(e) => setForm({ ...form, heartRate: e.target.value })}
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="small fw-semibold mb-1">Nhiệt độ (°C)</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.1"
                            size="sm"
                            disabled={isReadOnlyModal}
                            value={form.temperature}
                            onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="small fw-semibold mb-1">HA Tâm thu (mmHg)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            disabled={isReadOnlyModal}
                            isInvalid={!bpValidation.valid}
                            value={form.systolicBp}
                            onChange={(e) => setForm({ ...form, systolicBp: e.target.value })}
                          />
                        </Col>
                        <Col xs={6}>
                          <Form.Label className="small fw-semibold mb-1">HA Tâm trương (mmHg)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            disabled={isReadOnlyModal}
                            isInvalid={!bpValidation.valid}
                            value={form.diastolicBp}
                            onChange={(e) => setForm({ ...form, diastolicBp: e.target.value })}
                          />
                        </Col>
                        {!bpValidation.valid && (
                          <Col xs={12}>
                            <div className="text-danger small fw-semibold">{bpValidation.message}</div>
                          </Col>
                        )}
                        <Col xs={4}>
                          <Form.Label className="small fw-semibold mb-1">SpO2 (%)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            disabled={isReadOnlyModal}
                            value={form.spo2}
                            onChange={(e) => setForm({ ...form, spo2: e.target.value })}
                          />
                        </Col>
                        <Col xs={4}>
                          <Form.Label className="small fw-semibold mb-1">Cao (cm)</Form.Label>
                          <Form.Control
                            type="number"
                            size="sm"
                            disabled={isReadOnlyModal}
                            value={form.heightCm}
                            onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                          />
                        </Col>
                        <Col xs={4}>
                          <Form.Label className="small fw-semibold mb-1">Nặng (kg)</Form.Label>
                          <Form.Control
                            type="number"
                            step="0.1"
                            size="sm"
                            disabled={isReadOnlyModal}
                            value={form.weightKg}
                            onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                          />
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>

                {/* Right Column: Clinical Examination + ICD-10 + Treatment Plan */}
                <Col lg={7}>
                  <Card className="border rounded-4 h-100">
                    <Card.Header className="bg-light border-bottom py-2 px-3">
                      <span className="fw-bold small text-dark">
                        <Stethoscope className="text-primary me-2"  size="1em"/>
                        Khám Lâm Sàng, Chẩn Đoán WHO ICD-10 &amp; Phác Đồ Điều Trị
                      </span>
                    </Card.Header>
                    <Card.Body className="p-3 d-flex flex-column gap-3">
                      <div>
                        <Form.Label className="small fw-semibold mb-1">
                          Lý do vào khám <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          required
                          disabled={isReadOnlyModal}
                          placeholder="Ví dụ: Khám định kỳ đường huyết, mệt mỏi, đau đầu..."
                          value={form.chiefComplaint}
                          onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                        />
                      </div>

                      <div>
                        <Form.Label className="small fw-semibold mb-1">Triệu chứng &amp; Khám thực thể</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          disabled={isReadOnlyModal}
                          placeholder="Ghi nhận triệu chứng cơ năng, thực thể..."
                          value={form.clinicalSymptoms}
                          onChange={(e) => setForm({ ...form, clinicalSymptoms: e.target.value })}
                        />
                      </div>

                      <Row className="g-2">
                        <Col md={7}>
                          <Form.Label className="small fw-semibold mb-1">Chọn nhanh mã bệnh WHO ICD-10</Form.Label>
                          <Form.Select
                            size="sm"
                            disabled={isReadOnlyModal}
                            value={COMMON_ICD10.some((x) => x.code === form.icd10Code) ? form.icd10Code : ''}
                            onChange={(e) => {
                              const picked = COMMON_ICD10.find((x) => x.code === e.target.value);
                              if (picked) {
                                setForm({
                                  ...form,
                                  icd10Code: picked.code,
                                  icd10Name: picked.name
                                });
                              }
                            }}
                          >
                            <option value="">-- Chọn mã ICD-10 phổ biến --</option>
                            {COMMON_ICD10.map((icd) => (
                              <option key={icd.code} value={icd.code}>
                                {icd.code} — {icd.name}
                              </option>
                            ))}
                          </Form.Select>
                        </Col>
                        <Col md={5}>
                          <Form.Label className="small fw-semibold mb-1">
                            Mã ICD-10 <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            size="sm"
                            required
                            disabled={isReadOnlyModal}
                            placeholder="VD: E11.9"
                            value={form.icd10Code}
                            onChange={(e) => setForm({ ...form, icd10Code: e.target.value.toUpperCase() })}
                          />
                        </Col>
                      </Row>

                      <div>
                        <Form.Label className="small fw-semibold mb-1">
                          Kết luận chẩn đoán xác định <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          required
                          disabled={isReadOnlyModal}
                          placeholder="Nhập kết luận chẩn đoán sau khi đối chiếu kết quả xét nghiệm & lâm sàng..."
                          value={form.diagnosis}
                          onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                        />
                      </div>

                      <div>
                        <Form.Label className="small fw-semibold mb-1">
                          <Pill className="text-success me-1"  size="1em"/>
                          Phác đồ điều trị &amp; Hướng xử trí
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          disabled={isReadOnlyModal}
                          placeholder="Phác đồ điều trị, chế độ sinh hoạt, lịch hẹn tái khám..."
                          value={form.treatmentPlan}
                          onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
                        />
                      </div>

                      <div>
                        <Form.Label className="small fw-semibold mb-1">Ghi chú đơn thuốc / Lời dặn</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          disabled={isReadOnlyModal}
                          placeholder="Chi tiết thuốc, liều dùng hoặc dặn dò bệnh nhân..."
                          value={form.prescriptionNotes}
                          onChange={(e) => setForm({ ...form, prescriptionNotes: e.target.value })}
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Form>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-light border-top px-4 py-3 d-flex justify-content-between align-items-center">
          <div className="small text-muted">
            {selectedRecord ? (
              selectedRecord.canEdit ? (
                <span>
                  Tạo lúc: <strong>{formatDateTime(selectedRecord.createdAt)}</strong> · Được phép chỉnh sửa trong vòng <strong>24 giờ</strong>.
                </span>
              ) : (
                <span className="text-dark fw-semibold">
                  <Lock className="me-1"  size="1em"/> Hồ sơ đã khóa sửa sau 24 giờ theo Thông tư 46/2018/TT-BYT.
                </span>
              )
            ) : (
              <span>Hồ sơ bệnh án sẽ tự động khóa chỉnh sửa sau 24 giờ kể từ lúc phát hành.</span>
            )}
          </div>

          <div className="d-flex gap-2">
            {modalMode === 'edit' && selectedRecord && canWriteEmr && (
              <Button
                variant="outline-danger"
                className="rounded-pill px-3"
                disabled={submitLoading}
                onClick={() => {
                  setRecordToDelete(selectedRecord);
                  setDeleteReason('');
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="me-1"  size="1em"/> Hủy hồ sơ (Audit)
              </Button>
            )}

            <Button
              variant="outline-secondary"
              className="rounded-pill px-3"
              disabled={submitLoading}
              onClick={() => setShowModal(false)}
            >
              Đóng
            </Button>

            {!isReadOnlyModal && canWriteEmr && (
              <Button
                type="submit"
                form="emr-conclusion-form"
                variant="primary"
                className="rounded-pill px-4 fw-semibold shadow-sm"
                disabled={submitLoading || !bpValidation.valid || (hasPendingLabGate && !bypassPendingLab)}
              >
                {submitLoading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" /> Đang lưu...
                  </>
                ) : modalMode === 'create' ? (
                  <>
                    <CheckCircle2 className="me-1"  size="1em"/> Lưu Bệnh Án &amp; Chốt Chẩn Đoán
                  </>
                ) : (
                  <>
                    <SquarePen className="me-1"  size="1em"/> Cập Nhật Bệnh Án
                  </>
                )}
              </Button>
            )}
          </div>
        </Modal.Footer>
      </Modal>

      {/* Soft Delete Audit Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-6 fw-bold text-danger">
            <AlertTriangle className="me-2"  size="1em"/> Giải Trình Hủy Hồ Sơ Bệnh Án (Audit)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="small text-muted">
            Theo quy định kiểm toán y tế, việc hủy hồ sơ <strong>{recordToDelete?.recordCode}</strong> bắt buộc phải ghi nhận lý do rõ ràng (tối thiểu 15 ký tự).
          </p>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Nhập lý do hủy hồ sơ (ví dụ: Nhập nhầm lượt khám của bệnh nhân khác...)"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
            Hủy bỏ
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={submitLoading || deleteReason.trim().length < 15}
            onClick={handleDeleteConfirm}
          >
            Xác nhận hủy hồ sơ
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
