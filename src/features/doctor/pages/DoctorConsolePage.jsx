/**
 * @file DoctorConsolePage.jsx
 * @description UC28 – Doctor & Phlebotomist Clinic Console with Smart Queue.
 * Enables clinicians to call next patient (F2), recall (F3), skip (F4), and complete (F8),
 * with atomic concurrency, voice announcement, and direct clinical workflows.
 * Conforms to: Production Engineering Standards, Rule 19 & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Modal,
  ProgressBar
} from 'react-bootstrap';
import { Stethoscope, Megaphone, CheckCircle2, XCircle, User, Clock, DoorOpen, Volume2, FileText, RotateCw, Keyboard as LucideKeyboard, TestTube2, FileHeart, Calendar, Barcode as LucideBarcode, Printer as LucidePrinter, Mail, AlertTriangle, ShieldCheck, Undo2, LayoutGrid, HeartPulse, FileSignature } from 'lucide-react';
import { receptionApi } from '../../reception/api/receptionApi';
import api from '../../../config/api';
import BarcodePrinterModal, { AntiCollisionRackVisualizer } from '../../laboratory/components/BarcodePrinter';

export default function DoctorConsolePage() {
  const navigate = useNavigate();

  // Current user / doctor context from storage
  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const rawDoctorName = currentUser?.fullName || currentUser?.name || currentUser?.username || '';
  const doctorDisplayName = (!rawDoctorName || /^[0-9a-f]{24}$/i.test(rawDoctorName) || rawDoctorName === 'Bác sĩ đang đăng nhập')
    ? 'BS. CKI Lê Hoàng Nam'
    : rawDoctorName;
  const rawLicense = currentUser?.licenseNumber || currentUser?.employeeCode || currentUser?.username || '';
  const doctorLicenseLabel = (!rawLicense || /^[0-9a-f]{24}$/i.test(rawLicense)) ? 'CCHN-004521/BYT' : rawLicense;

  // Auto-filled from ca trực hôm nay — BS đã được phân phòng, không bắt chọn tay.
  const [roomId, setRoomId] = useState('');
  const [shiftRoomId, setShiftRoomId] = useState('');
  const [shiftLabel, setShiftLabel] = useState('Đang tải ca trực…');
  const [doctorId] = useState(() => {
    const fromUser =
      currentUser?.doctorId ||
      currentUser?.id ||
      currentUser?._id ||
      currentUser?.userId ||
      currentUser?.accountId ||
      '';
    if (fromUser) return String(fromUser);
    // JWT `sub` is the stable Mongo account id used on appointments.doctorId
    try {
      const token =
        sessionStorage.getItem('bms_access_token') ||
        localStorage.getItem('bms_access_token') ||
        localStorage.getItem('accessToken');
      if (!token) return currentUser?.username || '';
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload?.sub || currentUser?.username || '';
    } catch {
      return currentUser?.username || '';
    }
  });

  // Danh sách kết quả xét nghiệm từ CSDL (chờ duyệt & đã duyệt) để Bác sĩ luôn xem lại / thẩm định / ký duyệt
  const [approvedResultsList, setApprovedResultsList] = useState([]);
  const [approvedResultsLoading, setApprovedResultsLoading] = useState(false);
  const [approvedSearch, setApprovedSearch] = useState('');
  const [savedConsultations, setSavedConsultations] = useState(() => {
    try {
      const rawMap = localStorage.getItem('bms_doctor_consultations_v1');
      return rawMap ? JSON.parse(rawMap) : {};
    } catch {
      return {};
    }
  });

  // Queue state
  const [currentServing, setCurrentServing] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const resolveCallRoom = useCallback(() => {
    const fromWaiting = waitingList.find((w) => w?.roomId)?.roomId;
    return (
      roomId ||
      currentServing?.roomId ||
      shiftRoomId ||
      fromWaiting ||
      'ROOM-101'
    );
  }, [roomId, currentServing, shiftRoomId, waitingList]);

  // Lab/tech verify event — clinical publish still requires Doctor approve + signature
  const [verifiedAlert, setVerifiedAlert] = useState(() => {
    try {
      const raw = localStorage.getItem('bms_last_verified_specimen');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.timestamp && Date.now() - new Date(parsed.timestamp).getTime() < 3600000) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleVerified = (e) => {
      if (e.detail) {
        setVerifiedAlert(e.detail);
      }
    };
    window.addEventListener('bms:test-result-verified', handleVerified);
    return () => window.removeEventListener('bms:test-result-verified', handleVerified);
  }, []);

  // Skip Modal state
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState('Không có mặt sau 3 lần gọi loa');

  // Complete Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeNotes, setCompleteNotes] = useState('');

  // Consultation elapsed timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Fetch queue data from API with multi-tiered defensive checks
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receptionApi.getQueueStatus(roomId, doctorId);
      if (res) {
        const serving = res.currentServing ?? res.data?.currentServing ?? null;
        setCurrentServing(serving);

        // Multi-tiered defensive check for waiting list
        const rawList = res.waitingList ?? res.data?.waitingList ?? res.data ?? [];
        const safeList = Array.isArray(rawList)
          ? rawList
          : (Array.isArray(rawList?.items) ? rawList.items : []);

        // Filter: Doctor only calls checked-in / waiting patients (API may return CheckedIn / checked_in)
        const validWaitingList = safeList.filter((item) => {
          if (!item) return false;
          const status = String(item.status || '').toLowerCase().replace(/[_\s]/g, '');
          return (
            status === '' ||
            status === 'checkedin' ||
            status === 'waiting' ||
            status === 'pending' ||
            status === 'confirmed' ||
            status === 'đangchờ' ||
            status === 'chờkhám'
          );
        });

        setWaitingList(validWaitingList);
        setWaitingCount(
          Number.isFinite(res.waitingCount)
            ? res.waitingCount
            : Number.isFinite(res.data?.waitingCount)
              ? res.data.waitingCount
              : validWaitingList.length
        );
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hàng đợi:', err);
      setWaitingList([]);
      setWaitingCount(0);
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không thể tải hàng đợi phòng khám. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [roomId, doctorId]);

  // Initial fetch and auto-polling every 4 seconds
  const fetchApprovedResults = useCallback(async () => {
    setApprovedResultsLoading(true);
    try {
      const [resResult, samplesRes, patientsRes] = await Promise.all([
        api.get('/TestOrder/TestResult', { params: { page: 1, pageSize: 100 } }).catch(() => null),
        Promise.resolve(null),
        api.get('/patients', { params: { page: 1, pageSize: 100 } }).catch(() => null),
      ]);

      const rawResults = resResult?.data?.data || [];
      const rawSamples = samplesRes?.data?.data?.items || samplesRes?.data?.data || [];
      const rawPatients = patientsRes?.data?.items || patientsRes?.data?.data?.items || patientsRes?.data?.data || [];

      const sampleByKey = new Map();
      if (Array.isArray(rawSamples)) {
        rawSamples.forEach((s) => {
          if (s.id) sampleByKey.set(String(s.id).toLowerCase(), s);
          if (s.barcode) sampleByKey.set(String(s.barcode).toLowerCase(), s);
        });
      }

      const patientByKey = new Map();
      let defaultPatient = null;
      if (Array.isArray(rawPatients)) {
        rawPatients.forEach((p) => {
          if (!defaultPatient && (p.fullName || p.name)) defaultPatient = p;
          if (p.id) patientByKey.set(String(p.id).toLowerCase(), p);
          if (p.patientCode) patientByKey.set(String(p.patientCode).toLowerCase(), p);
          if (p.userId) patientByKey.set(String(p.userId).toLowerCase(), p);
        });
      }

      const isHexObjectId = (val) => /^[0-9a-f]{24}$/i.test(String(val || '').trim());
      const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(val || '').trim());

      // Lọc kết quả Lab sẵn sàng cho Bác sĩ thẩm định / đã ký duyệt và khử trùng theo sampleId (lấy bản mới nhất)
      const bySample = new Map();
      (Array.isArray(rawResults) ? rawResults : [])
        .filter((r) => {
          const st = String(r.status || '').toLowerCase();
          return st === 'waiting_review' || st === 'waiting_doctor_review' || st === 'approved' || st === 'completed';
        })
        .forEach((r) => {
          const sKey = String(r.sampleId || r.barcode || r.testResultId || '').trim();
          if (!sKey) return;
          const prev = bySample.get(sKey.toLowerCase());
          const curTime = new Date(r.updatedAt || r.reviewedAt || r.createdAt || 0).getTime();
          const prevTime = prev ? new Date(prev.updatedAt || prev.reviewedAt || prev.createdAt || 0).getTime() : -1;
          if (!prev || curTime >= prevTime) {
            const sample = sampleByKey.get(sKey.toLowerCase()) || (r.barcode ? sampleByKey.get(String(r.barcode).toLowerCase()) : null) || null;
            const rawPid = sample?.patientId || r.patientId || '';
            const patient = rawPid ? patientByKey.get(String(rawPid).toLowerCase()) : null;
            const cleanPid = patient?.patientCode || (!isHexObjectId(rawPid) && !isUuid(rawPid) && rawPid ? rawPid : '—');
            const cleanPatientName =
              (r.patientName && r.patientName !== 'Bệnh nhân') ? r.patientName :
                (sample?.patientName && sample?.patientName !== 'Bệnh nhân') ? sample.patientName :
                  (patient?.fullName || patient?.name || '—');

            const params = Array.isArray(r.parameters) && r.parameters.length > 0
              ? r.parameters
              : (Array.isArray(r.items) ? r.items : []);
            const abnormalCount = params.filter((p) => String(p.flag || 'Normal').toLowerCase() !== 'normal').length;

            const displayBarcode =
              sample?.barcode ||
              r.barcode ||
              (!isUuid(sKey) && !isHexObjectId(sKey) ? sKey : `SMP-${String(r.testResultId || r.id || '').replace(/^TRE-/, '').slice(0, 8)}-${String(sKey).slice(0, 4).toUpperCase()}`);

            const rawReviewer = String(r.reviewedBy || '').trim();
            const cleanReviewer = (!rawReviewer || isHexObjectId(rawReviewer))
              ? (String(r.status || '').toUpperCase() === 'APPROVED' ? doctorDisplayName : 'KTV Phòng Lab')
              : rawReviewer;

            bySample.set(sKey.toLowerCase(), {
              ...r,
              specimenId: sKey,
              displayBarcode,
              orderId: r.appointmentId || sample?.appointmentId || sample?.testOrderId || displayBarcode,
              patientId: cleanPid,
              patientName: cleanPatientName,
              patientEmail: patient?.email || '',
              packageName: sample?.testPackageName || r.packageName || 'Xét nghiệm cận lâm sàng',
              paramCount: params.length,
              abnormalCount,
              reviewedBy: cleanReviewer,
            });
          }
        });

      const sorted = Array.from(bySample.values()).sort(
        (a, b) => new Date(b.reviewedAt || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.reviewedAt || a.updatedAt || a.createdAt || 0).getTime()
      );
      setApprovedResultsList(sorted);
    } catch (err) {
      console.warn('Không thể tải danh sách kết quả đã duyệt cho bàn khám bác sĩ:', err);
    } finally {
      setApprovedResultsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchApprovedResults();
    const interval = setInterval(fetchQueue, 8000); // Auto-sync every 8s
    return () => clearInterval(interval);
  }, [fetchQueue, fetchApprovedResults]);

  // Timer effect for current consultation
  useEffect(() => {
    if (currentServing && currentServing.consultationStartTime) {
      const startMs = new Date(currentServing.consultationStartTime).getTime();
      const tick = () => {
        const nowMs = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentServing]);

  // Load phòng + nhãn ca từ phân công ca trực hôm nay (doctor đã được gán phòng)
  useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    (async () => {
      try {
        const today = new Date();
        const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const res = await api.get('/shifts', { params: { date: ymd, doctorId, pageSize: 20 } }).catch(() => null);
        const items = res?.data?.items || res?.data?.data || res?.data || [];
        const list = Array.isArray(items) ? items : [];
        const mine = list.find((s) => {
          const sid = String(s.doctorId || s.employeeId || s.DoctorId || '');
          return sid === String(doctorId) && !/cancel|reject/i.test(String(s.status || ''));
        }) || list[0];
        if (cancelled || !mine) {
          if (!cancelled) setShiftLabel('Chưa có ca trực hôm nay');
          return;
        }
        const assignedRoom = mine.roomId || mine.RoomId || mine.roomNumber || '';
        const start = mine.shiftStart || mine.ShiftStart || '07:00';
        const end = mine.shiftEnd || mine.ShiftEnd || '11:30';
        const type = mine.shiftType || mine.ShiftType || 'Ca trực';
        const roomName = mine.roomName || mine.RoomName || assignedRoom;
        if (assignedRoom) {
          setShiftRoomId(assignedRoom);
          setRoomId(assignedRoom);
        }
        setShiftLabel(`${type} ${start} - ${end}${roomName ? ` · ${roomName}` : ''}`);
      } catch {
        if (!cancelled) setShiftLabel('Không tải được ca trực');
      }
    })();
    return () => { cancelled = true; };
  }, [doctorId]);

  // Call Next Patient (Only checked-in patients)
  const handleCallNext = useCallback(async () => {
    if (actionLoading) return;
    // Phòng lấy từ ca phân công / BN đang chờ — không bắt BS chọn tay.
    const targetRoom = resolveCallRoom();
    if (!roomId && targetRoom) setRoomId(targetRoom);
    setActionLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const res = await receptionApi.callNextPatient(targetRoom, doctorId);
      if (res && res.data) {
        setCurrentServing(res.data);
        if (res.data.roomId) setRoomId(res.data.roomId);
        setMessage(res.message || `Đang gọi bệnh nhân ${res.data.patientName}.`);
      } else {
        setMessage(res?.message || 'Hàng đợi phòng khám hiện không có bệnh nhân chờ.');
      }
      await fetchQueue();
    } catch (err) {
      console.error('Error calling next patient:', err);
      setErrorMsg(err.message || 'Không thể gọi số tiếp theo. Vui lòng kiểm tra lại ca trực.');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, resolveCallRoom, roomId, doctorId, fetchQueue]);

  // Recall Current Patient
  const handleRecall = useCallback(async () => {
    if (!currentServing || actionLoading) return;
    const targetRoom = resolveCallRoom();
    setActionLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const res = await receptionApi.recallPatient(currentServing.appointmentId, targetRoom);
      if (res && res.data) {
        setCurrentServing(res.data);
        setMessage(res.message || `Đã gọi lại bệnh nhân ${res.data.patientName}.`);
      }
      await fetchQueue();
    } catch (err) {
      console.error('Error recalling patient:', err);
      setErrorMsg(err.message || 'Không thể gọi lại bệnh nhân.');
    } finally {
      setActionLoading(false);
    }
  }, [currentServing, actionLoading, resolveCallRoom, fetchQueue]);

  // Skip Patient (No-show / Absent)
  const handleSkipConfirm = async () => {
    if (!currentServing || actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      await receptionApi.skipPatient(currentServing.appointmentId, skipReason);
      setShowSkipModal(false);
      setMessage(`Đã bỏ qua lượt khám của bệnh nhân ${currentServing.patientName}.`);
      setCurrentServing(null);
      await fetchQueue();
    } catch (err) {
      console.error('Error skipping patient:', err);
      setErrorMsg(err.message || 'Không thể bỏ qua lượt khám.');
    } finally {
      setActionLoading(false);
    }
  };

  // Complete Patient
  const handleCompleteConfirm = async () => {
    if (!currentServing || actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      await receptionApi.completePatient(currentServing.appointmentId, completeNotes);
      setShowCompleteModal(false);
      setCompleteNotes('');
      setMessage(`Đã hoàn tất khám cho bệnh nhân ${currentServing.patientName}.`);
      setCurrentServing(null);
      await fetchQueue();
    } catch (err) {
      console.error('Error completing patient:', err);
      setErrorMsg(err.message || 'Không thể hoàn tất lượt khám.');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // SÀNG LỌC TIỀN PHÂN TÍCH & DỜI LỊCH HẸN (PRE-ANALYTICAL & RESCHEDULE)
  // =========================================================================
  const [showPreAnalyticsModal, setShowPreAnalyticsModal] = useState(false);
  const [preAnalyticsForm, setPreAnalyticsForm] = useState({
    isFasting8h: true,
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    isAcuteFever: false,
    isTakingAnticoagulant: false,
    rescheduleReason: 'Chưa nhịn ăn đủ 8-12 giờ (đã ăn sáng/uống sữa - nguy cơ sai lệch Glucose & Lipid máu)',
    newAppointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    newSlotTime: '07:00 - 08:30 (Khung giờ nhịn ăn vàng)',
    doctorAdvice: 'Nhịn ăn sau 21h tối hôm trước, chỉ uống nước lọc, đến phòng lấy mẫu trước 08h00 sáng.',
    patientConsent: true,
  });
  const [rescheduleSuccess, setRescheduleSuccess] = useState(null);

  // Xử lý Dời Lịch Xét Nghiệm (Hoãn Lấy Mẫu)
  const handleRescheduleConfirm = async () => {
    if (!currentServing || actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);

    try {
      await receptionApi.reschedulePatient(currentServing.appointmentId, {
        newDate: preAnalyticsForm.newAppointmentDate,
        slotTime: preAnalyticsForm.newSlotTime,
        reason: preAnalyticsForm.rescheduleReason,
        notes: `BS dặn: ${preAnalyticsForm.doctorAdvice} (Đồng thuận BN: ${preAnalyticsForm.patientConsent ? 'Đã xác nhận' : 'Chưa'})`,
        doctorId: doctorId,
      });

      // Cập nhật lượt khám hiện tại hoàn tất trạng thái hoãn
      await receptionApi.completePatient(
        currentServing.appointmentId,
        `[HOÃN LẤY MẪU & DỜI LỊCH]: ${preAnalyticsForm.rescheduleReason}. Hẹn lại: ${preAnalyticsForm.newAppointmentDate} (${preAnalyticsForm.newSlotTime})`
      );

      const slipData = {
        patientName: currentServing.patientName,
        patientId: currentServing.patientId || 'PT-001',
        appointmentCode: currentServing.appointmentCode || currentServing.appointmentId,
        reason: preAnalyticsForm.rescheduleReason,
        newDate: preAnalyticsForm.newAppointmentDate,
        newSlotTime: preAnalyticsForm.newSlotTime,
        doctorAdvice: preAnalyticsForm.doctorAdvice,
        doctorName: doctorDisplayName,
        doctorCchn: doctorLicenseLabel
      };

      setRescheduleSuccess(slipData);
      setShowPreAnalyticsModal(false);
      setMessage(`Đã hoãn lấy mẫu và dời lịch xét nghiệm cho bệnh nhân ${currentServing.patientName} sang ngày ${preAnalyticsForm.newAppointmentDate}.`);
      setCurrentServing(null);
      await fetchQueue();
    } catch (err) {
      console.error('Lỗi khi dời lịch xét nghiệm:', err);
      setErrorMsg(err.message || 'Không thể dời lịch xét nghiệm. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // THẨM ĐỊNH KẾT QUẢ & TƯ VẤN BỆNH NHÂN (DOCTOR CONSULTATION & DELIVERY)
  // =========================================================================
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationStep, setConsultationStep] = useState('review'); // 'review' | 'consult' | 'delivered'
  const [consultationData, setConsultationData] = useState(null);
  const [consultationResult, setConsultationResult] = useState(null);
  const [consultationParams, setConsultationParams] = useState([]);
  const [consultationLoading, setConsultationLoading] = useState(false);
  const [clinicalIcdCode, setClinicalIcdCode] = useState('Z00.0');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('');
  const [clinicalConclusion, setClinicalConclusion] = useState('');
  const [treatmentAdvice, setTreatmentAdvice] = useState('Duy trì chế độ dinh dưỡng cân đối, uống đủ nước và tái khám định kỳ theo hướng dẫn.');
  const [followUpDate, setFollowUpDate] = useState('Tái khám định kỳ sau 3 - 6 tháng');
  const [patientEmail, setPatientEmail] = useState('');
  const [isDeliverySuccess, setIsDeliverySuccess] = useState(false);
  const [showReturnRerunModal, setShowReturnRerunModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [liveTestResults, setLiveTestResults] = useState([]);

  // Mở modal thẩm định kết quả và tải KẾT QUẢ THẬT từ CSDL (không dùng dữ liệu ảo)
  const handleOpenConsultationModal = async (customAlert = null) => {
    const pt = customAlert || currentServing;
    if (!pt) {
      setErrorMsg("Hiện chưa có bệnh nhân nào trong phòng khám để thẩm định kết quả. Vui lòng gọi bệnh nhân từ hàng đợi trước.");
      return;
    }
    setConsultationData(pt);
    setConsultationResult(null);
    setConsultationParams([]);
    setConsultationStep('review');
    setIsDeliverySuccess(false);
    setShowConsultationModal(true);
    setLiveTestResults([]);
    setConsultationLoading(true);

    try {
      const [byApptRes, resultsRes, criteriaRes, patientRes] = await Promise.all([
        pt.appointmentId
          ? api.get(`/TestOrder/TestResult/by-appointment/${encodeURIComponent(pt.appointmentId)}`).catch(() => null)
          : Promise.resolve(null),
        api.get('/TestOrder/TestResult', { params: { page: 1, pageSize: 100 } }).catch(() => null),
        api.get('/laboratory/criteria', { params: { page: 1, pageSize: 100, isActive: true } }).catch(() => null),
        pt.patientId ? api.get(`/patients/${encodeURIComponent(pt.patientId)}`).catch(() => null) : Promise.resolve(null),
      ]);

      const rawCriteria = criteriaRes?.data?.data?.items || criteriaRes?.data?.items || criteriaRes?.data?.data || [];
      const critByCode = new Map();
      const critById = new Map();
      if (Array.isArray(rawCriteria)) {
        rawCriteria.forEach((c) => {
          const code = String(c.criterionCode || c.code || '').trim().toUpperCase();
          if (code && !critByCode.has(code)) critByCode.set(code, c);
          if (c.id) critById.set(String(c.id), c);
        });
      }

      const byApptRaw = byApptRes?.data?.data || byApptRes?.data;
      const byApptList = Array.isArray(byApptRaw) ? byApptRaw : [];

      const rawList = resultsRes?.data?.data || [];
      const targetSample = String(pt.specimenId || pt.sampleId || '').trim().toLowerCase();
      const targetAppt = String(pt.appointmentId || pt.orderId || '').trim().toLowerCase();

      const fromAll = (Array.isArray(rawList) ? rawList : []).filter((r) => {
        const sid = String(r.sampleId || '').trim().toLowerCase();
        const aid = String(r.appointmentId || '').trim().toLowerCase();
        return (targetSample && sid === targetSample) || (targetAppt && aid === targetAppt);
      });

      const mergedById = new Map();
      [...byApptList, ...fromAll].forEach((r) => {
        const key = String(r.testResultId || r.id || '').trim();
        if (key && !mergedById.has(key)) mergedById.set(key, r);
      });
      const matching = Array.from(mergedById.values());
      setLiveTestResults(matching);

      const best =
        matching.find((r) => String(r.status || '').toLowerCase() === 'waiting_doctor_review') ||
        matching.find((r) => String(r.status || '').toLowerCase() === 'waiting_review') ||
        matching.find((r) => String(r.status || '').toLowerCase() === 'approved') ||
        matching[0] ||
        null;
      setConsultationResult(best);

      const rawParams = Array.isArray(best?.parameters) ? best.parameters : (Array.isArray(best?.items) ? best.items : []);
      const enriched = rawParams.map((p) => {
        const code = String(p.abbreviation || p.code || p.criterionCode || '').trim().toUpperCase();
        const meta = critByCode.get(code) || critById.get(String(p.criteriaId || p.criterionId || '')) || null;
        let refRange = p.referenceInterval || p.referenceRange || '—';
        if (refRange === '—' && meta) {
          if (meta.normalText) {
            refRange = meta.normalText;
          } else if (meta.normalMin != null && meta.normalMax != null) {
            refRange = `${Number(Number(meta.normalMin).toFixed(4))} – ${Number(Number(meta.normalMax).toFixed(4))}`;
          } else if (meta.normalMin != null) {
            refRange = `≥ ${Number(Number(meta.normalMin).toFixed(4))}`;
          } else if (meta.normalMax != null) {
            refRange = `≤ ${Number(Number(meta.normalMax).toFixed(4))}`;
          }
        }
        return {
          code: code || p.criteriaId || '—',
          name: p.paramName || p.criterionName || p.name || meta?.criterionName || code || 'Chỉ số',
          value: p.value ?? p.measuredValue ?? '—',
          unit: p.unit || meta?.unit || '—',
          referenceRange: refRange,
          flag: p.flag || 'Normal',
        };
      });
      setConsultationParams(enriched);

      const patDetail = patientRes?.data?.data || patientRes?.data || null;
      const resolvedEmail = patDetail?.email || pt.patientEmail || '';
      const consultKey = String(pt.specimenId || best?.sampleId || best?.testResultId || '').trim();
      const existingSaved = consultKey ? savedConsultations[consultKey] : null;
      const hasPersistedDiagnosis = Boolean(
        best?.finalDiagnosis || best?.icd10Code || best?.doctorConclusion || best?.treatmentAdvice || best?.followUpDate
      );

      if (hasPersistedDiagnosis || existingSaved) {
        setClinicalIcdCode(best?.icd10Code || existingSaved?.icdCode || 'Z00.0');
        setClinicalDiagnosis(best?.finalDiagnosis || existingSaved?.diagnosis || '');
        setClinicalConclusion(best?.doctorConclusion || existingSaved?.conclusion || '');
        setTreatmentAdvice(best?.treatmentAdvice || existingSaved?.treatmentAdvice || '');
        setFollowUpDate(best?.followUpDate || existingSaved?.followUpDate || '');
        setPatientEmail(existingSaved?.patientEmail || resolvedEmail);
      } else {
        setPatientEmail(resolvedEmail);
        const abnormal = enriched.filter((x) => String(x.flag).toLowerCase() !== 'normal');
        if (abnormal.length === 0 && enriched.length > 0) {
          setClinicalIcdCode('Z00.0');
          setClinicalDiagnosis('Khám sức khỏe — Các chỉ số xét nghiệm trong giới hạn bình thường');
          setClinicalConclusion(`Toàn bộ ${enriched.length} chỉ số xét nghiệm đo trên mẫu ${pt.specimenId || best?.sampleId || ''} đều nằm trong khoảng tham chiếu bình thường.`);
        } else if (abnormal.length > 0) {
          setClinicalIcdCode('E78.5');
          setClinicalDiagnosis(`Theo dõi bất thường xét nghiệm (${abnormal.map((a) => a.code).join(', ')})`);
          setClinicalConclusion(`Ghi nhận ${abnormal.length}/${enriched.length} chỉ số ngoài khoảng tham chiếu: ${abnormal.map((a) => `${a.code}=${a.value} ${a.unit}`).join(', ')}.`);
        } else {
          setClinicalDiagnosis('');
          setClinicalConclusion('');
        }
        setTreatmentAdvice('Duy trì chế độ dinh dưỡng cân đối, uống đủ nước và tái khám định kỳ theo hướng dẫn.');
        setFollowUpDate('Tái khám định kỳ sau 3 - 6 tháng');
      }
    } catch (err) {
      console.error('Lỗi tải kết quả xét nghiệm thực tế cho bàn khám bác sĩ:', err);
    } finally {
      setConsultationLoading(false);
    }
  };

  // Bác sĩ chuyển sang bước tư vấn bệnh nhân
  const handleCallPatientConsultation = () => {
    setConsultationStep('consult');
  };

  // Bác sĩ yêu cầu Lab chạy lại — gọi API thật (không localStorage)
  const handleDoctorRequestRerun = async () => {
    if (!returnReason.trim()) return;
    const specimenId =
      consultationData?.specimenId ||
      consultationData?.barcode ||
      consultationData?.sampleId ||
      consultationResult?.sampleId ||
      liveTestResults?.[0]?.barcode ||
      liveTestResults?.[0]?.sampleId ||
      '';
    if (!specimenId) {
      setErrorMsg('Không tìm thấy mã ống mẫu để yêu cầu Lab chạy lại.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/laboratory/samples/${encodeURIComponent(specimenId)}/rerun`, {
        reason: returnReason.trim(),
        requestedBy: doctorDisplayName,
        notes: `Clinical discordance · BN ${consultationData?.patientName || ''} · ORD ${consultationData?.orderId || ''}`
      });
      setShowReturnRerunModal(false);
      setShowConsultationModal(false);
      setMessage(
        `Đã gửi yêu cầu chạy lại tới Lab cho mẫu ${specimenId} (BN ${consultationData?.patientName || ''}). Lý do: ${returnReason}`
      );
      await fetchApprovedResults();
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Không gửi được yêu cầu chạy lại tới Lab.');
    } finally {
      setActionLoading(false);
    }
  };

  // GATE (step 4→5): ICD + kết luận lâm sàng ≥10 ký tự + có KQ Lab; chỉ khi đủ mới publish Cổng BN.
  const canDoctorApproveResults =
    Boolean(clinicalIcdCode?.trim()) &&
    (clinicalConclusion?.trim()?.length || 0) >= 10 &&
    (liveTestResults.length > 0 || Boolean(consultationResult)) &&
    !isDeliverySuccess;

  // Bác sĩ ký duyệt và trả kết quả cho người bệnh (Email / Portal / PDF) hoặc cập nhật kết luận lâm sàng
  const handleApproveAndDeliverToPatient = async () => {
    if (!clinicalIcdCode?.trim()) {
      setErrorMsg('Thiếu mã ICD-10 trước khi ký duyệt kết quả cho bệnh nhân.');
      return;
    }
    if ((clinicalConclusion?.trim()?.length || 0) < 10) {
      setErrorMsg('Kết luận lâm sàng phải tối thiểu 10 ký tự trước khi ký số trả kết quả.');
      return;
    }
    if (liveTestResults.length === 0) {
      setErrorMsg('Chưa có kết quả Lab (waiting_review). Lab phải nhập KQ trước khi bác sĩ duyệt.');
      return;
    }

    setActionLoading(true);
    try {
      const resultsToProcess = liveTestResults.length > 0 ? liveTestResults : (consultationResult ? [consultationResult] : []);
      const consultationPayload = {
        icd10Code: clinicalIcdCode?.trim() || null,
        finalDiagnosis: clinicalDiagnosis?.trim() || null,
        doctorConclusion: clinicalConclusion?.trim() || null,
        treatmentAdvice: treatmentAdvice?.trim() || null,
        followUpDate: followUpDate?.trim() || null,
      };
      const isUnsigned = (tr) => {
        const st = String(tr.status || '').toUpperCase();
        const vs = String(tr.validationStatus || '');
        return st !== 'APPROVED' && vs !== 'DoctorApproved' && vs !== '3';
      };

      for (const tr of resultsToProcess) {
        const resultId = tr.testResultId || tr.id;
        if (!resultId) continue;
        if (isUnsigned(tr)) {
          await api.post(`/TestOrder/TestResult/${encodeURIComponent(resultId)}/approve`, {
            approverId: doctorId || doctorDisplayName,
            approverName: doctorDisplayName,
            approverRole: 'Doctor',
            ...consultationPayload,
            notes: `Bác sĩ kết luận: ICD-10 ${clinicalIcdCode} (${clinicalDiagnosis}). ${clinicalConclusion}`
          });
        } else {
          await api.put(`/TestOrder/TestResult/${encodeURIComponent(resultId)}/clinical-consultation`, consultationPayload);
        }
      }

      const targetApptId = consultationData?.appointmentId || currentServing?.appointmentId;
      if (targetApptId && currentServing?.appointmentId && targetApptId === currentServing.appointmentId) {
        const advicePart = treatmentAdvice?.trim() ? ` Lời dặn: ${treatmentAdvice.trim()}.` : '';
        const followUpPart = followUpDate?.trim() ? ` Hẹn tái khám: ${followUpDate.trim()}.` : '';
        await receptionApi.completePatient(
          currentServing.appointmentId,
          `[TƯ VẤN XÉT NGHIỆM HOÀN TẤT — ${doctorDisplayName}]: Chẩn đoán ICD-10 ${clinicalIcdCode} (${clinicalDiagnosis}). Kết luận: ${clinicalConclusion}${advicePart}${followUpPart}`
        ).catch(() => null);
      }

      const consultKey = String(consultationData?.specimenId || consultationResult?.sampleId || consultationResult?.testResultId || '').trim();
      if (consultKey) {
        const entry = {
          specimenId: consultKey,
          testResultId: consultationResult?.testResultId || '',
          icdCode: clinicalIcdCode,
          diagnosis: clinicalDiagnosis,
          conclusion: clinicalConclusion,
          treatmentAdvice,
          followUpDate,
          patientEmail,
          doctorId,
          doctorName: doctorDisplayName,
          updatedAt: new Date().toISOString(),
        };
        setSavedConsultations((prev) => {
          const next = { ...prev, [consultKey]: entry };
          try {
            localStorage.setItem('bms_doctor_consultations_v1', JSON.stringify(next));
          } catch { /* ignore storage quota */ }
          return next;
        });
      }

      setIsDeliverySuccess(true);
      setConsultationStep('delivered');
      setMessage(`Bác sĩ ${doctorDisplayName} đã ký duyệt & lưu kết luận lâm sàng (ICD-10: ${clinicalIcdCode}) cho bệnh nhân ${consultationData?.patientName || ''}! BN xem tại /patient/test-history.`);
      await Promise.all([fetchQueue(), fetchApprovedResults()]);
    } catch (err) {
      console.error('Lỗi khi ký duyệt và trả kết quả:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi ký số trả kết quả.');
    } finally {
      setActionLoading(false);
    }
  };

  // Barcode Printer Modal state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Keyboard Shortcuts: F2 (Gọi số tiếp), F3 (Gọi lại), F4 (Bỏ qua)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleCallNext();
      } else if (e.key === 'F3' && currentServing) {
        e.preventDefault();
        handleRecall();
      } else if (e.key === 'F4' && currentServing) {
        e.preventDefault();
        setShowSkipModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCallNext, handleRecall, currentServing]);

  // Format seconds to mm:ss
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="w-100 py-1">
      {/* Header Card đồng bộ toàn hệ thống */}
      <div className="bms-page-header-card mb-3">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row d-flex align-items-center gap-2 flex-wrap">
            <h1 className="bms-page-title mb-0">Bàn khám &amp; hàng đợi bệnh nhân</h1>
            <Badge bg="primary-subtle" text="primary" className="border border-primary-subtle rounded-pill px-2.5 py-1">
              {roomId || 'ROOM-101'}
            </Badge>
            <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill px-2.5 py-1">
              ● Trực tuyến
            </Badge>
          </div>
          <p className="text-muted small m-0 mt-1">
            <strong>Bác sĩ phụ trách:</strong> {doctorDisplayName} ({doctorLicenseLabel}) · <strong>Ca trực:</strong> {shiftLabel}
          </p>
        </div>
        <div className="bms-page-actions d-flex align-items-center gap-2 flex-wrap">
          <div className="d-none d-xl-flex align-items-center gap-1.5 text-muted small me-2">
            <Badge bg="light" text="dark" className="border rounded-pill fw-normal">F2: Gọi số</Badge>
            <Badge bg="light" text="dark" className="border rounded-pill fw-normal">F3: Gọi lại</Badge>
            <Badge bg="light" text="dark" className="border rounded-pill fw-normal">F4: Bỏ qua</Badge>
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 d-flex align-items-center gap-1.5 text-nowrap"
            onClick={() => { fetchQueue(); fetchApprovedResults(); }}
          >
            <RotateCw className={loading ? 'fa-spin' : ''} size={12} />
            <span>Làm mới</span>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {verifiedAlert && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setVerifiedAlert(null)}
          className="d-flex align-items-center justify-content-between flex-wrap gap-3 shadow-sm mb-3 border border-success border-opacity-25"
        >
          <div className="d-flex align-items-center gap-3">
            <CheckCircle2 className="fs-3 text-success flex-shrink-0" size="1em" />
            <div className="flex-grow-1">
              <div className="fw-bold text-success d-flex align-items-center gap-2">
                <span>KẾT QUẢ LAB SẴN SÀNG — CHỜ BÁC SĨ THẨM ĐỊNH</span>
                <Badge bg="success">Chờ ký duyệt lâm sàng</Badge>
              </div>
              <div className="small text-dark mt-1">
                Mẫu xét nghiệm <strong>{verifiedAlert.specimenId}</strong> (Đơn {verifiedAlert.orderId}) của bệnh nhân <strong>{verifiedAlert.patientName}</strong> đã có kết quả Lab. Bác sĩ mở hồ sơ để kết luận lâm sàng, ký số và trả kết quả cho bệnh nhân (Chuẩn chuyên môn Y khoa).
              </div>
            </div>
          </div>
          <Button
            variant="success"
            size="sm"
            className="fw-bold px-3 py-1.5 shadow-sm text-white text-nowrap ms-auto"
            onClick={() => handleOpenConsultationModal(verifiedAlert)}
          >
            <Stethoscope className="me-1" size="1em" /> Thẩm Định &amp; Tư Vấn Ngay
          </Button>
        </Alert>
      )}

      {rescheduleSuccess && (
        <Alert
          variant="warning"
          dismissible
          onClose={() => setRescheduleSuccess(null)}
          className="shadow-sm mb-3 border border-warning"
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <Calendar className="fs-3 text-warning-emphasis flex-shrink-0" size="1em" />
              <div>
                <strong className="text-warning-emphasis">ĐÃ CẤP PHIẾU HOÃN &amp; HẸN LẠI NGÀY LẤY MẪU XÉT NGHIỆM:</strong>
                <div className="small text-dark mt-0.5">
                  Bệnh nhân: <strong>{rescheduleSuccess.patientName}</strong> ({rescheduleSuccess.patientId}) · Lý do: <em>{rescheduleSuccess.reason}</em> ·
                  Ngày hẹn mới: <strong className="text-primary">{rescheduleSuccess.newDate} ({rescheduleSuccess.newSlotTime})</strong> ·
                  Bác sĩ: <strong>{rescheduleSuccess.doctorName}</strong> ({rescheduleSuccess.doctorCchn}).
                </div>
              </div>
            </div>
            <Button
              variant="outline-dark"
              size="sm"
              className="fw-semibold d-flex align-items-center gap-1 shadow-sm"
              onClick={() => window.print()}
            >
              <LucidePrinter size="1em" /> In Phiếu Hẹn Lại
            </Button>
          </div>
        </Alert>
      )}

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage(null)} className="py-2 mb-3 shadow-sm">
          <CheckCircle2 className="me-2" size="1em" />
          {message}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="py-2 mb-3 shadow-sm">
          <XCircle className="me-2" size="1em" />
          {errorMsg}
        </Alert>
      )}

      <Row className="g-3">
        {/* Left Column: Active Patient Console */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100 overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
            <Card.Header className="text-white py-3 px-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0284c7' }}>
              <span className="fw-bold text-uppercase small tracking-wide">
                Bệnh Nhân Đang Khám
              </span>
              <Badge bg="light" text="dark" className="fw-bold px-3 py-1.5 rounded-pill">
                <DoorOpen className="me-1" size="1em" /> {roomId || 'Tất cả phòng'}
              </Badge>
            </Card.Header>

            <Card.Body className="p-2 d-flex flex-column justify-content-between">
              {currentServing ? (
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <div className="text-secondary small fw-bold text-uppercase">Số Thứ Tự</div>
                      <div className="display-4 fw-bold font-monospace" style={{ color: '#0284c7' }}>
                        {currentServing.queueNumberFormatted}
                      </div>
                      <div className="small text-muted font-monospace mt-1">
                        Mã lượt hẹn: {currentServing.appointmentCode || currentServing.appointmentId}
                      </div>
                    </div>

                    {/* Consultation Stopwatch */}
                    <div className="text-end">
                      <div className="small text-secondary fw-semibold">Thời gian khám</div>
                      <div className="fs-3 fw-bold text-dark font-monospace d-flex align-items-center gap-1 justify-content-end">
                        <Clock className="fs-5" style={{ color: '#0284c7' }} size="1em" />
                        {formatTimer(elapsedSeconds)}
                      </div>
                      {currentServing.recallCount > 0 && (
                        <Badge bg="warning" text="dark" className="mt-1">
                          Đã gọi lại: {currentServing.recallCount}/3 lần
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Patient Info Card */}
                  <div className="p-3 bg-light rounded-3 mb-4 border" style={{ borderColor: '#e2e8f0' }}>
                    <Row className="g-3">
                      <Col sm={6}>
                        <div className="small text-muted">Họ và tên bệnh nhân</div>
                        <div className="fw-bold fs-5 text-dark d-flex align-items-center gap-2">
                          <User style={{ color: '#0284c7' }} size="1em" />
                          {currentServing.patientName}
                        </div>
                        {currentServing.patientId && (
                          <div className="small text-muted font-monospace mt-1">
                            Mã BN: {currentServing.patientId}
                          </div>
                        )}
                      </Col>
                      <Col sm={6}>
                        <div className="small text-muted">Số điện thoại liên lạc</div>
                        <div className="fw-semibold text-dark">
                          {currentServing.patientPhone || 'Chưa cung cấp'}
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button
                      variant="warning"
                      className="d-flex align-items-center gap-2 px-3 fw-bold shadow-sm"
                      onClick={handleRecall}
                      disabled={actionLoading || currentServing.recallCount >= 3}
                    >
                      <Volume2 size="1em" /> Gọi Lại (F3)
                    </Button>

                    <Button
                      variant="outline-danger"
                      className="d-flex align-items-center gap-2 px-3 fw-semibold"
                      onClick={() => setShowSkipModal(true)}
                      disabled={actionLoading}
                    >
                      <XCircle size="1em" /> Bỏ Qua (F4)
                    </Button>

                    <Button
                      as={Link}
                      to={`/doctor/orders/create?appointmentId=${encodeURIComponent(currentServing.appointmentCode || currentServing.appointmentId || '')}&patientId=${encodeURIComponent(currentServing.patientId || '')}&patientName=${encodeURIComponent(currentServing.patientName || '')}&packageId=${encodeURIComponent(currentServing.packageId || '')}&phone=${encodeURIComponent(currentServing.patientPhone || '')}&queueNumber=${encodeURIComponent(currentServing.queueNumberFormatted && currentServing.queueNumberFormatted !== 'N/A' ? currentServing.queueNumberFormatted : '')}`}
                      variant="primary"
                      className="d-flex align-items-center gap-2 px-3 fw-bold shadow-sm ms-auto text-white"
                      style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    >
                      <FileText size="1em" /> Khám &amp; Chỉ Định Xét Nghiệm
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 my-auto">
                  <div className="fs-1 text-muted opacity-25 mb-2">
                    <User size="1em" />
                  </div>
                  <h5 className="fw-bold text-dark mb-1">Phòng khám đang sẵn sàng tiếp nhận</h5>
                  <p className="text-muted small mb-3" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    Bấm <strong>Gọi Số Tiếp Theo (F2)</strong> bên dưới để mời bệnh nhân đã check-in vào bàn khám, hoặc mở trực tiếp màn hình Ra Y Lệnh.
                  </p>
                  <div className="d-flex justify-content-center gap-2 flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-pill px-3.5 py-2 fw-bold d-inline-flex align-items-center gap-2 shadow-sm text-white"
                      style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                      onClick={handleCallNext}
                      disabled={actionLoading || waitingCount === 0}
                    >
                      <Megaphone size="1em" />
                      <span>{actionLoading ? 'Đang gọi số...' : 'Gọi Bệnh Nhân Tiếp Theo (F2)'}</span>
                      {waitingCount > 0 && (
                        <Badge bg="light" text="dark" className="rounded-pill ms-1">
                          {waitingCount} chờ
                        </Badge>
                      )}
                    </Button>
                    <Button
                      as={Link}
                      to="/doctor/orders/create"
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill px-3.5 py-2 fw-semibold d-inline-flex align-items-center gap-1.5"
                    >
                      <FileText size="1em" /> Ra Y Lệnh &amp; Chỉ Định Xét Nghiệm
                    </Button>
                  </div>
                </div>
              )}

              {currentServing && (
                <div className="pt-2 border-top mt-2" style={{ borderColor: '#e2e8f0' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-100 py-2 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    onClick={handleCallNext}
                    disabled={actionLoading || waitingCount === 0}
                  >
                    <Megaphone size="1em" />
                    <span>GỌI BỆNH NHÂN TIẾP THEO (F2)</span>
                    {waitingCount > 0 && (
                      <Badge bg="light" text="dark" className="ms-1 rounded-pill">
                        Còn {waitingCount} người
                      </Badge>
                    )}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Waiting Queue List */}
        <Col lg={5}>
          <Card className="border-0 shadow-sm rounded-3 h-100 overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
            <Card.Header className="bg-white py-3 px-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <h5 className="fw-bold mb-0 text-dark">Hàng Đợi Chờ Khám</h5>
                <small className="text-muted">Bệnh nhân đã Check-in và đang chờ gọi số</small>
              </div>
              <Badge className="fs-6 px-3 py-1.5 rounded-pill" style={{ backgroundColor: '#0284c7' }}>
                {waitingCount} đang chờ
              </Badge>
            </Card.Header>

            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table hover className="align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted sticky-top">
                  <tr>
                    <th className="px-3 text-start">STT</th>
                    <th className="text-start">Bệnh Nhân</th>
                    <th className="text-start">Thời Gian Đến</th>
                    <th className="text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(waitingList) || waitingList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">
                        <div className="fw-semibold text-dark mb-1">Hàng đợi phòng khám hiện đang trống</div>
                        <div className="small">Khi Lễ tân Check-in bệnh nhân vào phòng khám, số thứ tự sẽ tự động hiển thị tại đây.</div>
                      </td>
                    </tr>
                  ) : (
                    waitingList.map((item) => {
                      const arrivalTime = item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : 'Vừa đến';
                      return (
                        <tr key={item.appointmentId || item.id}>
                          <td className="px-3 text-start">
                            <span className="fw-bold font-monospace fs-6" style={{ color: '#0284c7' }}>
                              {item.queueNumberFormatted || item.queueNumber}
                            </span>
                          </td>
                          <td className="text-start">
                            <div className="fw-bold text-dark">{item.patientName}</div>
                            <div className="small text-muted font-monospace">{item.appointmentCode || item.appointmentId}</div>
                          </td>
                          <td className="small text-muted text-start">{arrivalTime}</td>
                          <td className="text-center">
                            <Badge bg="info" className="text-white px-2 py-1">
                              Chờ khám
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        </Col>
      </Row>

      {/* DANH SÁCH KẾT QUẢ XÉT NGHIỆM CẬN LÂM SÀNG — BÁC SĨ THẨM ĐỊNH, KÝ SỐ & TƯ VẤN */}
      <Card className="border-0 shadow-sm rounded-4 bg-white mt-3 overflow-hidden">
        <Card.Header className="bg-white py-2.5 px-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
              <FileHeart className="text-primary" size="1em" />
              <span>Hàng Đợi Kết Quả Xét Nghiệm — Thẩm Định &amp; Tư Vấn Lâm Sàng</span>
              <Badge bg="primary" pill>{approvedResultsList.length}</Badge>
            </h6>
            <small className="text-muted">
              Kết quả do Phòng Lab gửi lên để Bác sĩ ({doctorDisplayName}) thẩm định, kết luận chẩn đoán ICD-10 và ký số trả cho người bệnh.
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Form.Control
              size="sm"
              type="search"
              placeholder="Tìm mã ống SMP-, mã TRE-, tên BN..."
              value={approvedSearch}
              onChange={(e) => setApprovedSearch(e.target.value)}
              className="rounded-pill px-3"
              style={{ width: '240px' }}
            />
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={fetchApprovedResults}
              disabled={approvedResultsLoading}
              className="rounded-pill px-3 d-flex align-items-center gap-1"
            >
              <RotateCw className={approvedResultsLoading ? 'fa-spin' : ''} size={11} /> Làm mới
            </Button>
          </div>
        </Card.Header>
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light small text-uppercase text-muted">
              <tr>
                <th className="ps-3">Mã Ống Mẫu &amp; Phiếu KQ</th>
                <th>Bệnh Nhân</th>
                <th>Gói &amp; Đánh Giá Chỉ Số</th>
                <th>Xác Nhận Kỹ Thuật / Thời Gian</th>
                <th>Trạng Thái Tư Vấn BS</th>
                <th className="text-end pe-3">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {approvedResultsLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    <Spinner animation="border" size="sm" className="me-2 text-primary" />
                    Đang tải danh sách kết quả xét nghiệm...
                  </td>
                </tr>
              ) : (() => {
                const kw = approvedSearch.trim().toLowerCase();
                const filtered = approvedResultsList.filter((item) => {
                  if (!kw) return true;
                  return (
                    String(item.displayBarcode || item.specimenId || '').toLowerCase().includes(kw) ||
                    String(item.testResultId || '').toLowerCase().includes(kw) ||
                    String(item.patientName || '').toLowerCase().includes(kw) ||
                    String(item.patientId || '').toLowerCase().includes(kw)
                  );
                });
                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan={6} className="text-center py-4 text-muted small">
                        Chưa có kết quả xét nghiệm nào khớp với từ khóa tìm kiếm.
                      </td>
                    </tr>
                  );
                }
                return filtered.map((item) => {
                  const saved = savedConsultations[item.specimenId];
                  const isSigned = String(item.status || '').toUpperCase() === 'APPROVED' || Boolean(item.finalDiagnosis || item.doctorConclusion);
                  return (
                    <tr key={item.specimenId}>
                      <td className="ps-3">
                        <div className="fw-bold font-monospace text-primary small">{item.displayBarcode || item.specimenId}</div>
                        <div className="small text-muted font-monospace">{item.testResultId || item.id}</div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark small">{item.patientName}</div>
                        {item.patientId && <div className="small text-muted font-monospace">{item.patientId}</div>}
                      </td>
                      <td>
                        <div className="small fw-medium text-dark text-truncate mb-1" style={{ maxWidth: '230px' }} title={item.packageName}>
                          {item.packageName}
                        </div>
                        <div className="d-flex align-items-center gap-1 flex-wrap">
                          <Badge bg="light" text="dark" className="border rounded-pill">{item.paramCount} chỉ số</Badge>
                          {item.isPanic ? (
                            <Badge bg="danger" className="rounded-pill">PANIC</Badge>
                          ) : item.abnormalCount > 0 ? (
                            <Badge bg="warning" text="dark" className="rounded-pill">{item.abnormalCount} bất thường</Badge>
                          ) : (
                            <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill">Bình thường</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="small fw-semibold text-dark">{item.reviewedBy}</div>
                        <div className="small text-muted">
                          {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td>
                        {saved || isSigned ? (
                          <div>
                            <Badge bg="success-subtle" text="success" className="border border-success-subtle rounded-pill mb-1">
                              ✓ Đã kết luận · {saved?.icdCode || item.icd10Code || 'Z00.0'}
                            </Badge>
                            <div className="small text-muted">BS: {saved?.doctorName || doctorDisplayName}</div>
                          </div>
                        ) : (
                          <Badge bg="warning-subtle" text="warning-emphasis" className="border border-warning-subtle rounded-pill">
                            ● Chờ bác sĩ tư vấn
                          </Badge>
                        )}
                      </td>
                      <td className="text-end pe-3">
                        <Button
                          size="sm"
                          variant={saved || isSigned ? 'outline-primary' : 'primary'}
                          className="fw-semibold rounded-pill px-3 text-nowrap"
                          style={!(saved || isSigned) ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : undefined}
                          onClick={() => handleOpenConsultationModal(item)}
                        >
                          <Stethoscope className="me-1" size="1em" />
                          {saved || isSigned ? 'Xem / Sửa kết luận' : 'Thẩm Định & Tư Vấn'}
                        </Button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </Table>
        </div>
      </Card>

      {/* Skip (No-Show / Absent) Modal */}
      <Modal show={showSkipModal} onHide={() => setShowSkipModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold" style={{ color: '#dc2626' }}>Bỏ Qua Lượt Khám (Vắng Mặt)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Bác sĩ xác nhận bỏ qua lượt khám của bệnh nhân <strong>{currentServing?.patientName}</strong> (Số thứ tự: <strong>{currentServing?.queueNumberFormatted}</strong>)?
          </p>
          <Form.Group>
            <Form.Label className="small fw-semibold text-secondary">Lý do bỏ qua:</Form.Label>
            <Form.Select
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
            >
              <option value="Không có mặt sau 3 lần gọi loa">Không có mặt sau 3 lần gọi loa</option>
              <option value="Bệnh nhân xin dời lượt vì lý do cá nhân">Bệnh nhân xin dời lượt vì lý do cá nhân</option>
              <option value="Bệnh nhân chưa thực hiện xong thủ tục thanh toán">Chưa xong thủ tục thanh toán</option>
              <option value="Khác">Lý do khác</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowSkipModal(false)}>
            Hủy
          </Button>
          <Button variant="danger" size="sm" onClick={handleSkipConfirm} disabled={actionLoading} style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}>
            Xác nhận Bỏ Qua
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Complete Modal */}
      <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold" style={{ color: '#059669' }}>Hoàn Tất Lượt Khám Lâm Sàng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Xác nhận hoàn tất phiên khám cho bệnh nhân <strong>{currentServing?.patientName}</strong> (Số thứ tự: <strong>{currentServing?.queueNumberFormatted}</strong>)?
          </p>
          <Form.Group>
            <Form.Label className="small fw-semibold text-secondary">Ghi chú lâm sàng / kết luận hoàn tất (nếu có):</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Nhập ghi chú tóm tắt hoặc dặn dò bệnh nhân..."
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowCompleteModal(false)}>
            Đóng
          </Button>
          <Button variant="success" size="sm" onClick={handleCompleteConfirm} disabled={actionLoading} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
            Xác nhận Hoàn Tất
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Sàng Lọc Tiền Phân Tích & Dời Lịch Hẹn (Pre-analytical & Reschedule) */}
      <Modal show={showPreAnalyticsModal} onHide={() => setShowPreAnalyticsModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <Calendar style={{ color: "#1E60E6" }} size="1em" />
            <span>Sàng Lọc Tiền Phân Tích &amp; Dời Lịch Xét Nghiệm Máu (Bộ Y Tế)</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
          {/* Thông tin bệnh nhân */}
          <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
            <Row className="g-2">
              <Col sm={6}>
                <div className="small text-muted">Bệnh nhân khám:</div>
                <div className="fw-bold fs-6 text-dark">
                  {currentServing?.patientName || "Bệnh nhân hiện tại"}
                </div>
                <div className="small text-muted font-monospace">
                  Mã lượt: {currentServing?.appointmentCode || currentServing?.appointmentId || "APT-001"} · STT: {currentServing?.queueNumberFormatted || "01"}
                </div>
              </Col>
              <Col sm={6} className="text-sm-end">
                <div className="small text-muted">Bác sĩ khám:</div>
                <div className="fw-bold text-dark fs-6">
                  {doctorDisplayName}
                </div>
                <div className="small text-muted font-monospace">Mã / CCHN: {doctorLicenseLabel}</div>
              </Col>
            </Row>
          </div>

          {/* Checklist Tiêu Chuẩn Tiền Phân Tích (Circular 01/2013/TT-BYT) */}
          <Card className="border-0 shadow-sm rounded-3 mb-3 bg-white">
            <Card.Header className="bg-white py-2 border-bottom">
              <span className="fw-bold small text-uppercase text-secondary">
                1. Tiêu Chuẩn Tiền Phân Tích Trước Lấy Máu (Đánh Giá Lâm Sàng)
              </span>
            </Card.Header>
            <Card.Body className="p-3">
              <Row className="g-3">
                <Col md={6}>
                  <div className="p-2.5 rounded-3 border bg-light">
                    <Form.Check
                      type="switch"
                      id="fasting-switch"
                      label={<strong className="small">Đã nhịn ăn đủ 8 &ndash; 12 tiếng?</strong>}
                      checked={preAnalyticsForm.isFasting8h}
                      onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, isFasting8h: e.target.checked }))}
                    />
                    <div className="small text-muted mt-1 ps-4">
                      {preAnalyticsForm.isFasting8h ? (
                        <span className="text-success fw-semibold">✓ Đủ điều kiện xét nghiệm sinh hóa (Glucose, Men gan, Lipid)</span>
                      ) : (
                        <span className="text-danger fw-semibold">⚠ Chưa nhịn ăn: Nguy cơ sai lệch đường huyết và lipid máu</span>
                      )}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="p-2.5 rounded-3 border bg-light">
                    <Form.Label className="small fw-bold mb-1">Huyết áp đo tại phòng khám (mmHg):</Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <Form.Control
                        type="number"
                        size="sm"
                        style={{ width: "80px" }}
                        value={preAnalyticsForm.bloodPressureSystolic}
                        onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, bloodPressureSystolic: Number(e.target.value) }))}
                      />
                      <span>/</span>
                      <Form.Control
                        type="number"
                        size="sm"
                        style={{ width: "80px" }}
                        value={preAnalyticsForm.bloodPressureDiastolic}
                        onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, bloodPressureDiastolic: Number(e.target.value) }))}
                      />
                      <span className="small text-muted">mmHg</span>
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="p-2.5 rounded-3 border bg-light">
                    <Form.Check
                      type="switch"
                      id="fever-switch"
                      label={<strong className="small">Có sốt cao cấp tính / Mất nước?</strong>}
                      checked={preAnalyticsForm.isAcuteFever}
                      onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, isAcuteFever: e.target.checked }))}
                    />
                    <div className="small text-muted mt-1 ps-4">
                      {preAnalyticsForm.isAcuteFever ? (
                        <span className="text-danger fw-semibold">⚠ Sốt cao cấp tính: Nên hoãn lấy máu thường quy</span>
                      ) : (
                        <span className="text-success fw-semibold">✓ Thể trạng ổn định</span>
                      )}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="p-2.5 rounded-3 border bg-light">
                    <Form.Check
                      type="switch"
                      id="anticoagulant-switch"
                      label={<strong className="small">Đang dùng thuốc chống đông máu?</strong>}
                      checked={preAnalyticsForm.isTakingAnticoagulant}
                      onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, isTakingAnticoagulant: e.target.checked }))}
                    />
                    <div className="small text-muted mt-1 ps-4">
                      {preAnalyticsForm.isTakingAnticoagulant ? (
                        <span className="text-warning-emphasis fw-semibold">⚠ Đang dùng kháng đông: Nguy cơ chảy máu sau chích</span>
                      ) : (
                        <span className="text-success fw-semibold">✓ Không ghi nhận thuốc can thiệp</span>
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Form Hoãn Lấy Máu & Dời Lịch */}
          <Card className="border-0 shadow-sm rounded-3 bg-white">
            <Card.Header className="bg-white py-2 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold small text-uppercase text-secondary">
                2. Kế Hoạch Hoãn Lấy Máu &amp; Dời Lịch Xét Nghiệm (Luật Khám Bệnh 2023)
              </span>
              <Badge bg="warning" text="dark">Hoãn Lấy Mẫu</Badge>
            </Card.Header>
            <Card.Body className="p-3">
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-dark">
                  Lý do y khoa hoãn lấy mẫu xét nghiệm: <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={preAnalyticsForm.rescheduleReason}
                  onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, rescheduleReason: e.target.value }))}
                  className="fw-semibold text-danger border-danger"
                >
                  <option value="Chưa nhịn ăn đủ 8-12 giờ (đã ăn sáng/uống sữa - nguy cơ sai lệch Glucose & Lipid máu)">
                    Chưa nhịn ăn đủ 8-12 giờ (đã ăn sáng/uống sữa - nguy cơ sai lệch Glucose &amp; Lipid máu)
                  </option>
                  <option value="Huyết áp quá cao (>180/110 mmHg - nguy cơ tai biến khi can thiệp lấy máu)">
                    Huyết áp dao động / Quá cao (&gt;180/110 mmHg - nguy cơ tai biến khi can thiệp)
                  </option>
                  <option value="Bệnh nhân đang có cơn sốt cao cấp tính / Mất nước nghiêm trọng">
                    Đang có cơn sốt cao cấp tính / Mất nước nghiêm trọng
                  </option>
                  <option value="Đang dùng thuốc chống đông máu liều cao (chưa có chỉ định ngưng)">
                    Đang dùng thuốc chống đông máu liều cao (chưa có chỉ định ngưng)
                  </option>
                  <option value="Bệnh nhân mệt mỏi, chóng mặt, yêu cầu dời ngày vì lý do sức khỏe cá nhân">
                    Bệnh nhân mệt mỏi, chóng mặt, yêu cầu dời ngày vì lý do sức khỏe cá nhân
                  </option>
                </Form.Select>
              </Form.Group>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Label className="small fw-semibold text-dark">Ngày hẹn lấy mẫu mới:</Form.Label>
                  <Form.Control
                    type="date"
                    value={preAnalyticsForm.newAppointmentDate}
                    onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, newAppointmentDate: e.target.value }))}
                  />
                </Col>
                <Col md={6}>
                  <Form.Label className="small fw-semibold text-dark">Khung giờ hẹn mới:</Form.Label>
                  <Form.Select
                    value={preAnalyticsForm.newSlotTime}
                    onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, newSlotTime: e.target.value }))}
                  >
                    <option value="07:00 - 08:30 (Khung giờ nhịn ăn vàng)">07:00 - 08:30 (Khung giờ nhịn ăn vàng)</option>
                    <option value="08:30 - 10:00 (Buổi sáng)">08:30 - 10:00 (Buổi sáng)</option>
                    <option value="13:30 - 15:00 (Buổi chiều)">13:30 - 15:00 (Buổi chiều)</option>
                  </Form.Select>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-dark">Dặn dò y khoa chuẩn bị cho lần lấy mẫu tới:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={preAnalyticsForm.doctorAdvice}
                  onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, doctorAdvice: e.target.value }))}
                />
              </Form.Group>

              <div className="p-2.5 rounded-3 bg-light border">
                <Form.Check
                  type="checkbox"
                  id="consent-check"
                  label={
                    <span className="small fw-semibold text-dark">
                      Bệnh nhân / Người đại diện hợp pháp đã được giải thích rõ lý do chuyên môn và đồng ý dời lịch xét nghiệm.
                    </span>
                  }
                  checked={preAnalyticsForm.patientConsent}
                  onChange={(e) => setPreAnalyticsForm(prev => ({ ...prev, patientConsent: e.target.checked }))}
                />
              </div>
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowPreAnalyticsModal(false)}>
            Hủy
          </Button>
          <Button
            as={Link}
            to={`/doctor/orders/create?appointmentId=${encodeURIComponent(currentServing?.appointmentId || '')}&patientId=${encodeURIComponent(currentServing?.patientId || '')}&patientName=${encodeURIComponent(currentServing?.patientName || '')}`}
            variant="outline-success"
            className="fw-semibold px-3"
            onClick={() => setShowPreAnalyticsModal(false)}
          >
            Đạt Tiêu Chuẩn &rarr; Chỉ Định Xét Nghiệm
          </Button>
          <Button
            variant="warning"
            onClick={handleRescheduleConfirm}
            disabled={actionLoading || !preAnalyticsForm.patientConsent}
            className="fw-bold px-3 text-dark shadow-sm"
          >
            {actionLoading ? 'Đang cập nhật...' : 'Xác Nhận Dời Lịch & Cấp Phiếu Hẹn'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Thẩm Định Kết Quả Xét Nghiệm & Tư Vấn Bệnh Nhân (Doctor Consultation Modal) */}
      <Modal show={showConsultationModal} onHide={() => setShowConsultationModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <Stethoscope style={{ color: "#1E60E6" }} size="1em" />
            <span>Thẩm Định Kết Quả Xét Nghiệm &amp; Tư Vấn Bệnh Nhân</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
          {/* Banner Bệnh Nhân & Đơn Xét Nghiệm */}
          <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
            <Row className="g-2">
              <Col sm={6}>
                <div className="small text-muted">Bệnh nhân hội chẩn:</div>
                <div className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                  <User style={{ color: "#1E60E6" }} size="1em" />
                  {consultationData?.patientName || "Bệnh nhân"}
                </div>
                <div className="small text-muted font-monospace">
                  Mã BN: {consultationData?.patientId || "PT-2026-004523"} · Đơn: {consultationData?.orderId || "ORD-261116-A01"}
                </div>
              </Col>
              <Col sm={6} className="text-sm-end">
                <div className="small text-muted">Xác nhận kỹ thuật Lab (không thay duyệt lâm sàng):</div>
                <div className="fw-bold text-success fs-6 d-flex align-items-center justify-content-sm-end gap-1">
                  <ShieldCheck size="1em" /> {consultationResult?.reviewedBy || consultationData?.technicianName || consultationData?.verifiedByName || 'KTV đã xác nhận kỹ thuật'}
                </div>
                <div className="small text-muted">Chờ bác sĩ duyệt để trả kết quả cho bệnh nhân</div>
              </Col>
            </Row>
          </div>

          {/* BẢNG KẾT QUẢ XÉT NGHIỆM THỰC TẾ TỪ CSDL */}
          <Card className="border-0 shadow-sm rounded-3 mb-3 bg-white">
            <Card.Header className="bg-white py-2.5 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
              <span className="fw-bold small text-uppercase text-dark">
                Bảng Kết Quả Xét Nghiệm Thực Tế ({consultationParams.length} chỉ số)
              </span>
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                {consultationResult?.deviceId || 'Dữ liệu đồng bộ từ Lab LIS'}
              </span>
            </Card.Header>
            <Card.Body className="p-0">
              {consultationLoading ? (
                <div className="text-center py-4 text-muted">
                  <Spinner animation="border" size="sm" className="me-2 text-primary" />
                  Đang tải kết quả xét nghiệm thực tế từ CSDL...
                </div>
              ) : consultationParams.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  Chưa tìm thấy chỉ số kết quả đo nào gắn với mẫu <strong>{consultationData?.specimenId || consultationData?.appointmentCode || '—'}</strong>.
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="align-middle mb-0 table-sm">
                    <thead className="table-light small text-uppercase text-secondary">
                      <tr>
                        <th className="ps-3 py-2">Thông Số Xét Nghiệm</th>
                        <th className="py-2 text-end" style={{ width: "120px" }}>Kết Quả Đo</th>
                        <th className="py-2">Đơn Vị</th>
                        <th className="py-2">Khoảng Tham Chiếu</th>
                        <th className="py-2 text-center" style={{ width: "140px" }}>Đánh Giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consultationParams.map((p, idx) => {
                        const fl = String(p.flag || 'Normal').toLowerCase();
                        const isCrit = fl === 'critical' || fl === 'panic' || fl === '3';
                        const isHigh = fl === 'high' || fl === '2';
                        const isLow = fl === 'low' || fl === '1';
                        return (
                          <tr
                            key={`${p.code}-${idx}`}
                            className={isCrit ? 'table-danger' : (isHigh || isLow ? 'table-warning' : undefined)}
                          >
                            <td className="ps-3">
                              <strong className="text-dark">{p.name}</strong>
                              <span className="badge bg-light text-secondary border font-monospace ms-2">{p.code}</span>
                            </td>
                            <td className={`text-end font-monospace fw-bold ${isCrit || isHigh || isLow ? 'text-danger' : 'text-dark'}`}>
                              {p.value}
                            </td>
                            <td className="small text-secondary">{p.unit}</td>
                            <td className="small text-muted font-monospace">{p.referenceRange}</td>
                            <td className="text-center">
                              {isCrit ? (
                                <Badge bg="danger">NGUY HIỂM</Badge>
                              ) : isHigh ? (
                                <Badge bg="warning" text="dark">&uarr; CAO (HIGH)</Badge>
                              ) : isLow ? (
                                <Badge bg="info" text="dark">&darr; THẤP (LOW)</Badge>
                              ) : (
                                <Badge bg="success-subtle" text="success" className="border">Bình thường</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Form Tư Vấn Lâm Sàng Khi Bác Sĩ Đồng Thuận Kết Quả */}
          <Card className="border-0 shadow-sm rounded-3 bg-white mb-3">
            <Card.Header className="bg-white py-2.5 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold small text-uppercase text-dark d-flex align-items-center gap-1.5">
                <Stethoscope style={{ color: "#1E60E6" }} size="1em" /> Tư Vấn Lâm Sàng, Chẩn Đoán &amp; Ký Số Trả Kết Quả Cho Người Bệnh
              </span>
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center gap-1 fw-semibold rounded-pill px-3"
                onClick={handleCallPatientConsultation}
              >
                <Megaphone size="1em" /> Phát Loa Mời Bệnh Nhân Vào Bàn Tư Vấn
              </Button>
            </Card.Header>

            <Card.Body className="p-3">
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Label className="small fw-semibold text-dark">Mã Bệnh ICD-10:</Form.Label>
                  <Form.Select
                    value={clinicalIcdCode}
                    onChange={(e) => setClinicalIcdCode(e.target.value)}
                    className="font-monospace fw-bold text-primary"
                  >
                    <option value="E11.9">E11.9 · Đái tháo đường typ 2</option>
                    <option value="E78.5">E78.5 · Rối loạn lipid máu (Tăng mỡ máu)</option>
                    <option value="I10">I10 · Tăng huyết áp nguyên phát</option>
                    <option value="Z00.0">Z00.0 · Khám sức khỏe bình thường</option>
                  </Form.Select>
                </Col>
                <Col md={8}>
                  <Form.Label className="small fw-semibold text-dark">Chẩn Đoán Xác Định Của Bác Sĩ:</Form.Label>
                  <Form.Control
                    value={clinicalDiagnosis}
                    onChange={(e) => setClinicalDiagnosis(e.target.value)}
                  />
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-dark">Kết Luận Chuyên Môn Của Bác Sĩ:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={clinicalConclusion}
                  onChange={(e) => setClinicalConclusion(e.target.value)}
                />
              </Form.Group>

              <Row className="g-3 mb-3">
                <Col md={8}>
                  <Form.Label className="small fw-semibold text-dark">Lời Dặn Điều Trị, Dinh Dưỡng &amp; Lối Sống:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={treatmentAdvice}
                    onChange={(e) => setTreatmentAdvice(e.target.value)}
                  />
                </Col>
                <Col md={4}>
                  <Form.Label className="small fw-semibold text-dark">Hẹn Tái Khám:</Form.Label>
                  <Form.Control
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="mb-2"
                  />
                  <Form.Label className="small fw-semibold text-dark">Email Nhận Kết Quả Của BN:</Form.Label>
                  <Form.Control
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                  />
                </Col>
              </Row>

              {isDeliverySuccess && (
                <Alert variant="success" className="py-2.5 mb-0 rounded-3 shadow-sm border-success">
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <div className="d-flex align-items-center gap-2">
                      <CheckCircle2 className="fs-4 text-success flex-shrink-0" size="1em" />
                      <div>
                        <strong>KẾT QUẢ ĐÃ ĐƯỢC KÝ SỐ &amp; PHÁT HÀNH THÀNH CÔNG:</strong>
                        <div className="small text-dark mt-0.5">
                          Đã gửi Email thông báo tới: <strong>{patientEmail}</strong> · Đã đồng bộ lên Cổng Tra Cứu Bệnh Nhân.
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="d-flex align-items-center gap-1 shadow-sm"
                      onClick={() => window.print()}
                    >
                      <LucidePrinter size="1em" /> In Phiếu Kết Quả Xét Nghiệm (PDF)
                    </Button>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer className="bg-light d-flex justify-content-between">
          <div>
            {!isDeliverySuccess && (
              <Button
                variant="outline-danger"
                className="d-flex align-items-center gap-1.5 fw-semibold"
                onClick={() => setShowReturnRerunModal(true)}
              >
                <Undo2 size="1em" /> Trả Về Lab Yêu Cầu Chạy Lại (Clinical Discordance)
              </Button>
            )}
          </div>

          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={() => setShowConsultationModal(false)}>
              Đóng
            </Button>
            <Button
              variant="success"
              onClick={handleApproveAndDeliverToPatient}
              disabled={actionLoading || !canDoctorApproveResults}
              title={
                isDeliverySuccess
                  ? 'Đã trả kết quả'
                  : (liveTestResults.length === 0 && !consultationResult)
                    ? 'Chưa có KQ Lab — Lab phải nhập trước'
                    : !clinicalIcdCode?.trim()
                      ? 'Nhập ICD-10'
                      : (clinicalConclusion?.trim()?.length || 0) < 10
                        ? 'Kết luận lâm sàng ≥ 10 ký tự'
                        : 'Ký duyệt và mở Cổng BN'
              }
              className="d-flex align-items-center gap-2 fw-bold text-white px-3 shadow-sm"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <FileSignature size="1em" />
              {savedConsultations[consultationData?.specimenId]
                ? 'Cập Nhật Kết Luận Lâm Sàng'
                : 'Lưu Kết Luận & Trả Kết Quả Cho Bệnh Nhân'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Modal Bác Sĩ Trả Kết Quả Về Lab Yêu Cầu Chạy Lại */}
      <Modal show={showReturnRerunModal} onHide={() => setShowReturnRerunModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
            <Undo2 size="1em" />
            <span>Bác Sĩ Trả Về Yêu Cầu Xét Nghiệm Lại</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3">
          <p className="small text-secondary mb-3">
            Bác sĩ nghi ngờ kết quả xét nghiệm bất tương thích với triệu chứng lâm sàng hoặc có sai lệch kỹ thuật:
          </p>
          <Form.Group className="mb-3">
            <Form.Label className="small fw-semibold text-dark">
              Lý do lâm sàng yêu cầu Lab phân tích lại: <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Ví dụ: Chỉ số Kali máu 6.8 mmol/L không tương xứng với điện tâm đồ bình thường, nghi ngờ vỡ hồng cầu in vitro..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" size="sm" onClick={() => setShowReturnRerunModal(false)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDoctorRequestRerun}
            disabled={!returnReason.trim()}
            className="fw-semibold px-3"
          >
            Xác Nhận Gửi Yêu Cầu Cho Lab
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Barcode Printer Modal */}
      <BarcodePrinterModal
        show={showBarcodeModal}
        onHide={() => setShowBarcodeModal(false)}
        patient={currentServing ? {
          id: currentServing.patientId || "PT-001",
          name: currentServing.patientName,
          gender: "Nam",
          age: 35
        } : null}
        orderCode={currentServing?.appointmentCode || "ORD-261116-A01"}
      />
    </div>
  );
}
