/**
 * 403 Forbidden Page Component
 * 
 * Displayed when a user tries to access a page they don't have permission for.
 * Specifically handles cases where patients try to access admin/management pages.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaLock, FaHome, FaExclamationTriangle } from 'react-icons/fa';
import { motion } from 'framer-motion';

/**
 * Forbidden403 Component
 * 
 * Shows an error page for unauthorized access attempts (403 Forbidden).
 * Provides navigation back to the home page.
 * 
 * @returns {React.ReactNode} 403 Forbidden error page
 */
const Forbidden403 = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/home');
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      <Container className="flex-grow-1 d-flex align-items-center justify-content-center py-5">
        <Row className="w-100">
          <Col xs={12} md={8} lg={6} className="mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="border-0 shadow-lg" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                <Card.Body className="p-5 text-center">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mb-4"
                  >
                    <div
                      style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        boxShadow: '0 15px 35px rgba(220, 53, 69, 0.4)',
                        border: '5px solid rgba(220, 53, 69, 0.2)'
                      }}
                    >
                      <FaLock size={60} color="#ffffff" />
                    </div>
                  </motion.div>

                  {/* Error Code */}
                  <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="display-1 fw-bold mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    403
                  </motion.h1>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="h3 fw-bold mb-3"
                    style={{ color: '#333333' }}
                  >
                    <FaExclamationTriangle className="me-2" style={{ color: '#dc3545' }} />
                    Không có quyền truy cập
                  </motion.h2>

                  {/* Message */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="lead text-muted mb-4"
                    style={{ fontSize: '1.1rem', lineHeight: '1.6' }}
                  >
                    Xin lỗi, bạn không có quyền truy cập vào trang này. 
                    Trang này chỉ dành cho các vai trò quản trị.
                  </motion.p>

                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                    className="text-muted mb-4"
                    style={{ fontSize: '0.95rem' }}
                  >
                    Nếu bạn là bệnh nhân, vui lòng sử dụng các chức năng dành cho bệnh nhân 
                    trong trang cá nhân của bạn.
                  </motion.p>

                  {/* Action Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleGoHome}
                      className="px-5 py-3"
                      style={{
                        background: 'linear-gradient(135deg, #0d6efd 0%, #6610f2 100%)',
                        border: 'none',
                        borderRadius: '30px',
                        fontWeight: '600',
                        fontSize: '1.1rem',
                        boxShadow: '0 10px 30px rgba(13, 110, 253, 0.4)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(13, 110, 253, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(13, 110, 253, 0.4)';
                      }}
                    >
                      <FaHome className="me-2" />
                      Quay về trang chủ
                    </Button>
                  </motion.div>
                </Card.Body>
              </Card>
            </motion.div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Forbidden403;
