import '../walkin.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, InputGroup, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import {
  FaIdCard, FaUser, FaPhone, FaCalendarAlt, FaCheckCircle, FaSearch,
  FaUserCheck, FaTicketAlt, FaPrint, FaDesktop, FaCashRegister,
  FaClipboardCheck, FaExclamationTriangle, FaHospital, FaArrowRight,
  FaFileInvoiceDollar, FaShieldAlt, FaClock, FaDoorOpen, FaUndo
} from 'react-icons/fa';
import { useRegisterWalkIn } from '../hooks/useRegisterWalkIn';
import { walkInApi } from '../api/walkInApi';
import { queueApi } from '../../reception/api/queueApi';

const emptyForm = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  phone: '',
  identityNumber: '',
  email: '',
  address: '',
  bloodType: '',
  medicalHistory: '',
  priority: 'NORMAL',
};

/**
 * UC26 – Tiếp nhận khách vãng lai & Đăng ký hồ sơ tại quầy (ISO 15189:2022 & Đề án 06 BYT).
 */
export function RegisterWalkInPage({ onSuccess }) {
  const navigate = useNavigate();
  const { register, loading, error, result, reset } = useRegisterWalkIn();

  const [form, setForm] = useState(emptyForm);
  const [lookupStatus, setLookupStatus] = useState('idle'); // 'idle' | 'checking' | 'found' | 'not_found' | 'error'
  const [lookupMsg, setLookupMsg] = useState(null);
  const [existingPatient, setExistingPatient] = useState(null);

  const [checks, setChecks] = useState({
    identity: false,
    fasting: false,
    meds: false,
    consent: false,
  });
  const [checkError, setCheckError] = useState(null);
  const [receptionNotes, setReceptionNotes] = useState('');
  const [issuedTicket, setIssuedTicket] = useState(null);
  const [isIssuingTicket, setIsIssuingTicket] = useState(false);
  const [showK80Modal, setShowK80Modal] = useState(false);
  const [activePatientData, setActivePatientData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const validateField = (key, value) => {
    const val = (value || '').toString().trim();
    if (key === 'fullName') {
      if (!val) return 'Họ và tên bệnh nhân không được để trống.';
    }
    if (key === 'identityNumber') {
      if (!val) return 'Số CCCD không được để trống (12 chữ số theo Đề án 06 BYT).';
      if (val.length !== 12) return 'Số CCCD phải gồm đúng 12 chữ số theo Đề án 06 Bộ Y Tế.';
    }
    if (key === 'dateOfBirth') {
      if (!val) return 'Ngày sinh không được để trống.';
      const selectedDate = new Date(val);
      const today = new Date();
      if (selectedDate > today) return 'Ngày sinh không được ở thời điểm tương lai.';
      if (selectedDate.getFullYear() < 1900) return 'Ngày sinh không hợp lệ (từ năm 1900 trở đi).';
    }
    if (key === 'phone') {
      if (!val) return 'Số điện thoại liên hệ không được để trống.';
      if (!/^0[35789]\d{8}$/.test(val)) return 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09.';
    }
    if (key === 'email') {
      if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Email không đúng định dạng (VD: email@example.com).';
    }
    return null;
  };

  const validateForm = () => {
    const errs = {};
    const fnErr = validateField('fullName', form.fullName);
    if (fnErr) errs.fullName = fnErr;

    const idErr = validateField('identityNumber', form.identityNumber);
    if (idErr) errs.identityNumber = idErr;

    const dobErr = validateField('dateOfBirth', form.dateOfBirth);
    if (dobErr) errs.dateOfBirth = dobErr;

    const phErr = validateField('phone', form.phone);
    if (phErr) errs.phone = phErr;

    const emErr = validateField('email', form.email);
    if (emErr) errs.email = emErr;

    return errs;
  };

  const handleBlur = (key, value) => {
    const err = validateField(key, value);
    setFieldErrors((prev) => ({
      ...prev,
      [key]: err,
    }));
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev && prev[key] ? { ...prev, [key]: null } : prev));
    // Reset lookup state if identityNumber changes
    if (key === 'identityNumber') {
      setLookupStatus('idle');
      setLookupMsg(null);
      setExistingPatient(null);
    }
  };

  // Tra cứu & Đối soát CCCD với hệ thống định danh y tế
  const onLookupCccd = async () => {
    const cccd = (form.identityNumber || '').trim();
    if (!cccd) {
      setLookupStatus('error');
      setLookupMsg('Vui lòng nhập số CCCD (12 chữ số theo Đề án 06 Bộ Y Tế).');
      return;
    }
    if (cccd.length !== 12 && cccd.length !== 9) {
      setLookupStatus('error');
      setLookupMsg('Số định danh cá nhân / CCCD phải gồm 12 chữ số hợp lệ.');
      return;
    }

    setLookupStatus('checking');
    setLookupMsg(null);
    setExistingPatient(null);

    try {
      const res = await walkInApi.lookupByIdentity(cccd);
      if (res?.exists || res?.Exists) {
        const found = {
          patientId: res.patientId || res.PatientId,
          fullName: res.fullName || res.FullName,
          identityNumber: res.identityNumber || res.IdentityNumber || cccd,
          phone: res.phone || res.Phone,
          dateOfBirth: res.dateOfBirth || res.DateOfBirth,
          gender: res.gender || res.Gender || 'Male',
        };
        setExistingPatient(found);
        setLookupStatus('found');
        setLookupMsg(`Người bệnh đã có hồ sơ y tế tại BMS MedLab (Mã: ${found.patientId}).`);
      } else {
        setExistingPatient(null);
        setLookupStatus('not_found');
        setLookupMsg('Số CCCD chưa có trên hệ thống — Sẵn sàng đăng ký hồ sơ khách vãng lai mới.');
      }
    } catch (err) {
      setLookupStatus('error');
      setLookupMsg(err?.message || 'Không thể kết nối đối soát thông tin CCCD lúc này.');
    }
  };

  // Nạp thông tin bệnh nhân đã có vào biểu mẫu
  const handleLoadExistingIntoForm = () => {
    if (!existingPatient) return;
    let formattedDob = '';
    if (existingPatient.dateOfBirth) {
      try {
        formattedDob = new Date(existingPatient.dateOfBirth).toISOString().split('T')[0];
      } catch {
        formattedDob = existingPatient.dateOfBirth;
      }
    }
    setForm((prev) => ({
      ...prev,
      fullName: existingPatient.fullName || prev.fullName,
      phone: existingPatient.phone || prev.phone,
      identityNumber: existingPatient.identityNumber || prev.identityNumber,
      gender: existingPatient.gender || prev.gender,
      dateOfBirth: formattedDob || prev.dateOfBirth,
    }));
  };

  // Cấp STT trực tiếp cho bệnh nhân đã có hồ sơ cũ (không cần tạo mới)
  const handleIssueTicketForExisting = async () => {
    if (!existingPatient) return;
    try {
      setIsIssuingTicket(true);
      const res = await queueApi.issueNextTicket({
        patientId: existingPatient.patientId,
        patientName: existingPatient.fullName,
        patientCode: existingPatient.patientId,
        packageName: 'Xét nghiệm máu vãng lai',
        isWalkIn: true,
        priority: form.priority === 'HIGH' ? 2 : 1,
      });

      const ticket = res?.data || res;
      setIssuedTicket(ticket);
      setActivePatientData({
        patientId: existingPatient.patientId,
        fullName: existingPatient.fullName,
        phone: existingPatient.phone,
        identityNumber: existingPatient.identityNumber,
        gender: existingPatient.gender,
        dateOfBirth: existingPatient.dateOfBirth,
        priority: form.priority,
        isExisting: true,
      });
      setShowK80Modal(true);
    } catch (err) {
      alert('Lỗi cấp STT: ' + (err?.message || 'Không thể kết nối máy cấp số'));
    } finally {
      setIsIssuingTicket(false);
    }
  };

  // Lưu hồ sơ khách vãng lai mới
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!checks.identity || !checks.consent) {
      setCheckError('Bắt buộc xác nhận đối chiếu CCCD và đồng thuận lấy mẫu (ISO 15189) trước khi đăng ký.');
      return;
    }
    setCheckError(null);

    // 1. Kiểm tra tính hợp lệ dữ liệu ngay tại Client
    const errs = validateForm();
    const activeErrKeys = Object.keys(errs).filter((k) => !!errs[k]);
    if (activeErrKeys.length > 0) {
      setFieldErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFieldErrors({});

    // 2. Chuẩn hóa họ tên in hoa theo chuẩn y tế
    const payload = {
      ...form,
      fullName: form.fullName.trim().toUpperCase(),
      phone: form.phone.trim(),
      identityNumber: form.identityNumber.trim(),
      address: (form.address || '').trim(),
      medicalHistory: [
        form.medicalHistory,
        checks.fasting ? 'Đã nhịn ăn 8-12h' : 'Chưa nhịn ăn',
        checks.meds ? 'Đã rà soát tiền sử thuốc' : '',
        receptionNotes ? `Ghi chú: ${receptionNotes}` : '',
      ]
        .filter(Boolean)
        .join('; '),
    };

    try {
      const res = await register(payload);
      setActivePatientData({
        patientId: res.patientId,
        fullName: res.fullName || payload.fullName,
        phone: res.phone || payload.phone,
        email: res.email || payload.email || '',
        identityNumber: res.identityNumber || payload.identityNumber,
        gender: res.gender || payload.gender,
        dateOfBirth: res.dateOfBirth || payload.dateOfBirth,
        priority: res.priority || payload.priority,
        portalUsername: res.portalUsername || '',
        temporaryPassword: res.temporaryPassword || '',
        accountAutoCreated: Boolean(res.accountAutoCreated),
        isExisting: false,
      });
      onSuccess?.(res.patientId);
    } catch (err) {
      /* handled by useRegisterWalkIn */
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (err?.errors && typeof err.errors === 'object') {
        const beErrors = {};
        Object.entries(err.errors).forEach(([k, v]) => {
          const fieldKey = k.charAt(0).toLowerCase() + k.slice(1);
          beErrors[fieldKey] = Array.isArray(v) ? v[0] : v;
        });
        setFieldErrors(beErrors);
      }
      const errMsg = err?.message || '';
      if (errMsg.includes('CCCD') || errMsg.includes('MSG-ERR-REC-01')) {
        onLookupCccd();
      }
    }
  };

  // Cấp STT cho bệnh nhân vừa tạo mới thành công
  const handleIssueWalkInTicket = async () => {
    const pt = activePatientData || result;
    if (!pt) return;
    try {
      setIsIssuingTicket(true);
      const res = await queueApi.issueNextTicket({
        patientId: pt.patientId,
        patientName: pt.fullName,
        patientCode: pt.patientId,
        packageName: 'Xét nghiệm máu vãng lai',
        isWalkIn: true,
        priority: pt.priority === 'HIGH' ? 2 : 1,
      });
      const ticket = res?.data || res;
      setIssuedTicket(ticket);
      setShowK80Modal(true);
    } catch (err) {
      alert('Lỗi cấp số thứ tự: ' + (err.message || 'Không thể kết nối bảng gọi số'));
    } finally {
      setIsIssuingTicket(false);
    }
  };

  // In nhiệt K80
  const handlePrintK80 = () => {
    const printContent = document.getElementById('walkin-k80-slip');
    if (printContent) {
      const win = window.open('', '_blank');
      win.document.write(`
        <html>
          <head>
            <title>Phieu_Tiep_Don_K80_${issuedTicket?.ticketNumber || 'BMS'}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                margin: 0;
                padding: 12px;
                background: #fff;
                color: #000;
                display: flex;
                justify-content: center;
              }
              .ticket {
                width: 76mm;
                max-width: 100%;
                text-align: center;
              }
              .border-dashed { border-bottom: 1px dashed #000; margin: 8px 0; }
            </style>
          </head>
          <body>
            <div class="ticket">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() { window.print(); window.close(); }
            </script>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
    }
  };

  // Reset toàn bộ để tiếp nhận người tiếp theo
  const handleResetAll = () => {
    reset();
    setForm(emptyForm);
    setLookupMsg(null);
    setLookupStatus('idle');
    setExistingPatient(null);
    setIssuedTicket(null);
    setActivePatientData(null);
    setReceptionNotes('');
  };

  // =========================================================================
  // MÀN HÌNH HOÀN TẤT TIẾP NHẬN & CẤP SỐ THỨ TỰ (SUCCESS VIEW)
  // =========================================================================
  if (activePatientData || result) {
    const pt = activePatientData || result;
    return (
      <div className="walkin-page container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
        <div className="container" style={{ maxWidth: 860 }}>
          <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
            <div
              className="p-4 text-white d-flex align-items-center justify-content-between"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-white text-success shadow-sm"
                  style={{ width: 48, height: 48, fontSize: '24px' }}
                >
                  <FaCheckCircle />
                </div>
                <div>
                  <h4 className="fw-bold mb-1 text-white">
                    {pt.isExisting ? 'Xác Nhận Tiếp Đón Khách Vãng Lai' : 'Tiếp Nhận & Đăng Ký Hồ Sơ Thành Công'}
                  </h4>
                  <p className="mb-0 text-white-50 small">
                    Hồ sơ hợp lệ theo quy chuẩn ISO 15189:2022 &amp; Đề án 06 Bộ Y Tế
                  </p>
                </div>
              </div>
              <Badge bg="light" text="dark" className="px-3 py-2 fs-6 rounded-pill">
                {pt.priority === 'HIGH' ? '🔥 Luồng Ưu Tiên' : '✅ Luồng Tiêu Chuẩn'}
              </Badge>
            </div>

            <Card.Body className="p-4">
              {/* Thẻ tóm tắt thông tin hành chính */}
              <div className="p-3 bg-light rounded-4 mb-4 border">
                <Row className="g-3">
                  <Col md={6}>
                    <div className="text-muted small">Mã định danh bệnh nhân:</div>
                    <div className="fs-5 fw-bold text-primary font-monospace">{pt.patientId}</div>
                  </Col>
                  <Col md={6}>
                    <div className="text-muted small">Họ và tên bệnh nhân:</div>
                    <div className="fs-5 fw-bold text-dark">{pt.fullName}</div>
                  </Col>
                  <Col md={4}>
                    <div className="text-muted small">Số điện thoại liên hệ:</div>
                    <div className="fw-semibold text-dark">{pt.phone || 'Chưa cung cấp'}</div>
                  </Col>
                  <Col md={4}>
                    <div className="text-muted small">Số CCCD / VNeID:</div>
                    <div className="fw-semibold text-dark font-monospace">{pt.identityNumber}</div>
                  </Col>
                  <Col md={4}>
                    <div className="text-muted small">Phân loại tiếp nhận:</div>
                    <span className="badge bg-primary">Khách vãng lai (Tại quầy)</span>
                  </Col>
                </Row>
              </div>

              {/* Tài khoản Cổng Bệnh Nhân tự động cấp cho khách vãng lai */}
              {pt.portalUsername && (
                <div
                  className="p-3 rounded-4 mb-4"
                  style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}
                >
                  <div className="fw-bold text-primary small mb-2">
                    🔐 Tài Khoản Cổng Bệnh Nhân Tra Cứu Kết Quả Trực Tuyến
                  </div>
                  <Row className="g-2 align-items-center">
                    <Col md={6}>
                      <div className="text-muted small">Tên đăng nhập (hoặc Email):</div>
                      <div className="fw-bold font-monospace text-dark">
                        {pt.portalUsername}
                        {pt.email ? <span className="text-muted fw-normal"> / {pt.email}</span> : null}
                      </div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted small">Mật khẩu tạm thời:</div>
                      <div className="fw-bold font-monospace text-primary fs-6">
                        {pt.temporaryPassword || '(Dùng tài khoản hiện có)'}
                      </div>
                    </Col>
                  </Row>
                  <div className="text-muted small mt-2">
                    {pt.accountAutoCreated
                      ? (pt.email
                          ? 'Hệ thống đã tự động gửi thông tin đăng nhập về email của người bệnh. Lễ tân có thể ghi/in kèm phiếu K80 để bệnh nhân tra cứu kết quả sau khi có.'
                          : 'Lễ tân vui lòng cung cấp thông tin đăng nhập trên (hoặc in phiếu K80) để bệnh nhân đăng nhập xem kết quả xét nghiệm.')
                      : 'Hồ sơ đã được liên kết với tài khoản bệnh nhân hiện có theo email đăng ký.'}
                  </div>
                </div>
              )}

              {/* Box Cấp STT Lấy Mẫu */}
              {issuedTicket ? (
                <div
                  className="p-4 text-center rounded-4 mb-4"
                  style={{ background: '#f0fdf4', border: '2px solid #86efac' }}
                >
                  <div className="text-success fw-bold small text-uppercase letter-spacing-1">
                    <FaCheckCircle className="me-1" /> ĐÃ CẤP SỐ THỨ TỰ LẤY MẪU MÁU
                  </div>
                  <div
                    style={{ fontSize: '3.6rem', fontWeight: '900', color: '#059669', lineHeight: 1.1, margin: '8px 0' }}
                  >
                    {issuedTicket.ticketNumber}
                  </div>
                  <div className="fw-semibold text-dark fs-6 mb-2">
                    <FaDoorOpen className="me-1 text-primary" /> Phòng Lấy Mẫu Máu 101 (Tầng 1 - Trạm lấy mẫu trung tâm)
                  </div>
                  <p className="text-muted small mb-3">
                    Người bệnh đã được đưa vào hàng đợi điện tử. Dữ liệu đồng bộ tự động với màn hình gọi số của Kỹ thuật viên.
                  </p>
                  <div className="d-flex justify-content-center gap-2 flex-wrap">
                    <Button
                      variant="success"
                      className="rounded-pill px-4 fw-bold shadow-sm"
                      onClick={() => setShowK80Modal(true)}
                    >
                      <FaPrint className="me-2" /> In Phiếu Tiếp Đón K80
                    </Button>
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-4 fw-semibold"
                      onClick={() => navigate('/reception/queue')}
                    >
                      <FaDesktop className="me-2" /> Bảng Điều Phối Hàng Đợi
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-4 rounded-4 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3"
                  style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}
                >
                  <div>
                    <h6 className="fw-bold text-primary mb-1">
                      <FaTicketAlt className="me-2" /> Bước tiếp theo: Cấp số thứ tự lấy mẫu
                    </h6>
                    <p className="text-muted small mb-0">
                      Đưa người bệnh vào luồng lấy mẫu máu tại <strong>Phòng Lấy Mẫu 101</strong> và in phiếu K80 điều hướng.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="rounded-pill px-4 py-2 fw-bold shadow-sm"
                    style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    onClick={handleIssueWalkInTicket}
                    disabled={isIssuingTicket}
                  >
                    {isIssuingTicket ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" /> Đang cấp số...
                      </>
                    ) : (
                      <>
                        <FaTicketAlt className="me-2" /> Cấp STT Lấy Mẫu Ngay
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Các thao tác chuyển tiếp */}
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                <Button variant="outline-secondary" className="rounded-pill px-3" onClick={handleResetAll}>
                  <FaUndo className="me-1" /> Tiếp nhận người bệnh tiếp theo
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    variant="success"
                    className="rounded-pill px-3 fw-semibold"
                    onClick={() => navigate(`/appointments/book?patientId=${encodeURIComponent(pt.patientId)}`)}
                  >
                    <FaCalendarAlt className="me-1" /> Tạo Lịch Hẹn &amp; Chọn Gói XN
                  </Button>
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-3 fw-semibold"
                    onClick={() => navigate(`/calculate-fees?patientId=${pt.patientId}`)}
                  >
                    <FaFileInvoiceDollar className="me-1" /> Quầy Dự Toán Viện Phí &amp; BHYT
                  </Button>
                  <Button
                    variant="primary"
                    className="rounded-pill px-3 fw-semibold"
                    style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    onClick={() => navigate('/invoices')}
                  >
                    <FaCashRegister className="me-1" /> Quầy Thu Ngân
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Modal Xem Trước & In Phiếu K80 */}
        <Modal show={showK80Modal} onHide={() => setShowK80Modal(false)} size="md" centered>
          <Modal.Header closeButton style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <Modal.Title style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>
              <FaPrint className="text-primary me-2" /> Xem Trước &amp; In Phiếu Tiếp Đón K80
            </Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: '24px' }}>
            <div
              id="walkin-k80-slip"
              style={{
                textAlign: 'center',
                background: '#ffffff',
                border: '1px dashed #94a3b8',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <div
                style={{
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                HỆ THỐNG XÉT NGHIỆM BMS MEDLAB
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                Đề án 06 BYT • Tiêu chuẩn ISO 15189:2022 • Hotline: 1900 6868
              </div>
              <div style={{ borderBottom: '1px dashed #cbd5e1', margin: '8px 0' }} />

              <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: '700', textTransform: 'uppercase' }}>
                PHIẾU TIẾP ĐÓN &amp; SỐ THỨ TỰ LẤY MẪU
              </div>

              {/* Big Ticket */}
              <div
                style={{
                  margin: '12px 0',
                  padding: '12px',
                  background: '#f0fdf4',
                  borderRadius: '10px',
                  border: '2px solid #86efac',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: '600' }}>SỐ THỨ TỰ LẤY MẪU</div>
                <div
                  style={{
                    fontSize: '3.2rem',
                    fontWeight: '900',
                    color: '#059669',
                    lineHeight: '1.1',
                    margin: '4px 0',
                  }}
                >
                  {issuedTicket?.ticketNumber || 'B01'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: '600' }}>
                  <FaDoorOpen className="me-1" /> Phòng Lấy Mẫu 101 (Tầng 1)
                </div>
              </div>

              {/* Mã Barcode / QR Code Chống Nhầm Lẫn Chuẩn ISO 15189 */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                <QRCodeSVG value={pt?.patientId || 'PAT-WALKIN'} size={110} level="M" />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'monospace' }}>
                MÃ BN: <strong>{pt?.patientId}</strong>
              </div>

              {/* Thông tin hành chính */}
              <div
                style={{
                  textAlign: 'left',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '0.85rem',
                  lineHeight: '1.7',
                  color: '#334155',
                  marginTop: '12px',
                }}
              >
                <div>
                  <strong>Bệnh nhân:</strong> {pt?.fullName}
                </div>
                <div>
                  <strong>CCCD/VNeID:</strong> <code>{pt?.identityNumber}</code>
                </div>
                <div>
                  <strong>SĐT:</strong> {pt?.phone || 'Chưa có'}
                </div>
                <div>
                  <strong>Độ ưu tiên:</strong>{' '}
                  <span className={`badge ${pt?.priority === 'HIGH' ? 'bg-danger' : 'bg-primary'}`}>
                    {pt?.priority === 'HIGH' ? 'Ưu tiên' : 'Tiêu chuẩn'}
                  </span>
                </div>
                <div>
                  <strong>Thời gian tiếp nhận:</strong> {new Date().toLocaleTimeString('vi-VN')} ({todayStr})
                </div>
              </div>

              <div className="mt-3 text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                * Bệnh nhân vui lòng ngồi tại sảnh chờ, theo dõi màn hình hiển thị số thứ tự hoặc nghe loa thông báo.
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer
            style={{
              background: '#f8fafc',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Button variant="outline-secondary" onClick={() => setShowK80Modal(false)}>
              Đóng
            </Button>
            <Button variant="success" className="px-4 fw-bold" onClick={handlePrintK80}>
              <FaPrint className="me-2" /> In Phiếu K80
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // MÀN HÌNH CHÍNH: BIỂU MẪU TIẾP ĐÓN & ĐĂNG KÝ KHÁCH VÃNG LAI
  // =========================================================================
  return (
    <div className="walkin-page container-fluid py-4" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header chuẩn hóa chung dashboard lễ tân */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fs-4 fw-bold text-dark mb-1">
            <FaIdCard className="text-primary me-2" />
            Quầy Tiếp Nhận &amp; Đăng Ký Hồ Sơ Khách Vãng Lai (Walk-in)
          </h2>
          <p className="text-muted mb-0 small">
            Tiếp đón người bệnh chưa đặt lịch, xác thực CCCD gắn chip (Đề án 06 Bộ Y Tế), sàng lọc tiêu chuẩn tiền phân tích (ISO 15189:2022) và cấp số thứ tự vào phòng lấy mẫu.
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" className="rounded-pill" onClick={() => navigate('/reception/queue')}>
            <FaDesktop className="me-1" /> Bảng Gọi Số
          </Button>
          <Button variant="outline-primary" size="sm" className="rounded-pill" onClick={() => navigate('/calculate-fees')}>
            <FaFileInvoiceDollar className="me-1" /> Quầy Dự Toán
          </Button>
        </div>
      </div>

      <Row className="g-4">
        {/* Cột trái: Biểu mẫu tiếp nhận */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
            <Card.Header className="bg-white border-bottom py-3 px-4">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <FaClipboardCheck className="text-primary" />
                Hồ Sơ Tiếp Đón Khách Vãng Lai Tại Quầy
              </h5>
            </Card.Header>

            <Card.Body className="p-4">
              {/* Alert lỗi trực quan ngay cạnh nút bấm */}
              {error && (
                <Alert variant="danger" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <FaExclamationTriangle className="text-danger flex-shrink-0" />
                  <div>
                    <strong>Lỗi:</strong> {error}
                  </div>
                </Alert>
              )}

              {/* Thông báo kết quả đối soát CCCD */}
              {lookupStatus === 'found' && existingPatient && (
                <div
                  className="p-3 rounded-4 mb-4 border"
                  style={{ background: '#f0fdf4', borderColor: '#86efac' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2 text-success fw-bold">
                      <FaUserCheck className="fs-5" />
                      <span>ĐÃ CÓ HỒ SƠ Y TẾ TẠI BMS MEDLAB (ĐỀ ÁN 06 KHỚP)</span>
                    </div>
                    <Badge bg="success" className="px-2 py-1">
                      Mã BN: {existingPatient.patientId}
                    </Badge>
                  </div>
                  <div className="small text-dark mb-3">
                    Người bệnh: <strong>{existingPatient.fullName}</strong> • Giới tính:{' '}
                    <strong>{existingPatient.gender === 'Female' ? 'Nữ' : 'Nam'}</strong> • SĐT:{' '}
                    <strong>{existingPatient.phone || 'Chưa có'}</strong> • CCCD:{' '}
                    <code>{existingPatient.identityNumber}</code>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant="success"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold shadow-sm"
                      onClick={handleIssueTicketForExisting}
                      disabled={isIssuingTicket}
                    >
                      {isIssuingTicket ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-1" /> Đang cấp số...
                        </>
                      ) : (
                        <>
                          <FaTicketAlt className="me-1" /> Cấp STT Lấy Mẫu Ngay (Phòng 101)
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold"
                      onClick={handleLoadExistingIntoForm}
                    >
                      Nạp thông tin vào biểu mẫu
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold"
                      onClick={() => navigate(`/calculate-fees?patientId=${existingPatient.patientId}`)}
                    >
                      Dự toán viện phí &rarr;
                    </Button>
                  </div>
                </div>
              )}

              {lookupStatus === 'not_found' && (
                <Alert variant="info" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <FaCheckCircle className="text-info flex-shrink-0" />
                  <div className="small">{lookupMsg}</div>
                </Alert>
              )}

              {lookupStatus === 'error' && (
                <Alert variant="warning" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <FaExclamationTriangle className="text-warning flex-shrink-0" />
                  <div className="small">{lookupMsg}</div>
                </Alert>
              )}

              {/* Alert lỗi bỏ trống thông tin bắt buộc */}
              {Object.values(fieldErrors).some(Boolean) && (
                <Alert variant="danger" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-start gap-2">
                  <FaExclamationTriangle className="text-danger mt-1 flex-shrink-0" />
                  <div>
                    <strong>Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc:</strong>
                    <ul className="mb-0 ps-3 small mt-1">
                      {Object.values(fieldErrors).filter(Boolean).map((msg, idx) => (
                        <li key={idx}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )}

              <Form onSubmit={onSubmit} noValidate>
                {/* 1. THÔNG TIN ĐỊNH DANH (ĐỀ ÁN 06 BYT) */}
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                    <FaIdCard /> 1. Thông Tin Định Danh Người Bệnh (Chuẩn Đề án 06 Bộ Y Tế)
                  </h6>
                  <Row className="g-3">
                    <Col md={7}>
                      <Form.Label className="text-muted small mb-1">
                        Họ và tên bệnh nhân <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        required
                        placeholder="VD: NGUYỄN TẤN PHÁT"
                        value={form.fullName}
                        onChange={(e) => set('fullName', e.target.value.toUpperCase())}
                        onBlur={(e) => handleBlur('fullName', e.target.value)}
                        isInvalid={!!fieldErrors.fullName}
                        style={{ minHeight: 44 }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.fullName}
                      </Form.Control.Feedback>
                    </Col>
                    <Col md={5}>
                      <Form.Label className="text-muted small mb-1">
                        Giới tính sinh học <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={form.gender}
                        onChange={(e) => set('gender', e.target.value)}
                        style={{ minHeight: 44 }}
                      >
                        <option value="Male">Nam</option>
                        <option value="Female">Nữ</option>
                        <option value="Other">Khác</option>
                      </Form.Select>
                    </Col>

                    <Col md={7}>
                      <Form.Label className="text-muted small mb-1">
                        Số CCCD / Định danh cá nhân (12 số) <span className="text-danger">*</span>
                      </Form.Label>
                      <div className="d-flex gap-2 align-items-stretch">
                        <Form.Control
                          required
                          placeholder="Nhập 12 chữ số CCCD gắn chip"
                          maxLength={12}
                          value={form.identityNumber}
                          onChange={(e) => set('identityNumber', e.target.value.replace(/\D/g, ''))}
                          onBlur={(e) => handleBlur('identityNumber', e.target.value)}
                          isInvalid={!!fieldErrors.identityNumber}
                          className={`rounded-3 ${fieldErrors.identityNumber ? 'is-invalid' : ''}`}
                          style={{
                            minHeight: 44,
                            fontFamily: 'monospace',
                            border: fieldErrors.identityNumber ? '1.5px solid #dc2626 !important' : '1.5px solid #cbd5e1 !important',
                            backgroundColor: fieldErrors.identityNumber ? '#fef2f2 !important' : '#ffffff !important'
                          }}
                        />
                        <Button
                          variant="outline-primary"
                          type="button"
                          className="px-3 fw-semibold text-nowrap rounded-3 d-flex align-items-center"
                          onClick={onLookupCccd}
                          disabled={lookupStatus === 'checking'}
                          style={{ minHeight: 44, border: '1px solid #1E60E6' }}
                        >
                          {lookupStatus === 'checking' ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-1" /> Đang kiểm tra...
                            </>
                          ) : (
                            <>
                              <FaSearch className="me-1" /> Đối soát CCCD
                            </>
                          )}
                        </Button>
                      </div>
                      {fieldErrors.identityNumber && (
                        <div className="text-danger small mt-1">
                          {fieldErrors.identityNumber}
                        </div>
                      )}
                    </Col>

                    <Col md={5}>
                      <Form.Label className="text-muted small mb-1">
                        Ngày sinh <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="date"
                        required
                        max={todayStr}
                        value={form.dateOfBirth}
                        onChange={(e) => set('dateOfBirth', e.target.value)}
                        onBlur={(e) => handleBlur('dateOfBirth', e.target.value)}
                        isInvalid={!!fieldErrors.dateOfBirth}
                        style={{ minHeight: 44 }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.dateOfBirth}
                      </Form.Control.Feedback>
                    </Col>

                    <Col md={6}>
                      <Form.Label className="text-muted small mb-1">
                        Số điện thoại liên hệ <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        required
                        placeholder="VD: 0912345678"
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                        onBlur={(e) => handleBlur('phone', e.target.value)}
                        isInvalid={!!fieldErrors.phone}
                        style={{ minHeight: 44 }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.phone}
                      </Form.Control.Feedback>
                    </Col>

                    <Col md={6}>
                      <Form.Label className="text-muted small mb-1">Email nhận kết quả điện tử</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="email@example.com"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        onBlur={(e) => handleBlur('email', e.target.value)}
                        isInvalid={!!fieldErrors.email}
                        style={{ minHeight: 44 }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.email}
                      </Form.Control.Feedback>
                    </Col>

                    <Col md={12}>
                      <Form.Label className="text-muted small mb-1">Địa chỉ thường trú / Nơi ở hiện tại</Form.Label>
                      <Form.Control
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        value={form.address}
                        onChange={(e) => set('address', e.target.value)}
                        style={{ minHeight: 44 }}
                      />
                    </Col>
                  </Row>
                </div>

                <hr className="my-4 text-muted opacity-25" />

                {/* 2. SÀNG LỌC TIỀN PHÂN TÍCH (ISO 15189:2022) */}
                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                    <FaShieldAlt /> 2. Tiêu Chuẩn Tiền Phân Tích &amp; An Toàn Xét Nghiệm (ISO 15189:2022)
                  </h6>
                  <div className="bg-light p-3 rounded-3 mb-3">
                    {[
                      ['identity', 'Đối chiếu thông tin người bệnh trùng khớp giấy tờ tùy thân CCCD / VNeID'],
                      ['fasting', 'Người bệnh đã nhịn ăn đúng yêu cầu 8–12 giờ trước khi lấy máu (đường huyết, mỡ máu)'],
                      ['meds', 'Ghi nhận tiền sử dùng thuốc (đặc biệt thuốc chống đông máu Heparin, Aspirin hoặc tiểu đường)'],
                      ['consent', 'Người bệnh đồng thuận tự nguyện thực hiện quy trình lấy mẫu xét nghiệm y khoa'],
                    ].map(([key, label]) => (
                      <Form.Check
                        key={key}
                        type="checkbox"
                        id={`check-${key}`}
                        className="mb-2"
                        label={<span className="small text-dark">{label}{(key === 'identity' || key === 'consent') ? ' *' : ''}</span>}
                        checked={checks[key]}
                        onChange={(e) => {
                          setChecks((c) => ({ ...c, [key]: e.target.checked }));
                          setCheckError(null);
                        }}
                      />
                    ))}
                    {checkError && (
                      <div className="small text-danger mt-2">{checkError}</div>
                    )}
                  </div>

                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Label className="text-muted small mb-1">Nhóm máu hệ ABO / Rh (nếu đã biết)</Form.Label>
                      <Form.Select
                        value={form.bloodType}
                        onChange={(e) => set('bloodType', e.target.value)}
                        style={{ minHeight: 44 }}
                      >
                        <option value="">Chưa xác định (Sẽ định nhóm tại Lab)</option>
                        <option value="O+">O Rh(+)</option>
                        <option value="A+">A Rh(+)</option>
                        <option value="B+">B Rh(+)</option>
                        <option value="AB+">AB Rh(+)</option>
                        <option value="O-">O Rh(-)</option>
                        <option value="A-">A Rh(-)</option>
                        <option value="B-">B Rh(-)</option>
                        <option value="AB-">AB Rh(-)</option>
                      </Form.Select>
                    </Col>
                    <Col md={6}>
                      <Form.Label className="text-muted small mb-1">Phân luồng ưu tiên hàng đợi</Form.Label>
                      <Form.Select
                        value={form.priority}
                        onChange={(e) => set('priority', e.target.value)}
                        style={{ minHeight: 44 }}
                      >
                        <option value="NORMAL">Tiêu chuẩn (Routine - Khách vãng lai thông thường)</option>
                        <option value="HIGH">Ưu tiên (Người già ≥75t, phụ nữ mang thai, trẻ sơ sinh)</option>
                      </Form.Select>
                    </Col>
                    <Col md={12}>
                      <Form.Label className="text-muted small mb-1">Ghi chú lâm sàng của Lễ tân</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Ghi chú thêm về thể trạng người bệnh, người nhà đi cùng nếu cần..."
                        value={receptionNotes}
                        onChange={(e) => setReceptionNotes(e.target.value)}
                      />
                    </Col>
                  </Row>
                </div>

                                {/* Alert lỗi trực quan ngay cạnh nút bấm */}
                {error && (
                  <Alert variant="danger" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                    <FaExclamationTriangle className="text-danger flex-shrink-0" />
                    <div>
                      <strong>Lỗi:</strong> {error}
                    </div>
                  </Alert>
                )}

                {/* Footer form buttons */}
                <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                  <span className="text-muted small">
                    <FaCheckCircle className="text-success me-1" /> Hồ sơ sau khi xác nhận sẽ tự động liên kết máy cấp STT.
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-pill px-4 py-2 fw-bold shadow-sm"
                    style={{ minHeight: 44, backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" /> Đang lưu hồ sơ...
                      </>
                    ) : (
                      <>
                        <FaUserCheck className="me-2" /> Xác Nhận Tiếp Nhận &amp; Cấp Hồ Sơ
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Cột phải: Hướng dẫn nghiệp vụ & Quy chuẩn y tế */}
        <Col lg={4}>
          {/* Card 1: An toàn phòng xét nghiệm */}
          <Card className="border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden">
            <Card.Body className="p-3">
              <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                <FaShieldAlt className="text-success" />
                Quy Chuẩn Tiền Phân Tích (ISO 15189)
              </h6>
              <p className="small text-muted mb-2">
                70% sai sót kết quả xét nghiệm bắt nguồn từ khâu tiền phân tích:
              </p>
              <ul className="small text-muted ps-3 mb-0">
                <li className="mb-1">Đối chiếu thông tin người bệnh với CCCD trước khi lấy mẫu.</li>
                <li className="mb-1">Khách vãng lai cần nhịn ăn ít nhất 8 tiếng với xét nghiệm sinh hóa đường/mỡ máu.</li>
                <li>Nếu người bệnh đang dùng kháng đông máu (Heparin, Warfarin), cần cảnh báo KTV lấy mẫu để ép băng kỹ.</li>
              </ul>
            </Card.Body>
          </Card>

          {/* Card 2: Chính sách viện phí */}
          <Card className="border-0 shadow-sm rounded-4 mb-3 overflow-hidden" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <Card.Body className="p-3">
              <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                <FaFileInvoiceDollar />
                Chính Sách Viện Phí &amp; Hóa Đơn Điện Tử
              </h6>
              <p className="small text-muted mb-2">
                Tuân thủ Nghị định 123/2020/NĐ-CP &amp; Thông tư 22/2023/TT-BYT:
              </p>
              <ul className="small text-muted ps-3 mb-0">
                <li className="mb-1">Khách vãng lai thanh toán tại quầy thu ngân hoặc ứng dụng trước/sau khi lấy mẫu theo luồng tiếp đón.</li>
                <li className="mb-1">Hỗ trợ đối soát quyền lợi BHYT 80% – 100% tại quầy dự toán viện phí.</li>
                <li>Tự động xuất biên lai nhiệt K80 và hóa đơn VAT điện tử.</li>
              </ul>
            </Card.Body>
          </Card>

          {/* Card 3: Quy trình 5 bước */}
          <Card className="border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden">
            <Card.Body className="p-3">
              <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                <FaHospital className="text-secondary" />
                Luồng Tiếp Đón Khách Vãng Lai
              </h6>
              <div className="small text-muted">
                <div className="d-flex align-items-start gap-2 mb-2">
                  <Badge bg="primary" className="rounded-circle p-1" style={{ width: 20, height: 20 }}>1</Badge>
                  <span>Nhập CCCD &rarr; Đối soát trùng lặp hồ sơ cũ.</span>
                </div>
                <div className="d-flex align-items-start gap-2 mb-2">
                  <Badge bg="primary" className="rounded-circle p-1" style={{ width: 20, height: 20 }}>2</Badge>
                  <span>Khai báo thông tin lâm sàng &amp; tiền phân tích.</span>
                </div>
                <div className="d-flex align-items-start gap-2 mb-2">
                  <Badge bg="primary" className="rounded-circle p-1" style={{ width: 20, height: 20 }}>3</Badge>
                  <span>Cấp mã bệnh nhân <code>PAT-xxxx</code> và STT lấy mẫu.</span>
                </div>
                <div className="d-flex align-items-start gap-2 mb-2">
                  <Badge bg="primary" className="rounded-circle p-1" style={{ width: 20, height: 20 }}>4</Badge>
                  <span>In Phiếu Tiếp Đón K80 &rarr; Hướng dẫn vào Phòng 101.</span>
                </div>
                <div className="d-flex align-items-start gap-2">
                  <Badge bg="primary" className="rounded-circle p-1" style={{ width: 20, height: 20 }}>5</Badge>
                  <span>Chuyển Quầy Dự Toán &amp; Thu Ngân thu viện phí.</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default RegisterWalkInPage;
