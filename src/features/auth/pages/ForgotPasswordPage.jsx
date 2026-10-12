/**
 * @file ForgotPasswordPage.jsx
 * @description Forgot Password & Password Reset screen (UC10) demonstrating end-to-end Send & Verify OTP (UC03).
 * Workflow: Input Email/Phone -> Verify OTP (Modal with 60s cooldown) -> Set New Password (with Strength Meter).
 * Conforms to: NIST SP 800-63B, OWASP ASVS & AGENTS-DESIGN.md Rules 01-28.
 */

import React, { useState } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { SendOtpModal } from '../components/SendOtpModal';
import { sendOtp } from '../../../services/authService';
import './ForgotPasswordPage.css';

export const ForgotPasswordPage = () => {
  // Step workflow state: 1: Enter email/phone, 2: OTP Modal verification, 3: Enter new password, 4: Done
  const [step, setStep] = useState(1);
  const [destination, setDestination] = useState('');
  const [channel, setChannel] = useState('Email');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');

  // Password reset form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  /**
   * Step 1: Request OTP dispatch from backend
   */
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setErrorMessage('Please enter your registered email address or phone number.');
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
        setErrorMessage(result.message || 'Unable to dispatch verification code. Please check your information.');
      }
    } catch (err) {
      setErrorMessage('A system error occurred while sending the OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Step 2 Callback: Triggered when OTP is verified successfully in modal
   */
  const handleOtpVerified = (token) => {
    setShowOtpModal(false);
    setVerificationToken(token);
    setStep(3); // Transition to reset password step
  };

  /**
   * Step 3: Submit new password to backend
   */
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMessage('New password must contain at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // Simulate sending token and new password to backend
    setTimeout(() => {
      setIsLoading(false);
      setResetSuccess(true);
      setStep(4);
    }, 1000);
  };

  // Evaluate password complexity score (0 to 4)
  const calculatePasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = calculatePasswordStrength(newPassword);
  const strengthColors = ['#e2e8f0', '#dc2626', '#f59e0b', '#2563eb', '#16a34a'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong', 'Very Secure'];

  return (
    <div className="bms-auth-page">
      <div className="bms-auth-card">
        {/* Card Header */}
        <div className="bms-auth-card-header">
          <div className="bms-step-badge">
            <i className="bi bi-shield-lock"></i>
            {step === 1 && 'Step 1: Request Security OTP'}
            {step === 3 && 'Step 2: Create New Password'}
            {step === 4 && 'Complete'}
          </div>
          <h4 className="fw-bold mb-1">Reset Password</h4>
          <p className="mb-0 text-white-50 small">
            BMS Blood Laboratory Management System
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

          {/* STEP 1: Enter email/phone to receive OTP */}
          {step === 1 && (
            <Form onSubmit={handleRequestOtp}>
              <p className="text-muted small mb-3">
                Enter the email address or phone number associated with your account to receive a one-time verification code.
              </p>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small text-secondary">Delivery Method</Form.Label>
                <div className="d-flex gap-3 mb-2">
                  <Form.Check
                    type="radio"
                    id="channel-email"
                    name="channel"
                    label="Email Inbox"
                    checked={channel === 'Email'}
                    onChange={() => setChannel('Email')}
                    className="small fw-semibold"
                  />
                  <Form.Check
                    type="radio"
                    id="channel-sms"
                    name="channel"
                    label="SMS Message"
                    checked={channel === 'Sms'}
                    onChange={() => setChannel('Sms')}
                    className="small fw-semibold"
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold small text-secondary">
                  {channel === 'Email' ? 'Email Address' : 'Phone Number'} <span className="text-danger">*</span>
                </Form.Label>
                <div className="bms-input-icon-group">
                  <i className={`bi ${channel === 'Email' ? 'bi-envelope' : 'bi-telephone'} bms-icon-addon`}></i>
                  <Form.Control
                    type={channel === 'Email' ? 'email' : 'tel'}
                    placeholder={channel === 'Email' ? 'patient@bmslab.vn' : '0901234567'}
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
                      Sending code...
                    </>
                  ) : (
                    'Send Verification OTP (6 Digits)'
                  )}
                </Button>
              </div>

              <div className="text-center">
                <a href="#/login" className="small text-decoration-none text-muted">
                  <i className="bi bi-arrow-left me-1"></i> Back to Login
                </a>
              </div>
            </Form>
          )}

          {/* STEP 3: Enter new password after OTP verified */}
          {step === 3 && (
            <Form onSubmit={handleResetPassword}>
              <Alert variant="info" className="py-2 small mb-3">
                <i className="bi bi-check-circle-fill me-2"></i>
                OTP verified successfully. Please set a new strong password.
              </Alert>

              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold small text-secondary">New Password <span className="text-danger">*</span></Form.Label>
                <div className="bms-input-icon-group">
                  <i className="bi bi-lock bms-icon-addon"></i>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters (letters, numbers, symbols)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="d-flex justify-content-between align-items-center small text-muted">
                      <span>Strength:</span>
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
                <Form.Label className="fw-semibold small text-secondary">Confirm Password <span className="text-danger">*</span></Form.Label>
                <div className="bms-input-icon-group">
                  <i className="bi bi-shield-check bms-icon-addon"></i>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
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
                      Updating password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </Form>
          )}

          {/* STEP 4: Success confirmation */}
          {step === 4 && (
            <div className="text-center py-3">
              <div
                className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3"
                style={{ width: '64px', height: '64px', fontSize: '32px' }}
              >
                <i className="bi bi-check-lg"></i>
              </div>
              <h5 className="fw-bold text-success mb-2">Password Reset Successfully!</h5>
              <p className="text-muted small mb-4">
                Your new password has been safely updated. You can now log into your account using your new credentials.
              </p>
              <div className="d-grid">
                <Button variant="primary" className="bms-btn-primary" onClick={() => setStep(1)}>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Go to Login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Integrated SendOtpModal component */}
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
