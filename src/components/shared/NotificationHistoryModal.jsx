/**
 * Notification History Modal and Bell Trigger Component
 * 
 * Displays an interactive notification bell with unread badge count.
 * Upon click, renders an itemized history of past real-time system notifications
 * (appointment reminders, result readiness, system alerts, billing receipts)
 * for Patient, Doctor, and Staff roles.
 * 
 * Strict constraints:
 * - Real-time synchronization via API, no mock or seed data injected.
 * - Exact Vietnam local time formatting (Asia/Ho_Chi_Minh / HH:mm:ss dd/MM/yyyy).
 * 
 * @author Blood Laboratory Management Team
 * @version 2.0.0
 * @since 2024
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Button, Nav, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
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
import { useAuth } from '../../shared/contexts/AuthContext';
import { getStoredUser } from '../../constants/roles';
import { notificationService } from '../../services/notificationService';

const NotificationHistoryModal = ({ variant = 'light' }) => {
  const authContext = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Resolve user safely across AuthContext and storage
  const user = useMemo(() => {
    return authContext?.user || getStoredUser();
  }, [authContext?.user]);

  const fetchNotifications = useCallback(async () => {
    const activeUser = user || getStoredUser();
    const userId = activeUser?.id || activeUser?.userId || activeUser?.sub || activeUser?.accountId || activeUser?._id;
    if (!userId) return;

    try {
      setLoading(true);
      const roleStr = activeUser?.role || activeUser?.roleName || authContext?.userRole || '';
      const res = await notificationService.getUserNotifications(userId, roleStr);
      if (res.success && Array.isArray(res.data)) {
        const normalized = res.data.map(n => ({
          notificationId: n.notificationId || n.NotificationId || n.id,
          title: n.title || n.Title || 'Thông báo hệ thống',
          message: n.message || n.Message || '',
          type: (n.type || n.Type || 'system_alert').toLowerCase(),
          isRead: Boolean(n.isRead ?? n.IsRead ?? false),
          createdAt: n.createdAt || n.CreatedAt || new Date().toISOString(),
          referenceId: n.referenceId || n.ReferenceId
        }));
        setNotifications(normalized);
      }
    } catch {
      // Ignore or empty network hiccups
    } finally {
      setLoading(false);
    }
  }, [user, authContext?.userRole]);

  useEffect(() => {
    fetchNotifications();

    // Responsive 15s interval for real-time background notification reconciliation
    const interval = setInterval(fetchNotifications, 15000);

    const onFocus = () => fetchNotifications();
    const onRefresh = () => fetchNotifications();

    window.addEventListener('focus', onFocus);
    window.addEventListener('bms:notification_refresh', onRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('bms:notification_refresh', onRefresh);
    };
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

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
    } catch {
      // Keep optimistic update or retry on next poll
    }
  };

  const handleMarkAllAsRead = async () => {
    const activeUser = user || getStoredUser();
    const userId = activeUser?.id || activeUser?.userId || activeUser?.sub || activeUser?.accountId || activeUser?._id;
    if (!userId) return;
    try {
      await notificationService.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      // Retry on next poll
    }
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

  /**
   * Formats UTC timestamps strictly into Vietnam standard time (UTC+7 / Asia/Ho_Chi_Minh).
   */
  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const vnTimeFormatted = new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      }).format(date);

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return `Vừa xong (${vnTimeFormatted})`;
      if (diffMins < 60) return `${diffMins} phút trước (${vnTimeFormatted})`;
      if (diffHours < 24) return `${diffHours} giờ trước (${vnTimeFormatted})`;
      return vnTimeFormatted;
    } catch {
      return dateStr;
    }
  };

  const filteredList = getFilteredNotifications();

  // Render Trigger Button depending on variant
  const renderTrigger = () => {
    if (variant === 'sidebar') {
      return (
        <button
          onClick={handleOpen}
          type="button"
          style={{
            background: '#EFF6FF',
            border: 'none',
            color: '#1E60E6',
            borderRadius: '9999px',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.15s ease'
          }}
          title={`Thông báo hệ thống (${unreadCount} chưa đọc)`}
          aria-label="Thông báo hệ thống"
        >
          <FaBell size={13} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                background: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '9999px',
                fontSize: '9px',
                fontWeight: 'bold',
                minWidth: '15px',
                height: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                border: '1.5px solid #FFFFFF',
                lineHeight: 1
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      );
    }

    if (variant === 'sidebar-collapsed') {
      return (
        <OverlayTrigger
          placement="right"
          overlay={
            <Tooltip id="tt-notifications-collapsed">
              Thông báo {unreadCount > 0 ? `(${unreadCount} chưa đọc)` : ''}
            </Tooltip>
          }
        >
          <button
            onClick={handleOpen}
            type="button"
            style={{
              background: '#EFF6FF',
              border: 'none',
              color: '#1E60E6',
              borderRadius: '9999px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 0.15s ease'
            }}
            aria-label="Thông báo hệ thống"
          >
            <FaBell size={13} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  background: '#EF4444',
                  color: '#FFFFFF',
                  borderRadius: '9999px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  minWidth: '15px',
                  height: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 2px',
                  border: '1.5px solid #FFFFFF',
                  lineHeight: 1
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </OverlayTrigger>
      );
    }

    if (variant === 'patient-navbar') {
      return (
        <button
          onClick={handleOpen}
          type="button"
          style={{
            background: '#F0F9FF',
            border: '1px solid #BAE6FD',
            color: '#0284C7',
            borderRadius: '9999px',
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.15s ease',
            marginRight: '6px'
          }}
          title={`Thông báo của bạn (${unreadCount} chưa đọc)`}
          aria-label="Thông báo"
        >
          <FaBell size={14} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                background: '#EF4444',
                color: '#FFFFFF',
                borderRadius: '9999px',
                fontSize: '9px',
                fontWeight: 700,
                minWidth: '15px',
                height: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 2px',
                border: '1.5px solid #FFFFFF',
                lineHeight: 1
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      );
    }

    // Default trigger
    return (
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
        title={`Lịch sử thông báo hệ thống (${unreadCount} chưa đọc)`}
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
    );
  };

  return (
    <>
      {/* Bell Trigger Button */}
      {renderTrigger()}

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
                      borderLeft: isUnread ? '4px solid #1E60E6' : '4px solid transparent',
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
            Hệ thống quản lý thông báo tự động phòng xét nghiệm (Thời gian: Giờ chuẩn Việt Nam GMT+7)
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
