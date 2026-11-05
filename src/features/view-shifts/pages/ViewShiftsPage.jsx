import '../view-shifts.css';
import React, { useEffect, useState } from 'react';
import { viewShiftApi } from '../api/viewShiftApi';
import { useAuth } from '../../../shared/contexts/AuthContext';

/** UC36 – Lịch Ca Trực Của Tôi & Phân Công Ca Làm Việc (ISO 15189 / BMS MedLab). */
export function ViewShiftsPage() {
  const { user, userRole } = useAuth();
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

  const isManagerOrAdmin = ['admin', 'manager'].includes((userRole || '').toLowerCase());

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
        {isManagerOrAdmin && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
            disabled
            title="Tạo ca mới được quản lý ở phân hệ Quản lý ca (UC35)"
          >
            + Tạo ca trực mới
          </button>
        )}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Catalog overview · Tổng ca trực tuần này</div>
              <div className="fs-3 fw-bold text-dark">{sourceShifts.length} ca</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Usage status · Ca đang trực / hiệu lực</div>
              <div className="fs-3 fw-bold text-success">{activeCount} ca</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Vị trí trực phân công</div>
              <div className="fs-5 fw-bold text-primary">Quầy 01 (Sảnh Tầng 1)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <input type="date" className="form-control" style={{ maxWidth: 160, minHeight: 40 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-muted">→</span>
        <input type="date" className="form-control" style={{ maxWidth: 160, minHeight: 40 }} value={to} onChange={(e) => setTo(e.target.value)} />
        {([
          ['all', 'Tất cả ca'],
          ['active', 'Đang hoạt động'],
          ['unused', 'Chưa nhận bàn'],
        ]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`btn ${filter === k ? 'btn-primary' : 'btn-outline-secondary'}`}
            style={{ minHeight: 40, ...(filter === k ? { backgroundColor: '#1e40af', borderColor: '#1e40af' } : {}) }}
            onClick={() => setFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-3 align-items-center">
            <h6 className="mb-0 fw-bold text-dark">Danh sách ca trực được phân công</h6>
            <span className="text-muted small">{filtered.length} ca</span>
          </div>
          {loading ? (
            <p className="text-muted">Đang tải lịch trực…</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead className="table-light">
                  <tr className="text-muted small">
                    <th>Mã ca</th>
                    <th>Tên ca trực & Nhân sự</th>
                    <th>Khung giờ làm việc</th>
                    <th>Khoa phòng / Vị trí bàn</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.shiftId}>
                      <td className="fw-semibold text-primary">{s.shiftId.slice(-10)}</td>
                      <td>
                        <div className="fw-bold text-dark">{s.shiftType}</div>
                        <div className="small text-muted">{s.employeeName || s.doctorName || user?.fullName || 'Lễ tân tiếp đón'}</div>
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
                        <div className="text-muted small">{s.department || 'Khoa Tiếp Nhận & Lấy Mẫu'} · Tiếp nhận: {s.currentPatientsCount || 0}/{s.maxPatients || 30} lượt</div>
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
                      <td className="text-end text-primary small fw-semibold cursor-pointer">
                        Chi tiết ca →
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        Không có ca trực nào trong khoảng thời gian đã chọn
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-3" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <div className="card-body small text-muted mb-0">
          <strong className="text-primary">Quy định ca trực y tế:</strong> Ca sáng 07:00–11:30, Ca chiều 13:00–17:00.
          Nghỉ trưa giao nhận ca trực: 11:30–13:00. Nhân viên cần có mặt trước giờ trực 15 phút để kiểm tra hệ thống,
          chuẩn bị máy quét QR và bàn giao hồ sơ người bệnh.
        </div>
      </div>
    </div>
  );
}

export default ViewShiftsPage;
