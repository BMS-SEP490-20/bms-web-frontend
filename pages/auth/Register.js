/**
 * Register Page Component
 * 
 * User registration page for the Blood Laboratory Management System.
 * Implements multi-step registration process with OTP verification
 * and form validation for secure account creation.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { authService } from '../../services/authService';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Steps from '../../shared/components/Steps/Steps';
import { emailService } from '../../services/emailService';
import { patientService } from '../../services/patientService';
import { validateDateOfBirthAge, getMinDateOfBirth, getMaxDateOfBirth } from '../../shared/utils/patientInfoValidator';
import background1 from '../../assets/background1.png';
import useResponsive from '../../shared/hooks/useResponsive';

/**
 * Register Component
 * 
 * Multi-step registration form with OTP verification.
 * After OTP verification, automatically creates account and sends login credentials via email.
 * 
 * @returns {React.ReactNode} Register page component
 */
const Register = () => {
  const { isMobile, isTablet } = useResponsive();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    dateOfBirth: ''
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0); // Countdown timer in seconds
  const [otpExpired, setOtpExpired] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [createdAccountId, setCreatedAccountId] = useState(null);
  const [accountCredentials, setAccountCredentials] = useState(null);

  // Use refs to track state and prevent reset
  // Initialize refs from sessionStorage if available (in case of remount)
  const accountCreatedRef = useRef(sessionStorage.getItem('register_accountCreated') === 'true');
  const stepRef = useRef(parseInt(sessionStorage.getItem('register_step') || '1', 10));

  const { register, sendOTP, verifyOTP } = useAuth();
  const { showSuccess, showError, showInfo, showWarning } = useNotificationContext();
  const navigate = useNavigate();

  // Clear sessionStorage on mount if user is starting a new registration
  // Only restore if we're in the middle of an active registration (within last 10 minutes)
  useEffect(() => {
    const savedAccountCreated = sessionStorage.getItem('register_accountCreated') === 'true';
    const savedStep = parseInt(sessionStorage.getItem('register_step') || '1', 10);
    const savedEmail = sessionStorage.getItem('register_email');
    const savedTimestamp = parseInt(sessionStorage.getItem('register_timestamp') || '0', 10);
    const now = Date.now();
    const timeSinceSave = now - savedTimestamp;
    const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds

    // If sessionStorage data is too old (more than 10 minutes), clear it
    if (savedTimestamp > 0 && timeSinceSave > TEN_MINUTES) {
      sessionStorage.removeItem('register_accountCreated');
      sessionStorage.removeItem('register_step');
      sessionStorage.removeItem('register_email');
      sessionStorage.removeItem('register_timestamp');
      // Reset refs and state
      accountCreatedRef.current = false;
      stepRef.current = 1;
      setAccountCreated(false);
      setStep(1);
      return;
    }

    // Only restore if we're in the middle of an active registration (step 3, account created)
    if (savedAccountCreated && savedStep === 3 && savedEmail && timeSinceSave < TEN_MINUTES) {
      accountCreatedRef.current = true;
      stepRef.current = 3;
      setAccountCreated(true);
      setStep(3);

      // Restore email to formData if it's missing
      if (savedEmail && !formData.email) {
        setFormData(prev => ({
          ...prev,
          email: savedEmail
        }));
      }
    } else {
      // Starting fresh registration - clear any old data
      sessionStorage.removeItem('register_accountCreated');
      sessionStorage.removeItem('register_step');
      sessionStorage.removeItem('register_email');
      sessionStorage.removeItem('register_timestamp');
      accountCreatedRef.current = false;
      stepRef.current = 1;
      setAccountCreated(false);
      setStep(1);
    }
  }, []); // Only run on mount

  // Auto transition to step 3 when account is created
  useEffect(() => {
    if (accountCreated && step !== 3) {
      // Force update step to 3
      setStep(prevStep => {
        stepRef.current = 3;
        return 3;
      });
    }
  }, [accountCreated]); // Chỉ depend on accountCreated, không depend on step để tránh loop

  // Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0 && step === 2 && !otpExpired) {
      const timer = setTimeout(() => {
        setOtpCountdown(prev => {
          if (prev <= 1) {
            setOtpExpired(true);
            showError('Mã OTP đã hết hiệu lực. Vui lòng thử lại!');
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
  }, [otpCountdown, step, otpExpired, navigate, showError]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate email
    if (!formData.email) {
      const errorMsg = 'Vui lòng nhập email';
      setError(errorMsg);
      showError(errorMsg);
      setLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      const errorMsg = 'Email không hợp lệ. Vui lòng nhập đúng định dạng email';
      setError(errorMsg);
      showError(errorMsg);
      setLoading(false);
      return;
    }

    try {
      // Kiểm tra email đã tồn tại chưa trước khi gửi OTP
      const emailCheck = await authService.checkEmailExists(formData.email);

      // Chỉ block nếu chắc chắn email đã tồn tại
      if (emailCheck.success && emailCheck.exists === true) {
        const errorMsg = emailCheck.message || 'Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.';
        setError(errorMsg);
        showError(errorMsg);
        setLoading(false);
        return;
      }

      // Nếu có warning nhưng không block, hiển thị info và tiếp tục
      if (emailCheck.warning) {
        showInfo('Đang kiểm tra email... Tiếp tục với quá trình đăng ký.');
      }

      // Email chưa tồn tại hoặc không thể check, tiếp tục gửi OTP
      // Backend sẽ tự validate khi register
      const result = await sendOTP(formData.email);

      if (result.success) {
        showSuccess(`✅ Mã OTP đã được gửi thành công đến ${formData.email}. Vui lòng kiểm tra email và nhập mã OTP 6 số.`);
        setStep(2);
        setError(''); // Clear any previous errors
        // Start countdown timer: 5 minutes = 300 seconds
        setOtpCountdown(300);
        setOtpExpired(false);
      } else {
        const errorMsg = result.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau';
        setError(errorMsg);
        showError(`❌ ${errorMsg}`);
      }
    } catch (error) {
      // Kiểm tra lại nếu là lỗi email đã tồn tại
      const errorMessage = error.response?.data?.message || error.message || '';
      if (errorMessage.includes('đã tồn tại') || errorMessage.includes('already exists') ||
        errorMessage.includes('Tài khoản đã tồn tại')) {
        const errorMsg = 'Tài khoản đã tồn tại';
        setError(errorMsg);
        showError(errorMsg);
      } else {
        const errorMsg = 'Đã xảy ra lỗi khi gửi mã OTP. Vui lòng thử lại sau';
        setError(errorMsg);
        showError(`❌ ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate OTP
    if (!otp) {
      const errorMsg = 'Vui lòng nhập mã OTP';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
      setLoading(false);
      return;
    }

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      const errorMsg = 'Mã OTP phải là 6 chữ số';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
      setLoading(false);
      return;
    }

    try {
      // Bước 1: Xác thực OTP (truyền email để verify)
      const verifyResult = await verifyOTP(otp, formData.email);

      if (!verifyResult.success) {
        const errorMsg = verifyResult.message || 'Mã OTP không đúng hoặc đã hết hạn';
        setError(errorMsg);
        showError(`❌ ${errorMsg}`);
        setLoading(false);
        return;
      }

      // OTP xác thực thành công
      showSuccess('✅ Xác thực OTP thành công! Đang tạo tài khoản...');

      // Bước 2: Tạo tài khoản
      const registerResult = await register({
        email: formData.email,
        role: 'patient',
        fullName: '',
        phone: ''
        // Không truyền password, hệ thống sẽ tự động tạo
      });

      if (!registerResult.success) {
        const errorMsg = registerResult.message || 'Không thể tạo tài khoản. Vui lòng thử lại sau';
        setError(errorMsg);
        showError(`❌ ${errorMsg}`);
        setLoading(false);
        return;
      }

      // Tài khoản tạo thành công

      // Set tất cả state cùng lúc để tránh race condition
      const username = registerResult.username || (registerResult.data && registerResult.data.includes('Tên đăng nhập:') ? registerResult.data.match(/Tên đăng nhập:\s*(\w+)/)?.[1] : null);

      // CRITICAL: Update refs FIRST and NEVER reset them
      // Refs are the source of truth - they persist even if component remounts
      accountCreatedRef.current = true;
      stepRef.current = 3;

      // Also store in sessionStorage as backup (persists across remounts)
      // Add timestamp to track when registration was started
      sessionStorage.setItem('register_accountCreated', 'true');
      sessionStorage.setItem('register_step', '3');
      sessionStorage.setItem('register_email', formData.email);
      sessionStorage.setItem('register_timestamp', Date.now().toString());


      // Set state đồng bộ
      setAccountCreated(true);
      setCreatedAccountId(registerResult.user?.id || registerResult.accountId || registerResult.data);
      setAccountCredentials({
        username: username,
        password: registerResult.password
      });
      setError('');
      setOtp('');
      setStep(3);


      // Set loading false sau khi set tất cả state để tránh re-render sớm
      setLoading(false);

      // Show notification after state is set
      showInfo('✅ Tài khoản đã được tạo thành công! Vui lòng điền thông tin cá nhân để tiếp tục.');

    } catch (error) {
      const errorMsg = 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại sau';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
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
              name="email"
              value={formData.email}
              onChange={handleChange}
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
          <motion.button
            type="submit"
            className="btn btn-primary btn-lg w-100 rounded-pill py-3"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
              transition: 'all 0.3s ease'
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 12px 40px rgba(0, 102, 204, 0.4)'
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
          </motion.button>
        </motion.div>
      </Form>
    </motion.div>
  );

  const handleSubmitPersonalInfo = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    if (!formData.fullName || formData.fullName.trim() === '') {
      const errorMsg = 'Vui lòng nhập họ và tên';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
      setLoading(false);
      return;
    }

    if (!formData.phone || formData.phone.trim() === '') {
      const errorMsg = 'Vui lòng nhập số điện thoại';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
      setLoading(false);
      return;
    }

    if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s+/g, ''))) {
      const errorMsg = 'Số điện thoại phải có 10-11 chữ số';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
      setLoading(false);
      return;
    }

    // Validate date of birth with age restriction (18-60 years old)
    const dateOfBirthValidation = validateDateOfBirthAge(formData.dateOfBirth);
    if (!dateOfBirthValidation.isValid) {
      setError(dateOfBirthValidation.message);
      showError(`❌ ${dateOfBirthValidation.message}`);
      setLoading(false);
      return;
    }

    try {
      // Get email from formData or sessionStorage (in case formData was reset)
      const patientEmail = formData.email || sessionStorage.getItem('register_email') || '';

      if (!patientEmail) {
        const errorMsg = 'Không tìm thấy email. Vui lòng thử lại từ đầu.';
        setError(errorMsg);
        showError(`❌ ${errorMsg}`);
        setLoading(false);
        return;
      }

      // Create patient record - use backend format (PascalCase)
      const patientData = {
        Fullname: formData.fullName.trim(),
        Email: patientEmail,
        Phone: formData.phone.trim(),
        Dob: formData.dateOfBirth ? formData.dateOfBirth.split('T')[0] : null,
        Gender: 'Unknown',
        Address: 'N/A',
        BloodType: 'N/A',
        IdentityNumber: '',
        Medical_History: ''
      };

      const patientResult = await patientService.createPatient(patientData);

      if (!patientResult.success) {
        const errorMsg = patientResult.message || 'Không thể tạo hồ sơ bệnh nhân. Vui lòng thử lại sau';
        setError(errorMsg);
        showError(`❌ ${errorMsg}`);
        setLoading(false);
        return;
      }

      // Send email with login credentials
      let emailSent = false;
      try {
        if (accountCredentials) {
          const emailResult = await emailService.sendLoginCredentials(
            formData.email,
            accountCredentials.username,
            accountCredentials.password
          );

          if (emailResult.success) {
            showSuccess('🎉 Đăng ký thành công! Thông tin đăng nhập đã được gửi đến email của bạn. Vui lòng kiểm tra email và đăng nhập vào hệ thống.', 8000);
            emailSent = true;
          } else {
            showWarning('⚠️ Đăng ký thành công nhưng không thể gửi email. Vui lòng lưu lại thông tin đăng nhập bên dưới:', 10000);
            setLoginCredentials({
              email: formData.email,
              username: accountCredentials.username,
              password: accountCredentials.password
            });
            emailSent = false;
          }
        } else {
          showWarning('⚠️ Đăng ký thành công nhưng không thể gửi email. Vui lòng liên hệ quản trị viên để lấy thông tin đăng nhập.');
          emailSent = false;
        }
      } catch (emailError) {
        showWarning('⚠️ Đăng ký thành công nhưng không thể gửi email. Vui lòng lưu lại thông tin đăng nhập bên dưới:', 10000);
        if (accountCredentials) {
          setLoginCredentials({
            email: formData.email,
            username: accountCredentials.username,
            password: accountCredentials.password
          });
        }
        emailSent = false;
      }

      setRegistrationSuccess(true);
      setError('');

      // Clear sessionStorage after successful registration
      sessionStorage.removeItem('register_accountCreated');
      sessionStorage.removeItem('register_step');
      sessionStorage.removeItem('register_email');
      sessionStorage.removeItem('register_timestamp');

      // Reset refs
      accountCreatedRef.current = false;
      stepRef.current = 1;

      // Redirect to login after delay
      const redirectDelay = emailSent ? 5000 : 10000;
      setTimeout(() => {
        navigate('/login');
      }, redirectDelay);

    } catch (error) {
      const errorMsg = 'Đã xảy ra lỗi trong quá trình đăng ký. Vui lòng thử lại sau';
      setError(errorMsg);
      showError(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep3 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Alert variant="info" className="mb-4 border-0" style={{ borderRadius: '15px' }}>
        <i className="fas fa-info-circle me-2"></i>
        <strong>Thông tin bắt buộc:</strong> Vui lòng điền đầy đủ các thông tin sau để hoàn tất đăng ký
      </Alert>

      <Form onSubmit={handleSubmitPersonalInfo}>
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-user me-2 text-primary"></i>
              Họ và tên <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nhập họ và tên đầy đủ"
              required
              className="border-2 border-light rounded-pill px-4 py-3"
              style={{
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.8)'
              }}
            />
          </Form.Group>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-phone me-2 text-primary"></i>
              Số điện thoại <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Nhập số điện thoại (10-11 chữ số)"
              required
              className="border-2 border-light rounded-pill px-4 py-3"
              style={{
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.8)'
              }}
            />
          </Form.Group>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold text-dark">
              <i className="fas fa-calendar me-2 text-primary"></i>
              Ngày tháng năm sinh <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              required
              min={getMinDateOfBirth()}
              max={getMaxDateOfBirth()}
              className="border-2 border-light rounded-pill px-4 py-3"
              style={{
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                background: 'rgba(255, 255, 255, 0.8)'
              }}
            />
          </Form.Group>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.button
            type="submit"
            className="btn btn-primary btn-lg w-100 rounded-pill py-3"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
              transition: 'all 0.3s ease'
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 12px 40px rgba(0, 102, 204, 0.4)'
            }}
            
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang hoàn tất đăng ký...
              </>
            ) : (
              <>
                <i className="fas fa-check-circle me-2"></i>
                Hoàn tất đăng ký
              </>
            )}
          </motion.button>
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
        {/* OTP Countdown Timer */}
        {otpCountdown > 0 && (
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

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.button
            type="submit"
            className="btn btn-primary btn-lg w-100 rounded-pill py-3"
            disabled={loading || otpExpired}
            style={{
              background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
              border: 'none',
              fontSize: '1.1rem',
              fontWeight: '600',
              boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
              transition: 'all 0.3s ease'
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: '0 12px 40px rgba(0, 102, 204, 0.4)'
            }}
            
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang xác thực...
              </>
            ) : otpExpired ? (
              <>
                <i className="fas fa-exclamation-triangle me-2"></i>
                OTP đã hết hạn
              </>
            ) : (
              <>
                <i className="fas fa-check-circle me-2"></i>
                Xác thực OTP
              </>
            )}
          </motion.button>
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
          <motion.div  >
            <Button
              variant="light"
              onClick={() => navigate('/')}
              className="d-flex align-items-center shadow-sm rounded-pill px-4 py-2"
            >
              <i className="fas fa-arrow-left me-2"></i>
              Quay lại trang chủ
            </Button>
          </motion.div>
        </motion.div>

        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
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
                      <i className="fas fa-user-plus fa-2x text-white"></i>
                    </motion.div>
                    <motion.h3
                      className="mb-2 fw-bold text-dark"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      Đăng ký tài khoản
                    </motion.h3>
                    <motion.p
                      className="text-muted mb-0"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                    >
                      Tạo tài khoản mới để sử dụng dịch vụ
                    </motion.p>
                  </motion.div>

                  {/* Steps */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <Steps
                      currentStep={step}
                      steps={[
                        { title: 'Nhập email', icon: 'fas fa-envelope' },
                        { title: 'Xác thực OTP', icon: 'fas fa-key' },
                        { title: 'Thông tin cá nhân', icon: 'fas fa-user' }
                      ]}
                    />
                  </motion.div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="danger" className="mb-3 border-0" style={{ borderRadius: '15px' }}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        {error}
                      </Alert>
                    </motion.div>
                  )}

                  {/* Hiển thị thông tin đăng nhập nếu gửi email thất bại */}
                  {loginCredentials && registrationSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="warning" className="mb-3 border-0" style={{ borderRadius: '15px' }}>
                        <h5 className="alert-heading mb-3">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Thông tin đăng nhập của bạn
                        </h5>
                        <p className="mb-2"><strong>📧 Email:</strong> {loginCredentials.email}</p>
                        <p className="mb-2"><strong>👤 Tên đăng nhập:</strong> <code style={{ backgroundColor: '#f8f9fa', padding: '2px 6px', borderRadius: '4px' }}>{loginCredentials.username}</code></p>
                        <p className="mb-2"><strong>🔐 Mật khẩu:</strong> <code style={{ backgroundColor: '#f8f9fa', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em' }}>{loginCredentials.password}</code></p>
                        <hr />
                        <p className="mb-0 small text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Vui lòng lưu lại thông tin này. Bạn sẽ được chuyển đến trang đăng nhập sau vài giây.
                        </p>
                      </Alert>
                    </motion.div>
                  )}

                  {/* Hiển thị thông báo thành công nếu đăng ký thành công và email đã được gửi */}
                  {registrationSuccess && !loginCredentials && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="success" className="mb-3 border-0" style={{ borderRadius: '15px' }}>
                        <h5 className="alert-heading mb-3">
                          <i className="fas fa-check-circle me-2"></i>
                          Đăng ký thành công!
                        </h5>
                        <p className="mb-0">
                          Thông tin đăng nhập đã được gửi đến email của bạn. Vui lòng kiểm tra email và đăng nhập vào hệ thống.
                        </p>
                      </Alert>
                    </motion.div>
                  )}

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.9 }}
                  >
                    {(() => {
                      // Use refs as primary source - they don't get reset
                      // Refs are more reliable than state for this use case
                      const refAccountCreated = accountCreatedRef.current === true;
                      const refStep = stepRef.current;

                      // CRITICAL: If refs say account is created, ALWAYS render step 3
                      // This is the most reliable check since refs don't get reset
                      if (refAccountCreated && !registrationSuccess) {
                        // Update state in background (non-blocking)
                        if (step !== 3) {
                          setTimeout(() => setStep(3), 0);
                        }
                        if (!accountCreated) {
                          setTimeout(() => setAccountCreated(true), 0);
                        }
                        return renderStep3();
                      }

                      // Fallback to state-based rendering
                      if (step === 3 && accountCreated && !registrationSuccess) {
                        return renderStep3();
                      }
                      if (step === 2 && !accountCreated && !refAccountCreated) {
                        return renderStep2();
                      }
                      if (step === 1 && !accountCreated && !refAccountCreated) {
                        return renderStep1();
                      }

                      // Final fallback - should not reach here if refs are working
                      return renderStep1();
                    })()}
                  </motion.div>

                  <motion.div
                    className="text-center mt-4"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.0 }}
                  >
                    <p className="text-muted mb-0">
                      Đã có tài khoản?{' '}
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

export default Register;
