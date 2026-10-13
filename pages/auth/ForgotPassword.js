/**
 * Forgot Password Page
 * 
 * Password recovery page for the Blood Laboratory Management System.
 * Provides multi-step password reset process with email verification,
 * OTP validation, and secure password reset functionality.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import background1 from '../../assets/background1.png';
import { authService } from '../../services/authService';
import useResponsive from '../../shared/hooks/useResponsive';

/**
 * Forgot Password Component
 * 
 * Multi-step password recovery process with email verification and OTP.
 * Provides secure password reset functionality with form validation.
 * 
 * @returns {React.ReactNode} Forgot password component
 */
const ForgotPassword = () => {
  const { isMobile, isTablet } = useResponsive();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0); // Countdown timer in seconds
  const [otpExpired, setOtpExpired] = useState(false);

  const navigate = useNavigate();

  // Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0 && step === 2 && !otpExpired) {
      const timer = setTimeout(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) {
            setOtpExpired(true);
            setError('Mã OTP đã hết hiệu lực. Vui lòng thử lại!');
            setTimeout(() => {
              navigate('/login');
            }, 2000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown, step, otpExpired, navigate]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Email không hợp lệ. Vui lòng nhập đúng định dạng email.');
        setLoading(false);
        return;
      }

      const result = await authService.sendOTP(email);
      
      if (result.success) {
        setSuccess(result.message || 'Mã OTP đã được gửi đến email của bạn');
        setStep(2);
        // Lưu email vào localStorage để dùng ở bước sau
        localStorage.setItem('otpEmail', email);
        // Start countdown timer: 5 minutes = 300 seconds
        setOtpCountdown(300);
        setOtpExpired(false);
      } else {
        setError(result.message || 'Lỗi gửi mã OTP. Vui lòng thử lại.');
      }
    } catch (error) {
      setError('Đã xảy ra lỗi khi gửi mã OTP. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate OTP format (should be 6 digits)
      if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        setError('Mã OTP phải là 6 chữ số');
        setLoading(false);
        return;
      }

      // Lấy email từ localStorage hoặc state
      const emailToVerify = localStorage.getItem('otpEmail') || email;
      
      if (!emailToVerify) {
        setError('Không tìm thấy email. Vui lòng quay lại bước 1.');
        setLoading(false);
        return;
      }

      // Ở bước 2, chỉ validate format OTP, không gọi API
      // API verify sẽ được gọi ở bước 3 cùng với newPassword để tránh OTP bị invalidate
      
      // Lưu OTP và email vào localStorage để dùng ở bước reset password
      localStorage.setItem('otp', otp);
      localStorage.setItem('otpEmail', emailToVerify);
      
      setSuccess('Mã OTP hợp lệ! Vui lòng nhập mật khẩu mới.');
      setStep(3);
    } catch (error) {
      setError('Đã xảy ra lỗi khi xác thực OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      setLoading(false);
      return;
    }

    try {
      // Lấy email và OTP từ localStorage hoặc state
      const emailToReset = localStorage.getItem('otpEmail') || email;
      const otpToUse = otp || localStorage.getItem('otp') || '';
      
      if (!emailToReset) {
        setError('Không tìm thấy email. Vui lòng quay lại bước 1.');
        setLoading(false);
        return;
      }

      if (!otpToUse) {
        setError('Không tìm thấy mã OTP. Vui lòng quay lại bước 2.');
        setLoading(false);
        return;
      }
      
      // Gọi resetPassword với OTP và newPassword cùng lúc
      // Backend sẽ verify OTP và reset password trong một request
      const result = await authService.resetPassword(emailToReset, otpToUse, newPassword);
      
      if (result.success) {
        setSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
        // Xóa tất cả OTP data khỏi localStorage
        localStorage.removeItem('otpEmail');
        localStorage.removeItem('otp');
        localStorage.removeItem('otpVerified');
        localStorage.removeItem('verifiedOtp');
        localStorage.removeItem('verifiedEmail');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.message || 'Lỗi đặt lại mật khẩu. Vui lòng thử lại.');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi đặt lại mật khẩu.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Form onSubmit={handleSendOTP}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-envelope me-2 text-primary"></i>
              Email
            </Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email của bạn"
              required
              className="border-2 border-light rounded-pill px-4 py-3"
              style={{
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.8)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0066cc';
                e.target.style.boxShadow = '0 0 0 0.2rem rgba(0, 102, 204, 0.25)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
                e.target.style.transform = 'translateY(0)';
              }}
            />
          </Form.Group>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100 rounded-pill py-3"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 102, 204, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 102, 204, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang gửi OTP...
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane me-2"></i>
                Gửi mã OTP
              </>
            )}
          </Button>
        </motion.div>
      </Form>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Form onSubmit={handleVerifyOTP}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-key me-2 text-primary"></i>
              Mã OTP
            </Form.Label>
            <Form.Control
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Nhập mã OTP 6 số"
              required
              maxLength={6}
              disabled={otpExpired}
              className="border-2 border-light rounded-pill px-4 py-3 text-center"
              style={{
                fontSize: '1.2rem',
                letterSpacing: '0.5rem',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.8)'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0066cc';
                e.target.style.boxShadow = '0 0 0 0.2rem rgba(0, 102, 204, 0.25)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e9ecef';
                e.target.style.boxShadow = 'none';
                e.target.style.transform = 'translateY(0)';
              }}
            />
          </Form.Group>
        </motion.div>

        {/* OTP Countdown Timer */}
        {otpCountdown > 0 && !otpExpired && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-3"
          >
            <Alert variant="info" className="mb-3 border-0 d-flex align-items-center justify-content-between" style={{ borderRadius: '15px' }}>
              <div>
                <i className="fas fa-clock me-2"></i>
                <strong>Hiệu lực OTP:</strong>
              </div>
              <div className="fw-bold text-primary" style={{ fontSize: '1.1rem' }}>
                {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
              </div>
            </Alert>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100 rounded-pill py-3"
            disabled={loading || otpExpired}
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 102, 204, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 102, 204, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang xác thực...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle me-2"></i>
                Xác thực OTP
              </>
            )}
          </Button>
        </motion.div>
      </Form>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-4 p-3 bg-light rounded-3"
      >
        <div className="text-center">
          <i className="fas fa-info-circle text-primary mb-2" style={{ fontSize: '1.5rem' }}></i>
          <p className="text-muted mb-2">
            <strong>Mã OTP đã được gửi đến email của bạn</strong>
          </p>
          <small className="text-muted">
            Vui lòng kiểm tra hộp thư đến và nhập mã OTP 6 chữ số
          </small>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Form onSubmit={handleResetPassword}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-lock me-2 text-primary"></i>
              Mật khẩu mới
            </Form.Label>
            <InputGroup style={{ position: 'relative' }}>
              <Form.Control
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                required
                className="border-2 border-light px-4 py-3"
                style={{
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderTopLeftRadius: '50px',
                  borderBottomLeftRadius: '50px',
                  borderRight: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0066cc';
                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(0, 102, 204, 0.25)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
              <InputGroup.Text
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="border-2 border-light"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderLeft: 'none',
                  borderTopRightRadius: '50px',
                  borderBottomRightRadius: '50px',
                  cursor: 'pointer',
                  padding: '0.75rem 1.25rem',
                  borderColor: '#e9ecef',
                  userSelect: 'none'
                }}
              >
                <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-primary`}></i>
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-lock me-2 text-primary"></i>
              Xác nhận mật khẩu mới
            </Form.Label>
            <InputGroup style={{ position: 'relative' }}>
              <Form.Control
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="border-2 border-light px-4 py-3"
                style={{
                  fontSize: '1rem',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderTopLeftRadius: '50px',
                  borderBottomLeftRadius: '50px',
                  borderRight: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0066cc';
                  e.target.style.boxShadow = '0 0 0 0.2rem rgba(0, 102, 204, 0.25)';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                }}
              />
              <InputGroup.Text
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="border-2 border-light"
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderLeft: 'none',
                  borderTopRightRadius: '50px',
                  borderBottomRightRadius: '50px',
                  cursor: 'pointer',
                  padding: '0.75rem 1.25rem',
                  borderColor: '#e9ecef',
                  userSelect: 'none'
                }}
              >
                <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-primary`}></i>
              </InputGroup.Text>
            </InputGroup>
          </Form.Group>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-100 rounded-pill py-3"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 102, 204, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 102, 204, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang đặt lại mật khẩu...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Đặt lại mật khẩu
              </>
            )}
          </Button>
        </motion.div>
      </Form>
    </motion.div>
  );

  return (
    <motion.div 
      className="min-vh-100 d-flex align-items-center"
      style={{
        background: `linear-gradient(rgba(0, 102, 204, 0.8), rgba(0, 102, 204, 0.8)), url(${background1}) center/cover no-repeat`,
        backgroundAttachment: 'fixed'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <Container>
        {/* Nút quay lại */}
        <motion.div 
          className="position-absolute top-0 start-0 p-3"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Button
            variant="light"
            onClick={() => navigate('/login')}
            className="d-flex align-items-center shadow-sm rounded-pill px-4 py-2"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Quay lại đăng nhập
          </Button>
        </motion.div>

        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Card 
                className="shadow-lg border-0" 
                style={{ 
                  borderRadius: '25px', 
                  backdropFilter: 'blur(15px)', 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <Card.Body className="p-5">
                  <motion.div 
                    className="text-center mb-4"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <motion.div 
                      className="d-inline-flex align-items-center justify-content-center mb-3" 
                      style={{ 
                        width: '90px', 
                        height: '90px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
                        boxShadow: '0 12px 40px rgba(0, 102, 204, 0.4)'
                      }}
                      whileHover={{ 
                        scale: 1.1,
                        rotate: 5,
                        boxShadow: '0 16px 50px rgba(0, 102, 204, 0.5)'
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <i className="fas fa-key fa-2x text-white"></i>
                    </motion.div>
                    <motion.h3 
                      className="mb-2 fw-bold text-dark"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      Quên mật khẩu
                    </motion.h3>
                    <motion.p 
                      className="text-muted mb-0"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                    >
                      {step === 1 && 'Nhập email để nhận mã OTP'}
                      {step === 2 && 'Nhập mã OTP để xác thực'}
                      {step === 3 && 'Tạo mật khẩu mới cho tài khoản'}
                    </motion.p>
                  </motion.div>

                  {/* Progress Steps */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mb-4"
                  >
                    <div className="d-flex justify-content-center">
                      {[1, 2, 3].map((stepNumber) => (
                        <div key={stepNumber} className="d-flex align-items-center">
                          <motion.div
                            className={`rounded-circle d-flex align-items-center justify-content-center ${
                              step >= stepNumber ? 'bg-primary text-white' : 'bg-light text-muted'
                            }`}
                            style={{ width: '40px', height: '40px' }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.4, delay: 0.9 + stepNumber * 0.1 }}
                          >
                            <i className={`fas ${
                              stepNumber === 1 ? 'fa-envelope' : 
                              stepNumber === 2 ? 'fa-key' : 'fa-lock'
                            }`}></i>
                          </motion.div>
                          {stepNumber < 3 && (
                            <motion.div
                              className={`mx-2 ${step > stepNumber ? 'bg-primary' : 'bg-light'}`}
                              style={{ width: '30px', height: '2px' }}
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ duration: 0.4, delay: 1.0 + stepNumber * 0.1 }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="danger" className="mb-3 border-0" style={{ borderRadius: '15px' }}>
                        {error}
                      </Alert>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="success" className="mb-3 border-0" style={{ borderRadius: '15px' }}>
                        {success}
                      </Alert>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                  >
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                  </motion.div>

                  <motion.div 
                    className="text-center mt-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                  >
                    <p className="text-muted mb-0">
                      Nhớ mật khẩu?{' '}
                      <Button
                        variant="link"
                        className="text-primary p-0 fw-semibold"
                        onClick={() => navigate('/login')}
                        style={{ textDecoration: 'none' }}
                      >
                        Đăng nhập ngay
                      </Button>
                    </p>
                  </motion.div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </motion.div>
  );
};

export default ForgotPassword;