/**
 * Notifications History Page Component
 * 
 * Provides a dedicated, full-featured notification hub for all 6 roles:
 * Patient, Receptionist, Doctor, Laboratory User, Manager, and Administrator.
 * Displays interactive alerts regarding appointments, check-ins, patient profile updates,
 * lab test results, and payment receipts without being obscured by sidebar/header.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.1.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Row, Col, Card, Nav, Button, Badge, Spinner } from 'react-bootstrap';
import { 
  FaBell, 
  FaCalendarAlt, 
  FaFlask, 
  FaExclamationTriangle, 
  FaReceipt, 
  FaCheckDouble,
  FaQrcode,
  FaUserEdit,
  FaCheckCircle,
  FaVial,
  FaSyncAlt,
  FaArrowLeft,
  FaTag,
  FaCheck
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { notificationService } from '../../../services/notificationService';
import PatientHeader from '../../../components/Layout/PatientHeader';
import GuestFooter from '../../components/Layout/GuestFooter';
import Layout from '../../components/Layout/Layout';

const NotificationsHistoryPage = () => {
  const { user, userRole, userRoleId } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const isPatientRole = useMemo(() => {
    return userRoleId === 5 || userRole === 'patient';
  }, [userRoleId, userRole]);

  const roleDisplayName = useMemo(() => {
    switch (userRoleId) {
      case 1: return 'Quản trị viên (Administrator)';
      case 2: return 'Quản lý Lab (Manager)';
      case 3: return 'Bác sĩ (Doctor)';
      case 4: return 'Kỹ thuật viên (Laboratory User)';
      case 5: return 'Bệnh nhân (Patient)';
      case 6: return 'Lễ tân (Receptionist)';
      default:
        switch (userRole) {
          case 'admin': return 'Quản trị viên (Administrator)';
          case 'manager': return 'Quản lý Lab (Manager)';
          case 'doctor': return 'Bác sĩ (Doctor)';
          case 'lab_user': return 'Kỹ thuật viên (Laboratory User)';
          case 'receptionist': return 'Lễ tân (Receptionist)';
          default: return 'Bệnh nhân (Patient)';
        }
    }
  }, [userRoleId, userRole]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await notificationService.getUserNotifications(user.id, user.role || '');
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (e) {
      // Ignore or empty
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (e) {}
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'checkin':
        return notifications.filter(n => n.type === 'checkin_event');
      case 'profile':
        return notifications.filter(n => n.type === 'patient_profile_update');
      case 'result':
        return notifications.filter(n => n.type === 'result_ready');
      case 'appointment':
        return notifications.filter(n => n.type === 'appointment_reminder');
      case 'sample':
        return notifications.filter(n => n.type === 'sample_validated' || n.type === 'sample_received');
      case 'receipt':
        return notifications.filter(n => n.type === 'receipt_issued');
      case 'alert':
        return notifications.filter(n => n.type === 'system_alert');
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const getTypeTheme = (type) => {
    switch (type) {
      case 'checkin_event':
        return {
          icon: <FaQrcode className="fs-4" />,
          color: '#198754',
          bg: '#e8f5e9',
          badgeText: 'Check-in',
          badgeBg: 'success'
        };
      case 'patient_profile_update':
        return {
          icon: <FaUserEdit className="fs-4" />,
          color: '#6f42c1',
          bg: '#f3e8ff',
          badgeText: 'Hồ sơ bệnh nhân',
          badgeBg: 'info'
        };
      case 'sample_validated':
        return {
          icon: <FaCheckCircle className="fs-4" />,
          color: '#20c997',
          bg: '#e6fffa',
          badgeText: 'Mẫu kiểm chuẩn',
          badgeBg: 'teal'
        };
      case 'sample_received':
        return {
          icon: <FaVial className="fs-4" />,
          color: '#0d6efd',
          bg: '#ebf5ff',
          badgeText: 'Tiếp nhận mẫu',
          badgeBg: 'primary'
        };
      case 'result_ready':
        return {
          icon: <FaFlask className="fs-4" />,
          color: '#0d6efd',
          bg: '#e0f2fe',
          badgeText: 'Kết quả xét nghiệm',
          badgeBg: 'primary'
        };
      case 'appointment_reminder':
        return {
          icon: <FaCalendarAlt className="fs-4" />,
          color: '#fd7e14',
          bg: '#fff7ed',
          badgeText: 'Lịch hẹn',
          badgeBg: 'warning'
        };
      case 'receipt_issued':
        return {
          icon: <FaReceipt className="fs-4" />,
          color: '#0dcaf0',
          bg: '#ecfeff',
          badgeText: 'Biên lai',
          badgeBg: 'info'
        };
      case 'system_alert':
      default:
        return {
          icon: <FaExclamationTriangle className="fs-4" />,
          color: '#ffc107',
          bg: '#fefce8',
          badgeText: 'Hệ thống',
          badgeBg: 'dark'
        };
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays === 1) return 'Hôm qua';
      return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return dateStr;
    }
  };

  const pageContent = (
    <div className="w-100" style={{ maxWidth: '100%' }}>
      {/* Top Banner / Header Card */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              <Button 
                variant="light" 
                onClick={() => navigate(-1)}
                className="rounded-circle border d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: '42px', height: '42px' }}
                title="Quay lại"
              >
                <FaArrowLeft />
              </Button>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h4 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <FaBell className="text-primary" />
                    Lịch Sử Thông Báo (Notifications History)
                  </h4>
                  <Badge bg="primary-subtle" className="text-primary border border-primary-subtle px-3 py-2 rounded-pill fw-semibold">
                    {roleDisplayName}
                  </Badge>
                </div>
                <p className="text-muted mb-0 small mt-1">
                  Trung tâm quản lý các cập nhật tương tác thời gian thực: Bác sĩ hủy/dời lịch, Lễ tân check-in, Cập nhật hồ sơ bệnh nhân, Ký duyệt kết quả & Biên lai.
                </p>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              {unreadCount > 0 && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="d-flex align-items-center gap-2 rounded-pill px-3 py-2 shadow-sm"
                >
                  <FaCheckDouble />
                  <span>Đọc tất cả ({unreadCount})</span>
                </Button>
              )}
              <Button
                variant="light"
                size="sm"
                onClick={fetchNotifications}
                disabled={loading}
                className="d-flex align-items-center gap-2 border rounded-pill px-3 py-2"
              >
                <FaSyncAlt className={loading ? 'fa-spin' : ''} />
                <span>Làm mới</span>
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Filter Tabs Navigation */}
      <Card className="border-0 shadow-sm rounded-4 mb-4 bg-white">
        <Card.Body className="p-3">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Nav 
              variant="pills" 
              activeKey={activeFilter} 
              onSelect={(k) => setActiveFilter(k || 'all')} 
              className="gap-2 flex-nowrap"
              style={{ minWidth: 'max-content' }}
            >
              <Nav.Item>
                <Nav.Link eventKey="all" className="rounded-pill px-3 py-2 fw-semibold small d-flex align-items-center gap-1">
                  Tất cả <Badge bg={activeFilter === 'all' ? 'light' : 'secondary'} text={activeFilter === 'all' ? 'dark' : 'white'} className="ms-1 rounded-pill">{notifications.length}</Badge>
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="unread" className="rounded-pill px-3 py-2 fw-semibold small d-flex align-items-center gap-1">
                  Chưa đọc {unreadCount > 0 && <Badge bg="danger" className="ms-1 rounded-pill">{unreadCount}</Badge>}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="checkin" className="rounded-pill px-3 py-2 fw-semibold small">
                  Check-in
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="profile" className="rounded-pill px-3 py-2 fw-semibold small">
                  Hồ sơ bệnh nhân
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="result" className="rounded-pill px-3 py-2 fw-semibold small">
                  Kết quả xét nghiệm
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="appointment" className="rounded-pill px-3 py-2 fw-semibold small">
                  Lịch hẹn
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="sample" className="rounded-pill px-3 py-2 fw-semibold small">
                  Mẫu xét nghiệm
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="receipt" className="rounded-pill px-3 py-2 fw-semibold small">
                  Biên lai thu phí
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="alert" className="rounded-pill px-3 py-2 fw-semibold small">
                  Cảnh báo hệ thống
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>
        </Card.Body>
      </Card>

      {/* Notifications Items List */}
      <Card className="border-0 shadow-sm rounded-4 overflow-hidden bg-white">
        <Card.Body className="p-0">
          {loading && notifications.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted small">Đang tải danh sách thông báo hệ thống...</p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="list-group list-group-flush">
              {filteredNotifications.map((item) => {
                const isUnread = !item.isRead;
                const theme = getTypeTheme(item.type);

                return (
                  <div
                    key={item.notificationId}
                    className={`list-group-item list-group-item-action p-4 d-flex gap-3 align-items-start border-bottom ${
                      isUnread ? 'bg-light-subtle' : ''
                    }`}
                    style={{
                      cursor: 'pointer',
                      borderLeft: `5px solid ${theme.color}`,
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => handleMarkAsRead(item.notificationId)}
                  >
                    {/* Circle Icon Badge */}
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                      style={{
                        width: '52px',
                        height: '52px',
                        backgroundColor: theme.bg,
                        color: theme.color
                      }}
                    >
                      {theme.icon}
                    </div>

                    {/* Content Details */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <h6 className={`mb-0 ${isUnread ? 'fw-bold text-dark' : 'text-secondary'}`} style={{ fontSize: '1.05rem' }}>
                            {item.title}
                          </h6>
                          <Badge bg={theme.badgeBg} className="px-2 py-1 rounded-pill fw-semibold" style={{ fontSize: '0.75rem' }}>
                            {theme.badgeText}
                          </Badge>
                          {item.referenceId && (
                            <Badge bg="light" text="dark" className="border d-flex align-items-center gap-1 font-monospace" style={{ fontSize: '0.75rem' }}>
                              <FaTag style={{ fontSize: '0.65rem' }} />
                              {item.referenceId}
                            </Badge>
                          )}
                        </div>
                        <small className="text-muted fw-medium" style={{ fontSize: '0.825rem' }}>
                          {formatTimestamp(item.createdAt)}
                        </small>
                      </div>

                      <p className="mb-2 text-secondary" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {item.message}
                      </p>

                      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2 pt-2 border-top border-light-subtle">
                        <div className="d-flex align-items-center gap-3">
                          <small className="text-muted" style={{ fontSize: '0.775rem' }}>
                            Mã: <code className="text-secondary">{item.notificationId}</code>
                          </small>
                          {item.role && (
                            <small className="text-muted" style={{ fontSize: '0.775rem' }}>
                              Vai trò liên quan: <strong className="text-dark">{item.role}</strong>
                            </small>
                          )}
                        </div>

                        {isUnread ? (
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-danger text-white rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                              Chưa đọc
                            </span>
                            <Button 
                              variant="outline-secondary" 
                              size="sm" 
                              className="py-0 px-2 rounded-pill"
                              style={{ fontSize: '0.75rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(item.notificationId);
                              }}
                            >
                              <FaCheck className="me-1" />
                              Đã đọc
                            </Button>
                          </div>
                        ) : (
                          <small className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                            <FaCheckCircle className="text-success" />
                            Đã đọc
                          </small>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-5">
              <div 
                className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center p-4 mb-3"
                style={{ width: '80px', height: '80px' }}
              >
                <FaBell className="text-muted" style={{ fontSize: '2.5rem', opacity: 0.4 }} />
              </div>
              <h5 className="text-dark fw-bold mb-1">Không có thông báo nào trong mục này</h5>
              <p className="text-muted small mb-0">
                Các thông báo tương tác về lịch hẹn, check-in, duyệt kết quả và hồ sơ bệnh nhân sẽ hiển thị tại đây.
              </p>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );

  if (isPatientRole) {
    return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <PatientHeader />
        <main className="flex-grow-1 py-4">
          <Container>
            {pageContent}
          </Container>
        </main>
        <GuestFooter />
      </div>
    );
  }

  return (
    <Layout>
      {pageContent}
    </Layout>
  );
};

export default NotificationsHistoryPage;
