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
import {
  FaCalendarAlt,
  FaClock,
  FaUserMd,
  FaSearch,
  FaFilter,
  FaRedo,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaVial,
  FaUserInjured,
  FaNotesMedical,
  FaQrcode
} from 'react-icons/fa';
import { appointmentApi } from '../api/appointmentApi';

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
        setAppointments(res.data);
        setTotalCount(res.total || res.data.length);
        setTotalPages(res.totalPages || Math.ceil((res.total || res.data.length) / pageSize) || 1);
      } else {
        setAppointments([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setErrorMsg(err.message || 'Không thể tải danh sách cuộc hẹn. Vui lòng thử lại.');
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
            <FaClock className="me-1" /> Chờ xác nhận
          </Badge>
        );
      case 'CONFIRMED':
      case '1':
        return (
          <Badge bg="info" className="px-2.5 py-1.5 rounded-pill shadow-xs text-white">
            <FaCheckCircle className="me-1" /> Đã xác nhận
          </Badge>
        );
      case 'CHECKEDIN':
      case 'CHECKED_IN':
      case '2':
        return (
          <Badge bg="primary" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <FaUserInjured className="me-1" /> Đã tiếp nhận
          </Badge>
        );
      case 'INPROGRESS':
      case 'IN_PROGRESS':
      case '3':
        return (
          <Badge bg="dark" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <FaVial className="me-1" /> Đang khám / Lấy mẫu
          </Badge>
        );
      case 'COMPLETED':
      case '4':
        return (
          <Badge bg="success" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <FaCheckCircle className="me-1" /> Hoàn thành
          </Badge>
        );
      case 'CANCELLED':
      case '5':
        return (
          <Badge bg="danger" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <FaTimesCircle className="me-1" /> Đã hủy
          </Badge>
        );
      case 'NOSHOW':
      case 'NO_SHOW':
      case '6':
        return (
          <Badge bg="secondary" className="px-2.5 py-1.5 rounded-pill shadow-xs">
            <FaExclamationTriangle className="me-1" /> Vắng mặt (No-show)
          </Badge>
        );
      default:
        return <Badge bg="light" text="dark" className="border">{rawStatus || 'N/A'}</Badge>;
    }
  };

  return (
    <div className="container-fluid py-4 px-lg-4">
      {/* Header title */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-primary d-flex align-items-center gap-2">
            <FaCalendarAlt /> Quản Lý Lịch Hẹn Khám & Lấy Mẫu
          </h2>
          <p className="text-muted mb-0 small">
            Theo dõi, tra cứu và điều phối danh sách cuộc hẹn khám bệnh & lấy mẫu tại phòng khám hoặc tại nhà.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center gap-2 px-3"
            onClick={fetchAppointments}
            disabled={loading}
          >
            <FaRedo className={loading ? 'fa-spin' : ''} /> Làm mới
          </Button>
        </div>
      </div>

      {/* Date Validation Alert */}
      {dateValidationWarning && (
        <Alert variant="warning" className="d-flex align-items-center gap-2 py-2 mb-3 shadow-sm border-warning">
          <FaExclamationTriangle />
          <span>{dateValidationWarning}</span>
        </Alert>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg(null)} className="py-2 mb-3 shadow-sm">
          {errorMsg}
        </Alert>
      )}

      {/* Filters Card */}
      <Card className="border-0 shadow-sm rounded-3 mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
            <Col md={3} sm={6}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Từ ngày</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text><FaCalendarAlt className="text-muted" /></InputGroup.Text>
                <Form.Control
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
            </Col>

            <Col md={3} sm={6}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Đến ngày</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text><FaCalendarAlt className="text-muted" /></InputGroup.Text>
                <Form.Control
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
            </Col>

            <Col md={3} sm={6}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Trạng thái</Form.Label>
              <Form.Select
                size="sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">-- Tất cả trạng thái --</option>
                <option value="Pending">Chờ xác nhận (Pending)</option>
                <option value="Confirmed">Đã xác nhận (Confirmed)</option>
                <option value="CheckedIn">Đã tiếp nhận (CheckedIn)</option>
                <option value="InProgress">Đang khám / Lấy mẫu (InProgress)</option>
                <option value="Completed">Hoàn thành (Completed)</option>
                <option value="Cancelled">Đã hủy (Cancelled)</option>
                <option value="NoShow">Vắng mặt (NoShow)</option>
              </Form.Select>
            </Col>

            <Col md={3} sm={6}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Tìm kiếm từ khóa</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text><FaSearch className="text-muted" /></InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Mã hẹn, địa chỉ, ghi chú..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
                {keyword && (
                  <Button variant="outline-secondary" onClick={() => setKeyword('')}>
                    ×
                  </Button>
                )}
              </InputGroup>
            </Col>
          </Row>

          <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
            <span className="small text-muted">
              Tìm thấy <strong className="text-dark">{totalCount}</strong> cuộc hẹn phù hợp
            </span>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none text-muted p-0"
              onClick={handleResetFilters}
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Data Table Card */}
      <Card className="border-0 shadow-sm rounded-3 overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0 text-nowrap">
            <thead className="table-light text-uppercase small text-muted">
              <tr>
                <th className="py-3 px-3">Mã Cuộc Hẹn</th>
                <th className="py-3">Ngày & Khung Giờ</th>
                <th className="py-3">Bác Sĩ Tiếp Nhận</th>
                <th className="py-3">Hình Thức</th>
                <th className="py-3">Địa Chỉ / Phòng Khám</th>
                <th className="py-3 text-center">Trạng Thái</th>
                <th className="py-3 text-center" style={{ minWidth: '90px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <Spinner animation="border" variant="primary" className="mb-2" />
                    <div className="text-muted small">Đang tải dữ liệu cuộc hẹn...</div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5">
                    <div className="text-muted mb-2 fs-4">📋</div>
                    <div className="fw-semibold text-secondary">Không tìm thấy cuộc hẹn nào</div>
                    <div className="text-muted small">
                      Thử điều chỉnh khoảng ngày hoặc bộ lọc trạng thái để tìm kiếm.
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((apt) => {
                  const appointmentDateStr = apt.appointmentDate
                    ? new Date(apt.appointmentDate).toLocaleDateString('vi-VN')
                    : 'N/A';
                  const isHome = String(apt.appointmentType || '').toLowerCase().includes('home');

                  return (
                    <tr key={apt.appointmentId || apt.id}>
                      <td className="px-3">
                        <div className="fw-bold text-primary font-monospace">
                          {apt.appointmentCode || apt.id?.slice(-8) || 'N/A'}
                        </div>
                        {apt.queueNumber && (
                          <span className="badge bg-light text-dark border small mt-1">
                            STT: Q-{String(apt.queueNumber).padStart(3, '0')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">
                          <FaCalendarAlt className="me-1 text-muted small" /> {appointmentDateStr}
                        </div>
                        <div className="small text-muted">
                          <FaClock className="me-1 text-muted small" /> {apt.slotTime || '30 phút'}
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark d-flex align-items-center gap-1">
                          <FaUserMd className="text-primary small" />
                          {apt.doctorName || 'Bác sĩ trực ban'}
                        </div>
                        {apt.specialty && (
                          <div className="small text-muted">{apt.specialty}</div>
                        )}
                      </td>
                      <td>
                        <Badge
                          bg={isHome ? 'secondary' : 'light'}
                          text={isHome ? 'white' : 'dark'}
                          className="border px-2 py-1"
                        >
                          {isHome ? 'Tại nhà (Home)' : 'Tại viện (Clinic)'}
                        </Badge>
                      </td>
                      <td className="text-truncate" style={{ maxWidth: '240px' }}>
                        {isHome ? (
                          <span className="small text-dark" title={apt.collectionAddress}>
                            <FaMapMarkerAlt className="text-danger me-1" />
                            {apt.collectionAddress || 'Chưa cung cấp'}
                          </span>
                        ) : (
                          <span className="small text-muted">
                            Phòng khám Đa khoa Quốc tế BMS
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {renderStatusBadge(apt.status)}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="px-2 py-1 d-inline-flex align-items-center gap-1"
                          onClick={() => handleViewDetail(apt.appointmentId || apt.id)}
                          title="Xem chi tiết cuộc hẹn"
                        >
                          <FaEye /> Chi tiết
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <Card.Footer className="bg-white py-3 d-flex justify-content-between align-items-center border-top">
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
          </Card.Footer>
        )}
      </Card>

      {/* Appointment Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="h5 fw-bold text-primary d-flex align-items-center gap-2">
            <FaNotesMedical /> Chi Tiết Cuộc Hẹn #{selectedAppointment?.appointmentCode || selectedAppointment?.appointmentId?.slice(-8) || ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {detailLoading ? (
            <div className="text-center py-5">
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
                      {selectedAppointment.appointmentCode || 'N/A'}
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

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <div className="border rounded-3 p-3">
                    <h6 className="fw-bold mb-2 text-secondary d-flex align-items-center gap-2">
                      <FaUserMd className="text-primary" /> Thông Tin Bác Sĩ & Lịch Khám
                    </h6>
                    <div className="small mb-1">
                      <strong>Bác sĩ:</strong> {selectedAppointment.doctorName || 'Bác sĩ chuyên khoa'}
                    </div>
                    {selectedAppointment.specialty && (
                      <div className="small mb-1">
                        <strong>Chuyên khoa:</strong> {selectedAppointment.specialty}
                      </div>
                    )}
                    <div className="small mb-1">
                      <strong>Ngày khám:</strong>{' '}
                      {selectedAppointment.appointmentDate
                        ? new Date(selectedAppointment.appointmentDate).toLocaleDateString('vi-VN')
                        : 'N/A'}
                    </div>
                    <div className="small mb-1">
                      <strong>Khung giờ:</strong> {selectedAppointment.slotTime || 'Theo ca'}
                    </div>
                  </div>
                </Col>

                <Col md={6}>
                  <div className="border rounded-3 p-3">
                    <h6 className="fw-bold mb-2 text-secondary d-flex align-items-center gap-2">
                      <FaMapMarkerAlt className="text-danger" /> Địa Điểm & Hình Thức
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
                    {selectedAppointment.notes && (
                      <div className="small mb-1 text-muted">
                        <strong>Ghi chú:</strong> {selectedAppointment.notes}
                      </div>
                    )}
                  </div>
                </Col>
              </Row>

              {selectedAppointment.testPackageName && (
                <div className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-0">
                  <FaVial className="text-primary" />
                  <span>
                    <strong>Gói xét nghiệm chỉ định:</strong> {selectedAppointment.testPackageName}
                  </span>
                </div>
              )}
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
