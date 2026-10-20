/**
 * @file PublicQueueBoardPage.jsx
 * @description UC28 – Fullscreen Smart Queue Public Kiosk Board.
 * Displays real-time public queue status for waiting hall, including currently called numbers,
 * active rooms, synthesized chime audio, and upcoming queue list.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import {
  FaHospital,
  FaClock,
  FaVolumeUp,
  FaExpand,
  FaCompress,
  FaDoorOpen,
  FaUserCheck,
  FaListOl
} from 'react-icons/fa';
import { receptionApi } from '../api/receptionApi';

export default function PublicQueueBoardPage() {
  const [queueData, setQueueData] = useState({
    waitingList: [],
    currentServing: null,
    waitingCount: 0,
    inProgressCount: 0,
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const lastCalledIdRef = useRef(null);

  // Digital clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio API Ding-Dong Chime
  const playChime = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // First tone (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      // Second tone (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.25);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.25);
      osc2.stop(ctx.currentTime + 0.85);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }, [audioEnabled]);

  // Vietnamese Voice Announcement
  const speakVoice = useCallback((patientName, queueNumber, room) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = `Xin mời bệnh nhân ${patientName}, số ${queueNumber}, vào ${room}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  }, [audioEnabled]);

  // Fetch queue from backend
  const fetchQueue = useCallback(async () => {
    try {
      const res = await receptionApi.getQueueStatus();
      if (res) {
        setQueueData(res);

        // Check if new patient was called
        if (res.currentServing && res.currentServing.appointmentId !== lastCalledIdRef.current) {
          lastCalledIdRef.current = res.currentServing.appointmentId;
          playChime();
          setTimeout(() => {
            speakVoice(
              res.currentServing.patientName,
              res.currentServing.queueNumberFormatted,
              res.currentServing.roomId || 'Phòng khám 101'
            );
          }, 600);
        }
      }
    } catch (err) {
      console.error('Queue fetch error:', err);
    }
  }, [playChime, speakVoice]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const current = queueData.currentServing;
  const waiting = queueData.waitingList || [];

  return (
    <div
      className="bms-kiosk-board text-white d-flex flex-column"
      style={{
        minHeight: '100vh',
        backgroundColor: '#0B132B',
        fontFamily: "'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Header Bar */}
      <div
        className="px-4 py-3 d-flex justify-content-between align-items-center border-bottom"
        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1C2541' }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="p-2 rounded-3 bg-primary text-white d-flex align-items-center justify-content-center"
            style={{ width: '48px', height: '48px' }}
          >
            <FaHospital className="fs-3" />
          </div>
          <div>
            <h4 className="fw-bold mb-0 text-white tracking-wide">
              BỆNH VIỆN & PHÒNG KHÁM ĐA KHOA QUỐC TẾ BMS
            </h4>
            <div className="small text-info text-uppercase fw-semibold">
              Hệ Thống Hàng Đợi Thông Minh (Smart Queue Kiosk)
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-4">
          {/* Clock Display */}
          <div className="text-end d-flex align-items-center gap-2">
            <FaClock className="text-warning fs-4" />
            <div>
              <div className="fs-4 fw-bold font-monospace text-warning leading-none">
                {currentTime.toLocaleTimeString('vi-VN')}
              </div>
              <div className="small text-white-50">
                {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Controls: Audio & Fullscreen */}
          <div className="d-flex gap-2">
            <Button
              variant={audioEnabled ? 'success' : 'outline-light'}
              size="sm"
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) playChime();
              }}
              title={audioEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt (Nhấp để bật)'}
            >
              <FaVolumeUp /> {audioEnabled ? 'Loa BẬT' : 'Bật Loa'}
            </Button>
            <Button variant="outline-light" size="sm" onClick={toggleFullscreen} title="Toàn màn hình">
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Board Body */}
      <Container fluid className="flex-grow-1 p-4">
        <Row className="g-4 h-100">
          {/* Left Column: Currently Serving Highlight */}
          <Col lg={7}>
            <Card
              className="h-100 border-0 rounded-4 shadow-lg overflow-hidden d-flex flex-column"
              style={{ backgroundColor: '#1C2541' }}
            >
              <div className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center">
                <span className="fw-bold text-uppercase fs-5 d-flex align-items-center gap-2">
                  <FaUserCheck /> ĐANG GỌI VÀO PHÒNG KHÁM
                </span>
                <span className="badge bg-warning text-dark fs-6 px-3 py-1.5 rounded-pill">
                  {current?.roomId || 'TẤT CẢ PHÒNG'}
                </span>
              </div>

              <Card.Body className="p-4 p-xl-5 d-flex flex-column justify-content-center text-center">
                {current ? (
                  <div>
                    <div className="text-info fw-bold text-uppercase fs-5 mb-2 letter-spacing-wide">
                      XIN MỜI SỐ THỨ TỰ
                    </div>
                    <div
                      className="fw-bold font-monospace text-warning mb-3"
                      style={{
                        fontSize: 'clamp(5rem, 12vw, 9rem)',
                        lineHeight: 1,
                        textShadow: '0 0 40px rgba(234, 179, 8, 0.4)',
                      }}
                    >
                      {current.queueNumberFormatted}
                    </div>

                    <div className="display-6 fw-bold text-white mb-4">
                      {current.patientName}
                    </div>

                    <div
                      className="d-inline-flex align-items-center gap-3 px-5 py-3 rounded-pill shadow-lg border"
                      style={{
                        backgroundColor: '#3A506B',
                        borderColor: '#5BC0BE',
                      }}
                    >
                      <FaDoorOpen className="text-info fs-2" />
                      <span className="fs-3 fw-bold text-white">
                        VÀO: {current.roomId || 'PHÒNG 101'}
                      </span>
                    </div>

                    <div className="mt-4 text-white-50 small">
                      Bác sĩ phụ trách: <strong>{current.doctorName || 'Bác sĩ chuyên khoa'}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="py-5">
                    <div className="display-1 text-white-50 opacity-25 mb-4">
                      <FaHospital />
                    </div>
                    <h2 className="fw-bold text-white mb-2">Đang chờ lượt gọi kế tiếp</h2>
                    <p className="text-white-50 fs-5 mb-0">
                      Bệnh nhân vui lòng chú ý lắng nghe loa và theo dõi số thứ tự trên màn hình.
                    </p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column: Upcoming Queue Waiting List */}
          <Col lg={5}>
            <Card
              className="h-100 border-0 rounded-4 shadow-lg overflow-hidden d-flex flex-column"
              style={{ backgroundColor: '#1C2541' }}
            >
              <div
                className="py-3 px-4 d-flex justify-content-between align-items-center border-bottom"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <span className="fw-bold text-uppercase fs-5 text-white d-flex align-items-center gap-2">
                  <FaListOl className="text-info" /> SỐ THỨ TỰ CHUẨN BỊ (ĐANG CHỜ)
                </span>
                <Badge bg="info" className="fs-6 px-3 py-1.5 rounded-pill text-dark">
                  {waiting.length} Người
                </Badge>
              </div>

              <Card.Body className="p-3 overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
                {waiting.length === 0 ? (
                  <div className="text-center py-5 text-white-50">
                    <div className="fs-1 mb-2">✨</div>
                    <div className="fs-5 fw-semibold">Hàng đợi trống</div>
                    <div className="small">Hiện không có số thứ tự nào đang chờ.</div>
                  </div>
                ) : (
                  waiting.map((item, index) => (
                    <div
                      key={item.appointmentId}
                      className="d-flex justify-content-between align-items-center p-3 mb-2 rounded-3 border"
                      style={{
                        backgroundColor: index === 0 ? 'rgba(91, 192, 190, 0.15)' : '#0B132B',
                        borderColor: index === 0 ? '#5BC0BE' : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                          style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: index === 0 ? '#5BC0BE' : 'rgba(255,255,255,0.1)',
                            color: index === 0 ? '#0B132B' : '#FFF',
                            fontSize: '14px',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <div className="fw-bold font-monospace fs-4 text-warning leading-none">
                            {item.queueNumberFormatted}
                          </div>
                          <div className="text-white-50 small mt-1">{item.patientName}</div>
                        </div>
                      </div>

                      <Badge
                        bg={index === 0 ? 'warning' : 'secondary'}
                        text={index === 0 ? 'dark' : 'white'}
                        className="px-3 py-2 fs-6 rounded-pill"
                      >
                        {index === 0 ? 'Chuẩn bị vào' : 'Đang chờ'}
                      </Badge>
                    </div>
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Bottom Ticker Notice */}
      <div
        className="px-4 py-2 border-top text-center text-white-50 small"
        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0B132B' }}
      >
        <span>🏥 Quý khách vui lòng giữ trật tự và theo dõi màn hình khi đến lượt. Mọi thắc mắc xin liên hệ Quầy tiếp đón hoặc Hotline: <strong>1900-8888</strong></span>
      </div>
    </div>
  );
}
