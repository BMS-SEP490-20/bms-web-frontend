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
import { Calendar, Stethoscope, Search, Clock, Hospital, CheckCircle2, Plus, SquarePen, Trash2, Eye, RefreshCw, AlertTriangle, Users, DoorOpen, Lock, X as LucideX, List, FlaskConical, UserCheck } from 'lucide-react';
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
import { WeeklyShiftTimetable, getMonday, addDays, toIsoDateStr } from '../../schedule/components/WeeklyShiftTimetable';
import { resolveStaffProfileMOH, formatShiftCode } from '../../schedule/utils/shiftStaffUtils';

import { ROLES, resolveRoleId, hasRole, getStoredUser } from '../../../constants/roles';
const SHIFT_TYPE_META = {
  Morning: { label: 'Ca Sáng', defaultStart: '07:00', defaultEnd: '11:30', badge: 'bg-primary-subtle text-primary border border-primary-subtle' },
  Afternoon: { label: 'Ca Chiều', defaultStart: '13:00', defaultEnd: '17:00', badge: 'bg-info-subtle text-info-emphasis border border-info-subtle' },
  Evening: { label: 'Ca Tối / Ngoài Giờ', defaultStart: '17:00', defaultEnd: '21:00', badge: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle' },
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

export function getShiftRoleCategory(shift) {
  if (!shift) return 'doctor';
  const role = String(shift.employeeRole || '').toLowerCase();
  if (role === 'doctor' || role === 'bác sĩ' || role === 'bacsi') return 'doctor';
  if (role.includes('lab') || role === 'labtech' || role === 'labhead' || role.includes('xét nghiệm')) return 'lab';
  if (role.includes('reception') || role.includes('lễ tân') || role === 'letan') return 'receptionist';

  const dept = String(shift.department || '').toLowerCase();
  const room = String(shift.roomName || shift.roomId || '').toLowerCase();
  const type = String(shift.shiftType || '').toLowerCase();

  if (dept.includes('xét nghiệm') || dept.includes('lab') || room.includes('lab') || type.includes('lab') || type.includes('xét nghiệm')) {
    return 'lab';
  }
  if (dept.includes('lễ tân') || dept.includes('tiếp nhận') || dept.includes('tiếp đón') || room.includes('quầy') || room.includes('sảnh') || type.includes('lễ tân') || type.includes('tiếp nhận')) {
    return 'receptionist';
  }
  return 'doctor';
}

export default function DoctorSchedulePage() {
  const [activeRoleTab, setActiveRoleTab] = useState('doctor');
  const [viewMode, setViewMode] = useState('timetable');
  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [shiftTypeFilter, setShiftTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roomIdFilter, setRoomIdFilter] = useState('');
  const [fromDate, setFromDate] = useState(() => toIsoDateStr(getMonday(new Date())));
  const [toDate, setToDate] = useState(() => toIsoDateStr(addDays(getMonday(new Date()), 6)));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [rooms, setRooms] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const storedUser = React.useMemo(() => getStoredUser(), []);
  const canViewAllShifts = React.useMemo(() => hasRole(storedUser, ROLES.ADMIN, ROLES.MANAGER), [storedUser]);
  const canManageShifts = React.useMemo(() => hasRole(storedUser, ROLES.MANAGER), [storedUser]);
  const isAdminReadOnly = React.useMemo(() => hasRole(storedUser, ROLES.ADMIN) && !canManageShifts, [storedUser, canManageShifts]);
  const currentUserId = React.useMemo(() => {
    return String(storedUser?.id || storedUser?.userId || storedUser?.UserId || '').trim();
  }, [storedUser]);
  const currentUserName = React.useMemo(() => {
    return String(storedUser?.fullName || storedUser?.name || storedUser?.username || '').trim();
  }, [storedUser]);

  useEffect(() => {
    setLoadingStaff(true);
    fetchShiftStaff()
      .then(list => {
        if (Array.isArray(list) && list.length > 0) {
          const nonAdminStaff = list.filter(u => {
            const id = resolveRoleId(u);
            return id !== ROLES.ADMIN && id !== ROLES.PATIENT;
          });
          setStaffList(nonAdminStaff);
          return null;
        }
        return null;
      })
      .catch(() => {
      })
      .finally(() => setLoadingStaff(false));
  }, []);
  useEffect(() => {
    fetchRooms()
      .then(data => {
        if (Array.isArray(data)) setRooms(data);
      })
      .catch(() => {
      });
  }, []);

  const [shifts, setShifts] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailShift, setDetailShift] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
        employeeId: canManageShifts ? undefined : (currentUserId || undefined),
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

  const doctorShifts = React.useMemo(() => shifts.filter(s => getShiftRoleCategory(s) === 'doctor'), [shifts]);
  const labShifts = React.useMemo(() => shifts.filter(s => getShiftRoleCategory(s) === 'lab'), [shifts]);
  const receptionistShifts = React.useMemo(() => shifts.filter(s => getShiftRoleCategory(s) === 'receptionist'), [shifts]);

  const currentRoleShifts = React.useMemo(() => {
    if (activeRoleTab === 'doctor') return doctorShifts;
    if (activeRoleTab === 'lab') return labShifts;
    if (activeRoleTab === 'receptionist') return receptionistShifts;
    return shifts;
  }, [activeRoleTab, doctorShifts, labShifts, receptionistShifts, shifts]);

  const myRoleShifts = React.useMemo(() => {
    if (canViewAllShifts) {
      return currentRoleShifts;
    }
    const uid = currentUserId.toLowerCase();
    const uname = currentUserName.toLowerCase();

    return shifts.filter(s => {
      const sid = String(s.employeeId || s.doctorId || '').trim().toLowerCase();
      if (sid && uid && (sid === uid || sid.includes(uid) || uid.includes(sid))) {
        return true;
      }
      const sname = String(s.employeeName || s.doctorName || '').trim().toLowerCase();
      if (sname && uname && (sname.includes(uname) || uname.includes(sname))) {
        return true;
      }
      return false;
    });
  }, [canViewAllShifts, currentRoleShifts, shifts, currentUserId, currentUserName]);

  const displayStaffList = React.useMemo(() => {
    const list = staffList || [];
    if (activeRoleTab === 'doctor') {
      const docs = list.filter(u => resolveRoleId(u) === ROLES.DOCTOR || String(u.role || '').toLowerCase() === 'doctor');
      return docs.length > 0 ? docs : list;
    }
    if (activeRoleTab === 'lab') {
      const labs = list.filter(u => {
        const rid = resolveRoleId(u);
        const r = String(u.role || '').toLowerCase();
        return rid === ROLES.LAB || rid === ROLES.MANAGER || r === 'lab' || r === 'lab_technician' || r === 'labtech' || r === 'manager' || r === 'labhead';
      });
      return labs.length > 0 ? labs : list;
    }
    if (activeRoleTab === 'receptionist') {
      const recs = list.filter(u => resolveRoleId(u) === ROLES.RECEPTIONIST || String(u.role || '').toLowerCase() === 'receptionist');
      return recs.length > 0 ? recs : list;
    }
    return list;
  }, [staffList, activeRoleTab]);

  const availableRoomsForRole = React.useMemo(() => {
    if (activeRoleTab === 'receptionist') {
      return [
        { id: 'QUAY-01', name: 'Quầy Tiếp Đón 01 (Sảnh Tầng 1)', department: 'Bộ Phận Tiếp Đón', floor: 'Tầng 1' },
        { id: 'QUAY-02', name: 'Quầy Thu Ngân & Bàn Giao (Sảnh Tầng 1)', department: 'Bộ Phận Tiếp Đón', floor: 'Tầng 1' },
        { id: 'QUAY-03', name: 'Quầy Điều Phối Hàng Đợi (Sảnh Tầng 1)', department: 'Bộ Phận Tiếp Đón', floor: 'Tầng 1' }
      ];
    }
    if (activeRoleTab === 'lab') {
      const labRooms = rooms.filter(r => {
        const type = String(r.type || '').toLowerCase();
        const dept = String(r.department || '').toLowerCase();
        const name = String(r.name || '').toLowerCase();
        const id = String(r.id || '').toLowerCase();
        return type === 'laboratory' || dept.includes('xét nghiệm') || dept.includes('lab') || name.includes('lab') || name.includes('xét nghiệm') || id.includes('lab');
      });
      return labRooms.length > 0 ? labRooms : [
        { id: 'LAB-01', name: 'Phòng Xét Nghiệm Sinh Hóa - Huyết Học', department: 'Khoa Xét Nghiệm', floor: '2' },
        { id: 'LAB-02', name: 'Phòng Xét Nghiệm Miễn Dịch - Vi Sinh', department: 'Khoa Xét Nghiệm', floor: '2' }
      ];
    }

    const docRooms = rooms.filter(r => {
      const type = String(r.type || '').toLowerCase();
      const dept = String(r.department || '').toLowerCase();
      const name = String(r.name || '').toLowerCase();
      const id = String(r.id || '').toLowerCase();
      if (type === 'laboratory' || dept.includes('xét nghiệm') || dept.includes('lab') || name.includes('lab') || name.includes('xét nghiệm') || id.includes('lab')) return false;
      if (name.includes('quầy') || name.includes('tiếp đón') || id.includes('quay')) return false;
      return true;
    });
    return docRooms.length > 0 ? docRooms : [
      { id: 'R.101', name: 'Phòng Khám Nội Tổng Quát', department: 'Khoa Khám Bệnh Lâm Sàng', floor: '1' },
      { id: 'R.102', name: 'Phòng Khám Chuyên Khoa', department: 'Khoa Khám Bệnh Lâm Sàng', floor: '1' }
    ];
  }, [rooms, activeRoleTab]);

  const activeCount = myRoleShifts.filter(s => ['Approved', 'Scheduled', 'Active'].includes(s.status)).length;
  const totalBooked = shifts.reduce((acc, s) => acc + (s.currentPatientsCount || 0), 0);
  const totalCapacity = shifts.reduce((acc, s) => acc + (s.maxPatients || 0), 0);
  const uniqueRooms = new Set(shifts.map(s => s.roomId).filter(Boolean)).size;

  const handleOpenCreate = (prefill) => {
    setEditingShift(null);
    let shiftType = 'Morning';
    let shiftStart = '07:00';
    let shiftEnd = '11:30';
    if (prefill?.slotId === 2) {
      shiftType = 'Afternoon';
      shiftStart = '13:00';
      shiftEnd = '17:00';
    } else if (prefill?.slotId === 3) {
      shiftType = 'Evening';
      shiftStart = '17:30';
      shiftEnd = '20:30';
    }

    let defaultRole = 'Doctor';
    let defaultDept = 'Khoa Khám Bệnh';
    if (activeRoleTab === 'lab') {
      defaultRole = 'LabTech';
      defaultDept = 'Khoa Xét Nghiệm';
    } else if (activeRoleTab === 'receptionist') {
      defaultRole = 'Receptionist';
      defaultDept = 'Bộ Phận Tiếp Đón & Lấy Mẫu';
    }

    setFormData({
      ...EMPTY_FORM,
      shiftDate: prefill?.dateStr || toDateInputStr(new Date()),
      shiftType,
      shiftStart: prefill?.shiftStart || shiftStart,
      shiftEnd: prefill?.shiftEnd || shiftEnd,
      employeeRole: defaultRole,
      department: defaultDept,
      roomId: activeRoleTab === 'receptionist' ? 'QUAY-01' : (availableRoomsForRole[0]?.id || availableRoomsForRole[0]?.roomNumber || '')
    });
    setFormError('');
    setShowFormModal(true);
  };

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

  const handleOpenDetail = async (shift) => {
    setDetailShift(shift);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const fresh = await fetchShiftById(shift.id);
      if (fresh) setDetailShift(fresh);
    } catch {
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDelete = (shift) => {
    setDeletingShift(shift);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleShiftTypeChange = (newType) => {
    const meta = SHIFT_TYPE_META[newType];
    setFormData(prev => ({
      ...prev,
      shiftType: newType,
      shiftStart: meta ? meta.defaultStart : prev.shiftStart,
      shiftEnd: meta ? meta.defaultEnd : prev.shiftEnd
    }));
  };

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

      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">
              Quản Lý Ca Trực &amp; Điều Phối Lịch Làm Việc
            </h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Điều phối ca làm việc, phân bổ phòng trực và chỉ tiêu tiếp nhận bệnh nhân
          </p>
        </div>

        <div className="bms-page-actions">
          {isAdminReadOnly && (
            <Badge bg="light" text="secondary" className="border rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-1">
              <Eye size={13} /> Chế độ Chỉ xem (Admin)
            </Badge>
          )}
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={loadShifts}
            disabled={loading}
            className="d-flex align-items-center gap-1 px-3 py-2 rounded-pill"
          >
            <RefreshCw className={loading ? 'fa-spin' : ''}  size="1em"/> Làm mới
          </Button>
          {canManageShifts && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              className="d-flex align-items-center gap-2 px-3 py-2 fw-semibold text-white rounded-pill"
              style={{
                backgroundColor: '#1E60E6',
                borderColor: '#1E60E6'
              }}
            >
              <Plus size={13} /> Tạo Ca Làm Việc Mới
            </Button>
          )}
        </div>
      </div>

      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="rounded-3 shadow-sm mb-3">
          <CheckCircle2 className="me-2"  size="1em"/>
          {successMsg}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="rounded-3 shadow-sm mb-3">
          <AlertTriangle className="me-2"  size="1em"/>
          {error}
        </Alert>
      )}

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Tổng Ca Làm Việc</h6>
              <div className="bms-kpi-value">{totalItems}</div>
              <div className="bms-kpi-sub text-muted">Hiển thị {shifts.length} ca trên trang</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
              <Calendar  size="1em"/>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Ca Đang Hoạt Động</h6>
              <div className="bms-kpi-value text-success">{activeCount}</div>
              <div className="bms-kpi-sub text-success">Sẵn sàng tiếp nhận bệnh nhân</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-green">
              <CheckCircle2  size="1em"/>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Công Suất Tiếp Nhận</h6>
              <div className="bms-kpi-value text-primary">{totalBooked} / {totalCapacity}</div>
              <div className="bms-kpi-sub text-muted">Lượt đăng ký / Tổng chỉ tiêu</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
              <Users  size="1em"/>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} xl={3}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Phòng Đang Phân Ca</h6>
              <div className="bms-kpi-value">{uniqueRooms}</div>
              <div className="bms-kpi-sub text-muted">Phòng khám &amp; xét nghiệm</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-purple">
              <DoorOpen  size="1em"/>
            </div>
          </div>
        </Col>
      </Row>

      {canViewAllShifts && (
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div className="d-flex align-items-center gap-2 p-1 bg-white border rounded-pill shadow-sm">
          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold transition-all ${activeRoleTab === 'doctor' ? 'btn-primary text-white shadow-sm' : 'text-secondary btn-light'}`}
            onClick={() => setActiveRoleTab('doctor')}
            style={activeRoleTab === 'doctor' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : {}}
          >
            <Stethoscope  size="1em"/>
            <span>Bác Sĩ Khám Lâm Sàng</span>
            <Badge bg={activeRoleTab === 'doctor' ? 'light' : 'secondary'} text={activeRoleTab === 'doctor' ? 'primary' : 'white'} pill>
              {doctorShifts.length}
            </Badge>
          </button>

          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold transition-all ${activeRoleTab === 'lab' ? 'btn-primary text-white shadow-sm' : 'text-secondary btn-light'}`}
            onClick={() => setActiveRoleTab('lab')}
            style={activeRoleTab === 'lab' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : {}}
          >
            <FlaskConical  size="1em"/>
            <span>Kỹ Thuật Viên Xét Nghiệm</span>
            <Badge bg={activeRoleTab === 'lab' ? 'light' : 'secondary'} text={activeRoleTab === 'lab' ? 'primary' : 'white'} pill>
              {labShifts.length}
            </Badge>
          </button>

          <button
            type="button"
            className={`btn btn-sm d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold transition-all ${activeRoleTab === 'receptionist' ? 'btn-primary text-white shadow-sm' : 'text-secondary btn-light'}`}
            onClick={() => setActiveRoleTab('receptionist')}
            style={activeRoleTab === 'receptionist' ? { backgroundColor: '#1E60E6', borderColor: '#1E60E6' } : {}}
          >
            <UserCheck  size="1em"/>
            <span>Lễ Tân &amp; Điều Phối Tiếp Đón</span>
            <Badge bg={activeRoleTab === 'receptionist' ? 'light' : 'secondary'} text={activeRoleTab === 'receptionist' ? 'primary' : 'white'} pill>
              {receptionistShifts.length}
            </Badge>
          </button>
        </div>

        <div className="small text-muted fw-semibold">
          Đang xem: <strong className="text-primary">{activeRoleTab === 'doctor' ? 'Khoa Khám Bác Sĩ' : activeRoleTab === 'lab' ? 'Phòng Phân Tích Lab' : 'Quầy Sảnh Lễ Tân'}</strong> ({currentRoleShifts.length} ca trực)
        </div>
      </div>

      )}

      {viewMode === 'table' && (
        <div className="bms-filter-bar mb-3">
          <div className="bms-search-input-pill">
            <Search className="bms-search-icon"  size="1em"/>
            <input
              type="text"
              placeholder="Tìm tên nhân sự, mã nhân viên, phòng trực..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                className="bms-search-clear"
                onClick={() => setKeyword('')}
                title="Xóa tìm kiếm"
              >
                <LucideX size={12} />
              </button>
            )}
          </div>

          <Form.Select
            size="sm"
            value={shiftTypeFilter}
            onChange={(e) => { setShiftTypeFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
          >
            <option value="">Tất cả ca trực</option>
            <option value="Morning">Ca Sáng (07:00 - 11:30)</option>
            <option value="Afternoon">Ca Chiều (13:00 - 17:00)</option>
            <option value="Evening">Ca Tối (17:00 - 21:00)</option>
            <option value="FullDay">Cả Ngày (07:00 - 17:00)</option>
          </Form.Select>

          <Form.Select
            size="sm"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Approved">Đã duyệt</option>
            <option value="Scheduled">Đã lên lịch</option>
            <option value="Active">Đang trực</option>
            <option value="Pending">Chờ duyệt</option>
            <option value="Completed">Hoàn thành</option>
            <option value="Cancelled">Đã huỷ</option>
          </Form.Select>

          <Form.Control
            type="date"
            size="sm"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
            title="Từ ngày"
          />

          <Form.Control
            type="date"
            size="sm"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            style={{ width: 'auto' }}
            title="Đến ngày"
          />

          <Button variant="outline-primary" size="sm" className="rounded-pill px-3 text-nowrap" onClick={filterToday}>
            Hôm nay
          </Button>
          <Button variant="outline-secondary" size="sm" className="rounded-pill px-3 text-nowrap" onClick={resetFilters}>
            Đặt lại
          </Button>

          <span className="bms-filter-meta">
            <strong>{myRoleShifts.length}</strong> ca trực
          </span>
        </div>
      )}

      <div className="bms-table-standalone-section">

        <div className="bms-table-standalone-header">
          <div className="mb-2 mb-lg-0">
            <h5 className="bms-table-standalone-title">
              <Calendar style={{ color: '#1E60E6' }}  size="1em"/>
              {viewMode === 'timetable'
                ? (activeRoleTab === 'doctor' ? 'Thời Khóa Biểu Ca Trực Bác Sĩ' : activeRoleTab === 'lab' ? 'Thời Khóa Biểu Ca Trực KTV Xét Nghiệm' : 'Thời Khóa Biểu Ca Trực Lễ Tân Tiếp Đón')
                : (activeRoleTab === 'doctor' ? 'Danh Sách Ca Trực Bác Sĩ' : activeRoleTab === 'lab' ? 'Danh Sách Ca Trực Xét Nghiệm' : 'Danh Sách Ca Trực Lễ Tân')}
            </h5>
            <p className="bms-table-standalone-subtitle">
              {viewMode === 'timetable' ? 'Ma trận ca trực tuần theo Slot (Sáng / Chiều / Tối / Đêm)' : `Hiển thị ${shifts.length} trên tổng số ${totalItems} ca trực toàn viện`}
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="btn-group" role="group" style={{ borderRadius: '9999px', overflow: 'hidden' }}>
              <Button
                variant={viewMode === 'timetable' ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => {
                  setViewMode('timetable');
                  setPageSize(100);
                  setPage(1);
                  setFromDate(toIsoDateStr(currentWeekMonday));
                  setToDate(toIsoDateStr(addDays(currentWeekMonday, 6)));
                }}
                style={{ padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                <Calendar className="me-1"  size="1em"/> Dạng Thời Khóa Biểu
              </Button>
              <Button
                variant={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                size="sm"
                onClick={() => {
                  setViewMode('table');
                  setPageSize(15);
                  setPage(1);
                }}
                style={{ padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                <List className="me-1"  size="1em"/> Dạng Bảng
              </Button>
            </div>
          </div>
        </div>

        {viewMode === 'timetable' ? (
          <div className="p-3 bg-white">
            <WeeklyShiftTimetable
              shifts={myRoleShifts}
              currentWeekMonday={currentWeekMonday}
              onChangeWeek={(newMonday) => {
                setCurrentWeekMonday(newMonday);
                setFromDate(toIsoDateStr(newMonday));
                setToDate(toIsoDateStr(addDays(newMonday, 6)));
                setPage(1);
              }}
              onSelectShift={handleOpenDetail}
              onCreateShift={handleOpenCreate}
              canManage={canManageShifts}
              loading={loading}
            />
          </div>
        ) : (
          <>

            <div className="bms-table-standalone-body">
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
                        <td colSpan="8" className="text-center py-3">
                          <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                          <span className="text-muted">Đang tải danh sách ca làm việc từ máy chủ...</span>
                        </td>
                      </tr>
                    ) : myRoleShifts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-3 text-muted">
                          <Stethoscope className="fs-2 d-block mx-auto mb-2 text-secondary opacity-50"  size="1em"/>
                          <div className="fw-semibold">Không tìm thấy ca làm việc nào phù hợp</div>
                          <div className="small mb-3">Thử xoá bộ lọc ngày hoặc nhấn &ldquo;Tạo Ca Làm Việc Mới&rdquo; để phân ca.</div>
                          {canManageShifts && (
                            <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                              <Plus className="me-1"  size="1em"/> Tạo Ca Làm Việc Đầu Tiên
                            </Button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      myRoleShifts.map((shift) => {
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
                                  <Stethoscope  size="1em"/>
                                </div>
                                <div>
                                  <div className="fw-bold text-dark">{shift.employeeName || shift.doctorName || 'Chưa gán nhân sự'}</div>
                                  <div className="text-muted small d-flex align-items-center gap-2">
                                    <code>{shift.employeeId || shift.doctorId || '—'}</code>
                                    <Badge bg="light" text="dark" className="border fw-normal">
                                      {shift.employeeRole === 'Doctor' ? 'Bác Sĩ' : shift.employeeRole === 'LabTech' ? 'KTV Xét Nghiệm' : shift.employeeRole === 'Receptionist' ? 'Lễ Tân' : (shift.employeeRole || 'Bác Sĩ')}
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
                                <Hospital className="text-primary small"  size="1em"/>
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
                                <Clock className="text-secondary"  size="1em"/>
                                <span>{shift.workingHoursLabel || `${shift.shiftStart} - ${shift.shiftEnd}`}</span>
                              </div>
                            </td>

                            <td className="text-center">
                              <div className="fw-bold text-dark">{currentPts} / {maxPts}</div>
                              <div className="progress mt-1" style={{ height: 4 }}>
                                <div
                                  className={`progress-bar ${percent > 80 ? 'bg-danger' : percent > 50 ? 'bg-warning' : 'bg-success'}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </td>

                            <td className="text-center">
                              <span className={`badge ${statusMeta.badge} px-2 py-1`}>
                                {statusMeta.label}
                              </span>
                            </td>

                            <td className="text-end pe-4">
                              <div className="d-flex justify-content-end gap-1">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleOpenDetail(shift)}
                                  title="Xem chi tiết ca"
                                >
                                  <Eye  size="1em"/>
                                </Button>
                                {canManageShifts && (
                                  <>
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() => handleOpenEdit(shift)}
                                      title="Chỉnh sửa ca"
                                    >
                                      <SquarePen  size="1em"/>
                                    </Button>
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleOpenDelete(shift)}
                                      title="Xoá ca"
                                    >
                                      <Trash2  size="1em"/>
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
            </div>

            <div className="bg-white border-top py-3 px-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
              <div className="text-muted small">
                Tổng cộng <strong>{totalItems}</strong> ca làm việc • Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ borderRadius: 9999 }}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ borderRadius: 9999 }}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

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
              <Calendar className="text-primary"  size="1em"/>
              <span>{editingShift ? 'Cập Nhật Thông Tin Ca Làm Việc' : 'Tạo Ca Làm Việc Mới'}</span>
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {formError && (
              <Alert variant="danger" className="py-2 small">
                <AlertTriangle className="me-2"  size="1em"/>
                {formError}
              </Alert>
            )}

            <div className="p-3 rounded-3 bg-light border mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <Form.Label className="small fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                  <Stethoscope className="text-primary"  size="1em"/>
                  Nhân Sự Phụ Trách Ca Trực (Đồng Bộ Quản Lý Nhân Sự) <span className="text-danger">*</span>
                </Form.Label>
                <Badge bg="secondary-subtle" text="secondary" className="border d-flex align-items-center gap-1">
                  <Lock size={10} /> Dữ liệu gốc CSDL (Chỉ xem)
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
                  {displayStaffList.map(emp => {
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
                        {emp.fullName || emp.username} — {dept} ({roleLabel}) [Mã: {emp.employeeCode || emp.username || emp.id}]
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
                <div>
                  <Form.Label className="small fw-semibold">
                    {activeRoleTab === 'receptionist'
                      ? 'Quầy Trực Bộ Phận Lễ Tân'
                      : activeRoleTab === 'lab'
                        ? 'Phòng Xét Nghiệm (Lab Room)'
                        : 'Phòng Khám Bác Sĩ (Clinic Room)'}{' '}
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={formData.roomId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const r = availableRoomsForRole.find(item => (item.id || item.roomNumber) === selId);
                      setFormData(prev => ({
                        ...prev,
                        roomId: selId,
                        department: r?.department ? r.department : prev.department,
                      }));
                    }}
                    required
                  >
                    <option value="">
                      {activeRoleTab === 'receptionist'
                        ? '-- Chọn quầy trực lễ tân --'
                        : activeRoleTab === 'lab'
                          ? '-- Chọn phòng xét nghiệm Lab --'
                          : '-- Chọn phòng khám bác sĩ --'}
                    </option>
                    {availableRoomsForRole.map(r => (
                      <option key={r.id || r.roomNumber} value={r.id || r.roomNumber}>
                        {r.name ? `${r.id || r.roomNumber} - ${r.name}` : (r.id || r.roomNumber)}
                      </option>
                    ))}
                    {formData.roomId && !availableRoomsForRole.some(r => (r.id || r.roomNumber) === formData.roomId) && (
                      <option value={formData.roomId}>{formData.roomId}</option>
                    )}
                  </Form.Select>
                </div>
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

      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <Eye className="text-primary"  size="1em"/>
            <span>Chi Tiết Ca Làm Việc & Phân Công Nhân Sự</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailLoading && (
            <div className="text-center py-2 mb-3">
              <Spinner animation="border" size="sm" variant="primary" className="me-2" />
              <span className="small text-muted">Đang đồng bộ dữ liệu mới nhất...</span>
            </div>
          )}
          {detailShift && (() => {
            const staffMOH = resolveStaffProfileMOH(detailShift, null);
            const shiftCode = formatShiftCode(detailShift.id);
            const shiftTypeVi = SHIFT_TYPE_META[detailShift.shiftType]?.label || detailShift.shiftType || 'Ca Sáng';

            return (
              <div className="d-flex flex-column gap-3">

                <div className="d-flex flex-wrap justify-content-between align-items-center p-3 rounded-3 bg-primary-subtle border border-primary-subtle gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary px-3 py-2 fs-6 font-monospace shadow-sm">
                      {shiftCode}
                    </span>
                    <div>
                      <div className="fw-bold fs-5 text-dark mb-0">{staffMOH.name}</div>
                      <div className="small text-secondary">
                        Mã NV: <code>{staffMOH.code}</code> • Chức danh: <strong>{staffMOH.title}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="info" className="px-3 py-2 fw-semibold">
                      {staffMOH.roleVi}
                    </Badge>
                    <Badge bg="success" className="px-3 py-2 fs-6">
                      {SHIFT_STATUS_META[detailShift.status]?.label || detailShift.status || 'Đã Duyệt'}
                    </Badge>
                  </div>
                </div>

                <Row className="g-3">

                  <Col md={7}>
                    <div className="p-3 border rounded-3 h-100 bg-white">
                      <div className="small fw-semibold text-muted text-uppercase mb-2 d-flex align-items-center justify-content-between">
                        <span className="d-flex align-items-center gap-2">
                          <Stethoscope className="text-primary"  size="1em"/>
                          Thông Tin Nhân Sự Trực
                        </span>
                        <Badge bg="success-subtle" className="text-success border border-success-subtle">
                          Đã xác thực CCCD
                        </Badge>
                      </div>

                      <div className="d-flex flex-column gap-2 small">
                        <div className="p-2 border rounded-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="text-muted">Mã định danh CCCD (12 số):</span>
                          <span className="font-monospace fw-bold text-dark">{staffMOH.cccd}</span>
                        </div>

                        {staffMOH.license && (
                          <div className="p-2 border rounded-2 bg-light d-flex justify-content-between align-items-center">
                            <span className="text-muted">Chứng chỉ hành nghề (CCHN):</span>
                            <span className="font-monospace fw-bold text-success">{staffMOH.license}</span>
                          </div>
                        )}

                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted d-block">Phạm vi hoạt động chuyên môn:</span>
                          <strong className="text-dark">{staffMOH.specialty}</strong>
                          <div className="text-muted mt-0.5" style={{ fontSize: '11px' }}>{staffMOH.scope}</div>
                        </div>

                        <div className="p-2 border rounded-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="text-muted">Trình độ đào tạo:</span>
                          <span className="fw-semibold text-secondary">{staffMOH.qualification}</span>
                        </div>

                        <div className="p-2 border rounded-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="text-muted">Đơn vị &amp; Liên hệ:</span>
                          <span className="text-dark font-monospace text-end">{staffMOH.phone} • {staffMOH.email}</span>
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col md={5}>
                    <div className="p-3 border rounded-3 h-100 bg-white d-flex flex-column justify-content-between">
                      <div>
                        <div className="small fw-semibold text-muted text-uppercase mb-2 d-flex align-items-center gap-2">
                          <Clock className="text-primary"  size="1em"/>
                          Thời Gian &amp; Vị Trí Làm Việc
                        </div>
                        <div className="d-flex flex-column gap-2 small">
                          <div className="p-2 border rounded-2 bg-light">
                            <span className="text-muted d-block">Phòng / Quầy tiếp đón:</span>
                            <strong className="text-dark fs-6">{detailShift.roomName || detailShift.roomId}</strong>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              Mã phòng: <code>{detailShift.roomId}</code>{detailShift.floor ? ` • Tầng ${detailShift.floor}` : ''}
                            </div>
                          </div>

                          <div className="p-2 border rounded-2 bg-light">
                            <span className="text-muted d-block">Ca trực &amp; Ngày làm việc:</span>
                            <strong className="text-primary fs-6">{formatVNDate(detailShift.shiftDate)} • {shiftTypeVi}</strong>
                            <div className="text-dark font-monospace mt-0.5">
                              Khung giờ: {detailShift.workingHoursLabel || `${detailShift.shiftStart} - ${detailShift.shiftEnd}`}
                            </div>
                          </div>

                          <div className="p-2 border rounded-2 bg-light">
                            <span className="text-muted d-block">Công suất tiếp nhận bệnh nhân:</span>
                            <strong className="text-primary fs-6">
                              {detailShift.currentPatientsCount || 0} / {detailShift.maxPatients || 30} lượt
                            </strong>
                            <div className="text-muted" style={{ fontSize: '11px' }}>
                              Slot còn trống: {detailShift.availableSlots ?? Math.max(0, (detailShift.maxPatients || 30) - (detailShift.currentPatientsCount || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Col>

                  <Col xs={12}>
                    <div className="p-3 border rounded-3 bg-light small">
                      <div className="text-muted fw-semibold mb-1">Ghi chú phân ca:</div>
                      <div className="text-dark">{detailShift.notes || 'Nhân sự nhận bàn giao cơ sở vật chất, chạy mẫu nội kiểm IQC đạt chuẩn trước giờ mở cửa tiếp đón bệnh nhân.'}</div>
                    </div>
                  </Col>
                </Row>
              </div>
            );
          })()}
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
              <SquarePen className="me-1"  size="1em"/> Chỉnh sửa ca này
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showDeleteModal}
        onHide={() => !deleting && setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton={!deleting} className="bg-danger-subtle text-danger">
          <Modal.Title className="fs-5 fw-bold d-flex align-items-center gap-2">
            <Trash2  size="1em"/>
            <span>Xác Nhận Xoá Ca Làm Việc</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError && (
            <Alert variant="danger" className="py-2 small">
              <AlertTriangle className="me-2"  size="1em"/>
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
                  <AlertTriangle className="me-1"  size="1em"/>
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