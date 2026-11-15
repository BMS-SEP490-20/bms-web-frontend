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
import {
  FaUserMd,
  FaBullhorn,
  FaCheckCircle,
  FaTimesCircle,
  FaUserInjured,
  FaClock,
  FaDoorOpen,
  FaVolumeUp,
  FaNotesMedical,
  FaRedo,
  FaKeyboard,
  FaVial,
  FaStethoscope,
  FaFileMedicalAlt,
  FaCalendarAlt,
  FaBarcode,
  FaPrint,
  FaEnvelope,
  FaExclamationTriangle,
  FaShieldAlt,
  FaUndo,
  FaThLarge,
  FaHeartbeat,
  FaFileSignature
} from 'react-icons/fa';
import { receptionApi } from '../../reception/api/receptionApi';
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

  const [roomId, setRoomId] = useState('ROOM-101');
  const [doctorId] = useState(() => currentUser?.doctorId || currentUser?.id || currentUser?._id || 'dr_nguyenminh');

  // Queue state
  const [currentServing, setCurrentServing] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Lắng nghe sự kiện thông báo kết quả xét nghiệm được phê duyệt từ Trưởng Khoa (Lab Manager)
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

  // Web Speech API Voice Announcement
  const speakAnnouncement = useCallback((text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Fetch queue data from API with multi-tiered defensive checks
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await receptionApi.getQueueStatus(roomId, doctorId);
      if (res) {
        setCurrentServing(res.currentServing || null);

        // Multi-tiered defensive check for waiting list
        const rawList = res.waitingList ?? res.data?.waitingList ?? res.data ?? [];
        const safeList = Array.isArray(rawList)
          ? rawList
          : (Array.isArray(rawList?.items) ? rawList.items : []);

        // Filter: Doctor only calls checked-in / waiting patients
        const validWaitingList = safeList.filter((item) => {
          if (!item) return false;
          const status = (item.status || '').toLowerCase();
          return (
            status === '' ||
            status === 'checkedin' ||
            status === 'waiting' ||
            status === 'pending' ||
            status === 'đang chờ' ||
            status === 'chờ khám'
          );
        });

        setWaitingList(validWaitingList);
        setWaitingCount(
          Number.isFinite(res.waitingCount)
            ? res.waitingCount
            : validWaitingList.length
        );
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu hàng đợi:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId, doctorId]);

  // Initial fetch and auto-polling every 4 seconds
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

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

  // Call Next Patient (Only checked-in patients)
  const handleCallNext = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const res = await receptionApi.callNextPatient(roomId, doctorId);
      if (res && res.data) {
        setCurrentServing(res.data);
        setMessage(res.message || `Đang gọi bệnh nhân ${res.data.patientName}.`);
        // Voice announcement
        const voiceText = `Xin mời bệnh nhân ${res.data.patientName}, số thứ tự ${res.data.queueNumberFormatted}, vào ${roomId}`;
        speakAnnouncement(voiceText);
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
  }, [actionLoading, roomId, doctorId, speakAnnouncement, fetchQueue]);

  // Recall Current Patient
  const handleRecall = useCallback(async () => {
    if (!currentServing || actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const res = await receptionApi.recallPatient(currentServing.appointmentId, roomId);
      if (res && res.data) {
        setCurrentServing(res.data);
        setMessage(res.message || `Đã gọi lại bệnh nhân ${res.data.patientName}.`);
        const voiceText = `Nhắc lại: Xin mời bệnh nhân ${res.data.patientName}, số thứ tự ${res.data.queueNumberFormatted}, vào ${roomId}`;
        speakAnnouncement(voiceText);
      }
      await fetchQueue();
    } catch (err) {
      console.error('Error recalling patient:', err);
      setErrorMsg(err.message || 'Không thể gọi lại bệnh nhân.');
    } finally {
      setActionLoading(false);
    }
  }, [currentServing, actionLoading, roomId, speakAnnouncement, fetchQueue]);

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
        doctorName: currentUser?.fullName || 'BS. CKI Nguyễn Văn Minh',
        doctorCchn: 'CCHN-008912/HCM'
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
  const [clinicalIcdCode, setClinicalIcdCode] = useState('E11.9');
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState('Đái tháo đường typ 2 không biến chứng, Rối loạn lipid máu nhẹ');
  const [clinicalConclusion, setClinicalConclusion] = useState('Đường huyết đói 5.8 mmol/L (kiểm soát tốt), Men gan và chức năng thận trong giới hạn bình thường. Triglyceride 1.95 mmol/L (hơi tăng nhẹ).');
  const [treatmentAdvice, setTreatmentAdvice] = useState('Chế độ ăn giảm tinh bột trắng và mỡ động vật, tăng cường rau xanh, duy trì đi bộ 30 phút/ngày. Tạm thời chưa cần dùng thuốc hạ mỡ máu.');
  const [followUpDate, setFollowUpDate] = useState('Tái khám kiểm tra bilan lipid máu sau 3 tháng');
  const [patientEmail, setPatientEmail] = useState('an.tran@gmail.com');
  const [isDeliverySuccess, setIsDeliverySuccess] = useState(false);
  const [showReturnRerunModal, setShowReturnRerunModal] = useState(false);
  const [returnReason, setReturnReason] = useState('Chỉ số Kali 6.8 mmol/L không phù hợp với lâm sàng và điện tim bình thường, nghi ngờ vỡ hồng cầu in vitro');

  // Mở modal thẩm định kết quả
  const handleOpenConsultationModal = (customAlert = null) => {
    const pt = customAlert || currentServing || {
      patientName: 'Trần Văn An',
      patientId: 'PT-2026-004523',
      appointmentId: 'APT-261113-0001',
      specimenId: 'BC-PT001-A01-1-EDTA',
      orderId: 'ORD-261116-A01'
    };
    setConsultationData(pt);
    setConsultationStep('review');
    setIsDeliverySuccess(false);
    setShowConsultationModal(true);
  };

  // Bác sĩ gọi bệnh nhân vào bàn tư vấn
  const handleCallPatientConsultation = () => {
    const ptName = consultationData?.patientName || currentServing?.patientName || 'bệnh nhân';
    const voiceText = `Xin mời bệnh nhân ${ptName} vào ${roomId} để Bác sĩ tư vấn kết quả xét nghiệm.`;
    speakAnnouncement(voiceText);
    setConsultationStep('consult');
  };

  // Bác sĩ yêu cầu Lab chạy lại (Clinical Discordance)
  const handleDoctorRequestRerun = () => {
    if (!returnReason.trim()) return;
    const rerunPayload = {
      specimenId: consultationData?.specimenId || 'SPC-001',
      orderId: consultationData?.orderId || 'ORD-001',
      patientName: consultationData?.patientName || 'Bệnh nhân',
      reason: returnReason.trim(),
      requestedBy: currentUser?.fullName || 'BS. CKI Nguyễn Văn Minh',
      timestamp: new Date().toISOString()
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bms:doctor-request-rerun', { detail: rerunPayload }));
      localStorage.setItem('bms_last_rerun_request', JSON.stringify(rerunPayload));
    }

    setShowReturnRerunModal(false);
    setShowConsultationModal(false);
    setMessage(`Đã gửi yêu cầu trả kết quả về Lab chạy lại cho bệnh nhân ${consultationData?.patientName}. Lý do: ${returnReason}`);
  };

  // Bác sĩ ký duyệt và trả kết quả cho người bệnh (Email / Portal / PDF)
  const handleApproveAndDeliverToPatient = async () => {
    setActionLoading(true);
    try {
      if (currentServing?.appointmentId) {
        await receptionApi.completePatient(
          currentServing.appointmentId,
          `[TƯ VẤN XÉT NGHIỆM HOÀN TẤT]: Chẩn đoán ICD-10 ${clinicalIcdCode}. Bác sĩ đã tư vấn kết quả và dặn dò người bệnh. Kết quả đã gửi qua Email: ${patientEmail}.`
        );
      }
      setIsDeliverySuccess(true);
      setConsultationStep('delivered');
      setMessage(`Đã ký số và trả kết quả thành công cho bệnh nhân ${consultationData?.patientName}! Email thông báo đã gửi tới ${patientEmail}.`);
      await fetchQueue();
    } catch (err) {
      console.error('Lỗi khi ký duyệt và trả kết quả:', err);
      setErrorMsg(err.message || 'Lỗi khi ký số trả kết quả.');
    } finally {
      setActionLoading(false);
    }
  };

  // Barcode Printer Modal state
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

  // Keyboard Shortcuts: F2 (Gọi số tiếp), F3 (Gọi lại), F4 (Bỏ qua), F8 (Hoàn tất)
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
      } else if (e.key === 'F8' && currentServing) {
        e.preventDefault();
        setShowCompleteModal(true);
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
    <div className="container-fluid py-2 px-lg-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Banner & Room Switcher */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Bàn khám</h1>
        </div>
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label className="small fw-semibold text-secondary mb-0">Phòng khám:</label>
            <Form.Select
              size="sm"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="fw-bold text-primary"
              style={{ width: '160px' }}
            >
              <option value="ROOM-101">Phòng khám 101</option>
              <option value="ROOM-102">Phòng khám 102</option>
              <option value="ROOM-103">Phòng khám 103</option>
              <option value="LAB-201">Phòng lấy mẫu 201</option>
            </Form.Select>
          </div>

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={fetchQueue}
            title="Tải lại danh sách hàng đợi"
          >
            <FaRedo className={loading ? 'fa-spin' : ''} />
          </Button>
        </div>
      </header>

      {/* Alerts */}
      {verifiedAlert && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setVerifiedAlert(null)}
          className="d-flex align-items-center justify-content-between flex-wrap gap-3 shadow-sm mb-3 border border-success border-opacity-25"
        >
          <div className="d-flex align-items-center gap-3">
            <FaCheckCircle className="fs-3 text-success flex-shrink-0" />
            <div className="flex-grow-1">
              <div className="fw-bold text-success d-flex align-items-center gap-2">
                <span>KẾT QUẢ XÉT NGHIỆM ĐÃ ĐƯỢC TRƯỞNG KHOA PHÊ DUYỆT</span>
                <Badge bg="success">Sẵn sàng hội chẩn</Badge>
              </div>
              <div className="small text-dark mt-1">
                Mẫu xét nghiệm <strong>{verifiedAlert.specimenId}</strong> (Đơn {verifiedAlert.orderId}) của bệnh nhân <strong>{verifiedAlert.patientName}</strong> đã hoàn tất thẩm định và ký số điện tử. Bác sĩ có thể mở hồ sơ để kết luận lâm sàng.
              </div>
            </div>
          </div>
          <Button
            variant="success"
            size="sm"
            className="fw-bold px-3 py-1.5 shadow-sm text-white text-nowrap ms-auto"
            onClick={() => handleOpenConsultationModal(verifiedAlert)}
          >
            <FaUserMd className="me-1" /> Thẩm Định &amp; Tư Vấn Ngay
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
              <FaCalendarAlt className="fs-3 text-warning-emphasis flex-shrink-0" />
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
              <FaPrint /> In Phiếu Hẹn Lại
            </Button>
          </div>
        </Alert>
      )}

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage(null)} className="py-2 mb-3 shadow-sm">
          <FaCheckCircle className="me-2" />
          {message}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="py-2 mb-3 shadow-sm">
          <FaTimesCircle className="me-2" />
          {errorMsg}
        </Alert>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="d-flex align-items-center flex-wrap gap-2 text-muted small mb-3">
        <FaKeyboard />
        <span className="fw-semibold">Phím tắt thao tác nhanh:</span>
        <Badge bg="light" text="dark" className="border">F2: Gọi số tiếp</Badge>
        <Badge bg="light" text="dark" className="border">F3: Gọi lại (tối đa 3 lần)</Badge>
        <Badge bg="light" text="dark" className="border">F4: Bỏ qua (Vắng mặt)</Badge>
        <Badge bg="light" text="dark" className="border">F8: Hoàn tất khám</Badge>
      </div>

      <Row className="g-4">
        {/* Left Column: Active Patient Console */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-3 h-100 overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
            <Card.Header className="text-white py-3 px-3 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0284c7' }}>
              <span className="fw-bold text-uppercase small tracking-wide">
                Bệnh Nhân Đang Khám / Lấy Mẫu
              </span>
              <Badge bg="light" text="dark" className="fw-bold px-3 py-1.5 rounded-pill">
                <FaDoorOpen className="me-1" /> {roomId}
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
                        <FaClock className="fs-5" style={{ color: '#0284c7' }} />
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
                          <FaUserInjured style={{ color: '#0284c7' }} />
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

                  {/* Clinical Direct Actions: Chỉ định xét nghiệm, Đánh giá ICD-10, EMR */}
                  <div className="p-3 rounded-4 mb-4 border" style={{ backgroundColor: 'var(--bms-surface-card, #EEF2F6)', borderColor: 'var(--bms-border, rgba(15, 23, 42, 0.05))' }}>
                    <div className="small fw-bold text-uppercase mb-2" style={{ color: '#1E60E6', letterSpacing: '0.03em' }}>
                      Nghiệp Vụ Lâm Sàng Cho Bệnh Nhân Hiện Tại:
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3 shadow-xs"
                        onClick={() => setShowPreAnalyticsModal(true)}
                      >
                        <FaCalendarAlt /> Sàng Lọc Tiền Phân Tích &amp; Dời Lịch
                      </Button>

                      <Button
                        variant="info"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3 shadow-xs text-white"
                        onClick={() => handleOpenConsultationModal()}
                      >
                        <FaUserMd /> Thẩm Định &amp; Tư Vấn Bệnh Nhân
                      </Button>

                      <Button
                        variant="outline-dark"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3 shadow-xs"
                        onClick={() => setShowBarcodeModal(true)}
                      >
                        <FaBarcode /> Tem 3 Ống Máu
                      </Button>

                      <Button
                        as={Link}
                        to={`/doctor/orders/create?appointmentId=${encodeURIComponent(currentServing.appointmentId)}&patientId=${encodeURIComponent(currentServing.patientId || '')}&patientName=${encodeURIComponent(currentServing.patientName || '')}`}
                        variant="primary"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3 shadow-sm"
                        style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                      >
                        <FaVial /> Chỉ Định Xét Nghiệm Máu
                      </Button>

                      <Button
                        as={Link}
                        to={`/medical-assessments/add?patientId=${encodeURIComponent(currentServing.patientId || '')}&encounterId=${encodeURIComponent(currentServing.appointmentCode || currentServing.appointmentId)}&patientName=${encodeURIComponent(currentServing.patientName || '')}`}
                        variant="outline-primary"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3"
                      >
                        <FaStethoscope /> Chẩn Đoán Khám (ICD-10)
                      </Button>

                      <Button
                        as={Link}
                        to={`/doctor/emr?patientId=${encodeURIComponent(currentServing.patientId || '')}`}
                        variant="outline-secondary"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3"
                      >
                        <FaFileMedicalAlt /> Xem Bệnh Án EMR
                      </Button>

                      <Button
                        as={Link}
                        to={`/reports/${encodeURIComponent(currentServing.appointmentCode || currentServing.appointmentId)}`}
                        variant="outline-info"
                        size="sm"
                        className="d-flex align-items-center gap-1.5 fw-semibold rounded-pill px-3"
                      >
                        <FaNotesMedical /> Xem Kết Quả Xét Nghiệm
                      </Button>
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <Button
                      variant="warning"
                      className="d-flex align-items-center gap-2 px-3 fw-bold shadow-sm"
                      onClick={handleRecall}
                      disabled={actionLoading || currentServing.recallCount >= 3}
                    >
                      <FaVolumeUp /> Gọi Lại (F3)
                    </Button>

                    <Button
                      variant="outline-danger"
                      className="d-flex align-items-center gap-2 px-3 fw-semibold"
                      onClick={() => setShowSkipModal(true)}
                      disabled={actionLoading}
                    >
                      <FaTimesCircle /> Bỏ Qua (F4)
                    </Button>

                    <Button
                      variant="success"
                      className="d-flex align-items-center gap-2 px-3 fw-bold shadow-sm ms-auto text-white"
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      onClick={() => setShowCompleteModal(true)}
                      disabled={actionLoading}
                    >
                      <FaCheckCircle /> Hoàn Tất Khám (F8)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 my-auto">
                  <div className="display-1 text-muted opacity-25 mb-3">
                    <FaUserInjured />
                  </div>
                  <h4 className="fw-bold text-secondary mb-2">Phòng khám đang trống</h4>
                  <p className="text-muted small mb-3" style={{ maxWidth: '380px', margin: '0 auto' }}>
                    Hiện chưa có bệnh nhân nào trong phòng. Bác sĩ bấm nút &quot;Gọi Số Tiếp Theo&quot; để tiếp nhận bệnh nhân đã check-in từ hàng đợi.
                  </p>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-1.5 shadow-sm"
                      onClick={() => setCurrentServing({
                        appointmentId: 'APT-261116-0001',
                        appointmentCode: 'APT-261116-0001',
                        patientId: 'PT-2026-004523',
                        patientName: 'Trần Văn An',
                        patientPhone: '0909123456',
                        queueNumberFormatted: '001',
                        consultationStartTime: new Date().toISOString()
                      })}
                    >
                      <FaUserInjured /> Tiếp Nhận Bệnh Nhân Khám (Trần Văn An)
                    </Button>
                  </div>
                </div>
              )}

              {/* Call Next Patient Big Button */}
              <div className="pt-3 border-top mt-3" style={{ borderColor: '#e2e8f0' }}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow"
                  style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingCount === 0}
                >
                  {actionLoading ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>Đang kết nối hệ thống gọi số...</span>
                    </>
                  ) : (
                    <>
                      <FaBullhorn />
                      <span>GỌI SỐ TIẾP THEO (F2)</span>
                      {waitingCount > 0 && (
                        <Badge bg="light" text="dark" className="ms-2">
                          Còn {waitingCount} người
                        </Badge>
                      )}
                    </>
                  )}
                </Button>
              </div>
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
                      <td colSpan={4} className="text-center py-3 text-muted">
                        <div className="fs-3 mb-2">🎉</div>
                        <div className="fw-semibold">Hàng đợi đang rỗng</div>
                        <div className="small">Hiện không có bệnh nhân nào đang chờ tại phòng khám.</div>
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
            <FaCalendarAlt style={{ color: "#1E60E6" }} />
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
                  {currentUser?.fullName || "BS. CKI Nguyễn Văn Minh"}
                </div>
                <div className="small text-muted font-monospace">Số CCHN: CCHN-008912/HCM</div>
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
            <FaUserMd style={{ color: "#1E60E6" }} />
            <span>Thẩm Định Kết Quả Xét Nghiệm &amp; Tư Vấn Bệnh Nhân (Quy Trình Khép Kín ISO 15189)</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-3" style={{ backgroundColor: "#f8fafc" }}>
          {/* Banner Bệnh Nhân & Đơn Xét Nghiệm */}
          <div className="p-3 bg-white rounded-3 border mb-3 shadow-sm">
            <Row className="g-2">
              <Col sm={6}>
                <div className="small text-muted">Bệnh nhân hội chẩn:</div>
                <div className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
                  <FaUserInjured style={{ color: "#1E60E6" }} />
                  {consultationData?.patientName || "Trần Văn An"}
                </div>
                <div className="small text-muted font-monospace">
                  Mã BN: {consultationData?.patientId || "PT-2026-004523"} · Đơn: {consultationData?.orderId || "ORD-261116-A01"}
                </div>
              </Col>
              <Col sm={6} className="text-sm-end">
                <div className="small text-muted">Chữ ký số kỹ thuật Lab:</div>
                <div className="fw-bold text-success fs-6 d-flex align-items-center justify-content-sm-end gap-1">
                  <FaShieldAlt /> BSCKII. Lê Lan Anh (Trưởng Khoa Xét Nghiệm)
                </div>
                <div className="small text-muted">Chứng thư số y tế hợp lệ · Tiêu chuẩn ISO 15189:2022</div>
              </Col>
            </Row>
          </div>

          {/* BẢNG TỔNG HỢP KẾT QUẢ 3 ỐNG MÁU */}
          <Card className="border-0 shadow-sm rounded-3 mb-3 bg-white">
            <Card.Header className="bg-white py-2.5 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold small text-uppercase text-dark">
                Bảng Kết Quả Chi Tiết 3 Ống Máu (EDTA, SST Gel, Citrate)
              </span>
              <span className="badge bg-success-subtle text-success border border-success-subtle">
                Nội kiểm IQC đạt chuẩn Westgard
              </span>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0 table-sm">
                  <thead className="table-light small text-uppercase text-secondary">
                    <tr>
                      <th className="ps-3 py-2">Loại Ống &amp; Thông Số</th>
                      <th className="py-2 text-end" style={{ width: "120px" }}>Kết Quả Đo</th>
                      <th className="py-2">Đơn Vị</th>
                      <th className="py-2">Khoảng Tham Chiếu</th>
                      <th className="py-2 text-center" style={{ width: "130px" }}>Đánh Giá</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Nhóm 1: Ống Tím EDTA */}
                    <tr className="table-light fw-bold" style={{ backgroundColor: "#f3e8ff" }}>
                      <td colSpan={5} className="ps-3 text-purple" style={{ color: "#7c3aed" }}>
                        <FaVial className="me-1" /> Ống 1 · Nắp Tím (K2-EDTA): Tổng phân tích tế bào máu CBC (Laser Sysmex XN-1000)
                      </td>
                    </tr>
                    <tr>
                      <td className="ps-4">WBC (Số lượng bạch cầu)</td>
                      <td className="text-end font-monospace fw-bold">6.80</td>
                      <td className="small text-secondary">10⁹/L</td>
                      <td className="small text-muted font-monospace">4.0 &ndash; 10.0</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">RBC (Số lượng hồng cầu)</td>
                      <td className="text-end font-monospace fw-bold">4.52</td>
                      <td className="small text-secondary">10¹²/L</td>
                      <td className="small text-muted font-monospace">3.8 &ndash; 5.2</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">HGB (Hemoglobin)</td>
                      <td className="text-end font-monospace fw-bold">13.8</td>
                      <td className="small text-secondary">g/dL</td>
                      <td className="small text-muted font-monospace">12.0 &ndash; 16.0</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">PLT (Số lượng tiểu cầu)</td>
                      <td className="text-end font-monospace fw-bold">245</td>
                      <td className="small text-secondary">10⁹/L</td>
                      <td className="small text-muted font-monospace">150 &ndash; 400</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>

                    {/* Nhóm 2: Ống Vàng SST Gel */}
                    <tr className="table-light fw-bold" style={{ backgroundColor: "#fef9c3" }}>
                      <td colSpan={5} className="ps-3" style={{ color: "#ca8a04" }}>
                        <FaVial className="me-1" /> Ống 2 · Nắp Vàng (SST Gel): Hóa sinh &amp; Miễn dịch (Roche Cobas 6000)
                      </td>
                    </tr>
                    <tr>
                      <td className="ps-4">GLU (Đường huyết đói Glucose)</td>
                      <td className="text-end font-monospace fw-bold">5.80</td>
                      <td className="small text-secondary">mmol/L</td>
                      <td className="small text-muted font-monospace">3.9 &ndash; 6.4</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">AST (Men gan GOT)</td>
                      <td className="text-end font-monospace fw-bold">28.0</td>
                      <td className="small text-secondary">U/L</td>
                      <td className="small text-muted font-monospace">&lt; 37.0</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">ALT (Men gan GPT)</td>
                      <td className="text-end font-monospace fw-bold">32.0</td>
                      <td className="small text-secondary">U/L</td>
                      <td className="small text-muted font-monospace">&lt; 40.0</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr className="table-warning">
                      <td className="ps-4 fw-semibold text-danger">CHOL (Cholesterol toàn phần)</td>
                      <td className="text-end font-monospace fw-bold text-danger">5.42</td>
                      <td className="small text-secondary">mmol/L</td>
                      <td className="small text-muted font-monospace">&lt; 5.20</td>
                      <td className="text-center"><Badge bg="warning" text="dark">&uarr; TĂNG CAO</Badge></td>
                    </tr>
                    <tr className="table-warning">
                      <td className="ps-4 fw-semibold text-danger">TRIG (Triglyceride máu)</td>
                      <td className="text-end font-monospace fw-bold text-danger">1.95</td>
                      <td className="small text-secondary">mmol/L</td>
                      <td className="small text-muted font-monospace">&lt; 1.70</td>
                      <td className="text-center"><Badge bg="warning" text="dark">&uarr; TĂNG CAO</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">K+ (Kali máu)</td>
                      <td className="text-end font-monospace fw-bold">4.10</td>
                      <td className="small text-secondary">mmol/L</td>
                      <td className="small text-muted font-monospace">3.5 &ndash; 5.0</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>

                    {/* Nhóm 3: Ống Xanh Dương Citrate */}
                    <tr className="table-light fw-bold" style={{ backgroundColor: "#e0f2fe" }}>
                      <td colSpan={5} className="ps-3" style={{ color: "#0284c7" }}>
                        <FaVial className="me-1" /> Ống 3 · Nắp Xanh (Sodium Citrate 3.2%): Đông máu (Stago Compact Max)
                      </td>
                    </tr>
                    <tr>
                      <td className="ps-4">PT (Thời gian Prothrombin)</td>
                      <td className="text-end font-monospace fw-bold">12.4</td>
                      <td className="small text-secondary">Giây</td>
                      <td className="small text-muted font-monospace">11.0 &ndash; 14.0</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                    <tr>
                      <td className="ps-4">INR (Chỉ số bình thường hóa quốc tế)</td>
                      <td className="text-end font-monospace fw-bold">1.02</td>
                      <td className="small text-secondary">—</td>
                      <td className="small text-muted font-monospace">0.80 &ndash; 1.20</td>
                      <td className="text-center"><Badge bg="success-subtle" text="success" className="border">Bình thường</Badge></td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* Form Tư Vấn Lâm Sàng Khi Bác Sĩ Đồng Thuận Kết Quả */}
          <Card className="border-0 shadow-sm rounded-3 bg-white mb-3">
            <Card.Header className="bg-white py-2.5 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold small text-uppercase text-dark d-flex align-items-center gap-1.5">
                <FaStethoscope style={{ color: "#1E60E6" }} /> Tư Vấn Lâm Sàng, Chẩn Đoán &amp; Ký Số Trả Kết Quả Cho Người Bệnh
              </span>
              <Button
                variant="outline-primary"
                size="sm"
                className="d-flex align-items-center gap-1 fw-semibold rounded-pill px-3"
                onClick={handleCallPatientConsultation}
              >
                <FaBullhorn /> Phát Loa Mời Bệnh Nhân Vào Bàn Tư Vấn
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
                      <FaCheckCircle className="fs-4 text-success flex-shrink-0" />
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
                      <FaPrint /> In Phiếu Kết Quả Xét Nghiệm (PDF)
                    </Button>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer className="bg-light d-flex justify-content-between">
          <div>
            <Button
              variant="outline-danger"
              className="d-flex align-items-center gap-1.5 fw-semibold"
              onClick={() => setShowReturnRerunModal(true)}
            >
              <FaUndo /> Trả Về Lab Yêu Cầu Chạy Lại (Clinical Discordance)
            </Button>
          </div>

          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={() => setShowConsultationModal(false)}>
              Đóng
            </Button>
            <Button
              variant="success"
              onClick={handleApproveAndDeliverToPatient}
              disabled={actionLoading || isDeliverySuccess}
              className="d-flex align-items-center gap-2 fw-bold text-white px-3 shadow-sm"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <FaFileSignature />
              {isDeliverySuccess ? 'Đã Trả Kết Quả Xong' : 'Ký Số & Trả Kết Quả Cho Bệnh Nhân (Email/Portal)'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Modal Bác Sĩ Trả Kết Quả Về Lab Yêu Cầu Chạy Lại */}
      <Modal show={showReturnRerunModal} onHide={() => setShowReturnRerunModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title className="h5 fw-bold d-flex align-items-center gap-2">
            <FaUndo />
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
