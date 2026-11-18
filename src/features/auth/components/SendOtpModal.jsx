/**
 * @file SendOtpModal.jsx
 * @description Two-Factor Authentication (2FA) OTP Verification Modal component (UC03).
 * Integrates 60-second anti-spam countdown, masked PII recipient badge,
 * resilient resend protection, and 6-digit independent PIN input group.
 * Conforms to: RFC 6238, OWASP Authentication Rules & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Alert, Spinner } from 'react-bootstrap';
import { FaLock, FaCheckCircle, FaEnvelope, FaPhoneAlt, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { OtpInputGroup } from '../../../components/common/OtpInputGroup';
import { maskDestination } from '../../../utils/maskSensitive';
import { useCountdown } from '../../../hooks/useCountdown';
import { sendOtp, verifyOtp } from '../../../services/authService';
import './SendOtpModal.css';

export const SendOtpModal = ({
  show,
  onHide,
  destination,
  purpose = 'PasswordReset',
  channel = 'Email',
  onVerified }) => {
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 60-second resend cooldown timer
  const {
    formattedTime: resendFormattedTime,
    isActive: isCountdownActive,
    reset: resetCountdown } = useCountdown(60);

  // Reset form state and start countdown when modal opens
  useEffect(() => {
    if (show) {
      setOtpValue('');
      setErrorMessage('');
      setSuccessMessage('Mã xác thực gồm 6 chữ số đã được gửi đi. Vui lòng kiểm tra hộp thư của bạn.');
      resetCountdown(60, true);
    }
  }, [show, resetCountdown]);

  /**
   * Handles OTP verification submission
   */
  const handleVerify = useCallback(async (codeToVerify = null) => {
    const finalOtp = codeToVerify || otpValue;
    if (finalOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số của mã xác thực.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    try {
      const result = await verifyOtp({
        destination,
        otp: finalOtp,
        purpose });

      if (result.isSuccess) {
        setSuccessMessage('Xác thực danh tính thành công!');
        setTimeout(() => {
          onVerified?.(result.verificationToken);
        }, 600);
      } else {
        setErrorMessage(result.message || 'Mã xác thực không chính xác hoặc đã hết hạn.');
      }
    } catch {
      setErrorMessage('Không thể kết nối máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setIsVerifying(false);
    }
  }, [destination, otpValue, purpose, onVerified]);

  /**
   * Handles requesting a new OTP code (Resend)
   */
  const handleResendOtp = async () => {
    if (isCountdownActive || isResending) return;

    setIsResending(true);
    setErrorMessage('');

    try {
      const result = await sendOtp({
        destination,
        channel,
        purpose });

      if (result.isSuccess) {
        setSuccessMessage(result.message || 'Mã xác thực mới đã được gửi lại!');
        setOtpValue('');
        resetCountdown(result.cooldownSeconds || 60, true);
      } else {
        setErrorMessage(result.message || 'Không thể gửi lại mã xác thực.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối mạng khi gửi lại mã. Vui lòng thử lại.');
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
      <Modal.Header closeButton className="border-0 pb-0 px-4 pt-4">
        <Modal.Title id="bms-otp-modal-title" className="h5 fw-bold m-0 d-flex align-items-center gap-2 text-dark">
          <FaLock className="text-primary" />
          <span>Xác Thực Mã Bảo Mật (OTP)</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 text-center">
        <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" style={{ width: 56, height: 56, backgroundColor: '#EFF6FF', color: '#1E60E6' }}>
          <FaCheckCircle size={26} />
        </div>

        <h5 className="fw-bold text-dark mb-1">Nhập Mã Xác Thực 6 Chữ Số</h5>
        <p className="text-muted small mb-2">
          Mã bảo mật đã được gửi đến {channel === 'Email' ? 'địa chỉ email' : 'số điện thoại'} của bạn:
        </p>

        {/* Masked destination badge */}
        <div className="mb-3">
          <span className="bms-otp-destination-badge d-inline-flex align-items-center gap-1.5">
            {channel === 'Email' ? <FaEnvelope /> : <FaPhoneAlt />}
            {maskDestination(destination)}
          </span>
        </div>

        {/* Feedback Messages */}
        {successMessage && !errorMessage && (
          <Alert variant="success" className="py-2 px-3 small text-start mt-2 mb-3 border-0 rounded-3 d-flex align-items-center gap-2">
            <FaCheckCircle className="flex-shrink-0" />
            <span>{successMessage}</span>
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="danger" className="py-2 px-3 small text-start mt-2 mb-3 border-0 rounded-3 d-flex align-items-center gap-2">
            <FaExclamationTriangle className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </Alert>
        )}

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

        <div className="small text-muted mb-3 d-inline-flex align-items-center gap-1.5">
          <FaClock />
          <span>Mã có hiệu lực trong <strong>5 phút</strong>.</span>
        </div>

        <div className="d-grid gap-2">
          <Button
            variant="primary"
            size="lg"
            className="rounded-pill fw-semibold text-white"
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

        <div className="bms-resend-wrapper mt-3">
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
                Gửi lại sau <span className="bms-resend-countdown">({resendFormattedTime})</span>
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
