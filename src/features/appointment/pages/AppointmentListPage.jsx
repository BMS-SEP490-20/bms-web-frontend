/**
 * @file AppointmentListPage.jsx
 * @description UC23 – View & Filter Appointments Management.
 * Comprehensive appointments dashboard for Receptionists, Doctors, Managers and Patients.
 * Implements strict clinical date-range validation (max 90 days), status filtering,
 * debounced search, responsive layout, and detailed modal inspector.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Table,
  Badge,
  Button,
  Form,
  Row,
  Col,
  Modal,
  Spinner,
  Alert,
  Pagination,
  InputGroup
} from 'react-bootstrap';
import { Calendar, Clock, Stethoscope, Search, Filter as LucideFilter, RotateCw, Eye, XCircle, AlertTriangle, MapPin, TestTube2, User, FileText, QrCode, Lock, Banknote, CheckCircle2, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { appointmentApi } from '../api/appointmentApi';
import { ROLES, resolveRoleId, getStoredUser, hasRole } from '../../../constants/roles';
import '../appointment.css';

const HOLD_DURATION_MS = 15 * 60 * 1000;

const resolveDoctorDisplay = (apt) => {
  if (!apt) return 'Chưa phân công';
  const name = apt.doctorName || apt.DoctorName;
  if (name && !name.startsWith('ID:') && !/^[0-9a-f]{24}$/i.test(name) && name !== 'N/A') return name;
  const docId = String(apt.doctorId || apt.DoctorId || '').trim();
  if (docId) return `BS (mã ${docId.slice(-6)})`;
  return 'Chưa phân công';
};

/** Paid/confirmed/checked-in/completed appointments retain their QR slip; only Pending, Cancelled, and NoShow hide it. */
const isPaidOrConfirmed = (rawStatus) => {
  if (!rawStatus && rawStatus !== 0) return false;
  const s = String(rawStatus).toUpperCase();
  return (
    s === 'CONFIRMED' || s === '1' ||
    s === 'CHECKEDIN' || s === 'CHECKED_IN' || s === '2' ||
    s === 'INPROGRESS' || s === 'IN_PROGRESS' || s === '3' ||
    s === 'COMPLETED' || s === '4'
  );
};

const isPending = (rawStatus) => {
  if (!rawStatus && rawStatus !== 0) return false;
  const s = String(rawStatus).toUpperCase();
  return s === 'PENDING' || s === '0';
};

const isCancelled = (rawStatus) => {
  if (!rawStatus && rawStatus !== 0) return false;
  const s = String(rawStatus).toUpperCase();
  return s === 'CANCELLED' || s === '5';
};

const isNoShow = (rawStatus) => {
  if (!rawStatus && rawStatus !== 0) return false;
  const s = String(rawStatus).toUpperCase();
  return s === 'NOSHOW' || s === 'NO_SHOW' || s === '6';
};

const getRemainingSeconds = (createdAt, now = Date.now()) => {
  if (!createdAt) return 0;
  const str = String(createdAt);
  const normalizedStr = str.endsWith('Z') || str.includes('+') ? str : `${str}Z`;
  const createdTime = new Date(normalizedStr).getTime();
  if (Number.isNaN(createdTime)) return 0;
  const expiresAt = createdTime + HOLD_DURATION_MS;
  const remaining = Math.floor((expiresAt - now) / 1000);
  return Math.max(0, remaining);
};

const formatCountdown = (totalSeconds) => {
  if (totalSeconds <= 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function AppointmentListPage() {
  // Query parameters state
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const roleId = useMemo(() => resolveRoleId(user), [user]);
  const isPatient = roleId === ROLES.PATIENT;
  const isReceptionist = useMemo(() => hasRole(user, ROLES.RECEPTIONIST), [user]);
  const canBookAppointment = isPatient || isReceptionist;
  const checkInButtonLabel = isReceptionist ? 'Mã Check-in' : 'Chi tiết lịch hẹn';

  // Data & UI states
  const [appointments, setAppointments] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [dateValidationWarning, setDateValidationWarning] = useState(null);

  // Detail Modal state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Live timer for reservation hold countdown (ticks every 1 second)
  const [now, setNow] = useState(Date.now());
  const autoCancelledIdsRef = React.useRef(new Set());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // When hold timer hits 0 for any pending appointment, automatically cancel hold & return slot
  useEffect(() => {
    appointments.forEach((apt) => {
      const aptId = apt.appointmentId || apt.id;
      if (!aptId) return;

      if (isPending(apt.status) && apt.createdAt) {
        const remaining = getRemainingSeconds(apt.createdAt, now);
        if (remaining <= 0 && !autoCancelledIdsRef.current.has(aptId)) {
          autoCancelledIdsRef.current.add(aptId);
          appointmentApi.cancelAppointment(aptId, 'Hệ thống tự động hủy do hết thời gian giữ chỗ 15 phút (Quá hạn thanh toán)')
            .then(() => {
              setAppointments((prev) =>
                prev.map((item) =>
                  (item.appointmentId === aptId || item.id === aptId)
                    ? { ...item, status: 'Cancelled', notes: 'Hệ thống tự động hủy do hết thời gian giữ chỗ 15 phút' }
                    : item
                )
              );
              setSelectedAppointment((prev) => {
                if (prev && (prev.appointmentId === aptId || prev.id === aptId)) {
                  return { ...prev, status: 'Cancelled', notes: 'Hệ thống tự động hủy do hết thời gian giữ chỗ 15 phút' };
                }
                return prev;
              });
            })
            .catch((err) => {
              console.error('Error auto-cancelling expired appointment:', err);
            });
        }
      }
    });
  }, [appointments, now]);

  // Debounce keyword input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Validate date range invariant: fromDate <= toDate & <= 90 days
  const isDateRangeValid = useMemo(() => {
    if (!fromDate || !toDate) {
      setDateValidationWarning(null);
      return true;
    }
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (to < from) {
      setDateValidationWarning('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.');
      return false;
    }
    const diffDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    if (diffDays > 90) {
      setDateValidationWarning('Khoảng cách tìm kiếm tối đa không quá 90 ngày để đảm bảo hiệu năng.');
      return false;
    }
    setDateValidationWarning(null);
    return true;
  }, [fromDate, toDate]);

  // Fetch appointments from API
  const fetchAppointments = useCallback(async () => {
    if (!isDateRangeValid) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const params = {
        page,
        pageSize,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        status: status || undefined,
        keyword: debouncedKeyword || undefined,
      };

      const res = await appointmentApi.getAppointments(params);
      if (res && res.data) {
        setAppointments(Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.items) ? res.data.items : []));
        setTotalCount(res.total || res.data.length);
        setTotalPages(res.totalPages || Math.ceil((res.total || res.data.length) / pageSize) || 1);
      } else {
        setAppointments([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setErrorMsg(err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Không thể tải danh sách cuộc hẹn. Vui lòng thử lại.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, fromDate, toDate, status, debouncedKeyword, isDateRangeValid]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Open detail modal
  const handleViewDetail = async (id) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await appointmentApi.getAppointmentDetail(id);
      setSelectedAppointment(res);
    } catch (err) {
      console.error('Failed to get appointment detail:', err);
      // Fallback to item in table list
      const fallback = appointments.find((a) => a.appointmentId === id || a.id === id);
      setSelectedAppointment(fallback || null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResetFilters = () => {
    const d = new Date();
    const f = new Date();
    f.setDate(d.getDate() - 7);
    const t = new Date();
    t.setDate(d.getDate() + 14);

    setFromDate(f.toISOString().split('T')[0]);
    setToDate(t.toISOString().split('T')[0]);
    setStatus('');
    setKeyword('');
    setPage(1);
  };

  // Badge mapping for AppointmentStatus enum
  const renderStatusBadge = (rawStatus) => {
    const s = String(rawStatus || '').toUpperCase();
    switch (s) {
      case 'PENDING':
      case '0':
        return (
          <Badge bg="warning" text="dark" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <Clock className="me-1"  size="1em"/> Chờ thanh toán
          </Badge>
        );
      case 'CONFIRMED':
      case '1':
        return (
          <Badge bg="success" className="px-2.5 py-1.5 rounded-pill shadow-xs text-white" style={{ backgroundColor: '#16a34a' }}>
            <CheckCircle2 className="me-1"  size="1em"/> Đã xác nhận
          </Badge>
        );
      case 'CHECKEDIN':
      case 'CHECKED_IN':
      case '2':
        return (
          <Badge bg="primary" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <User className="me-1"  size="1em"/> Đã tiếp nhận
          </Badge>
        );
      case 'INPROGRESS':
      case 'IN_PROGRESS':
      case '3':
        return (
          <Badge bg="dark" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <TestTube2 className="me-1"  size="1em"/> Đang khám / Lấy mẫu
          </Badge>
        );
      case 'COMPLETED':
      case '4':
        return (
          <Badge bg="success" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            Hoàn thành
          </Badge>
        );
      case 'CANCELLED':
      case '5':
        return (
          <Badge bg="danger" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            Đã hủy
          </Badge>
        );
      case 'NOSHOW':
      case 'NO_SHOW':
      case '6':
        return (
          <Badge bg="secondary" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <AlertTriangle className="me-1"  size="1em"/> Vắng mặt (No-show)
          </Badge>
        );
      default:
        return <Badge bg="light" text="dark" className="border">{rawStatus || 'N/A'}</Badge>;
    }
  };

  return (
    <div className="bms-appt-list">
      {/* Header title */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title">
            {isPatient ? 'Lịch Hẹn Của Tôi' : 'Quản Lý Lịch Hẹn'}
          </h1>
          <p className="bms-page-subtitle">
            {isPatient
              ? 'Theo dõi lịch lấy mẫu, mã QR check-in và trạng thái tiếp nhận'
              : 'Tra cứu danh sách đặt lịch, trạng thái check-in và phân bổ bác sĩ theo ca'}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill px-3 d-inline-flex align-items-center gap-1.5"
            onClick={fetchAppointments}
            disabled={loading}
          >
            <RotateCw className={loading ? 'fa-spin' : ''}  size="1em"/> Làm mới
          </Button>
          {canBookAppointment && (
            <Link to={isPatient ? '/services' : '/appointments/book'} className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 rounded-pill">
              <Calendar  size="1em"/> {isPatient ? 'Đặt lịch mới' : 'Tạo lịch hẹn mới'}
            </Link>
          )}
        </div>
      </div>

      {/* Date Validation Alert */}
      {dateValidationWarning && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 mb-3 border-0 rounded-3">
          <AlertTriangle  size="1em"/>
          <span>{dateValidationWarning}</span>
        </Alert>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="py-2 mb-3 border-0 rounded-3">
          {errorMsg}
        </Alert>
      )}

      {/* Unified Single-Row Filter Bar */}
      <div className="bms-filter-bar mb-3">
        <div className="bms-search-input-pill flex-grow-1" style={{ minWidth: '220px' }}>
          <Search className="text-muted" size={13} />
          <input
            type="text"
            placeholder="Tìm mã hẹn, địa chỉ, ghi chú..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <Form.Select
          size="sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{ width: 'auto', minWidth: '175px' }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Pending">Chờ thanh toán</option>
          <option value="Confirmed">Đã xác nhận</option>
          <option value="CheckedIn">Đã tiếp nhận</option>
          <option value="InProgress">Đang khám / Lấy mẫu</option>
          <option value="Completed">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
          <option value="NoShow">Vắng mặt</option>
        </Form.Select>

        <div className="d-flex align-items-center gap-1.5">
          <span className="small text-muted fw-semibold">Từ:</span>
          <Form.Control
            type="date"
            size="sm"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            style={{ width: '142px' }}
          />
        </div>

        <div className="d-flex align-items-center gap-1.5">
          <span className="small text-muted fw-semibold">Đến:</span>
          <Form.Control
            type="date"
            size="sm"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            style={{ width: '142px' }}
          />
        </div>

        <Button
          variant="outline-secondary"
          size="sm"
          className="rounded-pill px-3"
          onClick={handleResetFilters}
        >
          Đặt lại
        </Button>

        <span className="small text-muted ms-auto d-none d-xl-inline">
          Tổng: <strong className="text-dark">{totalCount}</strong> lịch hẹn
        </span>
      </div>

      <section className="bms-table-standalone-section">
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr>
                <th>Mã cuộc hẹn</th>
                <th>Ngày và giờ</th>
                <th>Bác sĩ</th>
                <th>Hình thức</th>
                <th>Địa điểm</th>
                <th className="text-center">Trạng thái</th>
                <th className="text-center">Mã check-in</th>
                <th className="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    <span className="text-muted small">Đang tải danh sách lịch hẹn...</span>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-5">
                    <div className="fw-semibold text-secondary mb-1">
                      {isPatient ? 'Chưa có lịch hẹn trong khoảng thời gian này' : 'Không tìm thấy lịch hẹn phù hợp'}
                    </div>
                    <div className="text-muted small mb-3">
                      {isPatient
                        ? 'Bạn có thể đặt lịch khám và lấy mẫu trực tuyến ngay bây giờ.'
                        : 'Điều chỉnh khoảng ngày hoặc trạng thái để tra cứu thêm.'}
                    </div>
                    {isPatient && (
                      <Link to="/services" className="btn btn-primary btn-sm px-3 rounded-pill">
                        <Calendar className="me-1"  size="1em"/> Đặt lịch lấy mẫu
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => {
                  const appointmentDateStr = apt.appointmentDate
                    ? new Date(apt.appointmentDate).toLocaleDateString('vi-VN')
                    : '—';
                  const isHome = String(apt.appointmentType || '').toLowerCase().includes('home');

                  return (
                    <tr key={apt.appointmentId || apt.id}>
                      <td className="px-3">
                        <div className="fw-bold text-primary font-monospace">
                          {apt.appointmentCode || apt.id?.slice(-8) || '—'}
                        </div>
                        {apt.queueNumber && (
                          <span className="badge bg-light text-dark rounded-pill small mt-1">
                            STT: Q-{String(apt.queueNumber).padStart(3, '0')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">
                          <Calendar className="me-1 text-muted small"  size="1em"/> {appointmentDateStr}
                        </div>
                        <div className="small text-muted">
                          <Clock className="me-1 text-muted small"  size="1em"/> {apt.slotTime || '—'}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark d-flex align-items-center gap-1">
                          <Stethoscope className="text-primary small"  size="1em"/>
                          {resolveDoctorDisplay(apt)}
                        </div>
                        <div className="small text-muted">{apt.specialty || 'Xét nghiệm lâm sàng'}</div>
                      </td>
                      <td>
                        <Badge
                          bg={isHome ? 'secondary' : 'light'}
                          text="dark"
                          className="rounded-pill px-2.5 py-1"
                        >
                          {isHome ? 'Tại nhà' : 'Tại phòng khám'}
                        </Badge>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '220px' }}>
                        {isHome ? (
                          <span className="small text-dark" title={apt.collectionAddress}>
                            <MapPin className="text-danger me-1"  size="1em"/>
                            {apt.collectionAddress || 'Chưa cung cấp'}
                          </span>
                        ) : (
                          <span className="small text-muted">
                            {apt.roomName || 'Trung tâm Xét nghiệm BMS'}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {renderStatusBadge(apt.status)}
                      </td>
                      <td className="text-center">
                        {isPaidOrConfirmed(apt.status) ? (
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 fw-semibold"
                            onClick={() => handleViewDetail(apt.appointmentId || apt.id)}
                            title={isReceptionist ? 'Bấm để xem Mã QR & Check-in Tiếp Đón' : 'Xem chi tiết lịch hẹn'}
                          >
                            <QrCode className="text-success"  size="1em"/> {checkInButtonLabel}
                          </Button>
                        ) : isPending(apt.status) ? (
                          <div className="d-inline-flex flex-column align-items-center gap-1">
                            <span className="badge bg-warning-subtle text-warning-emphasis rounded-pill px-2 py-1 small fw-semibold">
                              <Lock className="me-1"  size="1em"/> Chờ thanh toán
                            </span>
                            {apt.createdAt && (
                              <span className="badge bg-danger-subtle text-danger rounded-pill font-monospace px-2 py-0.5" style={{ fontSize: '0.75rem' }}>
                                <Clock className="me-1"  size="1em"/>
                                {formatCountdown(getRemainingSeconds(apt.createdAt, now))}
                              </span>
                            )}
                          </div>
                        ) : isCancelled(apt.status) ? (
                          <Badge bg="light" text="muted" className="rounded-pill px-2 py-1">
                            Đã hủy
                          </Badge>
                        ) : isNoShow(apt.status) ? (
                          <Badge bg="light" text="muted" className="rounded-pill px-2 py-1">
                            Vắng mặt
                          </Badge>
                        ) : (
                          <Badge bg="light" text="muted" className="rounded-pill px-2 py-1">
                            —
                          </Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="d-inline-flex align-items-center justify-content-center gap-1.5 flex-wrap">
                          {isPending(apt.status) && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 fw-semibold"
                              onClick={() => {
                                const targetId = apt.appointmentId || apt.id;
                                navigate(`/payments/checkout?appointmentId=${targetId}&code=${apt.appointmentCode || ''}`);
                              }}
                            >
                              <Banknote  size="1em"/> Thanh toán
                            </Button>
                          )}
                          {isPatient && ['COMPLETED', 'INPROGRESS', 'CHECKEDIN', '4', '3', '2'].includes(String(apt.status).toUpperCase()) && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1 fw-semibold text-dark"
                              onClick={() => {
                                const q = new URLSearchParams();
                                q.set('appointmentId', apt.appointmentCode || apt.id || '');
                                if (apt.packageId) q.set('packageId', apt.packageId);
                                if (apt.packageCode) q.set('packageCode', apt.packageCode);
                                navigate(`/feedback?${q.toString()}`);
                              }}
                              title="Đánh giá gói xét nghiệm đã sử dụng"
                            >
                              <Star size="1em" className="text-warning" /> Đánh giá
                            </Button>
                          )}
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1"
                            onClick={() => handleViewDetail(apt.appointmentId || apt.id)}
                          >
                            <Eye  size="1em"/> Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {totalPages > 1 && (
        <div className="bms-appt-pager">
            <span className="small text-muted">
              Trang {page} / {totalPages} (Tổng số: {totalCount} bản ghi)
            </span>
            <Pagination size="sm" className="mb-0">
              <Pagination.First onClick={() => setPage(1)} disabled={page === 1} />
              <Pagination.Prev onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} />
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pNum = page - 2 + idx;
                if (page < 3) pNum = idx + 1;
                if (pNum > totalPages) return null;
                if (pNum < 1) return null;
                return (
                  <Pagination.Item
                    key={pNum}
                    active={pNum === page}
                    onClick={() => setPage(pNum)}
                  >
                    {pNum}
                  </Pagination.Item>
                );
              })}

              <Pagination.Next onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} />
              <Pagination.Last onClick={() => setPage(totalPages)} disabled={page === totalPages} />
            </Pagination>
          </div>
        )}

      {/* Appointment Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        className="bms-appt-modal"
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-0 pb-0 px-4 pt-4">
          <Modal.Title className="h5 fw-bold text-dark d-flex align-items-center gap-2">
            <FileText className="text-primary"  size="1em"/> Chi Tiết Cuộc Hẹn #{selectedAppointment?.appointmentCode || selectedAppointment?.appointmentId?.slice(-8) || ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          {detailLoading ? (
            <div className="text-center py-3">
              <Spinner animation="border" variant="primary" />
              <div className="small text-muted mt-2">Đang tải thông tin chi tiết...</div>
            </div>
          ) : selectedAppointment ? (
            <div>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <div className="p-3 bg-light rounded-3">
                    <div className="small text-muted fw-semibold text-uppercase mb-1">Mã Lịch Hẹn</div>
                    <div className="h5 fw-bold text-primary font-monospace mb-0">
                      {selectedAppointment.appointmentCode || '—'}
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-3 bg-light rounded-3">
                    <div className="small text-muted fw-semibold text-uppercase mb-1">Trạng Thái Vận Hành</div>
                    <div>{renderStatusBadge(selectedAppointment.status)}</div>
                  </div>
                </Col>
              </Row>

              <div className="border rounded-3 p-3 mb-3 bg-white">
                <h6 className="fw-bold mb-2 text-secondary d-flex align-items-center gap-2">
                  <User className="text-primary"  size="1em"/> Thông Tin Bệnh Nhân
                </h6>
                <div className="row g-2 small">
                  <div className="col-sm-6">
                    <span className="text-muted">Họ và tên:</span>{' '}
                    <strong className="text-dark">{selectedAppointment.patientName || user?.fullName || '—'}</strong>
                  </div>
                  <div className="col-sm-6">
                    <span className="text-muted">Mã bệnh nhân:</span>{' '}
                    <code className="text-primary fw-bold">{selectedAppointment.patientId || selectedAppointment.createdBy || '—'}</code>
                  </div>
                </div>
              </div>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <div className="border rounded-3 p-3">
                    <h6 className="fw-bold mb-2 text-secondary d-flex align-items-center gap-2">
                      <Stethoscope className="text-primary"  size="1em"/> Thông Tin Bác Sĩ & Lịch Khám
                    </h6>
                    <div className="small mb-1">
                      <strong>Bác sĩ:</strong> {resolveDoctorDisplay(selectedAppointment)}
                    </div>
                    <div className="small mb-1">
                      <strong>Chuyên khoa:</strong> {selectedAppointment.specialty || 'Huyết học - Truyền máu'}
                    </div>
                    <div className="small mb-1">
                      <strong>Ngày khám:</strong>{' '}
                      {selectedAppointment.appointmentDate
                        ? new Date(selectedAppointment.appointmentDate).toLocaleDateString('vi-VN')
                        : 'N/A'}
                    </div>
                    <div className="small mb-1">
                      <strong>Khung giờ:</strong> {selectedAppointment.slotTime || (selectedAppointment.appointmentTime ? String(selectedAppointment.appointmentTime).slice(0, 5) : '08:00 - 08:30')}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="border rounded-3 p-3">
                    <h6 className="fw-bold mb-2 text-secondary d-flex align-items-center gap-2">
                      <MapPin className="text-danger"  size="1em"/> Địa Điểm & Hình Thức
                    </h6>
                    <div className="small mb-1">
                      <strong>Hình thức:</strong>{' '}
                      {String(selectedAppointment.appointmentType || '').toLowerCase().includes('home')
                        ? 'Lấy mẫu tại nhà (Home Phlebotomy)'
                        : 'Khám tại phòng khám (Clinic Visit)'}
                    </div>
                    {selectedAppointment.collectionAddress && (
                      <div className="small mb-1">
                        <strong>Địa chỉ lấy mẫu:</strong> {selectedAppointment.collectionAddress}
                      </div>
                    )}
                    {selectedAppointment.roomName && (
                      <div className="small mb-1">
                        <strong>Phòng:</strong> {selectedAppointment.roomName}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>

              {selectedAppointment.testPackageName && (
                <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                  <TestTube2 className="text-primary"  size="1em"/>
                  <span>
                    <strong>Gói xét nghiệm chỉ định:</strong> {selectedAppointment.testPackageName}
                  </span>
                </div>
              )}

              {/* Check-in Slip & QR Code Section */}
              {isPaidOrConfirmed(selectedAppointment.status) ? (
                <div className="p-3 bg-light rounded-4 text-center mt-3">
                  <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                    <Badge bg="success" className="px-3 py-1.5 fs-6 shadow-xs">
                      Đã Thanh Toán &amp; Đủ Điều Kiện Check-in
                    </Badge>
                  </div>
                  <h6 className="fw-bold text-success text-uppercase mb-1 d-flex align-items-center justify-content-center gap-2">
                    <QrCode  size="1em"/> Phiếu Tiếp Đón &amp; Check-in Xét Nghiệm
                  </h6>
                  <p className="small text-muted mb-3">
                    Quý khách vui lòng xuất trình mã QR này tại quầy Lễ tân hoặc máy quét tự động khi đến phòng xét nghiệm.
                  </p>

                  <div className="bms-checkin-qr">
                    <QRCodeSVG
                      value={selectedAppointment.appointmentCode || selectedAppointment.appointmentId || selectedAppointment.id || 'BMS-APT'}
                      size={240}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  {/* Prominent Manual Check-in Code */}
                  <div className="mx-auto" style={{ maxWidth: '420px' }}>
                    <div className="small text-muted fw-semibold mb-1">Mã lịch hẹn (xuất trình khi đến quầy):</div>
                    <div className="h4 fw-bold font-monospace text-primary bg-white p-2 rounded-3 mb-1 tracking-wider">
                      {selectedAppointment.appointmentCode || selectedAppointment.appointmentId || selectedAppointment.id || 'N/A'}
                    </div>
                  </div>
                </div>
              ) : isPending(selectedAppointment.status) ? (
                <div className="p-2 bg-light rounded-4 text-center mt-3">
                  <div className="d-inline-flex p-3 rounded-circle bg-warning-subtle text-warning mb-2" style={{ fontSize: '36px' }}>
                    <Lock  size="1em"/>
                  </div>
                  <h5 className="fw-bold text-dark text-uppercase mb-1">
                    Mã QR Check-in Tiếp Đón Đang Tạm Khóa
                  </h5>
                  <p className="text-muted small mb-3 mx-auto" style={{ maxWidth: '480px' }}>
                    Theo quy định an toàn xét nghiệm, <strong>Mã QR tiếp đón và Mã check-in tự động tại phòng Lab sẽ chỉ được hiển thị sau khi đơn xét nghiệm hoàn tất thanh toán</strong>.
                  </p>

                  {/* Reservation countdown box */}
                  {(() => {
                    const remaining = getRemainingSeconds(selectedAppointment.createdAt, now);
                    const isExpired = remaining <= 0;
                    return (
                      <div className="p-3 bg-white rounded-3 d-inline-block mb-3" style={{ minWidth: '280px' }}>
                        <div className="small text-muted fw-semibold mb-1">
                          <Clock className="me-1 text-warning"  size="1em"/> THỜI GIAN GIỮ CHỖ CÒN LẠI:
                        </div>
                        <div className={`h2 fw-bold font-monospace mb-0 ${isExpired ? 'text-danger' : 'text-danger'}`}>
                          {formatCountdown(remaining)}
                        </div>
                        <div className="text-muted small mt-1" style={{ fontSize: '0.78rem' }}>
                          {selectedAppointment.createdAt
                            ? `(Đếm ngược 15 phút từ lúc đặt hẹn: ${new Date(selectedAppointment.createdAt).toLocaleTimeString('vi-VN')})`
                            : '(Giữ chỗ trong 15 phút)'}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    {getRemainingSeconds(selectedAppointment.createdAt, now) > 0 ? (
                      <Button
                        variant="success"
                        size="lg"
                        className="fw-bold px-4 py-2.5 shadow-sm d-inline-flex align-items-center gap-2 text-white"
                        style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}
                        onClick={() => {
                          setShowDetailModal(false);
                          navigate(`/payments/checkout?appointmentId=${selectedAppointment.appointmentId || selectedAppointment.id}&code=${selectedAppointment.appointmentCode}`);
                        }}
                      >
                        <Banknote  size="1em"/> Tiến Hành Thanh Toán Ngay (VietQR / Chuyển Khoản)
                      </Button>
                    ) : (
                      <div className="alert alert-danger py-2 small mb-0">
                        <XCircle className="me-1"  size="1em"/> Lịch hẹn này đã hết hạn giữ chỗ (15 phút) và hệ thống đã hoàn trả slot khám.
                      </div>
                    )}
                  </div>
                </div>
              ) : isCancelled(selectedAppointment.status) ? (
                <div className="p-3 bg-light rounded-4 text-center mt-3">
                  <div className="text-danger mb-2" style={{ fontSize: '36px' }}>
                    <XCircle  size="1em"/>
                  </div>
                  <h5 className="fw-bold text-danger text-uppercase mb-1">Lịch Hẹn Đã Bị Hủy</h5>
                  <p className="text-muted small mb-0">
                    {selectedAppointment.notes || 'Lịch hẹn đã hủy hoặc hết hạn giữ chỗ 15 phút. Slot khám đã được giải phóng trở lại cho hệ thống.'}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <Alert variant="danger" className="mb-0">
              Không thể tải chi tiết lịch hẹn.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" size="sm" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
