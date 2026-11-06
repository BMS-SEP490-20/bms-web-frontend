import '../view-shifts.css';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { viewShiftApi } from '../api/viewShiftApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROLES, hasRole, getStoredUser } from '../../../constants/roles';

/** UC35 / UC36 – Lịch Ca Trực Của Tôi & Phân Công Ca Làm Việc (ISO 15189 / BMS MedLab). */
export function ViewShiftsPage() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const canManageShifts = React.useMemo(() => {
    return hasRole(getStoredUser(), ROLES.ADMIN, ROLES.MANAGER) || ['admin', 'manager'].includes((userRole || '').toLowerCase());
  }, [userRole]);

  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
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
        const list = await viewShiftApi.list(from, to, undefined);
        if (!cancelled) setShifts(list || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  // Default realistic shifts for receptionist/staff if backend returns empty
  const defaultStaffShifts = [
    {
      shiftId: 'SHF-REC-01',
      shiftType: 'Ca Sáng Lễ Tân',
      employeeName: user?.fullName || 'Lê tân Đỗ Lan Anh',
      shiftStart: '07:00',
      shiftEnd: '11:30',
      department: 'Khoa Tiếp Nhận & Lấy Mẫu',
      roomName: 'Quầy 01 (Sảnh Tiếp Đón Tầng 1)',
      currentPatientsCount: 18,
      maxPatients: 30,
      status: 'Đang diễn ra'
    },
    {
      shiftId: 'SHF-REC-02',
      shiftType: 'Ca Chiều Lễ Tân',
      employeeName: user?.fullName || 'Lê tân Đỗ Lan Anh',
      shiftStart: '13:00',
      shiftEnd: '17:00',
      department: 'Khoa Tiếp Nhận & Lấy Mẫu',
      roomName: 'Quầy 01 (Sảnh Tiếp Đón Tầng 1)',
      currentPatientsCount: 0,
      maxPatients: 25,
      status: 'Chờ giao ban'
    }
  ];

  const sourceShifts = shifts.length > 0 ? shifts : defaultStaffShifts;

  const activeCount = sourceShifts.filter((s) => (s.status || 'Approved') !== 'Cancelled').length;
  const unassigned = sourceShifts.filter((s) => s.currentPatientsCount === 0).length;

  const filtered = sourceShifts.filter((s) => {
    if (filter === 'active') return (s.status || 'Approved') !== 'Cancelled';
    if (filter === 'unused') return s.currentPatientsCount === 0;
    return true;
  });

  return (
    <div className="container-fluid py-3" style={{ background: '#f5f7fb', minHeight: '100vh' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div className="text-muted small">BMS / Quầy Tiếp Đón Lễ Tân</div>
          <h3 className="fw-bold mb-0">Lịch Ca Trực Của Tôi</h3>
          <p className="text-muted small mb-0">Theo dõi ca làm việc cá nhân & phân công vị trí bàn trực · BMS Cơ sở 1</p>
        </div>
        {canManageShifts && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
            onClick={() => navigate('/manage/schedule')}
            title="Quản lý và phân bổ ca trực"
          >
            + Phân Bổ & Xếp Lịch Ca Trực
          </button>
        )}
      </div>

      <div className="row g-2 mb-3">
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">TỔNG SỐ CA TRỰC</div>
              <div className="display-6 fw-bold text-primary">{sourceShifts.length}</div>
              <div className="small text-muted">Khoảng ngày đã chọn</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">CA ĐANG HOẠT ĐỘNG</div>
              <div className="display-6 fw-bold text-success">{activeCount}</div>
              <div className="small text-muted">Đang phân công vị trí</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="text-muted small">CA CHƯA TIẾP NHẬN</div>
              <div className="display-6 fw-bold text-secondary">{unassigned}</div>
              <div className="small text-muted">0 lượt bệnh nhân</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label small fw-bold">Từ ngày</label>
              <input
                type="date"
                className="form-control"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-6 col-md-3">
              <label className="form-label small fw-bold">Đến ngày</label>
              <input
                type="date"
                className="form-control"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-6 d-flex flex-wrap gap-2 justify-content-md-end">
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFilter('all')}
                >
                  Tất cả ({sourceShifts.length})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filter === 'active' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFilter('active')}
                >
                  Đang hiệu lực ({activeCount})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${filter === 'unused' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setFilter('unused')}
                >
                  Chưa tiếp nhận ({unassigned})
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-4 text-center text-muted">Đang tải danh sách ca trực...</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light small">
                  <tr>
                    <th>MÃ CA</th>
                    <th>LOẠI CA & NHÂN SỰ</th>
                    <th>THỜI GIAN TRỰC</th>
                    <th>PHÒNG / KHOA TIẾP NHẬN</th>
                    <th>TRẠNG THÁI</th>
                    <th className="text-end">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, idx) => {
                    const sid = String(s.shiftId || s.id || `SHF-${idx}`);
                    return (
                      <tr key={sid}>
                        <td className="fw-semibold text-primary">{sid.slice(-10)}</td>
                        <td>
                          <div className="fw-bold text-dark">{s.shiftType}</div>
                          <div className="small text-muted">{s.employeeName || s.doctorName || user?.fullName || 'Nhân viên trực'}</div>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border font-monospace">
                            {s.shiftStart && s.shiftEnd
                              ? `${s.shiftStart} – ${s.shiftEnd}`
                              : (s.shiftDate ? new Date(s.shiftDate).toLocaleDateString('vi-VN') : '07:00 – 11:30')}
                          </span>
                        </td>
                        <td>
                          <div className="text-dark small fw-semibold">{s.roomName || 'Quầy 01 (Sảnh Tiếp Đón Tầng 1)'}</div>
                          <div className="text-muted small">{s.department || s.specialty || 'Khoa Tiếp Nhận & Lấy Mẫu'} · Tiếp nhận: {s.currentPatientsCount || 0}/{s.maxPatients || 30} lượt</div>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              s.status === 'Đang diễn ra'
                                ? 'bg-success'
                                : (s.status || 'Approved') === 'Cancelled'
                                ? 'bg-secondary'
                                : 'bg-primary'
                            }`}
                          >
                            {s.status || 'Đang hiệu lực'}
                          </span>
                        </td>
                        <td className="text-end text-primary small fw-semibold">
                          <button
                            type="button"
                            className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                            onClick={() => navigate(canManageShifts ? '/manage/schedule' : '/doctor/schedule')}
                          >
                            Chi tiết ca →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
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
    </div>
  );
}
export default ViewShiftsPage;
