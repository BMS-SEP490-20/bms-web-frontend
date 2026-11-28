import '../walkin.css';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Modal, Form, InputGroup, Alert, Badge, Spinner, Row, Col } from 'react-bootstrap';
import { QRCodeSVG } from 'qrcode.react';
import { IdCard, User, Phone as LucidePhone, Calendar, CheckCircle2, Search, UserCheck, Ticket as LucideTicket, Printer, Monitor, ClipboardCheck, AlertTriangle, Hospital, ArrowRight, ShieldCheck, Clock, DoorOpen, Undo2 } from 'lucide-react';
import { useRegisterWalkIn } from '../hooks/useRegisterWalkIn';
import { walkInApi } from '../api/walkInApi';
import { queueApi } from '../../reception/api/queueApi';
import { PosThermalModal } from '../../../shared/components/PosThermalSlip';

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
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [lookupMsg, setLookupMsg] = useState(null);
  const [existingPatient, setExistingPatient] = useState(null);
  const [phoneLookup, setPhoneLookup] = useState({ status: 'idle', patient: null });
  const [emailLookup, setEmailLookup] = useState({ status: 'idle', patient: null });
  const cccdSeqRef = useRef(0);
  const phoneSeqRef = useRef(0);
  const emailSeqRef = useRef(0);

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
      if (!val) return 'Số CCCD không được để trống.';
      if (val.length !== 12) return 'Số CCCD phải gồm đúng 12 chữ số.';
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

    if (key === 'identityNumber') {
      setLookupStatus('idle');
      setLookupMsg(null);
      setExistingPatient(null);
    }
  };

  const normalizeLookupPatient = (res, fallbackCccd = '') => ({
    patientId: res.patientId || res.PatientId,
    patientCode: res.patientCode || res.PatientCode || res.patientId || res.PatientId,
    fullName: res.fullName || res.FullName,
    identityNumber: res.identityNumber || res.IdentityNumber || fallbackCccd,
    phone: res.phone || res.Phone || '',
    email: res.email || res.Email || '',
    address: res.address || res.Address || '',
    bloodType: res.bloodType || res.BloodType || '',
    dateOfBirth: res.dateOfBirth || res.DateOfBirth,
    gender: res.gender || res.Gender || 'Male',
  });

  const onLookupCccd = useCallback(async (overrideCccd) => {
    const cccd = (typeof overrideCccd === 'string' ? overrideCccd : form.identityNumber || '').trim();
    if (!cccd) {
      setLookupStatus('idle');
      setLookupMsg(null);
      setExistingPatient(null);
      return;
    }
    if (cccd.length !== 12) {
      setLookupStatus('error');
      setLookupMsg(`Số định danh cá nhân / CCCD phải gồm đúng 12 chữ số (hiện tại ${cccd.length}/12).`);
      setExistingPatient(null);
      return;
    }

    const seq = ++cccdSeqRef.current;
    setLookupStatus('checking');
    setLookupMsg(null);
    setExistingPatient(null);

    try {
      const res = await walkInApi.lookupByIdentity(cccd);
      if (seq !== cccdSeqRef.current) return;
      if (res?.exists || res?.Exists) {
        const found = normalizeLookupPatient(res, cccd);
        setExistingPatient(found);
        setLookupStatus('found');
        setLookupMsg(`CCCD đã tồn tại — thuộc về ${found.fullName} (${found.patientCode || found.patientId}).`);
      } else {
        setExistingPatient(null);
        setLookupStatus('not_found');
        setLookupMsg('CCCD hợp lệ — Chưa có trong CSDL, sẵn sàng đăng ký hồ sơ mới.');
      }
    } catch (err) {
      if (seq !== cccdSeqRef.current) return;
      setLookupStatus('error');
      setLookupMsg(err?.message || 'Không thể kết nối đối soát thông tin CCCD lúc này.');
    }
  }, [form.identityNumber]);

  useEffect(() => {
    const cccd = (form.identityNumber || '').trim();
    if (!cccd) {
      cccdSeqRef.current += 1;
      setLookupStatus('idle');
      setLookupMsg(null);
      setExistingPatient(null);
      return;
    }
    if (cccd.length < 12) {
      cccdSeqRef.current += 1;
      setLookupStatus('idle');
      setLookupMsg(null);
      setExistingPatient(null);
      return;
    }
    const timer = setTimeout(() => {
      void onLookupCccd(cccd);
    }, 260);
    return () => clearTimeout(timer);
  }, [form.identityNumber, onLookupCccd]);

  useEffect(() => {
    const phone = (form.phone || '').trim();
    if (!phone || !/^0[35789]\d{8}$/.test(phone)) {
      phoneSeqRef.current += 1;
      setPhoneLookup({ status: 'idle', patient: null });
      return;
    }
    const seq = ++phoneSeqRef.current;
    setPhoneLookup({ status: 'checking', patient: null });
    const timer = setTimeout(async () => {
      try {
        const res = await walkInApi.lookupByPhone(phone);
        if (seq !== phoneSeqRef.current) return;
        if (res?.exists || res?.Exists) {
          const found = normalizeLookupPatient(res);
          const sameAsCccd = Boolean(form.identityNumber && found.identityNumber && form.identityNumber.trim() === found.identityNumber.trim());
          setPhoneLookup({ status: sameAsCccd ? 'ok' : 'conflict', patient: found });
        } else {
          setPhoneLookup({ status: 'ok', patient: null });
        }
      } catch {
        if (seq === phoneSeqRef.current) setPhoneLookup({ status: 'idle', patient: null });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [form.phone, form.identityNumber]);

  useEffect(() => {
    const email = (form.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailSeqRef.current += 1;
      setEmailLookup({ status: 'idle', patient: null });
      return;
    }
    const seq = ++emailSeqRef.current;
    setEmailLookup({ status: 'checking', patient: null });
    const timer = setTimeout(async () => {
      try {
        const res = await walkInApi.lookupByEmail(email);
        if (seq !== emailSeqRef.current) return;
        if (res?.exists || res?.Exists) {
          const found = normalizeLookupPatient(res);
          const sameAsCccd = Boolean(form.identityNumber && found.identityNumber && form.identityNumber.trim() === found.identityNumber.trim());
          setEmailLookup({ status: sameAsCccd ? 'ok' : 'conflict', patient: found });
        } else {
          setEmailLookup({ status: 'ok', patient: null });
        }
      } catch {
        if (seq === emailSeqRef.current) setEmailLookup({ status: 'idle', patient: null });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [form.email, form.identityNumber]);

  const hasIdentityConflict =
    lookupStatus === 'found' ||
    phoneLookup.status === 'conflict' ||
    emailLookup.status === 'conflict';

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
      fullName: (existingPatient.fullName || prev.fullName || '').toUpperCase(),
      phone: existingPatient.phone || prev.phone,
      email: existingPatient.email || prev.email,
      address: existingPatient.address || prev.address,
      bloodType: existingPatient.bloodType || prev.bloodType,
      identityNumber: existingPatient.identityNumber || prev.identityNumber,
      gender: existingPatient.gender || prev.gender,
      dateOfBirth: formattedDob || prev.dateOfBirth,
    }));
  };

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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!checks.identity || !checks.consent) {
      setCheckError('Vui lòng xác nhận thông tin định danh và đồng thuận lấy mẫu trước khi đăng ký.');
      return;
    }
    setCheckError(null);

    if (lookupStatus === 'found' && existingPatient) {
      setFieldErrors({
        identityNumber: `CCCD ${existingPatient.identityNumber} đã gắn với bệnh nhân ${existingPatient.fullName} (${existingPatient.patientCode || existingPatient.patientId}). Vui lòng dùng hồ sơ sẵn có thay vì tạo mới.`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (phoneLookup.status === 'conflict' && phoneLookup.patient) {
      setFieldErrors({
        phone: `SĐT ${form.phone} đã gắn với bệnh nhân ${phoneLookup.patient.fullName} (${phoneLookup.patient.patientCode || phoneLookup.patient.patientId}).`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (emailLookup.status === 'conflict' && emailLookup.patient) {
      setFieldErrors({
        email: `Email ${form.email} đã gắn với bệnh nhân ${emailLookup.patient.fullName} (${emailLookup.patient.patientCode || emailLookup.patient.patientId}).`
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const errs = validateForm();
    const activeErrKeys = Object.keys(errs).filter((k) => !!errs[k]);
    if (activeErrKeys.length > 0) {
      setFieldErrors(errs);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setFieldErrors({});

    const payload = {
      ...form,
      fullName: form.fullName.trim().toUpperCase(),
      phone: form.phone.trim(),
      identityNumber: form.identityNumber.trim(),
      address: (form.address || '').trim(),

      email: (form.email || '').trim() || null,
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

  const handleResetAll = () => {
    reset();
    cccdSeqRef.current += 1;
    phoneSeqRef.current += 1;
    emailSeqRef.current += 1;
    setForm(emptyForm);
    setLookupMsg(null);
    setLookupStatus('idle');
    setExistingPatient(null);
    setPhoneLookup({ status: 'idle', patient: null });
    setEmailLookup({ status: 'idle', patient: null });
    setIssuedTicket(null);
    setActivePatientData(null);
    setReceptionNotes('');
  };

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
                  <CheckCircle2  size="1em"/>
                </div>
                <div>
                  <h4 className="fw-bold mb-1 text-white">
                    {pt.isExisting ? 'Xác Nhận Tiếp Đón Khách Vãng Lai' : 'Tiếp Nhận & Đăng Ký Hồ Sơ Thành Công'}
                  </h4>
                  <p className="mb-0 text-white-50 small">
                    Hồ sơ hợp lệ
                  </p>
                </div>
              </div>
              <Badge bg="light" text="dark" className="px-3 py-2 fs-6 rounded-pill">
                {pt.priority === 'HIGH' ? '🔥 Luồng Ưu Tiên' : '✅ Luồng Tiêu Chuẩn'}
              </Badge>
            </div>

            <Card.Body className="p-4">

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

              {issuedTicket ? (
                <div
                  className="p-4 text-center rounded-4 mb-4"
                  style={{ background: '#f0fdf4', border: '2px solid #86efac' }}
                >
                  <div className="text-success fw-bold small text-uppercase letter-spacing-1">
                    <CheckCircle2 className="me-1"  size="1em"/> ĐÃ CẤP SỐ THỨ TỰ LẤY MẪU MÁU
                  </div>
                  <div
                    style={{ fontSize: '3.6rem', fontWeight: '900', color: '#059669', lineHeight: 1.1, margin: '8px 0' }}
                  >
                    {issuedTicket.ticketNumber}
                  </div>
                  <div className="fw-semibold text-dark fs-6 mb-2">
                    <DoorOpen className="me-1 text-primary"  size="1em"/> Phòng Lấy Mẫu Máu 101 (Tầng 1 - Trạm lấy mẫu trung tâm)
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
                      <Printer className="me-2"  size="1em"/> In Phiếu Tiếp Đón K80
                    </Button>
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-4 fw-semibold"
                      onClick={() => navigate('/reception/queue')}
                    >
                      <Monitor className="me-2"  size="1em"/> Bảng Điều Phối Hàng Đợi
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
                      <LucideTicket className="me-2"  size="1em"/> Bước tiếp theo: Cấp số thứ tự lấy mẫu
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
                        <LucideTicket className="me-2"  size="1em"/> Cấp STT Lấy Mẫu Ngay
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-2 border-top">
                <Button variant="outline-secondary" className="rounded-pill px-3" onClick={handleResetAll}>
                  <Undo2 className="me-1"  size="1em"/> Tiếp nhận người bệnh tiếp theo
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    variant="success"
                    className="rounded-pill px-3 fw-semibold"
                    onClick={() => navigate(`/appointments/book?patientId=${encodeURIComponent(pt.patientId)}`)}
                  >
                    <Calendar className="me-1" size="1em"/> Tạo Lịch Hẹn &amp; Chọn Gói XN
                  </Button>
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-3 fw-semibold"
                    onClick={() => navigate('/reception/queue')}
                  >
                    <Monitor className="me-1" size="1em"/> Bảng Điều Phối Hàng Đợi
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>

        <PosThermalModal
          show={showK80Modal}
          onClose={() => setShowK80Modal(false)}
          modalTitle="Phiếu Tiếp Đón & Số Thứ Tự (Walk-in)"
          modalBadge="Khổ máy POS K80"
          modalSubtitle={`STT: ${issuedTicket?.ticketNumber || 'B01'} • Mã BN: ${pt?.patientId || '—'}`}
          printTitle={`Phieu_STT_WalkIn_POS_${issuedTicket?.ticketNumber || 'BMS'}`}
          printButtonLabel="In Phiếu STT (K80)"
          copyText={pt?.patientId || ''}
          copyButtonLabel="Sao chép mã BN"
          slipProps={{
            title: 'PHIẾU SỐ THỨ TỰ LẤY MẪU',
            subtitle: 'Tiếp nhận khách vãng lai tại quầy',
            statusBadge: pt?.priority === 'HIGH' ? 'LUỒNG ƯU TIÊN' : 'ĐÃ TIẾP ĐÓN',
            highlight: {
              label: 'SỐ THỨ TỰ',
              value: issuedTicket?.ticketNumber || 'B01',
              sub: 'Phòng Lấy Mẫu 101 • Tầng 1',
            },
            sections: [
              {
                title: 'Thông tin bệnh nhân',
                rows: [
                  { label: 'Bệnh nhân', value: pt?.fullName || '—' },
                  { label: 'Mã bệnh nhân', value: pt?.patientId || '—', mono: true },
                  { label: 'CCCD / VNeID', value: pt?.identityNumber || '', mono: true },
                  { label: 'Số điện thoại', value: pt?.phone || '', mono: true },
                  { label: 'Ngày tiếp nhận', value: todayStr },
                ],
              },
              ...(pt?.portalUsername ? [{
                title: 'Tài khoản tra cứu kết quả',
                rows: [
                  { label: 'Đăng nhập', value: pt.portalUsername, mono: true },
                  { label: 'Mật khẩu tạm', value: pt.temporaryPassword || '(Tài khoản hiện có)', mono: true },
                ],
              }] : []),
            ],
            notice: {
              title: 'Hướng dẫn chờ gọi số',
              lines: [
                'Vui lòng ngồi tại sảnh chờ và theo dõi bảng điện tử gọi số.',
                'Giữ phiếu để đối chiếu tại bàn lấy mẫu và tra cứu kết quả.',
              ],
            },
            qr: {
              value: pt?.patientId || issuedTicket?.ticketNumber || 'PAT-WALKIN',
              codeText: `${issuedTicket?.ticketNumber || 'B01'} • ${pt?.patientId || ''}`,
              caption: 'Mã QR định danh bệnh nhân tại phòng Lab',
              size: 108,
            },
            footerNote: 'Số thứ tự chỉ có giá trị trong ngày tiếp nhận.',
          }}
        />
      </div>
    );
  }

  return (
    <div className="walkin-page w-100 py-1">

      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">Tiếp Nhận Khách Vãng Lai (Walk-in)</h1>
          </div>
          <p className="text-muted mb-0 small mt-1">
            Tiếp đón bệnh nhân chưa đặt lịch, kiểm tra thông tin và cấp số thứ tự lấy mẫu.
          </p>
        </div>
        <div className="bms-page-actions">
          <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-1" onClick={() => navigate('/reception/queue')}>
            <Monitor size={14} /> Bảng Gọi Số
          </Button>
          <Button variant="outline-primary" size="sm" className="rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-1" onClick={() => navigate('/appointments')} style={{ borderColor: '#1E60E6', color: '#1E60E6' }}>
            <Calendar size={14} /> Sổ Lịch Hẹn
          </Button>
        </div>
      </div>

      <Row className="g-4">

        <Col lg={8}>
          <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
            <Card.Header className="bg-white border-bottom py-3 px-4">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <ClipboardCheck className="text-primary"  size="1em"/>
                Hồ Sơ Tiếp Đón Khách Vãng Lai Tại Quầy
              </h5>
            </Card.Header>

            <Card.Body className="p-4">

              {error && (
                <Alert variant="danger" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <AlertTriangle className="text-danger flex-shrink-0"  size="1em"/>
                  <div>
                    <strong>Lỗi:</strong> {error}
                  </div>
                </Alert>
              )}

              {lookupStatus === 'found' && existingPatient && (
                <div
                  className="p-3 rounded-4 mb-4"
                  style={{ background: '#ecfdf5', border: '1.5px solid #10b981' }}
                >
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <div className="d-flex align-items-center gap-2 fw-bold" style={{ color: '#065f46' }}>
                      <UserCheck size={18} />
                      <span>ĐÃ TÌM THẤY HỒ SƠ BỆNH NHÂN TRONG CSDL</span>
                    </div>
                    <span
                      className="font-monospace fw-bold px-2.5 py-1 rounded-pill"
                      style={{ background: '#d1fae5', color: '#065f46', fontSize: '11.5px' }}
                    >
                      Mã BN: {existingPatient.patientCode || existingPatient.patientId}
                    </span>
                  </div>
                  <div
                    className="small mb-3 p-2.5 rounded-3"
                    style={{ background: '#ffffff', color: '#0f172a', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '8px 16px' }}
                  >
                    <div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Họ và tên</div>
                      <div className="fw-bold" style={{ color: '#1E60E6' }}>{existingPatient.fullName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Số CCCD</div>
                      <div className="fw-bold font-monospace">{existingPatient.identityNumber || '—'}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Số điện thoại</div>
                      <div className="fw-bold font-monospace" style={{ color: '#047857' }}>{existingPatient.phone || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>Email</div>
                      <div className="fw-semibold" style={{ wordBreak: 'break-all' }}>{existingPatient.email || 'Chưa cập nhật'}</div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button
                      variant="success"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold"
                      onClick={handleIssueTicketForExisting}
                      disabled={isIssuingTicket}
                    >
                      {isIssuingTicket ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-1" /> Đang cấp số...
                        </>
                      ) : (
                        <>
                          <LucideTicket className="me-1" size="1em"/> Cấp STT Lấy Mẫu Ngay (Phòng 101)
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold"
                      onClick={() => navigate(`/appointments/book?patientId=${encodeURIComponent(existingPatient.patientId)}`)}
                    >
                      <Calendar className="me-1" size="1em"/> Tạo Lịch Hẹn &amp; Chọn Gói XN
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      className="rounded-pill px-3 fw-semibold"
                      onClick={handleLoadExistingIntoForm}
                    >
                      Điền thông tin vào biểu mẫu
                    </Button>
                  </div>
                </div>
              )}

              {lookupStatus === 'not_found' && (
                <Alert variant="info" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <CheckCircle2 className="text-info flex-shrink-0"  size="1em"/>
                  <div className="small">{lookupMsg}</div>
                </Alert>
              )}

              {lookupStatus === 'error' && (
                <Alert variant="warning" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                  <AlertTriangle className="text-warning flex-shrink-0"  size="1em"/>
                  <div className="small">{lookupMsg}</div>
                </Alert>
              )}

              {Object.values(fieldErrors).some(Boolean) && (
                <Alert variant="danger" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-start gap-2">
                  <AlertTriangle className="text-danger mt-1 flex-shrink-0"  size="1em"/>
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

                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                    <IdCard size="1em"/> 1. Thông Tin Định Danh Người Bệnh
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
                          placeholder="Nhập 12 chữ số CCCD — tự động đối soát CSDL"
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
                          onClick={() => onLookupCccd()}
                          disabled={lookupStatus === 'checking'}
                          style={{ minHeight: 44, border: '1px solid #1E60E6' }}
                        >
                          {lookupStatus === 'checking' ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-1" /> Đang kiểm tra...
                            </>
                          ) : (
                            <>
                              <Search className="me-1" size="1em"/> Đối soát ngay
                            </>
                          )}
                        </Button>
                      </div>

                      {form.identityNumber && form.identityNumber.length < 12 && !fieldErrors.identityNumber && (
                        <div className="small mt-1" style={{ color: '#64748b' }}>
                          Đã nhập <strong className="font-monospace">{form.identityNumber.length}/12</strong> chữ số — hệ thống sẽ tự động đối soát CSDL khi đủ 12 số.
                        </div>
                      )}
                      {lookupStatus === 'checking' && (
                        <div className="small mt-1 d-flex align-items-center gap-1" style={{ color: '#1E60E6' }}>
                          <Spinner animation="border" size="sm" /> Đang đối soát CCCD trong CSDL...
                        </div>
                      )}
                      {lookupStatus === 'not_found' && (
                        <div className="small mt-1 fw-semibold d-flex align-items-center gap-1" style={{ color: '#059669' }}>
                          <CheckCircle2 size={13} /> CCCD hợp lệ — chưa tồn tại trong CSDL, sẵn sàng đăng ký mới.
                        </div>
                      )}
                      {lookupStatus === 'found' && existingPatient && (
                        <div className="small mt-1 fw-semibold" style={{ color: '#b45309' }}>
                          CCCD đã gắn với: <strong>{existingPatient.fullName}</strong> ({existingPatient.patientCode || existingPatient.patientId}) · SĐT: <span className="font-monospace">{existingPatient.phone || '—'}</span> · Email: {existingPatient.email || '—'}
                        </div>
                      )}
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
                        isInvalid={!!fieldErrors.phone || phoneLookup.status === 'conflict'}
                        style={{ minHeight: 44 }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.phone}
                      </Form.Control.Feedback>
                      {phoneLookup.status === 'checking' && (
                        <div className="small mt-1 d-flex align-items-center gap-1" style={{ color: '#1E60E6' }}>
                          <Spinner animation="border" size="sm" /> Đang kiểm tra liên kết SĐT...
                        </div>
                      )}
                      {phoneLookup.status === 'ok' && !fieldErrors.phone && (
                        <div className="small mt-1 fw-semibold d-flex align-items-center gap-1" style={{ color: '#059669' }}>
                          <CheckCircle2 size={13} /> Số điện thoại hợp lệ, chưa trùng hồ sơ khác.
                        </div>
                      )}
                      {phoneLookup.status === 'conflict' && phoneLookup.patient && (
                        <div className="small mt-1 fw-semibold" style={{ color: '#dc2626' }}>
                          SĐT đã gắn với <strong>{phoneLookup.patient.fullName}</strong> ({phoneLookup.patient.patientCode || phoneLookup.patient.patientId} · CCCD: <span className="font-monospace">{phoneLookup.patient.identityNumber || '—'}</span> · Email: {phoneLookup.patient.email || '—'}).
                        </div>
                      )}
                    </Col>

                    <Col md={6}>
                      <Form.Label className="text-muted small mb-1">Email nhận kết quả điện tử</Form.Label>
                      <Form.Control
                        type="email"
                        placeholder="email@example.com"
                        value={form.email}
                        onChange={(e) => set('email', e.target.value)}
                        onBlur={(e) => handleBlur('email', e.target.value)}
                        isInvalid={!!fieldErrors.email || emailLookup.status === 'conflict'}
                        style={{ minHeight: 44 }}
                      />
                      <Form.Control.Feedback type="invalid">
                        {fieldErrors.email}
                      </Form.Control.Feedback>
                      {emailLookup.status === 'checking' && (
                        <div className="small mt-1 d-flex align-items-center gap-1" style={{ color: '#1E60E6' }}>
                          <Spinner animation="border" size="sm" /> Đang kiểm tra liên kết Email...
                        </div>
                      )}
                      {emailLookup.status === 'ok' && !fieldErrors.email && (
                        <div className="small mt-1 fw-semibold d-flex align-items-center gap-1" style={{ color: '#059669' }}>
                          <CheckCircle2 size={13} /> Email hợp lệ, chưa trùng hồ sơ khác.
                        </div>
                      )}
                      {emailLookup.status === 'conflict' && emailLookup.patient && (
                        <div className="small mt-1 fw-semibold" style={{ color: '#dc2626' }}>
                          Email đã gắn với <strong>{emailLookup.patient.fullName}</strong> ({emailLookup.patient.patientCode || emailLookup.patient.patientId} · CCCD: <span className="font-monospace">{emailLookup.patient.identityNumber || '—'}</span> · SĐT: <span className="font-monospace">{emailLookup.patient.phone || '—'}</span>).
                        </div>
                      )}
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

                <div className="mb-4">
                  <h6 className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                    <ShieldCheck size="1em"/> 2. Sàng Lọc Trước Lấy Mẫu
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
                    <Col md={12}>
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

                {error && (
                  <Alert variant="danger" className="rounded-3 py-2 px-3 mb-3 d-flex align-items-center gap-2">
                    <AlertTriangle className="text-danger flex-shrink-0"  size="1em"/>
                    <div>
                      <strong>Lỗi:</strong> {error}
                    </div>
                  </Alert>
                )}

                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 border-top">
                  <span className="small" style={{ color: hasIdentityConflict ? '#dc2626' : '#64748b' }}>
                    {hasIdentityConflict ? (
                      <>
                        <AlertTriangle className="me-1" size="1em"/> Phát hiện trùng CCCD / SĐT / Email trong CSDL — vui lòng dùng hồ sơ sẵn có hoặc kiểm tra lại thông tin.
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="text-success me-1" size="1em"/> Hồ sơ sau khi xác nhận sẽ tự động liên kết máy cấp STT.
                      </>
                    )}
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    className="rounded-pill px-4 py-2 fw-bold shadow-sm"
                    style={{ minHeight: 44, backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
                    disabled={loading || hasIdentityConflict || lookupStatus === 'checking'}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" /> Đang lưu hồ sơ...
                      </>
                    ) : (
                      <>
                        <UserCheck className="me-2"  size="1em"/> Xác Nhận Tiếp Nhận &amp; Cấp Hồ Sơ
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>

          <Card className="border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden">
            <Card.Body className="p-3">
              <h6 className="fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                <ShieldCheck className="text-success"  size="1em"/>
                Điều Kiện Trước Lấy Mẫu
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

          <Card className="border-0 shadow-sm rounded-4 mb-3 overflow-hidden" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <Card.Body className="p-3">
              <h6 className="fw-bold text-primary mb-2 d-flex align-items-center gap-2">
                <IdCard size="1em"/>
                Định Danh Hồ Sơ Duy Nhất (Đề Án 06)
              </h6>
              <ul className="small text-muted ps-3 mb-0">
                <li className="mb-1"><strong>CCCD 12 số</strong>, <strong>SĐT</strong> và <strong>Email</strong> gắn liền duy nhất với từng hồ sơ bệnh nhân.</li>
                <li className="mb-1">Hệ thống tự động đối soát CSDL ngay khi gõ để tránh tạo hồ sơ trùng lặp.</li>
                <li>Nếu bệnh nhân đã có hồ sơ, dùng nút <strong>Cấp STT Lấy Mẫu Ngay</strong> hoặc <strong>Tạo Lịch Hẹn</strong>.</li>
              </ul>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden">
            <Card.Body className="p-3">
              <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <Hospital className="text-secondary" size="1em"/>
                Luồng Tiếp Đón Khách Vãng Lai
              </h6>
              <div className="small text-muted d-flex flex-column gap-2">
                {[
                  { n: 1, content: <>Nhập CCCD &rarr; Đối soát tự động hồ sơ cũ trong CSDL.</> },
                  { n: 2, content: <>Khai báo thông tin lâm sàng &amp; tiền phân tích.</> },
                  { n: 3, content: <>Cấp mã bệnh nhân <code>PAT-xxxx</code> và STT lấy mẫu.</> },
                  { n: 4, content: <>In Phiếu Tiếp Đón K80 &rarr; Hướng dẫn vào Phòng 101.</> },
                  { n: 5, content: <>Tạo lịch hẹn / chuyển tiếp vào khu vực khám &amp; lấy mẫu.</> }
                ].map((step) => (
                  <div key={step.n} className="d-flex align-items-start" style={{ gap: '10px', lineHeight: 1.5 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: '#EEF4FD',
                        color: '#1E60E6',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '1px'
                      }}
                    >
                      {step.n}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{step.content}</span>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default RegisterWalkInPage;
