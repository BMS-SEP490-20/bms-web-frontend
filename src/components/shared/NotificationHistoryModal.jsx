/**
 * Notification History Modal and Bell Trigger Component
 * 
 * Displays an interactive notification bell with unread badge count.
 * Upon click, renders an itemized history of past system notifications
 * (appointment reminders, result readiness, system alerts, billing receipts)
 * for Patient, Doctor, and Staff roles.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Nav, Spinner } from 'react-bootstrap';
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
  FaVial
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { notificationService } from '../../services/notificationService';

const NotificationHistoryModal = ({ variant = 'light' }) => {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

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

    // SIDE EFFECT: Polling interval periodically reconciles unread notification counts.
    // The cleanup callback disposes the timer upon unmount to prevent memory leaks and zombie network calls.
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);


  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleOpen = () => {
    fetchNotifications();
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

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

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'appointment':
        return notifications.filter(n => n.type === 'appointment_reminder');
      case 'checkin':
        return notifications.filter(n => n.type === 'checkin_event');
      case 'profile':
        return notifications.filter(n => n.type === 'patient_profile_update');
      case 'sample':
        return notifications.filter(n => n.type === 'sample_validated' || n.type === 'sample_received');
      case 'result':
        return notifications.filter(n => n.type === 'result_ready');
      case 'alert':
        return notifications.filter(n => n.type === 'system_alert');
      case 'receipt':
        return notifications.filter(n => n.type === 'receipt_issued');
      default:
        return notifications;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'appointment_reminder':
        return <FaCalendarAlt className="text-primary fs-5" />;
      case 'checkin_event':
        return <FaQrcode className="text-success fs-5" />;
      case 'patient_profile_update':
        return <FaUserEdit className="text-info fs-5" />;
      case 'sample_validated':
        return <FaCheckCircle className="text-teal fs-5" style={{ color: '#20c997' }} />;
      case 'sample_received':
        return <FaVial className="text-primary fs-5" />;
      case 'result_ready':
        return <FaFlask className="text-success fs-5" />;
      case 'receipt_issued':
        return <FaReceipt className="text-info fs-5" />;
      case 'system_alert':
      default:
        return <FaExclamationTriangle className="text-warning fs-5" />;
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
      return date.toLocaleDateString('vi-VN');
    } catch (e) {
      return dateStr;
    }
  };

  const filteredList = getFilteredNotifications();

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        onClick={handleOpen}
        type="button"
        className={`btn btn-link position-relative p-2 text-decoration-none ${
          variant === 'dark' ? 'text-white' : 'text-dark'
        }`}
        style={{
          border: 'none',
          background: 'transparent',
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
        title="Lịch sử thông báo hệ thống"
      >
        <FaBell style={{ fontSize: '1.25rem' }} />
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.7rem', padding: '0.3em 0.55em' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications History Modal */}
      <Modal show={showModal} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white border-0 py-3">
          <div className="d-flex align-items-center gap-2">
            <FaBell className="fs-5" />
            <Modal.Title style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              Lịch Sử Thông Báo (Notifications History)
            </Modal.Title>
          </div>
        </Modal.Header>

        {/* Tab Filters & Mark All Button */}
        <div className="bg-light px-3 pt-3 pb-2 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'all')}>
            <Nav.Item>
              <Nav.Link eventKey="all" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tất cả ({notifications.length})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="unread" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Chưa đọc ({unreadCount})
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="checkin" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Check-in
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="profile" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Hồ sơ
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="result" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Kết quả
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="appointment" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Lịch hẹn
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="receipt" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Biên lai
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="alert" className="py-1 px-3 rounded-pill fw-semibold" style={{ fontSize: '0.85rem' }}>
                Cảnh báo
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {unreadCount > 0 && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center gap-1 rounded-pill"
              onClick={handleMarkAllAsRead}
              style={{ fontSize: '0.8rem' }}
            >
              <FaCheckDouble />
              <span>Đọc tất cả</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <Modal.Body className="p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {loading && notifications.length === 0 ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted small">Đang tải lịch sử thông báo...</p>
            </div>
          ) : filteredList.length > 0 ? (
            <div className="list-group list-group-flush">
              {filteredList.map((item) => {
                const isUnread = !item.isRead;
                return (
                  <div
                    key={item.notificationId}
                    className={`list-group-item list-group-item-action p-3 d-flex gap-3 align-items-start border-bottom ${
                      isUnread ? 'bg-light-subtle' : ''
                    }`}
                    style={{
                      cursor: 'pointer',
                      borderLeft: isUnread ? '4px solid #0d6efd' : '4px solid transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                    onClick={() => handleMarkAsRead(item.notificationId)}
                  >
                    <div
                      className="p-2 rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: '42px',
                        height: '42px',
                        backgroundColor: '#f1f5f9'
                      }}
                    >
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <h6 className={`mb-0 ${isUnread ? 'fw-bold text-dark' : 'text-secondary'}`} style={{ fontSize: '0.95rem' }}>
                          {item.title}
                        </h6>
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {formatTimestamp(item.createdAt)}
                        </small>
                      </div>
                      <p className="mb-0 text-muted" style={{ fontSize: '0.875rem', lineHeight: '1.4' }}>
                        {item.message}
                      </p>
                    </div>

                    {isUnread && (
                      <span
                        className="badge bg-primary rounded-circle p-1 flex-shrink-0 align-self-center"
                        style={{ width: '8px', height: '8px' }}
                        title="Chưa đọc"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-5">
              <FaBell className="text-muted mb-2" style={{ fontSize: '2.5rem', opacity: 0.4 }} />
              <p className="text-muted mb-0">Không có thông báo nào trong mục này</p>
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="bg-light py-2 border-0 d-flex justify-content-between">
          <small className="text-muted">
            Hệ thống quản lý thông báo tự động phòng xét nghiệm
          </small>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NotificationHistoryModal;
