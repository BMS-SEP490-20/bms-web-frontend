/**
 * @file EnterTestResultsPage.jsx
 * @description Nhập kết quả đo máy xét nghiệm tự động & kiểm soát cờ báo động nguy hiểm CRITICAL (UC46).
 * Đánh giá giá trị báo động đỏ (Critical / Panic Values) theo tiêu chuẩn ISO 15189:2022:
 *  - Kali máu (K+): Critical khi K < 2.5 hoặc K > 6.5 mmol/L
 *  - Natri máu (Na+): Critical khi Na < 120 hoặc Na > 160 mmol/L
 * Kích hoạt âm thanh còi Web Audio 880Hz, đồng hồ đếm ngược 15 phút và form ghi log cuộc gọi cấp cứu bắt buộc.
 * Tuân thủ: Clean Medical Standard (Rule 19) & AGENTS-CODE.md.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Badge,
  Alert,
  Form,
  Spinner,
  InputGroup
} from 'react-bootstrap';
import {
  FaFlask,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPhoneAlt,
  FaVial,
  FaMicroscope,
  FaClock,
  FaUserMd,
  FaSave,
  FaSearch,
  FaLock,
  FaBell,
  FaVolumeUp,
  FaStopwatch,
  FaHospital
} from 'react-icons/fa';
import { resultApi } from '../api/resultApi';
import api from '../../../config/api';

const DEFAULT_PARAMS = [
  { code: 'WBC', name: 'WBC · Số lượng bạch cầu', value: 0, unit: '10⁹/L', refLow: 4.0, refHigh: 10.0, criticalLow: 1.5, criticalHigh: 30.0 },
  { code: 'RBC', name: 'RBC · Số lượng hồng cầu', value: 0, unit: '10¹²/L', refLow: 3.8, refHigh: 5.2, criticalLow: 2.0, criticalHigh: 7.0 },
  { code: 'HGB', name: 'HGB · Nồng độ Hemoglobin', value: 0, unit: 'g/dL', refLow: 12.0, refHigh: 16.0, criticalLow: 7.0, criticalHigh: 20.0 },
  { code: 'HCT', name: 'HCT · Dung tích hồng cầu (Hematocrit)', value: 0, unit: '%', refLow: 36.0, refHigh: 46.0, criticalLow: 20.0, criticalHigh: 60.0 },
  { code: 'MCV', name: 'MCV · Thể tích trung bình hồng cầu', value: 0, unit: 'fL', refLow: 80.0, refHigh: 100.0, criticalLow: 60.0, criticalHigh: 120.0 },
  { code: 'PLT', name: 'PLT · Số lượng tiểu cầu', value: 0, unit: '10⁹/L', refLow: 150, refHigh: 400, criticalLow: 20, criticalHigh: 1000 },
  { code: 'GLU', name: 'GLU · Đường huyết đói (Glucose)', value: 0, unit: 'mmol/L', refLow: 3.9, refHigh: 6.4, criticalLow: 2.2, criticalHigh: 25.0 },
  { code: 'K', name: 'K⁺ · Kali máu (Potassium)', value: 0, unit: 'mmol/L', refLow: 3.5, refHigh: 5.0, criticalLow: 2.5, criticalHigh: 6.5 },
  { code: 'NA', name: 'Na⁺ · Natri máu (Sodium)', value: 0, unit: 'mmol/L', refLow: 135.0, refHigh: 145.0, criticalLow: 120.0, criticalHigh: 160.0 }
];

function evaluateMedicalFlag(code, value, p) {
  if (value === 0 || value === '' || Number.isNaN(Number(value))) return 'NORMAL';
  const num = Number(value);

  // Critical / Panic thresholds (ISO 15189:2022)
  if (p.criticalLow != null && num <= p.criticalLow) return 'CRITICAL';
  if (p.criticalHigh != null && num >= p.criticalHigh) return 'CRITICAL';

  // Reference range thresholds
  if (p.refLow != null && num < p.refLow) return 'LOW';
  if (p.refHigh != null && num > p.refHigh) return 'HIGH';

  return 'NORMAL';
}

function playWebAudioAlert880Hz() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playPulse = (startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, startTime); // Còi cảnh báo chuẩn ISO 880Hz

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playPulse(now, 0.22);
    playPulse(now + 0.32, 0.22);
    playPulse(now + 0.64, 0.35);
  } catch (err) {
    console.warn('Web Audio alarm playback warning:', err);
  }
}

export function EnterTestResultsPage() {
  const [sampleId, setSampleId] = useState('');
  const [batchId, setBatchId] = useState('BAT-20261104-01');
  const [device, setDevice] = useState('Sysmex XN-1000 (Huyết học tự động)');
  const [params, setParams] = useState(DEFAULT_PARAMS.map(p => ({ ...p })));
  const [notes, setNotes] = useState('Kết quả đo ổn định, không có cảnh báo quang học từ thiết bị.');
  const [entrySource, setEntrySource] = useState('device');

  // RÀNG BUỘC NGHIỆP VỤ: Xác nhận Báo động Bác sĩ điều trị khi có cờ CRITICAL
  const [confirmRerun, setConfirmRerun] = useState(false);
  const [doctorNotified, setDoctorNotified] = useState(false);
  const [doctorName, setDoctorName] = useState('BS. Trực Nguyễn Văn Hùng');
  const [doctorPhone, setDoctorPhone] = useState('0912.345.678 (Máy nhánh 105)');
  const [doctorDepartment, setDoctorDepartment] = useState('Khoa Cấp Cứu / Hồi Sức Tích Cực (ICU)');
  const [notificationChannel, setNotificationChannel] = useState('Điện thoại nội bộ khoa cấp cứu');
  const [notificationTime, setNotificationTime] = useState(() => new Date().toLocaleTimeString('vi-VN'));
  const [callLogNotes, setCallLogNotes] = useState('Bác sĩ đã xác nhận tiếp nhận thông số nguy hiểm, chỉ định xử trí hạ kali/điện giải khẩn cấp.');

  // Đồng hồ đếm ngược 15 phút cảnh báo khẩn cấp (ISO 15189 Turnaround Time)
  const [countdownSeconds, setCountdownSeconds] = useState(900); // 15 phút = 900 giây
  const [timerRunning, setTimerRunning] = useState(false);

  // Feedback states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [sampleDetails, setSampleDetails] = useState(null);

  // Danh sách kiểm soát chất lượng
  const [checks, setChecks] = useState({
    allRequired: true,
    unitsOk: true,
    qcOk: true,
    reviewedAbnormal: true
  });

  // Tự động đánh giá cờ cho từng chỉ số
  const flags = useMemo(() => {
    const list = Array.isArray(params) ? params : [];
    return list.map((p) => {
      const val = Number(p.value);
      const flag = evaluateMedicalFlag(p.code, val, p);
      return {
        ...p,
        flag: val !== 0 ? flag : 'NORMAL'
      };
    });
  }, [params]);

  const criticalAnalytes = useMemo(() => {
    return (Array.isArray(flags) ? flags : []).filter((p) => p.flag === 'CRITICAL' && p.value !== 0);
  }, [flags]);

  const hasCritical = useMemo(() => {
    return criticalAnalytes.length > 0;
  }, [criticalAnalytes]);

  const abnormalAnalytes = useMemo(() => {
    return (Array.isArray(flags) ? flags : []).filter((p) => (p.flag === 'LOW' || p.flag === 'HIGH' || p.flag === 'CRITICAL') && p.value !== 0);
  }, [flags]);

  // Kích hoạt còi Web Audio 880Hz và quản lý đồng hồ đếm ngược 15 phút
  const prevCriticalRef = useRef(false);

  useEffect(() => {
    if (hasCritical && !prevCriticalRef.current) {
      playWebAudioAlert880Hz();
      setCountdownSeconds(900);
      setNotificationTime(new Date().toLocaleTimeString('vi-VN'));
    }
    prevCriticalRef.current = hasCritical;
  }, [hasCritical]);

  useEffect(() => {
    if (hasCritical && !doctorNotified) {
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
    }
  }, [hasCritical, doctorNotified]);

  useEffect(() => {
    let interval = null;
    if (timerRunning && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((sec) => Math.max(0, sec - 1));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, countdownSeconds]);

  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const setValue = (idx, val) => {
    setParams((prev) =>
      (Array.isArray(prev) ? prev : []).map((p, i) => (i === idx ? { ...p, value: val } : p))
    );
  };

  // Tra cứu thông tin mẫu khi nhập mã Barcode
  const handleLookupSample = async () => {
    const target = sampleId.trim();
    if (!target) return;
    try {
      const res = await api.get(`/laboratory/samples/${encodeURIComponent(target)}`);
      if (res.data?.data) {
        setSampleDetails(res.data.data);
      }
    } catch {
      setSampleDetails(null);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!sampleId.trim()) {
      setError('Vui lòng quét hoặc nhập Mã Barcode ống mẫu bệnh phẩm.');
      return;
    }

    // RÀNG BUỘC NGHIỆP VỤ BẮT BUỘC: Nếu có cờ CRITICAL, BẮT BUỘC xác nhận đã thông báo cho Bác sĩ điều trị
    if (hasCritical && (!doctorNotified || !doctorName.trim() || !confirmRerun)) {
      setError('RÀNG BUỘC BẮT BUỘC (ISO 15189): Phát hiện chỉ số ở ngưỡng BÁO ĐỘNG NGUY HIỂM (CRITICAL). Kỹ thuật viên bắt buộc phải kiểm tra màng ống, chạy kiểm chứng lần 2 và ghi log thông báo trực tiếp cho Bác sĩ điều trị!');
      return;
    }

    const validParams = (Array.isArray(params) ? params : []).filter((p) => p.value !== 0 && p.value !== '');
    if (validParams.length === 0) {
      setError('Vui lòng nhập ít nhất một kết quả đo chỉ số xét nghiệm.');
      return;
    }

    setLoading(true);
    try {
      const res = await resultApi.enter({
        sampleId: sampleId.trim(),
        packageId: batchId || 'BAT-DEFAULT',
        equipmentCode: device,
        parameters: validParams,
        notes: `${notes}${hasCritical ? ` [ĐÃ BÁO ĐỘNG ĐỎ CRITICAL: BS ${doctorName} (${doctorDepartment}) qua ${notificationChannel} lúc ${notificationTime}. Phản hồi BS: ${callLogNotes}]` : ''}`,
        isPanic: hasCritical,
        criticalNotified: doctorNotified,
        doctorNotifiedName: doctorName,
        notifiedAt: new Date().toISOString(),
        reviewedBy: 'KTV. Lê Minh Tuấn'
      });

      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi kết quả xét nghiệm lên hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  const getFlagBadge = (flag, value) => {
    if (value === 0 || value === '') return <span className="text-muted">—</span>;
    switch (flag) {
      case 'CRITICAL':
        return <Badge bg="danger" className="px-2 py-1 fw-bold"><FaExclamationTriangle className="me-1" />NGUY HIỂM (CRITICAL)</Badge>;
      case 'HIGH':
        return <Badge bg="warning" text="dark" className="px-2 py-1 fw-bold">&uarr; VƯỢT CAO</Badge>;
      case 'LOW':
        return <Badge bg="info" text="dark" className="px-2 py-1 fw-bold">&darr; DƯỚI THẤP</Badge>;
      default:
        return <Badge bg="success-subtle" text="success" className="border border-success-subtle px-2 py-1">Bình thường</Badge>;
    }
  };

  return (
    <Container fluid className="py-2 px-md-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Tiêu đề trang chuẩn y khoa ISO 15189 */}
      <header className="bms-page-header">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">Nhập kết quả</h1>
        </div>
      </header>

      <div style={{ maxWidth: 1250 }} className="mx-auto">
        {/* Card thiết lập lượt chạy máy */}
        <Card className="border-0 shadow-sm mb-4 bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
          <Card.Body className="p-2">
            <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
              <FaFlask style={{ color: '#1E60E6' }} />
              <span>Thông Tin Mẻ Phân Tích &amp; Thiết Bị Đo</span>
            </h6>
            <Row className="g-3">
              <Col md={4}>
                <Form.Label className="small fw-semibold text-secondary">Mã Mẻ / Lượt Chạy (Batch Code)</Form.Label>
                <Form.Control
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="VD: BAT-20261104-01"
                />
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-semibold text-secondary">Máy Phân Tích Tự Động (Instrument)</Form.Label>
                <Form.Select value={device} onChange={(e) => setDevice(e.target.value)}>
                  <option value="Roche Cobas 6000 (Hóa sinh - Điện giải tự động)">Roche Cobas 6000 (Hóa sinh - Điện giải tự động)</option>
                  <option value="Sysmex XN-1000 (Huyết học tự động)">Sysmex XN-1000 (Huyết học tự động)</option>
                  <option value="Abbott Architect i2000SR (Miễn dịch)">Abbott Architect i2000SR (Miễn dịch)</option>
                </Form.Select>
              </Col>
              <Col md={4}>
                <Form.Label className="small fw-semibold text-secondary">
                  Mã Barcode Ống Mẫu <span className="text-danger">*</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    required
                    value={sampleId}
                    onChange={(e) => setSampleId(e.target.value)}
                    onBlur={handleLookupSample}
                    placeholder="Quét Barcode hoặc nhập mã SMP-..."
                  />
                  <Button variant="outline-primary" type="button" onClick={handleLookupSample}>
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Thông báo Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="rounded-3 shadow-sm">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}
        {result && (
          <Alert variant={result.isPanic ? 'warning' : 'success'} className="rounded-3 shadow-sm">
            <FaCheckCircle className="me-2" />
            <strong>{result.resultId || 'Thành công'}</strong> &mdash; {result.message}
          </Alert>
        )}

        {/* Banner đếm ngược 15 phút nếu có chỉ số CRITICAL */}
        {hasCritical && (
          <div className="alert alert-danger p-3 mb-4 rounded-3 border-danger shadow-sm d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center p-3 fs-4 shadow-sm">
                <FaBell className="fa-shake" />
              </div>
              <div>
                <h5 className="mb-1 fw-bold text-danger d-flex align-items-center gap-2">
                  <span>BÁO ĐỘNG ĐỎ: PHÁT HIỆN GIÁ TRỊ NGUY HIỂM (CRITICAL / PANIC)</span>
                  <Badge bg="danger" className="px-2 py-1">ISO 15189 TAT &lt; 15 PHÚT</Badge>
                </h5>
                <div className="small text-dark">
                  Chỉ số nguy hiểm: <strong>{criticalAnalytes.map(c => `${c.name} = ${c.value} ${c.unit}`).join('; ')}</strong>. Bắt buộc liên hệ Bác sĩ điều trị ngay!
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <Button
                variant="outline-danger"
                size="sm"
                className="d-flex align-items-center gap-1 fw-semibold"
                type="button"
                onClick={playWebAudioAlert880Hz}
              >
                <FaVolumeUp />
                <span>Thử Còi 880Hz</span>
              </Button>

              <div className="text-center p-2 rounded bg-white border border-danger shadow-sm" style={{ minWidth: 150 }}>
                <div className="small text-danger fw-semibold d-flex align-items-center justify-content-center gap-1">
                  <FaStopwatch />
                  <span>Thời gian còn lại</span>
                </div>
                <div className={`fs-4 fw-bold font-monospace ${countdownSeconds < 180 ? 'text-danger' : 'text-dark'}`}>
                  {formatCountdown(countdownSeconds)}
                </div>
                {countdownSeconds === 0 && (
                  <div className="small text-danger fw-bold">QUÁ HẠN 15 PHÚT!</div>
                )}
              </div>
            </div>
          </div>
        )}

        <Row className="g-4">
          {/* Cột trái: Bảng nhập chỉ số phân tích */}
          <Col lg={8}>
            <Form onSubmit={onSubmit}>
              <Card className="border-0 shadow-sm rounded-3 bg-white mb-4">
                <Card.Body className="p-2">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h5 className="mb-0 fw-bold text-dark">Bảng Nhập Chỉ Số Đo Bệnh Phẩm</h5>
                      <small className="text-muted">
                        {flags.length} thông số &bull; Đơn vị tính và khoảng tham chiếu cấu hình chuẩn ISO 15189
                      </small>
                    </div>
                    <span className="badge bg-light text-dark border">
                      KTV nhập: Lê Minh Tuấn
                    </span>
                  </div>

                  <div className="table-responsive">
                    <Table hover align="middle" className="mb-0 table-sm">
                      <thead className="table-light text-muted small text-uppercase">
                        <tr>
                          <th className="py-2.5 ps-3">Thông Số Đo</th>
                          <th className="py-2.5 text-end" style={{ width: '130px' }}>Kết Quả Đo</th>
                          <th className="py-2.5">Đơn Vị</th>
                          <th className="py-2.5">Khoảng Tham Chiếu</th>
                          <th className="py-2.5 text-end pe-3">Cờ Cảnh Báo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(flags) ? flags : []).map((p, idx) => (
                          <tr
                            key={p.code}
                            className={p.flag === 'CRITICAL' ? 'table-danger' : p.flag !== 'NORMAL' && p.value !== 0 ? 'table-warning' : undefined}
                          >
                            <td className="ps-3">
                              <strong className="text-dark">{p.name}</strong>
                              <span className="badge bg-light text-secondary border font-monospace ms-2">{p.code}</span>
                              {(p.code === 'K' || p.code === 'NA') && (
                                <Badge bg="danger-subtle" text="danger" className="ms-1 border border-danger-subtle small">
                                  {p.code === 'K' ? 'Panic: <2.5 hoặc >6.5' : 'Panic: <120 hoặc >160'}
                                </Badge>
                              )}
                            </td>
                            <td className="text-end">
                              <Form.Control
                                type="number"
                                step="any"
                                size="sm"
                                className="text-end fw-bold font-monospace"
                                value={p.value || ''}
                                onChange={(e) => setValue(idx, e.target.value)}
                                placeholder="0.0"
                              />
                            </td>
                            <td className="text-secondary small">{p.unit}</td>
                            <td className="small text-muted font-monospace">
                              {p.refLow} &ndash; {p.refHigh} {p.unit}
                            </td>
                            <td className="text-end pe-3">{getFlagBadge(p.flag, p.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Cảnh báo các chỉ số bất thường */}
                  {abnormalAnalytes.length > 0 && (
                    <div className="alert alert-warning py-2 small mt-3 rounded-3 mb-0">
                      <strong>Phát hiện {abnormalAnalytes.length} chỉ số ngoài khoảng tham chiếu:</strong>{' '}
                      {abnormalAnalytes.map((a) => `${a.code} (${a.value} ${a.unit})`).join(', ')}. 
                      Cần rà soát kỹ thuật trước khi chuyển Bác sĩ phê duyệt.
                    </div>
                  )}

                  {/* RÀNG BUỘC BẮT BUỘC: FORM GHI LOG CUỘC GỌI KHẨN CẤP CHO BÁC SĨ ĐIỀU TRỊ */}
                  {hasCritical && (
                    <div className="alert alert-danger mt-3 p-3 rounded-3 border-danger shadow-sm">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <FaExclamationTriangle className="fs-4 text-danger flex-shrink-0" />
                        <div>
                          <strong className="fs-6">QUY TRÌNH GHI LOG BÁO ĐỘNG ĐỎ BÁC SĨ ĐIỀU TRỊ (ISO 15189 §7.4)</strong>
                          <div className="small">
                            Chỉ số vượt ngưỡng sinh tồn nguy hiểm. Yêu cầu kiểm tra ống mẫu, chạy lại kiểm chứng và bắt buộc hoàn tất biên bản ghi log thông báo.
                          </div>
                        </div>
                      </div>

                      {/* Xác nhận chạy kiểm chứng lần 2 */}
                      <div className="form-check mb-2 ps-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="confirmRerun"
                          checked={confirmRerun}
                          onChange={(e) => setConfirmRerun(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold small text-danger" htmlFor="confirmRerun">
                          1. Tôi đã kiểm tra ống mẫu (không tán huyết, không đông dây) và đã chạy kiểm chứng lần 2 trên máy.
                        </label>
                      </div>

                      {/* Xác nhận thông báo Bác sĩ điều trị */}
                      <div className="form-check mb-3 ps-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="doctorNotified"
                          checked={doctorNotified}
                          onChange={(e) => setDoctorNotified(e.target.checked)}
                          required
                        />
                        <label className="form-check-label fw-bold small text-danger" htmlFor="doctorNotified">
                          2. BẮT BUỘC: Tôi xác nhận đã kích hoạt quy trình BÁO ĐỘNG ĐỎ và thông báo trực tiếp cho Bác sĩ điều trị!
                        </label>
                      </div>

                      {/* Chi tiết thông báo Bác sĩ */}
                      <div className="p-3 bg-white rounded-3 border border-danger-subtle">
                        <h6 className="fw-bold text-danger mb-3 d-flex align-items-center gap-2">
                          <FaPhoneAlt />
                          <span>Biên Bản Log Cuộc Gọi Khẩn Cấp Báo Động Đỏ</span>
                        </h6>
                        <Row className="g-2 mb-2">
                          <Col md={6}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaUserMd className="me-1" /> Họ Tên Bác Sĩ Tiếp Nhận <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={doctorName}
                              onChange={(e) => setDoctorName(e.target.value)}
                              placeholder="BS. Trực..."
                              required={hasCritical}
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaPhoneAlt className="me-1" /> Số Điện Thoại / Máy Nhánh <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={doctorPhone}
                              onChange={(e) => setDoctorPhone(e.target.value)}
                              placeholder="VD: 0912.xxx.xxx hoặc Máy nhánh..."
                              required={hasCritical}
                            />
                          </Col>
                        </Row>

                        <Row className="g-2 mb-2">
                          <Col md={5}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaHospital className="me-1" /> Khoa Lâm Sàng Tiếp Nhận
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={doctorDepartment}
                              onChange={(e) => setDoctorDepartment(e.target.value)}
                              placeholder="VD: Khoa Cấp cứu / Hồi sức..."
                            />
                          </Col>
                          <Col md={4}>
                            <Form.Label className="small fw-semibold text-secondary">
                              Kênh Thông Báo <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Select
                              size="sm"
                              value={notificationChannel}
                              onChange={(e) => setNotificationChannel(e.target.value)}
                            >
                              <option value="Điện thoại nội bộ khoa cấp cứu">Điện thoại nội bộ khoa cấp cứu</option>
                              <option value="Điện thoại di động BS trực">Điện thoại di động BS trực</option>
                              <option value="Bàn giao trực tiếp tại giường bệnh">Bàn giao trực tiếp tại giường bệnh</option>
                              <option value="Tin nhắn khẩn cấp HIS/LIS">Tin nhắn khẩn cấp HIS/LIS</option>
                            </Form.Select>
                          </Col>
                          <Col md={3}>
                            <Form.Label className="small fw-semibold text-secondary">
                              <FaClock className="me-1" /> Giờ Báo Động
                            </Form.Label>
                            <Form.Control
                              size="sm"
                              value={notificationTime}
                              onChange={(e) => setNotificationTime(e.target.value)}
                            />
                          </Col>
                        </Row>

                        <div>
                          <Form.Label className="small fw-semibold text-secondary">
                            Nội Dung Trao Đổi &amp; Ý Kiến Phản Hồi Của Bác Sĩ Điều Trị
                          </Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={2}
                            size="sm"
                            value={callLogNotes}
                            onChange={(e) => setCallLogNotes(e.target.value)}
                            placeholder="Ghi nhận tóm tắt chỉ định khẩn cấp hoặc xác nhận của Bác sĩ..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ghi chú kỹ thuật */}
                  <div className="row g-3 mt-3">
                    <Col md={8}>
                      <Form.Label className="small fw-semibold text-secondary">Ghi Chú Kỹ Thuật (Technical Notes)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ghi nhận tình trạng huyết thanh, độ đục, kiểm tra quang học hoặc mã báo động máy..."
                      />
                    </Col>
                    <Col md={4}>
                      <Form.Label className="small fw-semibold text-secondary">Nguồn Dữ Liệu</Form.Label>
                      <Form.Select
                        value={entrySource}
                        onChange={(e) => setEntrySource(e.target.value)}
                      >
                        <option value="device">Đồng bộ tự động từ máy xét nghiệm</option>
                        <option value="manual">Nhập thủ công có đối soát</option>
                      </Form.Select>
                    </Col>
                  </div>
                </Card.Body>

                <Card.Footer className="bg-white border-top d-flex justify-content-end gap-2 px-3 py-3 rounded-bottom-3">
                  <Button variant="outline-secondary" type="button" onClick={() => setParams(DEFAULT_PARAMS.map(p => ({ ...p })))}>
                    Nhập lại giá trị
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading || !sampleId.trim() || (hasCritical && (!doctorNotified || !confirmRerun))}
                    className="d-flex align-items-center gap-2 shadow-sm px-3 fw-semibold text-white"
                    style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6', borderRadius: '9999px' }}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" animation="border" />
                        <span>Đang lưu...</span>
                      </>
                    ) : hasCritical ? (
                      <>
                        <FaExclamationTriangle />
                        <span>Xác Nhận Đã Báo BS &amp; Gửi Phê Duyệt</span>
                      </>
                    ) : (
                      <>
                        <FaCheckCircle />
                        <span>Lưu &amp; Gửi Phê Duyệt Kết Quả</span>
                      </>
                    )}
                  </Button>
                </Card.Footer>
              </Card>
            </Form>
          </Col>

          {/* Cột phải: Thông tin mẫu & Danh sách kiểm tra chất lượng */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm mb-3 bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
              <Card.Body className="p-3">
                <h6 className="fw-bold text-dark mb-2">Thông Tin Ống Mẫu Xét Nghiệm</h6>
                <div className="badge border mb-2 px-3 py-1 rounded-pill" style={{ backgroundColor: '#EEF2F6', color: '#1E60E6', borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                  Đang phân tích (Testing)
                </div>
                <div className="fw-bold font-monospace fs-6" style={{ color: '#1E60E6' }}>
                  {sampleId || 'Chưa chọn mẫu'}
                </div>
                {sampleDetails ? (
                  <div className="small text-muted mt-2 border-top pt-2" style={{ borderColor: 'rgba(15, 23, 42, 0.05)' }}>
                    <div>Bệnh nhân: <strong className="text-dark">{sampleDetails.patientName}</strong></div>
                    <div>Mã BN: <code>{sampleDetails.patientId}</code></div>
                    <div>Gói XN: <strong>{sampleDetails.testPackageName}</strong></div>
                    <div>Loại mẫu: {sampleDetails.sampleType} ({sampleDetails.tubeColor})</div>
                  </div>
                ) : (
                  <p className="small text-muted mb-0 mt-1">
                    Quét hoặc nhập mã Barcode để đối chiếu bệnh nhân trước khi nhập kết quả.
                  </p>
                )}
              </Card.Body>
            </Card>

            <Card className="border-0 shadow-sm bg-white rounded-4" style={{ border: '1px solid rgba(15, 23, 42, 0.05)' }}>
              <Card.Body className="p-3">
                <h6 className="fw-bold text-dark mb-2">Tiêu Chuẩn Kiểm Soát IQC (ISO 15189)</h6>
                <span className="badge bg-warning-subtle text-warning-emphasis border mb-3">
                  Bản nháp chờ duyệt
                </span>
                {[
                  ['allRequired', 'Đã đo đầy đủ các thông số chỉ định'],
                  ['unitsOk', 'Đơn vị tính và số chữ số thập phân chuẩn mực'],
                  ['qcOk', 'Nội kiểm IQC trong ca đạt chuẩn Westgard'],
                  ['reviewedAbnormal', 'Đã rà soát các giá trị bất thường ngoài dải']
                ].map(([key, label]) => (
                  <label key={key} className="d-flex align-items-center gap-2 mb-2 small text-dark" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      className="form-check-input mt-0"
                      checked={checks[key]}
                      onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}

                <div className="alert alert-secondary py-2 small mt-3 mb-0">
                  <FaLock className="me-1 text-secondary" />
                  Sau khi gửi, kết quả sẽ bị khóa để Trưởng khoa / Bác sĩ duyệt ký số trước khi trả cho bệnh nhân.
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </Container>
  );
}

export default EnterTestResultsPage;
