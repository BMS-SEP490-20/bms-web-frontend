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
  FaFileMedicalAlt
} from 'react-icons/fa';
import { receptionApi } from '../../reception/api/receptionApi';

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
    <div className="container-fluid py-4 px-lg-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Top Banner & Room Switcher */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded-3 shadow-sm border" style={{ borderColor: '#e2e8f0' }}>
        <div>
          <h3 className="fw-bold mb-1 d-flex align-items-center gap-2" style={{ color: '#0284c7' }}>
            <FaUserMd /> Bàn Khám Bác Sĩ & Điều Phối Bệnh Nhân
          </h3>
          <div className="small text-muted d-flex align-items-center gap-2">
            <span>Bác sĩ phụ trách: <strong>{currentUser?.fullName || currentUser?.name || 'BS. Nguyễn Minh'}</strong></span>
            <span>•</span>
            <span className="fw-semibold" style={{ color: '#059669' }}>Ca trực: Đang hoạt động</span>
          </div>
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
      </div>

      {/* Alerts */}
      {verifiedAlert && (
        <Alert
          variant="success"
          dismissible
          onClose={() => setVerifiedAlert(null)}
          className="d-flex align-items-center gap-3 shadow-sm mb-3 border border-success border-opacity-25"
        >
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
            <Card.Header className="text-white py-3 px-4 d-flex justify-content-between align-items-center" style={{ backgroundColor: '#0284c7' }}>
              <span className="fw-bold text-uppercase small tracking-wide">
                Bệnh Nhân Đang Khám / Lấy Mẫu
              </span>
              <Badge bg="light" text="dark" className="fw-bold px-3 py-1.5 rounded-pill">
                <FaDoorOpen className="me-1" /> {roomId}
              </Badge>
            </Card.Header>

            <Card.Body className="p-4 d-flex flex-column justify-content-between">
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
                      className="d-flex align-items-center gap-2 px-4 fw-bold shadow-sm ms-auto text-white"
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      onClick={() => setShowCompleteModal(true)}
                      disabled={actionLoading}
                    >
                      <FaCheckCircle /> Hoàn Tất Khám (F8)
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 my-auto">
                  <div className="display-1 text-muted opacity-25 mb-3">
                    <FaUserInjured />
                  </div>
                  <h4 className="fw-bold text-secondary mb-2">Phòng khám đang trống</h4>
                  <p className="text-muted small mb-4" style={{ maxWidth: '380px', margin: '0 auto' }}>
                    Hiện chưa có bệnh nhân nào trong phòng. Bác sĩ bấm nút &quot;Gọi Số Tiếp Theo&quot; để tiếp nhận bệnh nhân đã check-in từ hàng đợi.
                  </p>
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
            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: '#e2e8f0' }}>
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
                      <td colSpan={4} className="text-center py-5 text-muted">
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
    </div>
  );
}
