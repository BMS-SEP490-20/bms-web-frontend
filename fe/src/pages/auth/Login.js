/**
 * Login Page Component
 * 
 * User authentication page for the Blood Laboratory Management System.
 * Provides login form with username/password authentication and
 * redirects users to appropriate dashboard based on their role.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useNotificationContext } from '../../shared/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import background1 from '../../assets/background1.png';
import logo1 from '../../assets/logo1.png';
import useResponsive from '../../shared/hooks/useResponsive';

/**
 * Login Component
 * 
 * Handles user authentication with form validation and error handling.
 * Redirects authenticated users to their role-specific dashboard.
 * 
 * @returns {React.ReactNode} Login page component
 */
const Login = () => {
  const { isMobile, isTablet } = useResponsive();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useNotificationContext();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * Get redirect path based on roleId
   * roleId 1, 2, 3, 4 → dashboard pages
   * roleId 5 → patient dashboard
   */
  const getRedirectPathByRoleId = (roleId) => {
    // Convert roleId to number if it's a string, handle both string and number
    const id = typeof roleId === 'string' ? parseInt(roleId, 10) : (typeof roleId === 'number' ? roleId : null);
    
    // If conversion failed, return null to use fallback
    if (id === null || isNaN(id)) {
      return null;
    }
    
    switch (id) {
      case 1: // Admin
        return '/admin/dashboard';
      case 2: // Manager
        return '/manager/dashboard';
      case 3: // Doctor
        return '/doctor/dashboard';
      case 4: // Lab User
        return '/lab-user/dashboard';
      case 5: // Patient
        return '/patient/dashboard';
      case 6: // Receptionist
        return '/receptionist/dashboard';
      default:
        // Fallback: try to get from role string
        return '/dashboard';
    }
  };

  /**
   * Get redirect path based on role string (fallback)
   */
  const getRedirectPathByRole = (role) => {
    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'patient':
        return '/patient/dashboard';
      case 'doctor':
        return '/doctor/dashboard';
      case 'lab_user':
        case 'labuser':
        case 'lab user':
        case 'lab-user':
        return '/lab-user/dashboard';
      case 'receptionist':
        return '/receptionist/dashboard';
      case 'manager':
        return '/manager/dashboard';
      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      // Priority: Use roleId first (convert to number), then fallback to role string
      const roleId = result.user?.roleId;
      let redirectPath = null;
      
      // Try to get path from roleId (number or string that can be converted)
      if (roleId !== undefined && roleId !== null) {
        redirectPath = getRedirectPathByRoleId(roleId);
      }
      
      // Fallback to role string if roleId path is null
      if (!redirectPath) {
        redirectPath = getRedirectPathByRole(result.user?.role || 'patient');
      }
      
      showSuccess(`Đăng nhập thành công! Chào mừng ${result.user?.fullName || result.user?.username || 'bạn'}!`);
      navigate(redirectPath);
    } else {
      setError(result.message);
      showError(result.message);
    }
    
    setLoading(false);
  };

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
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
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
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '50%', 
                        background: 'transparent',
                        overflow: 'hidden'
                      }}
                      whileHover={{ 
                        scale: 1.1,
                        rotate: 5
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <img 
                        src={logo1} 
                        alt="Logo" 
                        style={{
                          width: '120px',
                          height: '120px',
                          objectFit: 'contain',
                          borderRadius: '50%'
                        }}
                      />
                    </motion.div>
                    <motion.h3 
                      className="mb-2 fw-bold text-dark"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                    >
                      Phòng Xét Nghiệm Máu
                    </motion.h3>
                    <motion.p 
                      className="text-muted mb-0"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                    >
                      Đăng nhập vào hệ thống xét nghiệm máu
                    </motion.p>
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

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <Form onSubmit={handleSubmit}>
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.9 }}
                      >
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-user me-2 text-primary"></i>
                            Tài khoản
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Nhập tài khoản của bạn"
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
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.0 }}
                      >
                        <Form.Group className="mb-3">
                          <Form.Label className="fw-semibold">
                            <i className="fas fa-lock me-2 text-primary"></i>
                            Mật khẩu
                          </Form.Label>
                          <InputGroup style={{ position: 'relative' }}>
                            <Form.Control
                              type={showPassword ? "text" : "password"}
                              name="password"
                              value={formData.password}
                              onChange={handleChange}
                              placeholder="Nhập mật khẩu của bạn"
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
                              onClick={() => setShowPassword(!showPassword)}
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
                              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-primary`}></i>
                            </InputGroup.Text>
                          </InputGroup>
                        </Form.Group>
                      </motion.div>

                      <motion.div 
                        className="d-flex justify-content-between align-items-center mb-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.1 }}
                      >
                        <Form.Check
                          type="checkbox"
                          label="Ghi nhớ đăng nhập"
                          className="text-muted"
                        />
                        <Button
                          variant="link"
                          className="text-primary p-0 fw-semibold"
                          onClick={() => navigate('/forgot-password')}
                          style={{ textDecoration: 'none' }}
                        >
                          Quên mật khẩu?
                        </Button>
                      </motion.div>

                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.2 }}
                        whileHover={{ 
                          scale: 1.01,
                        }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          className="w-100 rounded-pill py-3 mb-4"
                          disabled={loading}
                          style={{
                            background: 'linear-gradient(135deg, #0066cc 0%, #004499 100%)',
                            border: 'none',
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            boxShadow: '0 8px 32px rgba(0, 102, 204, 0.3)',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {loading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Đang đăng nhập...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sign-in-alt me-2"></i>
                              Đăng nhập
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </Form>
                  </motion.div>

                  {/* Quick Login Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.3 }}
                  >
                  </motion.div>

                  <motion.div 
                    className="text-center"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 1.9 }}
                  >
                    <p className="text-muted mb-0">
                      Chưa có tài khoản?{' '}
                      <Button
                        variant="link"
                        className="text-primary p-0 fw-semibold"
                        onClick={() => navigate('/register')}
                        style={{ textDecoration: 'none' }}
                      >
                        Đăng ký ngay
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

export default Login;
