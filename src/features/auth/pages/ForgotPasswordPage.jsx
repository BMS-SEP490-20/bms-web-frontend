/**
 * @file ForgotPasswordPage.jsx
 * @description Màn hình Quên mật khẩu & Đặt lại mật khẩu (UC10) tích hợp luồng Gửi & Xác thực OTP (UC03).
 * Trình diễn toàn bộ quy trình: Nhập Email/SĐT -> Nhận OTP (Modal 6 số với 60s cooldown) -> Đặt lại mật khẩu mới.
 * Tuân thủ: NIST SP 800-63B, OWASP ASVS & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { SendOtpModal } from '../components/SendOtpModal';
import { sendOtp } from '../../../services/authService';
import './ForgotPasswordPage.css';

export const ForgotPasswordPage = () => {
  // Trạng thái các bước: 1: Nhập email, 2: Xác thực OTP (Modal), 3: Nhập mật khẩu mới, 4: Thành công
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [channel, setChannel] = useState('Email');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');

  // Form đặt lại mật khẩu mới
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  /**
   * Bước 1: Gửi yêu cầu mã OTP tới Backend
   */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ Email hoặc Số điện thoại đăng ký.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await sendOtp({
        destination: destination.trim(),
        channel,
        purpose: 'PasswordReset',
      });

      if (result.isSuccess) {
        setShowOtpModal(true);
      } else {
        setErrorMessage(result.message || 'Không thể gửi mã xác thực. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err) {
      setErrorMessage('Lỗi hệ thống trong quá trình gửi mã OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Bước 2 Callback: Khi người dùng hoàn tất xác thực OTP trong Modal
   */
  const handleOtpVerified = (token) => {
    setShowOtpModal(false);
    setVerificationToken(token);
    setStep(3); // Chuyển sang bước đặt mật khẩu mới
  };

  /**
   * Bước 3: Đặt lại mật khẩu mới
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // Giả lập gửi token và mật khẩu mới lên backend
    setTimeout(() => {
      setIsLoading(false);
      setResetSuccess(true);
      setStep(4);
    }, 1000);
  };

  // Tính độ mạnh mật khẩu (Password Strength)
  const calculatePasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0 đến 4
  };

  const strength = calculatePasswordStrength(newPassword);
  const strengthColors = ['#e2e8f0', '#dc2626', '#f59e0b', '#2563eb', '#16a34a'];
  const strengthLabels = ['', 'Yếu', 'Trung bình', 'Khá mạnh', 'Rất an toàn'];

  return (
    <div className="bms-auth-page">
      <div className="bms-auth-card">
        {/* Card Header */}
        <div className="bms-auth-card-header">
          <div className="bms-step-badge">
            <i className="bi bi-shield-lock"></i>
            {step === 1 && 'Bước 1: Nhận mã xác thực OTP'}
            {step === 3 && 'Bước 2: Tạo mật khẩu mới'}
            {step === 4 && 'Hoàn tất quy trình'}
          </div>
          <h4 className="fw-bold mb-1">Cấp Lại Mật Khẩu</h4>
          <p className="mb-0 text-white-50 small">
            Hệ thống Quản lý Phòng Xét nghiệm Y khoa BMS
          </p>
        </div>

        {/* Card Body */}
        <div className="bms-auth-card-body">
          {errorMessage && (
            <Alert variant="danger" dismissible onClose={() => setErrorMessage('')} className="py-2 small">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {errorMessage}
            </Alert>
          )}

          {/* BƯỚC 1: Form yêu cầu gửi OTP */}
          {step === 1 && (
            <Form onSubmit={handleRequestOtp}>
              <p className="text-muted small mb-3">
                Nhập địa chỉ Email hoặc Số điện thoại đã liên kết với tài khoản bệnh nhân/nhân viên y tế để nhận mã OTP xác minh danh tính.
              </p>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small text-secondary">Phương thức nhận mã</Form.Label>
                <div className="d-flex gap-3 mb-2">
                  <Form.Check
                    type="radio"
                    id="channel-email"
                    name="channel"
                    label="Hộp thư Email"
                    checked={channel === 'Email'}
                    onChange={() => setChannel('Email')}
                    className="small fw-semibold"
                  />
                  <Form.Check
                    type="radio"
                    id="channel-sms"
                    name="channel"
                    label="Tin nhắn SMS"
                    checked={channel === 'Sms'}
                    onChange={() => setChannel('Sms')}
                    className="small fw-semibold"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold small text-secondary">
                  {channel === 'Email' ? 'Địa chỉ Email' : 'Số điện thoại'} <span className="text-danger">*</span>
                </Form.Label>
                <div className="bms-input-icon-group">
                  <i className={`bi ${channel === 'Email' ? 'bi-envelope' : 'bi-telephone'} bms-icon-addon`}></i>
                  <Form.Control
                    type={channel === 'Email' ? 'email' : 'tel'}
                    placeholder={channel === 'Email' ? 'nhanvien@bmslab.vn' : '0901234567'}
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                  />
                </div>
              </Form.Group>

              <div className="d-grid mb-3">
                <Button type="submit" className="bms-btn-primary" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang xử lý gửi mã...
                    </>
                  ) : (
                    'Gửi Mã Xác Thực OTP (6 Số)'
                  )}
                </Button>
              </div>

              <div className="text-center">
                <a href="#/login" className="small text-decoration-none text-muted">
                  <i className="bi bi-arrow-left me-1"></i> Quay lại trang Đăng nhập
                </a>
              </div>
            </Form>
          )}

          {/* BƯỚC 3: Nhập mật khẩu mới sau khi OTP thành công */}
          {step === 3 && (
            <Form onSubmit={handleResetPassword}>
              <Alert variant="info" className="py-2 small mb-3">
                <i className="bi bi-check-circle-fill me-2"></i>
                Đã xác thực OTP thành công. Vui lòng thiết lập mật khẩu mới có tính bảo mật cao.
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small text-secondary">Mật khẩu mới <span className="text-danger">*</span></Form.Label>
                <div className="bms-input-icon-group">
                  <i className="bi bi-lock bms-icon-addon"></i>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 8 ký tự (chữ, số, ký tự đặc biệt)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                {/* Strength Bar */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="d-flex justify-content-between align-items-center small text-muted">
                      <span>Độ an toàn:</span>
                      <strong style={{ color: strengthColors[strength] }}>{strengthLabels[strength]}</strong>
                    </div>
                    <div className="bms-password-strength-bar">
                      <div
                        className="bms-password-strength-fill"
                        style={{
                          width: `${(strength / 4) * 100}%`,
                          backgroundColor: strengthColors[strength],
                        }}
                      />
                    </div>
                  </div>
                )}
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold small text-secondary">Xác nhận mật khẩu <span className="text-danger">*</span></Form.Label>
                <div className="bms-input-icon-group">
                  <i className="bi bi-shield-check bms-icon-addon"></i>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Nhập lại chính xác mật khẩu trên"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </Form.Group>

              <div className="d-grid mb-3">
                <Button type="submit" className="bms-btn-primary" disabled={isLoading || strength < 2}>
                  {isLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Đang cập nhật mật khẩu...
                    </>
                  ) : (
                    'Cập Nhật Mật Khẩu'
                  )}
                </Button>
              </div>
            </Form>
          )}

          {/* BƯỚC 4: Hoàn tất */}
          {step === 4 && (
            <div className="text-center py-3">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3"
                style={{ width: '64px', height: '64px', fontSize: '32px' }}
              >
                <i className="bi bi-check-lg"></i>
              </div>
              <h5 className="fw-bold text-success mb-2">Đổi Mật Khẩu Thành Công!</h5>
              <p className="text-muted small mb-4">
                Mật khẩu mới của bạn đã được cập nhật an toàn trong cơ sở dữ liệu. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
              </p>
              <div className="d-grid">
                <Button variant="primary" className="bms-btn-primary" onClick={() => setStep(1)}>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Đăng Nhập Ngay
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tích hợp SendOtpModal chuẩn UC03 */}
      <SendOtpModal
        show={showOtpModal}
        onHide={() => setShowOtpModal(false)}
        destination={destination}
        channel={channel}
        purpose="PasswordReset"
        onVerified={handleOtpVerified}
      />
    </div>
  );
};

export default ForgotPasswordPage;
