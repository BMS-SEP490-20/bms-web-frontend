/**
 * @file SendOtpModal.jsx
 * @description Modal xác thực mã OTP 2 lớp (2FA) bảo mật y tế chuyên biệt (UC03).
 * Tích hợp tự động đếm ngược 60 giây chống Spam/Rate Limit, hiển thị thông tin mask,
 * xử lý gửi lại mã (Resend) và xác thực hoàn tất quy trình.
 * Tuân thủ: RFC 6238, OWASP Authentication Rules & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { OtpInputGroup } from '../../../components/common/OtpInputGroup';
import { maskDestination } from '../../../utils/maskSensitive';
import { useCountdown } from '../../../hooks/useCountdown';
import { sendOtp, verifyOtp } from '../../../services/authService';
import './SendOtpModal.css';

/**
 * @typedef {object} SendOtpModalProps
 * @property {boolean} show - Trạng thái hiển thị Modal.
 * @property {Function} onHide - Callback khi người dùng đóng modal.
 * @property {string} destination - Email hoặc Số điện thoại người nhận.
 * @property {'Registration'|'PasswordReset'|'Login'|'Transaction'} [purpose='PasswordReset'] - Mục đích nghiệp vụ OTP.
 * @property {'Email'|'Sms'} [channel='Email'] - Phương thức nhận mã.
 * @property {Function} onVerified - Callback được gọi khi OTP được xác thực thành công `(verificationToken: string) => void`.
 */

export const SendOtpModal = ({
  show,
  onHide,
  destination,
  purpose = 'PasswordReset',
  channel = 'Email',
  onVerified,
}) => {
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Bộ đếm ngược thời gian chờ gửi lại mã (60 giây mặc định)
  const {
    seconds: resendSeconds,
    formattedTime: resendFormattedTime,
    isActive: isCountdownActive,
    start: startCountdown,
    reset: resetCountdown,
  } = useCountdown(60);

  // Khi modal mở lên, bắt đầu đếm ngược thời gian và reset form
  useEffect(() => {
    if (show) {
      setOtpValue('');
      setErrorMessage('');
      setSuccessMessage('Mã OTP 6 chữ số đã được gửi. Vui lòng kiểm tra hộp thư của bạn.');
      resetCountdown(60, true);
    }
  }, [show, resetCountdown]);

  /**
   * Xử lý xác thực mã OTP khi người dùng bấm Xác nhận hoặc nhập đủ 6 số
   */
  const handleVerify = useCallback(async (codeToVerify = null) => {
    const finalOtp = codeToVerify || otpValue;
    if (finalOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const result = await verifyOtp({
        destination,
        otp: finalOtp,
        purpose,
      });

      if (result.isSuccess) {
        setSuccessMessage('Xác thực danh tính thành công!');
        setTimeout(() => {
          onVerified?.(result.verificationToken);
        }, 600);
      } else {
        setErrorMessage(result.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err) {
      setErrorMessage('Đã xảy ra sự cố mạng. Vui lòng thử lại sau.');
    } finally {
      setIsVerifying(false);
    }
  }, [destination, otpValue, purpose, onVerified]);

  /**
   * Xử lý gửi lại mã OTP (Resend)
   */
  const handleResendOtp = async () => {
    if (isCountdownActive || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const result = await sendOtp({
        destination,
        channel,
        purpose,
      });

      if (result.isSuccess) {
        setSuccessMessage(result.message || 'Đã gửi lại mã OTP mới!');
        setOtpValue('');
        resetCountdown(result.cooldownSeconds || 60, true);
      } else {
        setErrorMessage(result.message || 'Không thể gửi lại mã OTP.');
      }
    } catch (err) {
      setErrorMessage('Lỗi kết nối khi gửi lại mã. Vui lòng thử lại.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      backdrop="static"
      className="bms-otp-modal"
      aria-labelledby="bms-otp-modal-title"
    >
      <Modal.Header closeButton className="bms-otp-modal-header">
        <Modal.Title id="bms-otp-modal-title" className="h5 fw-bold m-0 d-flex align-items-center">
          <i className="bi bi-shield-lock-fill me-2 fs-5"></i>
          Xác Thực Mã Bảo Mật (OTP)
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 text-center">
        {/* Shield icon */}
        <div className="bms-otp-shield-icon">
          <i className="bi bi-shield-check"></i>
        </div>

        <h5 className="fw-bold text-dark mb-1">Nhập mã xác nhận 6 chữ số</h5>
        <p className="text-muted small mb-2">
          Mã xác thực đã được gửi tới {channel === 'Email' ? 'hộp thư điện tử' : 'số điện thoại'}:
        </p>

        {/* Masked destination info */}
        <div>
          <span className="bms-otp-destination-badge">
            <i className={`bi ${channel === 'Email' ? 'bi-envelope-at' : 'bi-phone'}`}></i>
            {maskDestination(destination)}
          </span>
        </div>

        {/* Feedback Messages */}
        {successMessage && !errorMessage && (
          <Alert variant="success" className="py-2 px-3 small text-start mt-2 mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="danger" className="py-2 px-3 small text-start mt-2 mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {errorMessage}
          </Alert>
        )}

        {/* 6-Digit PIN input group with auto-advance and shake on error */}
        <OtpInputGroup
          length={6}
          value={otpValue}
          onChange={(newVal) => {
            setOtpValue(newVal);
            if (errorMessage) setErrorMessage('');
          }}
          onComplete={(completedCode) => handleVerify(completedCode)}
          hasError={Boolean(errorMessage)}
          disabled={isVerifying || isResending}
          autoFocus={show}
        />

        <div className="small text-muted mb-3">
          <i className="bi bi-clock-history me-1"></i>
          Mã có hiệu lực trong vòng <strong>5 phút</strong>.
        </div>

        {/* Action Button */}
        <div className="d-grid gap-2">
          <Button
            variant="primary"
            size="lg"
            className="bms-otp-submit-btn text-white"
            onClick={() => handleVerify()}
            disabled={otpValue.length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang xác thực...
              </>
            ) : (
              'Xác Nhận & Tiếp Tục'
            )}
          </Button>
        </div>

        {/* Resend Cooldown Section */}
        <div className="bms-resend-wrapper">
          <span>Chưa nhận được mã? </span>
          <button
            type="button"
            className="bms-resend-btn"
            onClick={handleResendOtp}
            disabled={isCountdownActive || isResending}
          >
            {isResending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Đang gửi...
              </>
            ) : isCountdownActive ? (
              <>
                Gửi lại sau
                <span className="bms-resend-countdown">({resendFormattedTime})</span>
              </>
            ) : (
              'Gửi lại mã ngay'
            )}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SendOtpModal;
