/**
 * @file ViewShiftsPage.jsx
 * @description UC35 / UC36 – Lịch Ca Trực Của Tôi & Lịch Ca Trực Toàn Viện (ISO 15189 / BMS MedLab).
 * Features: Luxury Header Card, KPI quad metrics, unified date range filters,
 * status pills, and standalone independent table section (Zero table-in-card).
 * Conforms to: Soft Medical Telehealth UI Specification & AGENTS-DESIGN.md.
 */

import '../view-shifts.css';
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Badge, Spinner, Modal, Button, Card } from 'react-bootstrap';
import { Calendar, Clock, CheckCircle2, Stethoscope, DoorOpen, Users, ArrowRight, Plus, CalendarCheck, Hospital, Info as LucideInfo, X as LucideX, UserCheck, FlaskConical, List } from 'lucide-react';
import { WeeklyShiftTimetable, getMonday, addDays, toIsoDateStr, getShiftRoleCategory } from '../../schedule/components/WeeklyShiftTimetable';
import { resolveStaffProfileMOH } from '../../schedule/utils/shiftStaffUtils';
import { viewShiftApi } from '../api/viewShiftApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROLES, hasRole, getStoredUser, resolveRoleId } from '../../../constants/roles';

export function ViewShiftsPage() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const storedUser = useMemo(() => getStoredUser(), []);
  const roleId = useMemo(() => resolveRoleId(storedUser || user), [storedUser, user]);
  const isAdmin = roleId === ROLES.ADMIN || (userRole || '').toLowerCase() === 'admin';

  const canManageShifts = useMemo(() => {
    return hasRole(storedUser, ROLES.ADMIN, ROLES.MANAGER) || ['admin', 'manager'].includes((userRole || '').toLowerCase());
  }, [storedUser, userRole]);

  const currentUserId = useMemo(() => {
    return String(user?.id || user?.userId || user?.UserId || storedUser?.id || storedUser?.userId || storedUser?.UserId || '').trim();
  }, [user, storedUser]);

  const currentUserName = useMemo(() => {
    return String(user?.fullName || user?.name || user?.username || storedUser?.fullName || storedUser?.username || '').trim();
  }, [user, storedUser]);

  const isLab = useMemo(() => {
    return [ROLES.LAB, ROLES.MANAGER].includes(roleId) || ['lab', 'labtech', 'labhead', 'manager'].includes((userRole || '').toLowerCase());
  }, [roleId, userRole]);

  const isReceptionist = useMemo(() => {
    return roleId === ROLES.RECEPTIONIST || (userRole || '').toLowerCase() === 'receptionist';
  }, [roleId, userRole]);

  const defaultRole = isLab ? 'lab' : isReceptionist ? 'receptionist' : 'doctor';
  const [activeRoleTab, setActiveRoleTab] = useState(defaultRole);
  const [viewMode, setViewMode] = useState('timetable');
  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => getMonday(new Date()));
  const [from, setFrom] = useState(() => toIsoDateStr(getMonday(new Date())));
  const [to, setTo] = useState(() => toIsoDateStr(addDays(getMonday(new Date()), 6)));
  const [shifts, setShifts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const empIdParam = canManageShifts ? undefined : (currentUserId || undefined);
        const list = await viewShiftApi.list(from, to, undefined, empIdParam);
        if (!cancelled) setShifts(list || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Lỗi khi tải danh sách ca trực.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const sourceShifts = useMemo(() => (Array.isArray(shifts) ? shifts : []), [shifts]);

  const doctorShifts = useMemo(() => sourceShifts.filter(s => getShiftRoleCategory(s) === 'doctor'), [sourceShifts]);
  const labShifts = useMemo(() => sourceShifts.filter(s => getShiftRoleCategory(s) === 'lab'), [sourceShifts]);
  const receptionistShifts = useMemo(() => sourceShifts.filter(s => getShiftRoleCategory(s) === 'receptionist'), [sourceShifts]);

  const roleFilteredShifts = useMemo(() => {
    if (activeRoleTab === 'doctor') return doctorShifts;
    if (activeRoleTab === 'lab') return labShifts;
    if (activeRoleTab === 'receptionist') return receptionistShifts;
    return sourceShifts;
  }, [activeRoleTab, doctorShifts, labShifts, receptionistShifts, sourceShifts]);

  // Strict personal shift scoping:
  // If user is Admin or Manager -> can see all shifts & switch tabs.
  // If user is regular staff (e.g. Lab tech Hưng) -> ONLY sees shifts belonging to Hưng!
  const myVisibleShifts = useMemo(() => {
    if (canManageShifts) {
      return roleFilteredShifts;
    }
    const uid = currentUserId.toLowerCase();
    const uname = currentUserName.toLowerCase();

    return sourceShifts.filter(s => {
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
  }, [canManageShifts, roleFilteredShifts, sourceShifts, currentUserId, currentUserName]);

  const activeCount = myVisibleShifts.filter((s) => (s.status || 'Approved') !== 'Cancelled').length;
  const unassigned = sourceShifts.filter((s) => s.currentPatientsCount === 0).length;

  const [selectedShift, setSelectedShift] = useState(null);
  const [showShiftDetailModal, setShowShiftDetailModal] = useState(false);

  const formatShiftType = (type) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('morning') || t.includes('sáng')) return 'Ca Sáng (07:00 – 11:30)';
    if (t.includes('afternoon') || t.includes('chiều')) return 'Ca Chiều (13:00 – 17:00)';
    if (t.includes('evening') || t.includes('tối')) return 'Ca Tối (17:30 – 20:30)';
    if (t.includes('fullday') || t.includes('toàn')) return 'Ca Toàn Ngày (07:00 – 17:00)';
    return type || 'Ca Sáng (07:00 – 11:30)';
  };

  const formatShiftCode = (sid) => {
    if (!sid) return 'CA-001';
    const s = String(sid);
    if (s.startsWith('SHF-') || s.startsWith('CA-')) return s;
    return `CA-${s.slice(-6).toUpperCase()}`;
  };

  const getShiftStatusBadge = (status) => {
    const st = String(status || 'Approved').toLowerCase();
    if (st === 'approved' || st === 'đã phê duyệt') {
      return (
        <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill fw-semibold" style={{ fontSize: '12px' }}>
          <i className="fas fa-check-circle me-1"></i> Đã phê duyệt
        </span>
      );
    }
    if (st === 'active' || st === 'đang diễn ra' || st === 'đang hoạt động') {
      return (
        <span className="badge bg-success text-white px-3 py-1 rounded-pill fw-semibold" style={{ fontSize: '12px' }}>
          <i className="fas fa-circle me-1" style={{ fontSize: '8px' }}></i> Đang diễn ra
        </span>
      );
    }
    if (st === 'scheduled' || st === 'đã lên lịch') {
      return (
        <span className="badge bg-info-subtle text-primary border border-info-subtle px-3 py-1 rounded-pill fw-semibold" style={{ fontSize: '12px' }}>
          <i className="fas fa-clock me-1"></i> Đã lên lịch
        </span>
      );
    }
    if (st === 'pending' || st === 'chờ duyệt') {
      return (
        <span className="badge bg-warning-subtle text-dark border border-warning-subtle px-3 py-1 rounded-pill fw-semibold" style={{ fontSize: '12px' }}>
          <i className="fas fa-hourglass-half me-1"></i> Chờ duyệt
        </span>
      );
    }
    if (st === 'cancelled' || st === 'đã hủy') {
      return (
        <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-1 rounded-pill fw-semibold" style={{ fontSize: '12px' }}>
          <i className="fas fa-ban me-1"></i> Đã hủy
        </span>
      );
    }
    return (
      <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill fw-semibold" style={{ fontSize: '12px' }}>
        {status}
      </span>
    );
  };

  const handleOpenShiftDetail = (shift) => {
    setSelectedShift(shift);
    setShowShiftDetailModal(true);
  };

  const filtered = myVisibleShifts.filter((s) => {
    if (filter === 'active') return (s.status || 'Approved') !== 'Cancelled';
    if (filter === 'unused') return s.currentPatientsCount === 0;
    return true;
  });

  return (
    <div className="w-100 py-1">
      {/* 1. Page Header Card */}
      <div className="bms-page-header-card mb-4">
        <div className="bms-page-header-content flex-column align-items-start">
          <div className="bms-page-title-row">
            <h1 className="bms-page-title">
              {canManageShifts ? 'Lịch Ca Trực Toàn Viện' : 'Lịch Ca Trực Của Tôi'}
            </h1>
          </div>
          <p className="text-muted small m-0 mt-1">
            Tra cứu thời khóa biểu phân ca theo tuần và danh sách ca trực chi tiết
          </p>
        </div>
        <div className="bms-page-actions">
          {canManageShifts && (
            <button
              type="button"
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 fw-semibold px-3 py-2 text-white rounded-pill"
              style={{
                background: '#1E60E6',
                borderColor: '#1E60E6'
              }}
              onClick={() => navigate('/manage/schedule')}
              title="Quản lý và phân bổ ca trực"
            >
              <Plus size={13} />
              <span>Phân Bổ &amp; Xếp Lịch Ca Trực</span>
            </button>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-danger shadow-sm mb-4" role="alert" style={{ borderRadius: 14 }}>
          {error}
        </div>
      )}

      {/* 2. KPI Summary Row */}
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={4}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Tổng Số Ca Trực</h6>
              <div className="bms-kpi-value">{sourceShifts.length}</div>
              <div className="bms-kpi-sub text-muted">Khoảng ngày đã chọn</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
              <Calendar  size="1em"/>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Ca Đang Hoạt Động</h6>
              <div className="bms-kpi-value text-success">{activeCount}</div>
              <div className="bms-kpi-sub text-success">Đang phân công vị trí trực</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-green">
              <CheckCircle2  size="1em"/>
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Ca Chưa Tiếp Nhận</h6>
              <div className="bms-kpi-value text-secondary">{unassigned}</div>
              <div className="bms-kpi-sub text-muted">0 lượt bệnh nhân tiếp đón</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-rose">
              <Clock  size="1em"/>
            </div>
          </div>
        </Col>
      </Row>

      {/* Role Tabs Bar: Bác Sĩ / Xét Nghiệm / Lễ Tân */}
      {canManageShifts && (
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
          Phòng ban: <strong className="text-primary">{activeRoleTab === 'doctor' ? 'Khám Bệnh (Bác Sĩ)' : activeRoleTab === 'lab' ? 'Xét Nghiệm (KTV)' : 'Tiếp Đón & Lấy Mẫu (Lễ Tân)'}</strong> ({roleFilteredShifts.length} ca)
        </div>
      </div>

      )}

      {/* 3. Standalone Independent Table Section for Shifts (ZERO TABLE IN CARDS) */}
      {viewMode === 'table' && (
        <div className="bms-filter-bar mb-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 w-100">
            <div className="d-flex align-items-center gap-2 flex-nowrap">
              <span className="small text-muted fw-semibold text-nowrap">Từ ngày:</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{ width: '140px', borderRadius: '9999px', height: '36px' }}
              />
              <span className="small text-muted fw-semibold text-nowrap">Đến ngày:</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{ width: '140px', borderRadius: '9999px', height: '36px' }}
              />
            </div>

            {/* Pill filter buttons on 1 line */}
            <div className="btn-group shadow-sm" role="group" style={{ borderRadius: '9999px', overflow: 'hidden' }}>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('all')}
                style={{ padding: '6px 14px', fontWeight: 600, fontSize: '13px' }}
              >
                Tất cả ({sourceShifts.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'active' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('active')}
                style={{ padding: '6px 14px', fontWeight: 600, fontSize: '13px' }}
              >
                Đang hiệu lực ({activeCount})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'unused' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('unused')}
                style={{ padding: '6px 14px', fontWeight: 600, fontSize: '13px' }}
              >
                Chưa tiếp nhận ({unassigned})
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bms-table-standalone-section mb-4">
        <div className="bms-table-standalone-header">
          <div>
            <h5 className="bms-table-standalone-title">
              {viewMode === 'timetable' ? 'Thời Khóa Biểu Ca Trực' : 'Danh Sách Ca Trực'}
            </h5>
            <div className="bms-table-standalone-subtitle">
              {viewMode === 'timetable' ? 'Ma trận ca trực theo tuần (Slot & Thứ trong tuần)' : 'Xem dạng bảng chi tiết từng ca trực'}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* View Mode Toggle */}
            <div className="btn-group shadow-sm" role="group" style={{ borderRadius: '9999px', overflow: 'hidden' }}>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'timetable' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('timetable')}
                style={{ padding: '7px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                <Calendar className="me-1"  size="1em"/> Dạng Thời Khóa Biểu
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setViewMode('table')}
                style={{ padding: '7px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                <List className="me-1"  size="1em"/> Dạng Bảng
              </button>
            </div>
          </div>
        </div>

        <div className="bms-table-standalone-body">
          {viewMode === 'timetable' ? (
            <WeeklyShiftTimetable
              shifts={filtered}
              currentWeekMonday={currentWeekMonday}
              onChangeWeek={(newMonday) => {
                setCurrentWeekMonday(newMonday);
                setFrom(toIsoDateStr(newMonday));
                setTo(toIsoDateStr(addDays(newMonday, 6)));
              }}
              onSelectShift={handleOpenShiftDetail}
              loading={loading}
              canManage={canManageShifts}
            />
          ) : loading ? (
            <div className="p-3 text-center text-muted">
              <Spinner animation="border" variant="primary" size="sm" className="me-2" />
              Đang tải danh sách ca trực...
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th style={{ width: '140px' }}>MÃ CA</th>
                    <th>LOẠI CA &amp; NHÂN SỰ</th>
                    <th style={{ width: '180px' }}>THỜI GIAN TRỰC</th>
                    <th>PHÒNG / KHOA TIẾP NHẬN</th>
                    <th style={{ width: '140px' }}>TRẠNG THÁI</th>
                    <th className="text-end pe-4" style={{ width: '130px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const sid = String(s.shiftId || s.id || `SHF-${idx}`);
                    const shiftCode = formatShiftCode(sid);
                    const shiftTypeVi = formatShiftType(s.shiftType);
                    const timeWindow = s.shiftStart && s.shiftEnd
                      ? `${s.shiftStart} – ${s.shiftEnd}`
                      : (s.shiftDate ? new Date(s.shiftDate).toLocaleDateString('vi-VN') : '07:00 – 11:30');

                    return (
                      <tr key={sid}>
                        <td className="fw-semibold text-primary font-monospace">{shiftCode}</td>
                        <td>
                          <div className="fw-bold text-dark">{shiftTypeVi}</div>
                          <div className="small text-muted">{s.employeeName || s.doctorName || user?.fullName || 'Nhân viên trực'}</div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: '12px', padding: '5px 10px', borderRadius: 9999 }}>
                            {timeWindow}
                          </span>
                        </td>
                        <td>
                          <div className="text-dark small fw-semibold">{s.roomName || 'Quầy 01 (Sảnh Tiếp Đón Tầng 1)'}</div>
                          <div className="text-muted small">{s.department || s.specialty || 'Khoa Tiếp Nhận & Lấy Mẫu'} · Tiếp nhận: {s.currentPatientsCount || 0}/{s.maxPatients || 30} lượt</div>
                        </td>
                        <td>
                          {getShiftStatusBadge(s.status)}
                        </td>
                        <td className="text-end pe-4">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm px-3 py-1 rounded-pill fw-semibold text-nowrap d-inline-flex align-items-center gap-1"
                            onClick={() => handleOpenShiftDetail(s)}
                            style={{ fontSize: '12px' }}
                          >
                            <span>Chi tiết ca</span>
                            <ArrowRight size={10} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-3">
                        <Clock className="fs-2 text-muted opacity-50 mb-2 d-block mx-auto"  size="1em"/>
                        Không có ca trực nào phù hợp với bộ lọc ngày đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Shift Detail Modal */}
      <Modal 
        show={showShiftDetailModal} 
        onHide={() => setShowShiftDetailModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="border-bottom bg-white py-3 px-4">
          <div className="d-flex align-items-center gap-3">
            <div className="rounded-3 bg-primary-subtle p-2 text-primary d-flex align-items-center justify-content-center shadow-sm" style={{ width: 44, height: 44 }}>
              <Hospital className="fs-5"  size="1em"/>
            </div>
            <div>
              <Modal.Title className="fw-bold fs-5 text-dark mb-0">
                Thông Tin Chi Tiết Ca Trực Y Tế
              </Modal.Title>
              <div className="text-muted small">
                Thông tin phân công lịch trực và phạm vi tiếp nhận
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="p-4" style={{ backgroundColor: '#F8FAFC' }}>
          {selectedShift && (() => {
            const sid = String(selectedShift.shiftId || selectedShift.id || 'CA-001');
            const code = formatShiftCode(sid);
            const shiftTypeVi = formatShiftType(selectedShift.shiftType);
            const timeWindow = selectedShift.shiftStart && selectedShift.shiftEnd 
              ? `${selectedShift.shiftStart} – ${selectedShift.shiftEnd}` 
              : '07:00 – 11:30';
            const roomName = selectedShift.roomName || 'Quầy Tiếp Đón Sảnh A / Phòng 101';
            const current = selectedShift.currentPatientsCount || 0;
            const max = selectedShift.maxPatients || 30;
            const staffMOH = resolveStaffProfileMOH(selectedShift, user);

            return (
              <div className="d-flex flex-column gap-3">
                {/* Header Card */}
                <div className="d-flex flex-wrap align-items-center justify-content-between p-3 bg-white rounded-3 border shadow-sm gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-primary px-3 py-2 fs-6 font-monospace shadow-sm">
                      {code}
                    </span>
                    <Badge bg="light" text="dark" className="border px-2 py-2">
                      <Calendar className="text-primary me-1"  size="1em"/>
                      {selectedShift.shiftDate ? new Date(selectedShift.shiftDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Hôm nay'}
                    </Badge>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg="info" className="px-3 py-2 fw-normal">
                      {staffMOH.roleVi}
                    </Badge>
                    {getShiftStatusBadge(selectedShift.status)}
                  </div>
                </div>

                {/* 2-Column Details: MOH Staff Identity + Shift Location */}
                <Row className="g-3">
                  {/* Left Column: MOH Personnel Credentials */}
                  <Col xs={12} md={7}>
                    <Card className="h-100 border shadow-sm rounded-3 bg-white p-3">
                      <div className="small fw-semibold text-muted text-uppercase mb-3 d-flex align-items-center justify-content-between">
                        <span className="d-flex align-items-center gap-2">
                          <Stethoscope className="text-primary"  size="1em"/>
                          Hồ Sơ Cán Bộ Trực
                        </span>
                        <Badge bg="success-subtle" className="text-success border border-success-subtle">
                          Đã xác thực CCCD
                        </Badge>
                      </div>

                      <div className="d-flex align-items-center gap-3 p-3 bg-light rounded-3 mb-3 border">
                        <div className="rounded-circle bg-white border p-3 text-primary d-flex align-items-center justify-content-center shadow-sm flex-shrink-0" style={{ width: 54, height: 54 }}>
                          <UserCheck className="fs-3 text-primary"  size="1em"/>
                        </div>
                        <div>
                          <div className="fw-bold fs-6 text-dark">{staffMOH.name}</div>
                          <div className="text-primary small fw-semibold">{staffMOH.title}</div>
                          <div className="text-muted small mt-1">
                            Mã NV: <span className="font-monospace fw-bold text-dark me-2">{staffMOH.code}</span>
                            Trình độ: <span className="fw-semibold text-secondary">{staffMOH.qualification}</span>
                          </div>
                        </div>
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
                          <span className="text-muted d-block">Phạm vi chuyên môn &amp; Y lệnh:</span>
                          <strong className="text-dark">{staffMOH.specialty}</strong>
                          <div className="text-muted mt-0.5" style={{ fontSize: '11px' }}>{staffMOH.scope}</div>
                        </div>

                        <div className="p-2 border rounded-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="text-muted">Đơn vị công tác:</span>
                          <span className="fw-semibold text-dark text-end">{staffMOH.department}</span>
                        </div>

                        <div className="p-2 border rounded-2 bg-light d-flex justify-content-between align-items-center">
                          <span className="text-muted">Liên hệ nội bộ:</span>
                          <span className="text-dark font-monospace">{staffMOH.phone} • {staffMOH.email}</span>
                        </div>
                      </div>
                    </Card>
                  </Col>

                  {/* Right Column: Time & Room Info */}
                  <Col xs={12} md={5}>
                    <Card className="h-100 border shadow-sm rounded-3 bg-white p-3">
                      <div className="small fw-semibold text-muted text-uppercase mb-3 d-flex align-items-center gap-2">
                        <Clock className="text-primary"  size="1em"/>
                        Thời Gian &amp; Vị Trí Trực
                      </div>
                      <div className="d-flex flex-column gap-2 small">
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted d-block">Loại ca làm việc:</span>
                          <strong className="text-primary fs-6">{shiftTypeVi}</strong>
                        </div>
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted d-block">Khung giờ quy chuẩn:</span>
                          <strong className="text-dark font-monospace fs-6">
                            <Clock className="text-primary me-1"  size="1em"/>
                            {timeWindow}
                          </strong>
                        </div>
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted d-block">Vị trí phòng / quầy trực:</span>
                          <strong className="text-dark">
                            <DoorOpen className="text-primary me-1"  size="1em"/>
                            {roomName}
                          </strong>
                        </div>
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted d-block">Hình thức tiếp nhận:</span>
                          <strong className="text-success">
                            <Hospital className="me-1 text-success"  size="1em"/>
                            Trực tiếp tại viện (On-site Clinical / Lab)
                          </strong>
                        </div>
                        <div className="p-2 border rounded-2 bg-light">
                          <span className="text-muted d-block">Chế độ phân luồng:</span>
                          <span className="text-muted">
                            Hệ thống tự động đồng bộ STT từ Kiosk và Quầy tiếp đón đến phòng làm việc.
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Capacity & Workflow Card */}
                <Card className="border shadow-sm rounded-3 bg-white p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="small fw-semibold text-muted text-uppercase d-flex align-items-center gap-2">
                      <Users className="text-primary"  size="1em"/>
                      Công Suất Tiếp Nhận Bệnh Nhân &amp; Mẫu Bệnh Phẩm
                    </div>
                    <Badge bg={current >= max ? 'danger' : 'success'} className="px-3 py-1">
                      {current} / {max} lượt
                    </Badge>
                  </div>
                  <div className="progress mb-3" style={{ height: 10, borderRadius: 9999 }}>
                    <div 
                      className={`progress-bar ${current >= max ? 'bg-danger' : 'bg-primary'}`} 
                      style={{ width: `${Math.min(100, (current / max) * 100)}%` }}
                    />
                  </div>
                  <div className="p-2 border rounded-2 bg-light small text-muted">
                    <strong className="text-dark me-1">
                      <CheckCircle2 className="text-success me-1"  size="1em"/>
                      Quy định ca trực:
                    </strong>
                    Cán bộ y tế có mặt trước 15 phút để nhận bàn giao trang thiết bị, kiểm tra đối soát QC hóa chất hoặc phôi phiếu tiếp đón và đồng bộ hệ thống trước khi bắt đầu tiếp nhận bệnh nhân.
                  </div>
                </Card>
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer className="bg-white border-top py-3 px-4 d-flex justify-content-end">
          <Button 
            variant="secondary" 
            onClick={() => setShowShiftDetailModal(false)}
            className="px-4 py-2 rounded-3 fw-semibold"
          >
            <LucideX className="me-2"  size="1em"/>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ViewShiftsPage;
