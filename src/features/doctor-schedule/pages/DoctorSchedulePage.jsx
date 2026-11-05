/**
 * @file DoctorSchedulePage.jsx
 * @description Clinical & Laboratory Shifts Management Page (View Shifts, Create Shifts, Update Shifts, Delete Shifts).
 * Connects to /api/shifts for full CRUD with popup modals, schedule conflict detection, and dependency checks.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Row, Col, Table, Badge, Button, Form, InputGroup,
  Spinner, Alert, Modal
} from 'react-bootstrap';
import {
  FaCalendarAlt, FaUserMd, FaSearch, FaClock, FaClinicMedical,
  FaCheckCircle, FaPlus, FaEdit, FaTrash, FaEye, FaSyncAlt,
  FaExclamationTriangle, FaUsers, FaDoorOpen, FaLock
} from 'react-icons/fa';
import {
  fetchShifts,
  fetchShiftById,
  createShift,
  updateShift,
  deleteShift,
  fetchRooms,
  fetchShiftStaff
} from '../api/scheduleApi';
import { userManagementService } from '../../../services/userManagementService';

import { ROLES, resolveRoleId, hasRole, getStoredUser } from '../../../constants/roles';
const SHIFT_TYPE_META = {
  Morning: { label: 'Ca Sáng', defaultStart: '07:00', defaultEnd: '11:30', badge: 'bg-primary-subtle text-primary border border-primary-subtle' },
  Afternoon: { label: 'Ca Chiều', defaultStart: '13:00', defaultEnd: '17:00', badge: 'bg-info-subtle text-info-emphasis border border-info-subtle' },
  Evening: { label: 'Ca Tối / Ngoài Giờ', defaultStart: '17:00', defaultEnd: '21:00', badge: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' },
  Night: { label: 'Ca Đêm', defaultStart: '21:00', defaultEnd: '23:59', badge: 'bg-dark-subtle text-dark border border-secondary-subtle' },
  FullDay: { label: 'Ca Cả Ngày', defaultStart: '07:00', defaultEnd: '17:00', badge: 'bg-success-subtle text-success border border-success-subtle' }
};

const SHIFT_STATUS_META = {
  Approved: { label: 'Đã Duyệt', badge: 'bg-success-subtle text-success border border-success-subtle' },
  Scheduled: { label: 'Đã Lên Lịch', badge: 'bg-primary-subtle text-primary border border-primary-subtle' },
  Active: { label: 'Đang Trực', badge: 'bg-info-subtle text-info-emphasis border border-info-subtle' },
  Pending: { label: 'Chờ Duyệt', badge: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' },
  Completed: { label: 'Hoàn Thành', badge: 'bg-secondary-subtle text-secondary border border-secondary-subtle' },
  Cancelled: { label: 'Đã Huỷ', badge: 'bg-danger-subtle text-danger border border-danger-subtle' },
  Rejected: { label: 'Từ Chối', badge: 'bg-danger-subtle text-danger border border-danger-subtle' }
};



function toDateInputStr(val) {
  if (!val) return '';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatVNDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function extractApiError(err, fallback = 'Đã xảy ra lỗi khi xử lý yêu cầu ca trực.') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.errors && typeof data.errors === 'object') {
    const msgs = Object.values(data.errors).flat().filter(Boolean);
    if (msgs.length > 0) return msgs.join(' ');
  }
  return data.detail || data.message || data.title || fallback;
}

const EMPTY_FORM = {
  employeeId: '',
  employeeName: '',
  employeeRole: 'Doctor',
  department: 'Nội Tổng Quát',
  roomId: '',
  shiftDate: toDateInputStr(new Date()),
  shiftType: 'Morning',
  shiftStart: '07:00',
  shiftEnd: '11:30',
  maxPatients: 30,
  status: 'Approved',
  notes: ''
};

export default function DoctorSchedulePage() {
  // Filter & pagination states
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [shiftTypeFilter, setShiftTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomIdFilter, setRoomIdFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  // Rooms & Staff from DB
  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // WHY: UC35 Create/Update/Delete Shifts are restricted to Manager role per ROLE-PERMISSION-MATRIX §1.
  // All staff roles (Admin, Manager, Doctor, Lab, Receptionist) can View Shifts.
  const canManageShifts = React.useMemo(() => hasRole(getStoredUser(), ROLES.ADMIN, ROLES.MANAGER), []);

  useEffect(() => {
    setLoadingStaff(true);
    fetchShiftStaff()
      .then(list => {
        if (Array.isArray(list) && list.length > 0) {
          setStaffList(list);
          return null;
        }
        return userManagementService.getAllUsers({ pageSize: 100 });
      })
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          const staff = res.data.filter(u => { const id = resolveRoleId(u); return id !== null && id !== ROLES.PATIENT; });
          setStaffList(staff);
        }
      })
      .catch(() => {
        // Handled silently; error banner shown on shift load if API unreachable
      })
      .finally(() => setLoadingStaff(false));
  }, []);
  useEffect(() => {
    fetchRooms()
      .then(data => {
        if (Array.isArray(data)) setRooms(data);
      })
      .catch(() => {
        // Handled silently; error banner shown on shift load if API unreachable
      });
  }, []);

  // Data states
  const [shifts, setShifts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create / Update Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // View Detail Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailShift, setDetailShift] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete Confirmation Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingShift, setDeletingShift] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const loadShifts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchShifts({
        keyword: debouncedKeyword || undefined,
        shiftType: shiftTypeFilter || undefined,
        status: statusFilter || undefined,
        roomId: roomIdFilter.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page,
        pageSize
      });
      const items = res?.items || res?.Items || (Array.isArray(res) ? res : []);
      setShifts(items);
      setTotalItems(res?.totalItems ?? res?.TotalItems ?? items.length);
      setTotalPages(Math.max(1, res?.totalPages ?? res?.TotalPages ?? 1));
    } catch (err) {
      setError(extractApiError(err, 'Không thể tải danh sách ca làm việc từ máy chủ.'));
      setShifts([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, shiftTypeFilter, statusFilter, roomIdFilter, fromDate, toDate, page, pageSize]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Summary KPIs
  const activeCount = shifts.filter(s => ['Approved', 'Scheduled', 'Active'].includes(s.status)).length;
  const totalBooked = shifts.reduce((acc, s) => acc + (s.currentPatientsCount || 0), 0);
  const totalCapacity = shifts.reduce((acc, s) => acc + (s.maxPatients || 0), 0);
  const uniqueRooms = new Set(shifts.map(s => s.roomId).filter(Boolean)).size;

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingShift(null);
    setFormData({
      ...EMPTY_FORM,
      shiftDate: toDateInputStr(new Date())
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (shift) => {
    setEditingShift(shift);
    setFormData({
      employeeId: shift.employeeId || shift.doctorId || '',
      employeeName: shift.employeeName || '',
      employeeRole: shift.employeeRole || 'Doctor',
      department: shift.department || '',
      roomId: shift.roomId || '',
      shiftDate: toDateInputStr(shift.shiftDate) || toDateInputStr(new Date()),
      shiftType: shift.shiftType || 'Morning',
      shiftStart: shift.shiftStart || '07:00',
      shiftEnd: shift.shiftEnd || '11:30',
      maxPatients: shift.maxPatients ?? 30,
      status: shift.status || 'Approved',
      notes: shift.notes || ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Open View Detail Modal
  const handleOpenDetail = async (shift) => {
    setDetailShift(shift);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const fresh = await fetchShiftById(shift.id);
      if (fresh) setDetailShift(fresh);
    } catch {
      // Keep row snapshot if detail call fails
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (shift) => {
    setDeletingShift(shift);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  // Handle ShiftType change -> auto-set default start/end times
  const handleShiftTypeChange = (newType) => {
    const meta = SHIFT_TYPE_META[newType];
    setFormData(prev => ({
      ...prev,
      shiftType: newType,
      shiftStart: meta ? meta.defaultStart : prev.shiftStart,
      shiftEnd: meta ? meta.defaultEnd : prev.shiftEnd
    }));
  };

  
  // Submit Create or Update Shift
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.employeeId.trim()) {
      setFormError('Vui lòng nhập hoặc chọn mã nhân sự / bác sĩ phụ trách ca trực.');
      return;
    }
    if (!formData.roomId.trim()) {
      setFormError('Vui lòng nhập hoặc chọn mã phòng làm việc (RoomId).');
      return;
    }
    if (!formData.shiftDate) {
      setFormError('Vui lòng chọn ngày trực (ShiftDate).');
      return;
    }
    if (formData.shiftStart >= formData.shiftEnd) {
      setFormError(`Giờ bắt đầu (${formData.shiftStart}) phải nhỏ hơn giờ kết thúc (${formData.shiftEnd}).`);
      return;
    }
    const maxPts = Number(formData.maxPatients);
    if (!Number.isFinite(maxPts) || maxPts < 1 || maxPts > 500) {
      setFormError('Chỉ tiêu tiếp nhận tối đa phải từ 1 đến 500 bệnh nhân.');
      return;
    }
    if (editingShift && maxPts < (editingShift.currentPatientsCount || 0)) {
      setFormError(`Chỉ tiêu tối đa (${maxPts}) không được nhỏ hơn số bệnh nhân đã đăng ký (${editingShift.currentPatientsCount}).`);
      return;
    }

    const payload = {
      employeeId: formData.employeeId.trim(),
      doctorId: formData.employeeId.trim(),
      employeeName: formData.employeeName.trim() || undefined,
      employeeRole: formData.employeeRole.trim() || 'Doctor',
      department: formData.department.trim() || undefined,
      roomId: formData.roomId.trim().toUpperCase(),
      shiftDate: formData.shiftDate,
      shiftType: formData.shiftType,
      shiftStart: formData.shiftStart,
      shiftEnd: formData.shiftEnd,
      maxPatients: maxPts,
      status: formData.status,
      notes: formData.notes.trim() || null
    };

    setSubmitting(true);
    try {
      if (editingShift) {
        await updateShift(editingShift.id, payload);
        setSuccessMsg(`Đã cập nhật thành công ca trực của ${formData.employeeName || formData.employeeId} tại phòng ${payload.roomId}.`);
      } else {
        await createShift(payload);
        setSuccessMsg(`Đã tạo ca trực mới cho ${formData.employeeName || formData.employeeId} tại phòng ${payload.roomId}.`);
      }
      setShowFormModal(false);
      await loadShifts();
    } catch (err) {
      setFormError(extractApiError(err, 'Không thể lưu ca trực. Vui lòng kiểm tra trùng lịch nhân sự hoặc phòng khám.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete Shift
  const handleConfirmDelete = async () => {
    if (!deletingShift) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteShift(deletingShift.id);
      setSuccessMsg(`Đã xoá ca làm việc tại phòng ${deletingShift.roomId} (${formatVNDate(deletingShift.shiftDate)}).`);
      setShowDeleteModal(false);
      setDeletingShift(null);
      await loadShifts();
    } catch (err) {
      setDeleteError(extractApiError(err, 'Không thể xoá ca trực này do đang có bệnh nhân hoặc lịch hẹn tham chiếu.'));
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setShiftTypeFilter('');
    setStatusFilter('');
    setRoomIdFilter('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const filterToday = () => {
    const todayStr = toDateInputStr(new Date());
    setFromDate(todayStr);
    setToDate(todayStr);
    setPage(1);
  };

  return (
    <div className="w-100 py-1">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
            <FaCalendarAlt className="text-primary" />
            <span>Quản Lý Ca Trực & Điều Phối Lịch Làm Việc</span>
          </h2>
          <p className="text-muted small mb-0">
            Xem danh sách ca trực, phân công bác sĩ/nhân viên xét nghiệm, kiểm soát trùng lịch và quản lý công suất tiếp nhận.
          </p>
        </div>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <Button variant="outline-secondary" size="sm" onClick={loadShifts} disabled={loading} className="d-flex align-items-center gap-1 px-3 py-2">
            <FaSyncAlt className={loading ? 'fa-spin' : ''} /> Làm mới
          </Button>
          {canManageShifts && (
            <Button variant="primary" size="sm" onClick={handleOpenCreate} className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm">
              <FaPlus /> Tạo Ca Làm Việc Mới (UC35)
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="rounded-3 shadow-sm mb-3">
          <FaCheckCircle className="me-2" />
          {successMsg}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="rounded-3 shadow-sm mb-3">
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}

      {/* KPI Summary Row */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <div className="text-muted small fw-medium">Tổng Ca Làm Việc</div>
                <div className="fs-4 fw-bold text-dark">{totalItems}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Hiển thị {shifts.length} ca trên trang</div>
              </div>
              <div className="rounded-3 bg-primary-subtle text-primary p-3 fs-4">
                <FaCalendarAlt />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <div className="text-muted small fw-medium">Ca Đã Duyệt / Đang Trực</div>
                <div className="fs-4 fw-bold text-success">{activeCount}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Sẵn sàng tiếp nhận bệnh nhân</div>
              </div>
              <div className="rounded-3 bg-success-subtle text-success p-3 fs-4">
                <FaCheckCircle />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <div className="text-muted small fw-medium">Công Suất Tiếp Nhận</div>
                <div className="fs-4 fw-bold text-primary">{totalBooked} / {totalCapacity}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Lượt đăng ký / Tổng chỉ tiêu</div>
              </div>
              <div className="rounded-3 bg-info-subtle text-info-emphasis p-3 fs-4">
                <FaUsers />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body className="d-flex align-items-center justify-content-between p-3">
              <div>
                <div className="text-muted small fw-medium">Phòng Đang Phân Ca</div>
                <div className="fs-4 fw-bold text-dark">{uniqueRooms}</div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>Phòng khám & phòng xét nghiệm</div>
              </div>
              <div className="rounded-3 bg-warning-subtle text-warning-emphasis p-3 fs-4">
                <FaDoorOpen />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filter & Search Toolbar */}
      <Card className="shadow-sm border-0 rounded-4 mb-4">
        <Card.Body className="p-3">
          <Row className="g-2 align-items-end">
            <Col xs={12} lg={3}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Tìm kiếm nhân sự / phòng / khoa</Form.Label>
              <InputGroup size="sm">
                <InputGroup.Text className="bg-white text-muted">
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Tên BS, mã NV, phòng, khoa..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </InputGroup>
            </Col>

            <Col xs={6} md={3} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Loại ca trực</Form.Label>
              <Form.Select
                size="sm"
                value={shiftTypeFilter}
                onChange={(e) => { setShiftTypeFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả ca trực</option>
                <option value="Morning">Ca Sáng (07:00 - 11:30)</option>
                <option value="Afternoon">Ca Chiều (13:00 - 17:00)</option>
                <option value="Evening">Ca Tối (17:00 - 21:00)</option>
                <option value="Night">Ca Đêm (21:00 - 23:59)</option>
                <option value="FullDay">Cả Ngày (07:00 - 17:00)</option>
              </Form.Select>
            </Col>

            <Col xs={6} md={3} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Trạng thái</Form.Label>
              <Form.Select
                size="sm"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Approved">Đã Duyệt (Approved)</option>
                <option value="Scheduled">Đã Lên Lịch (Scheduled)</option>
                <option value="Active">Đang Trực (Active)</option>
                <option value="Pending">Chờ Duyệt (Pending)</option>
                <option value="Completed">Hoàn Thành (Completed)</option>
                <option value="Cancelled">Đã Huỷ (Cancelled)</option>
              </Form.Select>
            </Col>

            <Col xs={6} md={3} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Từ ngày</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
            </Col>

            <Col xs={6} md={3} lg={2}>
              <Form.Label className="small fw-semibold text-secondary mb-1">Đến ngày</Form.Label>
              <Form.Control
                type="date"
                size="sm"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </Col>

            <Col xs={12} lg={1} className="d-flex gap-1">
              <Button variant="outline-primary" size="sm" className="w-100" onClick={filterToday} title="Lọc ca hôm nay">
                Hôm nay
              </Button>
              <Button variant="outline-secondary" size="sm" onClick={resetFilters} title="Xoá bộ lọc">
                Xoá
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Shifts Data Table */}
      <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="table-responsive">
          <Table hover className="align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="ps-4">Nhân Sự Phụ Trách</th>
                <th>Khoa / Chuyên Môn</th>
                <th>Phòng Làm Việc</th>
                <th>Ngày Trực</th>
                <th>Khung Giờ Ca</th>
                <th className="text-center">Công Suất (BN)</th>
                <th className="text-center">Trạng Thái</th>
                <th className="text-end pe-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                    <span className="text-muted">Đang tải danh sách ca làm việc từ máy chủ...</span>
                  </td>
                </tr>
              ) : shifts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    <FaUserMd className="fs-2 d-block mx-auto mb-2 text-secondary opacity-50" />
                    <div className="fw-semibold">Không tìm thấy ca làm việc nào phù hợp</div>
                    <div className="small mb-3">Thử xoá bộ lọc ngày hoặc nhấn &ldquo;Tạo Ca Làm Việc Mới&rdquo; để phân ca.</div>
                    {canManageShifts && (
                      <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                        <FaPlus className="me-1" /> Tạo Ca Làm Việc Đầu Tiên
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                shifts.map((shift) => {
                  const typeMeta = SHIFT_TYPE_META[shift.shiftType] || {
                    label: shift.shiftType || 'Ca Trực',
                    badge: 'bg-secondary-subtle text-secondary'
                  };
                  const statusMeta = SHIFT_STATUS_META[shift.status] || {
                    label: shift.status || 'Approved',
                    badge: 'bg-secondary-subtle text-secondary'
                  };
                  const currentPts = shift.currentPatientsCount || 0;
                  const maxPts = shift.maxPatients || 30;
                  const percent = Math.min(100, Math.round((currentPts / Math.max(1, maxPts)) * 100));

                  return (
                    <tr key={shift.id}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{ width: 38, height: 38 }}
                          >
                            <FaUserMd />
                          </div>
                          <div>
                            <div className="fw-bold text-dark">{shift.employeeName || shift.employeeId || shift.doctorId}</div>
                            <div className="text-muted small d-flex align-items-center gap-2">
                              <code>{shift.employeeId || shift.doctorId}</code>
                              <Badge bg="light" text="dark" className="border fw-normal">
                                {shift.employeeRole || 'Doctor'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-secondary">{shift.department || 'Lâm sàng'}</div>
                        {shift.licenseNumber && (
                          <div className="text-muted small">CCHN: {shift.licenseNumber}</div>
                        )}
                      </td>

                      <td>
                        <div className="d-flex align-items-center gap-1 fw-semibold text-dark">
                          <FaClinicMedical className="text-primary small" />
                          <span>{shift.roomName || shift.roomId}</span>
                        </div>
                        <div className="text-muted small">
                          Mã phòng: <code>{shift.roomId}</code>
                          {shift.floor ? ` • Tầng ${shift.floor}` : ''}
                        </div>
                      </td>

                      <td>
                        <div className="fw-semibold text-dark">{formatVNDate(shift.shiftDate)}</div>
                      </td>

                      <td>
                        <span className={`badge ${typeMeta.badge} px-2 py-1 mb-1 d-inline-block`}>
                          {typeMeta.label}
                        </span>
                        <div className="small text-muted d-flex align-items-center gap-1">
                          <FaClock className="text-secondary" />
                          <span>{shift.workingHoursLabel || `${shift.shiftStart} - ${shift.shiftEnd}`}</span>
                        </div>
                      </td>

                      <td className="text-center" style={{ minWidth: 130 }}>
                        <div className="fw-bold text-dark small">
                          {currentPts} / {maxPts} BN
                        </div>
                        <div className="progress mt-1" style={{ height: 6 }}>
                          <div
                            className={`progress-bar ${percent >= 85 ? 'bg-danger' : percent >= 60 ? 'bg-warning' : 'bg-success'}`}
                            role="progressbar"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                          Còn trống: {Math.max(0, maxPts - currentPts)}
                        </div>
                      </td>

                      <td className="text-center">
                        <span className={`badge ${statusMeta.badge} px-3 py-1 rounded-pill`}>
                          {statusMeta.label}
                        </span>
                      </td>

                      <td className="text-end pe-4">
                        <div className="d-inline-flex gap-1">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            title="Xem chi tiết ca trực"
                            onClick={() => handleOpenDetail(shift)}
                          >
                            <FaEye />
                          </Button>
                          {canManageShifts && (
                            <>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                title="Cập nhật ca trực (UC35)"
                                onClick={() => handleOpenEdit(shift)}
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                title="Xoá ca trực (UC35)"
                                onClick={() => handleOpenDelete(shift)}
                              >
                                <FaTrash />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>

        {/* Pagination Footer */}
        <Card.Footer className="bg-white border-top py-3 px-4 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
          <div className="text-muted small">
            Tổng cộng <strong>{totalItems}</strong> ca làm việc • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Trang trước
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </Button>
          </div>
        </Card.Footer>
      </Card>

      {/* =====================================================================
          MODAL 1: CREATE / UPDATE SHIFT POPUP
         ===================================================================== */}
      <Modal
        show={showFormModal}
        onHide={() => !submitting && setShowFormModal(false)}
        size="lg"
        centered
        backdrop="static"
      >
        <Form onSubmit={handleFormSubmit}>
          <Modal.Header closeButton={!submitting} className="bg-light">
            <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
              <FaCalendarAlt className="text-primary" />
              <span>{editingShift ? 'Cập Nhật Thông Tin Ca Làm Việc' : 'Tạo Ca Làm Việc Mới'}</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4">
            {formError && (
              <Alert variant="danger" className="py-2 small">
                <FaExclamationTriangle className="me-2" />
                {formError}
              </Alert>
            )}

            {/* Select staff from User Management database */}
            <div className="p-3 rounded-3 bg-light border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="small fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <FaUserMd className="text-primary" />
                  Nhân Sự Phụ Trách Ca Trực (Đồng Bộ Quản Lý Nhân Sự) <span className="text-danger">*</span>
                </Form.Label>
                <Badge bg="secondary-subtle" text="secondary" className="border d-flex align-items-center gap-1">
                  <FaLock size={10} /> Dữ liệu gốc CSDL (Chỉ xem)
                </Badge>
              </div>
              <small className="text-muted d-block mb-2">
                Chọn nhân viên hoặc bác sĩ từ hệ thống Quản lý nhân sự. Thông tin chuyên môn sẽ được nạp tự động và khóa không cho nhập tay.
              </small>

              {loadingStaff ? (
                <div className="text-muted small py-2">
                  <Spinner size="sm" animation="border" className="me-2 text-primary" />
                  Đang tải danh sách nhân sự từ cơ sở dữ liệu...
                </div>
              ) : (
                <Form.Select
                  value={formData.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const st = staffList.find(s => s.id === empId || s.username === empId);
                    if (st) {
                      const rawRole = String(st.role || '').toLowerCase();
                      const roleMap = {
                        doctor: 'Doctor',
                        lab: 'LabTech',
                        lab_technician: 'LabTech',
                        labtech: 'LabTech',
                        manager: 'Manager',
                        receptionist: 'Receptionist',
                        admin: 'Admin'
                      };
                      const mappedRole = roleMap[rawRole] || st.role || 'Doctor';
                      const defaultDept = st.department || st.doctorProfile?.specialty ||
                        (rawRole === 'doctor' ? 'Khoa Khám Bệnh' :
                         (rawRole === 'lab' || rawRole === 'lab_technician' || rawRole === 'manager' ? 'Khoa Xét Nghiệm' : 'Bộ Phận Tiếp Đón'));
                      setFormData(prev => ({
                        ...prev,
                        employeeId: st.id,
                        employeeName: st.fullName || st.username,
                        employeeRole: mappedRole,
                        department: defaultDept
                      }));
                    } else {
                      setFormData(prev => ({ ...prev, employeeId: empId, employeeName: '', department: '' }));
                    }
                  }}
                  required
                >
                  <option value="">-- Chọn Bác Sĩ / Kỹ Thuật Viên / Lễ Tân từ CSDL Nhân Sự --</option>
                  {staffList.map(emp => {
                    const rawRole = String(emp.role || '').toLowerCase();
                    const roleLabel =
                      rawRole === 'doctor' ? 'Bác sĩ' :
                      (rawRole === 'lab' || rawRole === 'lab_technician' || rawRole === 'labtech') ? 'KTV Xét nghiệm' :
                      rawRole === 'manager' ? 'Quản lý Lab' :
                      rawRole === 'receptionist' ? 'Lễ tân' : 'Quản trị';
                    const dept = emp.department || emp.doctorProfile?.specialty ||
                      (rawRole === 'doctor' ? 'Khoa Khám Bệnh' :
                       (rawRole === 'lab' || rawRole === 'lab_technician' || rawRole === 'manager') ? 'Khoa Xét Nghiệm' : 'Bộ Phận Tiếp Đón');
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName || emp.username} — {dept} ({roleLabel}) [Mã: {emp.id}]
                      </option>
                    );
                  })}
                  {formData.employeeId && !staffList.some(s => s.id === formData.employeeId) && (
                    <option value={formData.employeeId}>
                      {formData.employeeName || formData.employeeId} [Mã: {formData.employeeId}]
                    </option>
                  )}
                </Form.Select>
              )}
            </div>

            {/* Read-only locked employee details card */}
            <div className="p-3 rounded-3 bg-white border mb-3">
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label className="small fw-semibold text-muted">Mã Nhân Viên / Bác Sĩ (Chỉ xem)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.employeeId || '—'}
                    readOnly
                    className="bg-light fw-bold font-monospace text-primary"
                  />
                </Col>

                <Col md={5}>
                  <Form.Label className="small fw-semibold text-muted">Họ và Tên Nhân Sự (Chỉ xem)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.employeeName || '—'}
                    readOnly
                    className="bg-light fw-bold text-dark"
                  />
                </Col>

                <Col md={3}>
                  <Form.Label className="small fw-semibold text-muted">Vai Trò (Chỉ xem)</Form.Label>
                  <Form.Control
                    type="text"
                    value={
                      formData.employeeRole === 'Doctor' ? 'Bác sĩ (Doctor)' :
                      formData.employeeRole === 'LabTech' ? 'KTV Xét nghiệm (LabTech)' :
                      formData.employeeRole === 'LabHead' ? 'Trưởng khoa XN (LabHead)' :
                      formData.employeeRole === 'Receptionist' ? 'Lễ tân (Receptionist)' :
                      formData.employeeRole || '—'
                    }
                    readOnly
                    className="bg-light fw-semibold text-secondary"
                  />
                </Col>

                <Col md={6}>
                  <Form.Label className="small fw-semibold text-muted">Khoa / Bộ Phận Phụ Trách (Chỉ xem)</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.department || '—'}
                    readOnly
                    className="bg-light text-dark"
                  />
                </Col>
              </Row>
            </div>

              
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="small fw-semibold">
                  Phòng Khám / Phòng Lab (Cơ Sở Dữ Liệu) <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.roomId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const r = rooms.find(item => (item.id || item.roomNumber) === selId);
                    setFormData(prev => ({
                      ...prev,
                      roomId: selId,
                      department: r?.department ? r.department : prev.department,
                    }));
                  }}
                  required
                >
                  <option value="">-- Chọn phòng trực từ cơ sở dữ liệu --</option>
                  {rooms.map(r => (
                    <option key={r.id || r.roomNumber} value={r.id || r.roomNumber}>
                      {r.name ? `${r.id || r.roomNumber} - ${r.name} (${r.department || (r.floor ? `Tầng ${r.floor}` : r.type || 'Phòng')})` : (r.id || r.roomNumber)}
                    </option>
                  ))}
                  {formData.roomId && !rooms.some(r => (r.id || r.roomNumber) === formData.roomId) && (
                    <option value={formData.roomId}>{formData.roomId}</option>
                  )}
                </Form.Select>
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">
                  Ngày Làm Việc <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  value={formData.shiftDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftDate: e.target.value }))}
                  required
                />
              </Col>

              <Col md={4}>
                <Form.Label className="small fw-semibold">
                  Loại Ca Trực <span className="text-danger">*</span>
                </Form.Label>
                <Form.Select
                  value={formData.shiftType}
                  onChange={(e) => handleShiftTypeChange(e.target.value)}
                >
                  <option value="Morning">Ca Sáng (Morning)</option>
                  <option value="Afternoon">Ca Chiều (Afternoon)</option>
                  <option value="Evening">Ca Tối / Ngoài Giờ (Evening)</option>
                  <option value="Night">Ca Đêm (Night)</option>
                  <option value="FullDay">Cả Ngày (FullDay)</option>
                </Form.Select>
              </Col>

              <Col md={2}>
                <Form.Label className="small fw-semibold">
                  Giờ Bắt Đầu <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="time"
                  value={formData.shiftStart}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftStart: e.target.value }))}
                  required
                />
              </Col>

              <Col md={2}>
                <Form.Label className="small fw-semibold">
                  Giờ Kết Thúc <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="time"
                  value={formData.shiftEnd}
                  onChange={(e) => setFormData(prev => ({ ...prev, shiftEnd: e.target.value }))}
                  required
                />
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold">
                  Chỉ Tiêu Bệnh Nhân / Mẫu Tối Đa <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  min={editingShift ? Math.max(1, editingShift.currentPatientsCount || 1) : 1}
                  max={500}
                  value={formData.maxPatients}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxPatients: e.target.value }))}
                  required
                />
                {editingShift && (
                  <Form.Text className="text-muted">
                    Hiện đã có <strong>{editingShift.currentPatientsCount || 0}</strong> bệnh nhân đặt lịch trong ca này.
                  </Form.Text>
                )}
              </Col>

              <Col md={6}>
                <Form.Label className="small fw-semibold">Trạng Thái Ca Trực</Form.Label>
                <Form.Select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Approved">Đã Duyệt (Approved)</option>
                  <option value="Scheduled">Đã Lên Lịch (Scheduled)</option>
                  <option value="Active">Đang Trực (Active)</option>
                  <option value="Pending">Chờ Duyệt (Pending)</option>
                  <option value="Completed">Hoàn Thành (Completed)</option>
                  <option value="Cancelled">Đã Huỷ (Cancelled)</option>
                </Form.Select>
              </Col>

              <Col xs={12}>
                <Form.Label className="small fw-semibold">Ghi Chú Phân Công / Bàn Giao Ca</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ghi chú nhiệm vụ chuyên môn, bàn giao thiết bị hoặc lưu ý tiếp nhận..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer className="bg-light">
            <Button variant="secondary" onClick={() => setShowFormModal(false)} disabled={submitting}>
              Huỷ Bỏ
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Đang lưu...
                </>
              ) : (
                editingShift ? 'Lưu Cập Nhật Ca Trực' : 'Tạo Ca Làm Việc'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* =====================================================================
          MODAL 2: VIEW SHIFT DETAIL POPUP
         ===================================================================== */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaEye className="text-primary" />
            <span>Chi Tiết Ca Làm Việc & Phân Công Nhân Sự</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {detailLoading && (
            <div className="text-center py-2 mb-3">
              <Spinner animation="border" size="sm" variant="primary" className="me-2" />
              <span className="small text-muted">Đang đồng bộ dữ liệu mới nhất...</span>
            </div>
          )}
          {detailShift && (
            <div>
              <div className="d-flex flex-wrap justify-content-between align-items-center p-3 rounded-3 bg-primary-subtle border border-primary-subtle mb-3">
                <div>
                  <div className="fw-bold fs-5 text-dark">{detailShift.employeeName || detailShift.employeeId}</div>
                  <div className="small text-secondary">
                    Mã nhân sự: <code>{detailShift.employeeId || detailShift.doctorId}</code> • Vai trò: <strong>{detailShift.employeeRole || 'Doctor'}</strong> • Khoa: <strong>{detailShift.department || 'Lâm sàng'}</strong>
                  </div>
                </div>
                <Badge bg="primary" className="px-3 py-2 fs-6">
                  {SHIFT_STATUS_META[detailShift.status]?.label || detailShift.status}
                </Badge>
              </div>

              <Row className="g-3">
                <Col sm={6}>
                  <div className="p-3 border rounded-3 h-100">
                    <div className="text-muted small mb-1">Phòng làm việc được phân công</div>
                    <div className="fw-bold text-dark fs-6">{detailShift.roomName || detailShift.roomId}</div>
                    <div className="small text-muted">
                      Mã phòng: <code>{detailShift.roomId}</code>
                      {detailShift.floor ? ` • Tầng: ${detailShift.floor}` : ''}
                    </div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="p-3 border rounded-3 h-100">
                    <div className="text-muted small mb-1">Thời gian làm việc</div>
                    <div className="fw-bold text-dark fs-6">
                      {formatVNDate(detailShift.shiftDate)} ({SHIFT_TYPE_META[detailShift.shiftType]?.label || detailShift.shiftType})
                    </div>
                    <div className="small text-muted">
                      Khung giờ: <strong>{detailShift.workingHoursLabel || `${detailShift.shiftStart} - ${detailShift.shiftEnd}`}</strong>
                      {detailShift.durationMinutes ? ` (${detailShift.durationMinutes} phút)` : ''}
                    </div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="p-3 border rounded-3 h-100">
                    <div className="text-muted small mb-1">Công suất tiếp nhận bệnh nhân</div>
                    <div className="fw-bold text-primary fs-6">
                      Đã đăng ký: {detailShift.currentPatientsCount || 0} / {detailShift.maxPatients || 30} BN
                    </div>
                    <div className="small text-muted">
                      Slot còn trống: <strong>{detailShift.availableSlots ?? Math.max(0, (detailShift.maxPatients || 30) - (detailShift.currentPatientsCount || 0))}</strong>
                    </div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="p-3 border rounded-3 h-100">
                    <div className="text-muted small mb-1">Thông tin định danh bản ghi</div>
                    <div className="small text-dark">ID Ca: <code>{detailShift.id}</code></div>
                    <div className="small text-muted">
                      Cập nhật: {detailShift.updatedAt ? new Date(detailShift.updatedAt).toLocaleString('vi-VN') : new Date(detailShift.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </Col>
                <Col xs={12}>
                  <div className="p-3 border rounded-3 bg-light">
                    <div className="text-muted small mb-1">Ghi chú phân ca / bàn giao</div>
                    <div className="text-dark small">{detailShift.notes || 'Không có ghi chú đặc biệt.'}</div>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          {detailShift && canManageShifts && (
            <Button
              variant="outline-primary"
              onClick={() => {
                setShowDetailModal(false);
                handleOpenEdit(detailShift);
              }}
            >
              <FaEdit className="me-1" /> Chỉnh sửa ca này
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      {/* =====================================================================
          MODAL 3: DELETE SHIFT CONFIRMATION POPUP
         ===================================================================== */}
      <Modal
        show={showDeleteModal}
        onHide={() => !deleting && setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton={!deleting} className="bg-danger-subtle text-danger">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <FaTrash />
            <span>Xác Nhận Xoá Ca Làm Việc</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {deleteError && (
            <Alert variant="danger" className="py-2 small">
              <FaExclamationTriangle className="me-2" />
              {deleteError}
            </Alert>
          )}
          {deletingShift && (
            <div>
              <p className="mb-2">
                Bạn có chắc chắn muốn xoá ca làm việc sau khỏi hệ thống?
              </p>
              <div className="p-3 rounded-3 bg-light border small mb-3">
                <div><strong>Nhân sự:</strong> {deletingShift.employeeName} (<code>{deletingShift.employeeId || deletingShift.doctorId}</code>)</div>
                <div><strong>Phòng:</strong> {deletingShift.roomName || deletingShift.roomId}</div>
                <div><strong>Thời gian:</strong> {formatVNDate(deletingShift.shiftDate)} • {deletingShift.workingHoursLabel || `${deletingShift.shiftStart} - ${deletingShift.shiftEnd}`}</div>
                <div><strong>Bệnh nhân đã đặt:</strong> {deletingShift.currentPatientsCount || 0} / {deletingShift.maxPatients}</div>
              </div>
              {(deletingShift.currentPatientsCount || 0) > 0 && (
                <Alert variant="warning" className="py-2 small mb-0">
                  <FaExclamationTriangle className="me-1" />
                  Ca trực này đang có <strong>{deletingShift.currentPatientsCount}</strong> bệnh nhân đã đăng ký. Hệ thống sẽ chặn xoá nếu còn lịch hẹn hoạt động.
                </Alert>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="bg-light">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
            Huỷ
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Đang xoá...
              </>
            ) : (
              'Xác Nhận Xoá Ca'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}