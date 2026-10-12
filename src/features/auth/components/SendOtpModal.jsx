/**
 * @file SendOtpModal.jsx
 * @description Two-Factor Authentication (2FA) OTP Verification Modal component (UC03).
 * Integrates 60-second anti-spam countdown, masked PII recipient badge,
 * resilient resend protection, and 6-digit independent PIN input group.
 * Conforms to: RFC 6238, OWASP Authentication Rules & AGENTS-DESIGN.md Rules 01-28.
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
 * @property {boolean} show - Controls modal visibility.
 * @property {Function} onHide - Invoked when closing or dismissing modal.
 * @property {string} destination - Recipient email or phone number.
 * @property {'Registration'|'PasswordReset'|'Login'|'Transaction'} [purpose='PasswordReset'] - Business purpose.
 * @property {'Email'|'Sms'} [channel='Email'] - Communication channel.
 * @property {Function} onVerified - Triggered upon successful verification `(verificationToken: string) => void`.
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

  // 60-second resend cooldown timer
  const {
    seconds: resendSeconds,
    formattedTime: resendFormattedTime,
    isActive: isCountdownActive,
    start: startCountdown,
    reset: resetCountdown,
  } = useCountdown(60);

  // Reset form state and start countdown when modal opens
  useEffect(() => {
    if (show) {
      setOtpValue('');
      setErrorMessage('');
      setSuccessMessage('A 6-digit verification code has been dispatched. Please check your inbox.');
      resetCountdown(60, true);
    }
  }, [show, resetCountdown]);

  /**
   * Handles OTP verification submission
   */
  const handleVerify = useCallback(async (codeToVerify = null) => {
    const finalOtp = codeToVerify || otpValue;
    if (finalOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
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
        setSuccessMessage('Identity verified successfully!');
        setTimeout(() => {
          onVerified?.(result.verificationToken);
        }, 600);
      } else {
        setErrorMessage(result.message || 'Verification code is invalid or has expired.');
      }
    } catch (err) {
      setErrorMessage('A network error occurred. Please try again.');
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
        purpose,
      });

      if (result.isSuccess) {
        setSuccessMessage(result.message || 'A new verification code has been dispatched!');
        setOtpValue('');
        resetCountdown(result.cooldownSeconds || 60, true);
      } else {
        setErrorMessage(result.message || 'Unable to resend verification code.');
      }
    } catch (err) {
      setErrorMessage('Network connection error while resending code. Please retry.');
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
          Verify Security Code (OTP)
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4 text-center">
        {/* Shield icon */}
        <div className="bms-otp-shield-icon">
          <i className="bi bi-shield-check"></i>
        </div>

        <h5 className="fw-bold text-dark mb-1">Enter 6-Digit Verification Code</h5>
        <p className="text-muted small mb-2">
          A secure code was sent to your {channel === 'Email' ? 'email inbox' : 'mobile phone'}:
        </p>

        {/* Masked destination badge */}
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

        {/* 6-Digit PIN input group with auto-advance and shake animation */}
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
          Code remains valid for <strong>5 minutes</strong>.
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
                Verifying...
              </>
            ) : (
              'Verify & Continue'
            )}
          </Button>
        </div>

        {/* Resend Cooldown Section */}
        <div className="bms-resend-wrapper">
          <span>Didn't receive the code? </span>
          <button
            type="button"
            className="bms-resend-btn"
            onClick={handleResendOtp}
            disabled={isCountdownActive || isResending}
          >
            {isResending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Sending...
              </>
            ) : isCountdownActive ? (
              <>
                Resend in
                <span className="bms-resend-countdown">({resendFormattedTime})</span>
              </>
            ) : (
              'Resend code now'
            )}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SendOtpModal;
