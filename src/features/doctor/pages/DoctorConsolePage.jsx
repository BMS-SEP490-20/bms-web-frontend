/**
 * @file DoctorConsolePage.jsx
 * @description UC28 – Doctor & Phlebotomist Clinic Console with Smart Queue.
 * Enables clinicians to call next patient (F2), recall (F3), skip (F4), and complete (F8),
 * with atomic concurrency, voice announcement, and real-time queue visibility.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  FaStepForward,
  FaCheckCircle,
  FaTimesCircle,
  FaUserInjured,
  FaClock,
  FaDoorOpen,
  FaVolumeUp,
  FaNotesMedical,
  FaRedo,
  FaKeyboard
} from 'react-icons/fa';
import { receptionApi } from '../../reception/api/receptionApi';

export default function DoctorConsolePage() {
  // Current user / doctor context from localStorage
  const [currentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [roomId, setRoomId] = useState('ROOM-101');
  const [doctorId] = useState(() => currentUser?.doctorId || currentUser?.id || 'DOC-001');

  // Queue state
  const [currentServing, setCurrentServing] = useState(null);
  const [waitingList, setWaitingList] = useState([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

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

  // Fetch queue data from API
  const fetchQueue = useCallback(async () => {
    try {
      const res = await receptionApi.getQueueStatus(roomId, doctorId);
      if (res) {
        setCurrentServing(res.currentServing || null);
        setWaitingList(res.waitingList || []);
        setWaitingCount(res.waitingCount || (res.waitingList ? res.waitingList.length : 0));
      }
    } catch (err) {
      console.error('Failed to fetch queue status:', err);
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

  // Call Next Patient
  const handleCallNext = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      const res = await receptionApi.callNextPatient(roomId, doctorId);
      if (res && res.data) {
        setCurrentServing(res.data);
        setMessage(res.message);
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
        setMessage(res.message);
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

  // Skip Patient (No-show)
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

  // Keyboard Shortcuts: F2 (Call next), F3 (Recall), F4 (Skip), F8 (Complete)
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
    <div className="container-fluid py-4 px-lg-4">
      {/* Top Banner & Room Switcher */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3 bg-white p-3 rounded-3 shadow-sm border">
        <div>
          <h3 className="fw-bold text-primary mb-1 d-flex align-items-center gap-2">
            <FaUserMd /> Bàn Khám & Điều Phối Bệnh Nhân (Clinic Console)
          </h3>
          <div className="small text-muted d-flex align-items-center gap-2">
            <span>Bác sĩ: <strong>{currentUser?.fullName || 'BS. Chuyên Khoa'}</strong></span>
            <span>•</span>
            <span className="text-success fw-semibold">Ca trực hôm nay: Đang hoạt động</span>
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
              style={{ width: '140px' }}
            >
              <option value="ROOM-101">Phòng 101</option>
              <option value="ROOM-102">Phòng 102</option>
              <option value="ROOM-103">Phòng 103</option>
              <option value="LAB-201">Lấy mẫu 201</option>
            </Form.Select>
          </div>

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={fetchQueue}
            title="Tải lại danh sách"
          >
            <FaRedo className={loading ? 'fa-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage(null)} className="py-2 mb-3 shadow-sm">
          {message}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="py-2 mb-3 shadow-sm">
          {errorMsg}
        </Alert>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="d-flex align-items-center gap-2 text-muted small mb-3">
        <FaKeyboard />
        <span>Phím tắt thao tác nhanh:</span>
        <Badge bg="light" text="dark" className="border">F2: Gọi số tiếp</Badge>
        <Badge bg="light" text="dark" className="border">F3: Gọi lại (tối đa 3 lần)</Badge>
        <Badge bg="light" text="dark" className="border">F4: Bỏ qua (No-show)</Badge>
        <Badge bg="light" text="dark" className="border">F8: Hoàn tất khám</Badge>
      </div>

      <Row className="g-4">
        {/* Left Column: Active Patient Console */}
        <Col lg={7}>
          <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
            <Card.Header className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
              <span className="fw-bold text-uppercase tracking-wider small">
                Bệnh Nhân Đang Khám / Lấy Mẫu
              </span>
              <Badge bg="light" text="primary" className="fw-bold px-3 py-1.5 rounded-pill">
                <FaDoorOpen className="me-1" /> {roomId}
              </Badge>
            </Card.Header>

            <Card.Body className="p-4 d-flex flex-column justify-content-between">
              {currentServing ? (
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <div className="text-secondary small fw-bold text-uppercase">Số Thứ Tự</div>
                      <div className="display-4 fw-bold text-primary font-monospace">
                        {currentServing.queueNumberFormatted}
                      </div>
                      <div className="small text-muted font-monospace mt-1">
                        Mã hẹn: {currentServing.appointmentCode}
                      </div>
                    </div>

                    {/* Consultation Stopwatch */}
                    <div className="text-end">
                      <div className="small text-secondary fw-semibold">Thời gian khám</div>
                      <div className="fs-3 fw-bold text-dark font-monospace d-flex align-items-center gap-1 justify-content-end">
                        <FaClock className="text-primary fs-5" />
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
                  <div className="p-3 bg-light rounded-3 mb-4 border">
                    <Row className="g-3">
                      <Col sm={6}>
                        <div className="small text-muted">Họ và tên bệnh nhân</div>
                        <div className="fw-bold fs-5 text-dark d-flex align-items-center gap-2">
                          <FaUserInjured className="text-primary" />
                          {currentServing.patientName}
                        </div>
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
                  <p className="text-muted small mb-4" style={{ maxWidth: '360px', margin: '0 auto' }}>
                    Hiện chưa có bệnh nhân nào trong phòng. Bấm &quot;Gọi Số Tiếp Theo&quot; để tiếp nhận bệnh nhân kế tiếp từ hàng đợi.
                  </p>
                </div>
              )}

              {/* Call Next Patient Big Button */}
              <div className="pt-3 border-top mt-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow"
                  onClick={handleCallNext}
                  disabled={actionLoading || waitingCount === 0}
                >
                  {actionLoading ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      <span>Đang kết nối hệ thống...</span>
                    </>
                  ) : (
                    <>
                      <FaBullhorn />
                      <span>GỌI SỐ TIẾP THEO (F2)</span>
                      {waitingCount > 0 && (
                        <Badge bg="light" text="primary" className="ms-2">
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
          <Card className="border-0 shadow-sm rounded-4 h-100 overflow-hidden">
            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold mb-0 text-dark">Hàng Đợi Chờ Khám</h5>
                <small className="text-muted">Đã Check-in và đang chờ gọi số</small>
              </div>
              <Badge bg="primary" className="fs-6 px-3 py-1.5 rounded-pill">
                {waitingCount} đang chờ
              </Badge>
            </Card.Header>

            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table hover className="align-middle mb-0">
                <thead className="table-light small text-uppercase text-muted sticky-top">
                  <tr>
                    <th className="px-3">STT</th>
                    <th>Bệnh Nhân</th>
                    <th>Thời Gian Đến</th>
                    <th className="text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-5 text-muted">
                        <div className="fs-3 mb-2">🎉</div>
                        <div className="fw-semibold">Hàng đợi đang rỗng</div>
                        <div className="small">Không có bệnh nhân nào đang chờ tại quầy.</div>
                      </td>
                    </tr>
                  ) : (
                    waitingList.map((item, idx) => {
                      const arrivalTime = item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                        : 'Vừa đến';
                      return (
                        <tr key={item.appointmentId}>
                          <td className="px-3">
                            <span className="fw-bold font-monospace text-primary fs-6">
                              {item.queueNumberFormatted}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{item.patientName}</div>
                            <div className="small text-muted">{item.appointmentCode}</div>
                          </td>
                          <td className="small text-muted">{arrivalTime}</td>
                          <td className="text-center">
                            <Badge bg="info" className="text-white">
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

      {/* Skip (No-Show) Modal */}
      <Modal show={showSkipModal} onHide={() => setShowSkipModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-danger">Bỏ Qua Lượt Khám (No-Show)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Bạn có chắc chắn muốn bỏ qua bệnh nhân <strong>{currentServing?.patientName}</strong> ({currentServing?.queueNumberFormatted})?
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
          <Button variant="danger" size="sm" onClick={handleSkipConfirm} disabled={actionLoading}>
            Xác nhận Bỏ Qua
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Complete Modal */}
      <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 fw-bold text-success">Hoàn Tất Lượt Khám / Lấy Mẫu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Xác nhận hoàn tất phiên khám cho bệnh nhân <strong>{currentServing?.patientName}</strong> ({currentServing?.queueNumberFormatted})?
          </p>
          <Form.Group>
            <Form.Label className="small fw-semibold text-secondary">Ghi chú lâm sàng / kết luận (nếu có):</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Nhập ghi chú hoặc dặn dò bệnh nhân..."
              value={completeNotes}
              onChange={(e) => setCompleteNotes(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowCompleteModal(false)}>
            Đóng
          </Button>
          <Button variant="success" size="sm" onClick={handleCompleteConfirm} disabled={actionLoading}>
            Xác nhận Hoàn Tất
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
