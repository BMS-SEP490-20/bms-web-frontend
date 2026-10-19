/**
 * @file Register.jsx
 * @description Patient self-registration portal with two-phase verification (UC02, UC03, UC04).
 * Collects demographic data and coordinates with OTP verification modal.
 * Conforms to: BR-IAM-01 (Password Complexity), BR-REC-01 & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Modal, Row, Col, InputGroup, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserPlus, FaShieldAlt, FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaVial, FaLock } from 'react-icons/fa';
import api from '../../config/api';
import OtpInputGroup from '../../components/common/OtpInputGroup';

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    identityCard: '', // CCCD 12 số
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    gender: 'Nam',
    dateOfBirth: '',
    address: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OTP Verification Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (showOtpModal && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showOtpModal, countdown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  // Comprehensive validation following BR-IAM-01 and BR-REC-01
  const validateForm = () => {
    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      setErrorMsg('Vui lòng nhập Họ và tên đầy đủ (tối thiểu 2 ký tự).');
      return false;
    }

    // CCCD 12 số
    if (!formData.identityCard.trim() || !/^[0-9]{12}$/.test(formData.identityCard.trim())) {
      setErrorMsg('Số Căn cước công dân (CCCD) phải bao gồm chính xác 12 chữ số.');
      return false;
    }

    // SĐT 10 số đầu số VN
    if (!formData.phoneNumber.trim() || !/^(03|05|07|08|09)[0-9]{8}$/.test(formData.phoneNumber.trim())) {
      setErrorMsg('Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return false;
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setErrorMsg('Địa chỉ Email không đúng định dạng chuẩn.');
      return false;
    }

    // Username
    if (!formData.username.trim() || formData.username.length < 3) {
      setErrorMsg('Tên đăng nhập phải có ít nhất 3 ký tự.');
      return false;
    }

    // Mật khẩu mạnh (BR-IAM-01)
    const pwd = formData.password;
    if (pwd.length < 8) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu 8 ký tự.');
      return false;
    }
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setErrorMsg('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt.');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp với mật khẩu đã nhập.');
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address?.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined
      };
      const res = await api.post('/auth/register', payload);
      setSuccessMsg(res.data?.message || 'Đăng ký thành công! Mã OTP xác thực (6 chữ số) đã được gửi đến email/SĐT của bạn.');
      setShowOtpModal(true);
      setCountdown(60);
      setOtpAttempts(0);
    } catch (err) {
      console.error('[Register] Registration error:', err);
      const msg = err.response?.data?.message || err.response?.data?.Message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpValue || otpValue.trim().length !== 6) {
      setOtpError('Vui lòng nhập đầy đủ 6 chữ số mã OTP.');
      return;
    }

    if (otpAttempts >= 3) {
      setOtpError('Bạn đã nhập sai quá 3 lần. Vui lòng yêu cầu gửi lại mã OTP mới.');
      return;
    }

    setOtpLoading(true);
    setOtpError('');
    try {
      await api.post('/auth/verify-otp', {
        email: formData.email.trim(),
        otp: otpValue.trim()
      });
      setShowOtpModal(false);
      navigate('/login?registered=true');
    } catch (err) {
      setOtpAttempts((prev) => prev + 1);
      const msg = err.response?.data?.message || err.response?.data?.Message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        username: formData.username.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address?.trim() || undefined,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined
      };
      await api.post('/auth/register', payload);
      setCountdown(60);
      setOtpAttempts(0);
      setSuccessMsg('Mã OTP mới đã được gửi lại vào email của bạn.');
    } catch (err) {
      try {
        await api.post('/auth/otp/send', {
          destination: formData.email.trim(),
          purpose: 'Registration'
        });
        setCountdown(60);
        setOtpAttempts(0);
        setSuccessMsg('Mã OTP mới đã được gửi lại vào email của bạn.');
      } catch (subErr) {
        const msg = err.response?.data?.message || subErr.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
        setOtpError(msg);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
            <Card.Header className="text-white py-4 px-4 border-0 text-center" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #0f172a 100%)' }}>
              <div className="d-inline-flex align-items-center justify-content-center bg-white rounded-3 p-1 mb-2 shadow-sm" style={{ width: 56, height: 56, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h3 className="fw-bold mb-1" style={{ fontSize: '24px' }}>Mở Hồ Sơ Sức Khỏe Điện Tử BMS</h3>
              <p className="mb-2 text-white-50 small">
                Đăng ký một lần để lưu trữ lịch sử xét nghiệm trọn đời, nhận kết quả online có chữ ký số và tư vấn 1-1 cùng Bác sĩ Chuyên khoa
              </p>
              <div className="d-flex flex-wrap justify-content-center align-items-center gap-3 pt-2 text-white small" style={{ fontSize: '11px', opacity: 0.9 }}>
                <span><FaShieldAlt className="text-warning me-1" /> Bảo mật thông tin bệnh án (HIPAA)</span>
                <span><FaCheckCircle className="text-success me-1" /> Định danh chính xác theo CCCD 12 số</span>
              </div>
            </Card.Header>

            <Card.Body className="p-4 p-md-5">
              {errorMsg && (
                <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="d-flex align-items-center gap-2">
                  <FaTimesCircle className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </Alert>
              )}

              {successMsg && !showOtpModal && (
                <Alert variant="success" className="d-flex align-items-center gap-2">
                  <FaCheckCircle className="flex-shrink-0" />
                  <span>{successMsg}</span>
                </Alert>
              )}

              <Form onSubmit={handleRegister}>
                <Row className="g-3">
                  {/* Full Name */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Họ và tên bệnh nhân <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        placeholder="Ví dụ: Nguyễn Văn An"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* CCCD (12 số) */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Số CCCD / Định danh (12 số) <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="identityCard"
                        placeholder="Nhập 12 chữ số CCCD"
                        maxLength={12}
                        value={formData.identityCard}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Phone */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Số điện thoại liên hệ <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="tel"
                        name="phoneNumber"
                        placeholder="0912345678"
                        maxLength={10}
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Email */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Địa chỉ Email <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        placeholder="patient@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Username */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Tên đăng nhập <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="username"
                        placeholder="Tên đăng nhập duy nhất"
                        value={formData.username}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Date of Birth & Gender */}
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Ngày sinh</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Giới tính</Form.Label>
                      <Form.Select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Password */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Mật khẩu bảo mật <span className="text-danger">*</span></Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          placeholder="Tối thiểu 8 ký tự (Hoa, thường, số, ký tự đặc biệt)"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                          aria-label="Ẩn hiện mật khẩu"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* Confirm Password */}
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Xác nhận mật khẩu <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        placeholder="Nhập lại mật khẩu"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Address */}
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="fw-semibold small">Địa chỉ thường trú</Form.Label>
                      <Form.Control
                        type="text"
                        name="address"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                        value={formData.address}
                        onChange={handleChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="mt-4 pt-2">
                  <Button
                    variant="primary"
                    type="submit"
                    className="w-100 py-2 fw-bold rounded-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        <span>Đang khởi tạo tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <FaUserPlus />
                        <span>Đăng Ký Tài Khoản Bệnh Nhân</span>
                      </>
                    )}
                  </Button>
                </div>
              </Form>

              <div className="text-center mt-4 pt-3 border-top text-muted small">
                Đã có tài khoản y tế?{' '}
                <Link to="/login" className="text-primary fw-bold text-decoration-none">
                  Đăng nhập ngay
                </Link>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* OTP Verification Modal (UC03, UC04) */}
      <Modal show={showOtpModal} onHide={() => setShowOtpModal(false)} backdrop="static" centered>
        <Form onSubmit={handleVerifyOtp}>
          <Modal.Header className="border-bottom pb-3">
            <Modal.Title className="fw-bold h5 mb-0 d-flex align-items-center gap-2 text-primary">
              <FaLock />
              <span>Xác Thực Mã OTP (6 Chữ Số)</span>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 text-center">
            <p className="text-muted small mb-3">
              Mã bảo mật gồm 6 chữ số đã được gửi đến địa chỉ <strong>{formData.email}</strong>. Vui lòng nhập mã để kích hoạt tài khoản.
            </p>

            {otpError && (
              <Alert variant="danger" className="text-start small py-2 mb-3">
                {otpError}
              </Alert>
            )}

            <div className="d-flex justify-content-center mb-3">
              <OtpInputGroup
                value={otpValue}
                onChange={setOtpValue}
                hasError={Boolean(otpError)}
                disabled={otpLoading}
              />
            </div>

            <div className="text-muted small mt-2">
              {countdown > 0 ? (
                <span>Gửi lại mã sau <strong>{countdown}s</strong></span>
              ) : (
                <Button variant="link" className="p-0 text-primary fw-semibold small" onClick={handleResendOtp}>
                  Gửi lại mã OTP
                </Button>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top">
            <Button variant="secondary" onClick={() => setShowOtpModal(false)}>
              Để Sau
            </Button>
            <Button variant="primary" type="submit" disabled={otpLoading || otpValue.length !== 6}>
              {otpLoading ? 'Đang Xác Thực...' : 'Kích Hoạt Tài Khoản'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
