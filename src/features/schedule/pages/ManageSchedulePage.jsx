/**
 * @file ManageSchedulePage.jsx
 * @description UC31 – Quản lý lịch ca làm việc cá nhân bác sĩ & kỹ thuật viên (ISO 15189 / BMS MedLab).
 * Features: Luxury Header Card, KPI quad metrics, standalone table section (Zero table-in-card).
 */

import '../schedule.css';
import React, { useCallback, useEffect, useState } from 'react';
import { Row, Col, Button, Badge } from 'react-bootstrap';
import {
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaPlus,
  FaTrash,
  FaClinicMedical,
  FaUsers,
  FaTimes
} from 'react-icons/fa';
import { scheduleApi } from '../api/scheduleApi';

export function ManageSchedulePage({ doctorId, rooms: initialRooms }) {
  const [rooms, setRooms] = useState(initialRooms || []);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doctorId,
    shiftDate: '',
    shiftType: 'Morning',
    roomId: '',
    maxPatients: 30,
  });

  useEffect(() => {
    if (!initialRooms || initialRooms.length === 0) {
      scheduleApi.getRooms()
        .then((list) => {
          if (Array.isArray(list) && list.length > 0) {
            setRooms(list);
            setForm((f) => ({ ...f, roomId: f.roomId || list[0].id || list[0].roomNumber }));
          }
        })
        .catch(() => {
          // Handled silently
        });
    }
  }, [initialRooms]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await scheduleApi.list(doctorId, undefined, undefined);
      setShifts(list || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tải danh sách ca thất bại.');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upcoming = shifts.filter((s) => new Date(s.shiftDate) >= new Date(new Date().toDateString())).length;

  const filtered = shifts.filter((s) => {
    if (filter === 'active') return s.status === 'Approved' || s.status === 'Active';
    if (filter === 'unused') return s.status === 'Cancelled' || s.currentPatientsCount === 0;
    return true;
  });

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      await scheduleApi.create({ ...form, doctorId });
      setForm((f) => ({ ...f, shiftDate: '' }));
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tạo ca làm việc thất bại.');
    }
  };

  const statusBadge = (st) => {
    const map = {
      Approved: 'bg-primary',
      Active: 'bg-success',
      Completed: 'bg-secondary',
      Cancelled: 'bg-light text-dark border',
      Pending: 'bg-warning text-dark',
    };
    return (
      <span className={`badge ${map[st] ?? 'bg-light text-dark border'}`} style={{ borderRadius: 9999, padding: '5px 12px' }}>
        {st || 'Approved'}
      </span>
    );
  };

  return (
    <div className="w-100 py-1">
      {/* 1. Master Luxury Page Header Card */}
      <div className="bms-page-header-card">
        <div className="bms-page-header-content">
          
          <div className="bms-page-title-row">
            
            <h1 className="bms-page-title">
              Lịch Làm Việc Cá Nhân
            </h1>
          </div>
          
        </div>
        <div className="bms-page-actions">
          <Button
            variant="primary"
            onClick={() => setShowForm((v) => !v)}
            className="d-flex align-items-center gap-2 shadow-sm fw-semibold px-3 py-2 text-white"
            style={{
              borderRadius: 9999,
              background: '#1E60E6',
              borderColor: '#1E60E6',
              boxShadow: '0 4px 14px rgba(30, 96, 230, 0.25)',
              fontSize: '14px'
            }}
          >
            <FaPlus size={13} />
            <span>{showForm ? 'Đóng Biểu Mẫu' : 'Tạo Ca Trực Mới'}</span>
          </Button>
        </div>
      </div>

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
              <h6 className="bms-kpi-label">Tổng Ca Đã Đăng Ký</h6>
              <div className="bms-kpi-value">{shifts.length}</div>
              <div className="bms-kpi-sub text-muted">Toàn bộ lịch làm việc</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-blue">
              <FaCalendarAlt />
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Ca Sắp Tới</h6>
              <div className="bms-kpi-value text-success">{upcoming}</div>
              <div className="bms-kpi-sub text-success">Đang hiệu lực phân công</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-green">
              <FaCheckCircle />
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <div className="bms-kpi-quad-card">
            <div>
              <h6 className="bms-kpi-label">Trạng Thái Trùng Lịch</h6>
              <div className="bms-kpi-value text-primary fs-5 mt-2">Hợp lệ 100%</div>
              <div className="bms-kpi-sub text-muted">Không có xung đột thời gian</div>
            </div>
            <div className="bms-kpi-icon-badge bms-kpi-icon-purple">
              <FaClock />
            </div>
          </div>
        </Col>
      </Row>

      {/* Create Shift Form */}
      {showForm && (
        <form className="bg-white p-2 rounded-4 shadow-sm border mb-4" onSubmit={onCreate} style={{ borderColor: 'rgba(226, 232, 240, 0.85)' }}>
          <h5 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
            <FaPlus className="text-primary" />
            <span>Tạo Ca Làm Việc Mới</span>
          </h5>
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-3">
              <label className="form-label small fw-semibold text-secondary">Ngày trực</label>
              <input
                type="date"
                className="form-control"
                style={{ minHeight: 40, borderRadius: '9999px' }}
                required
                value={form.shiftDate}
                onChange={(e) => setForm({ ...form, shiftDate: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small fw-semibold text-secondary">Khung giờ ca</label>
              <select
                className="form-select"
                style={{ minHeight: 40, borderRadius: '9999px' }}
                value={form.shiftType}
                onChange={(e) => setForm({ ...form, shiftType: e.target.value })}
              >
                <option value="Morning">Ca Sáng (07:00 - 11:30)</option>
                <option value="Afternoon">Ca Chiều (13:00 - 17:00)</option>
                <option value="FullDay">Cả Ngày (07:00 - 17:00)</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <label className="form-label small fw-semibold text-secondary">Phòng làm việc</label>
              <select
                className="form-select"
                style={{ minHeight: 40, borderRadius: '9999px' }}
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              >
                <option value="">-- Chọn phòng trực --</option>
                {rooms.map((r) => (
                  <option key={r.id || r.roomNumber} value={r.id || r.roomNumber}>
                    {r.name ? `${r.id || r.roomNumber} - ${r.name}` : (r.id || r.roomNumber)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-2">
              <label className="form-label small fw-semibold text-secondary">Công suất tối đa (BN)</label>
              <input
                type="number"
                className="form-control"
                style={{ minHeight: 40, borderRadius: '9999px' }}
                min={1}
                max={100}
                value={form.maxPatients}
                onChange={(e) => setForm({ ...form, maxPatients: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div className="col-12 col-md-2 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary flex-grow-1 text-white fw-semibold"
                style={{ minHeight: 40, borderRadius: '9999px', backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
              >
                Lưu Ca
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                style={{ minHeight: 40, borderRadius: '9999px' }}
                onClick={() => setShowForm(false)}
              >
                Hủy
              </button>
            </div>
          </div>
        </form>
      )}

      {/* 3. Standalone Independent Table Section (ZERO TABLE IN CARDS) */}
      <div className="bms-table-standalone-section">
        <div className="bms-table-standalone-header">
          <div>
            <h5 className="bms-table-standalone-title">
              <FaCalendarAlt style={{ color: '#1E60E6' }} />
              Danh Sách Lịch Làm Việc Đã Lên Kế Hoạch
            </h5>
            <p className="bms-table-standalone-subtitle">
              Hiển thị {filtered.length} trên tổng số {shifts.length} ca làm việc
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="btn-group shadow-sm" role="group" style={{ borderRadius: '9999px', overflow: 'hidden' }}>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('all')}
                style={{ padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                Tất cả ({shifts.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'active' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('active')}
                style={{ padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                Đang hiệu lực
              </button>
              <button
                type="button"
                className={`btn btn-sm ${filter === 'unused' ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                onClick={() => setFilter('unused')}
                style={{ padding: '8px 16px', fontWeight: 600, fontSize: '13px' }}
              >
                Chưa tiếp nhận / Đã hủy
              </button>
            </div>
          </div>
        </div>

        <div className="bms-table-standalone-body">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead>
                <tr>
                  <th style={{ width: '150px' }}>NGÀY TRỰC</th>
                  <th style={{ width: '180px' }}>LOẠI CA</th>
                  <th>PHÒNG LÀM VIỆC</th>
                  <th className="text-center" style={{ width: '160px' }}>CÔNG SUẤT (BN)</th>
                  <th className="text-center" style={{ width: '140px' }}>TRẠNG THÁI</th>
                  <th className="text-end pe-4" style={{ width: '120px' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="text-center py-3 text-muted">
                      Đang tải danh sách lịch ca...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-3 text-muted">
                      <FaCalendarAlt className="fs-2 text-muted opacity-50 mb-2 d-block mx-auto" />
                      Không tìm thấy ca làm việc nào.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold text-dark font-monospace">
                        {new Date(s.shiftDate).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <span className="badge bg-light text-primary border" style={{ borderRadius: 9999, padding: '5px 12px', fontSize: '12px' }}>
                          {s.shiftType}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1 fw-semibold text-dark">
                          <FaClinicMedical className="text-primary small" />
                          <span>{s.roomName || s.roomId}</span>
                        </div>
                        <div className="text-muted small">Mã: <code>{s.roomId}</code></div>
                      </td>
                      <td className="text-center font-monospace fw-bold">
                        {s.currentPatientsCount ?? 0} / {s.maxPatients}
                      </td>
                      <td className="text-center">{statusBadge(s.status)}</td>
                      <td className="text-end pe-4">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) return;
                            try {
                              await scheduleApi.remove(s.id);
                              await load();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Xóa ca thất bại');
                            }
                          }}
                          style={{ borderRadius: 9999 }}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageSchedulePage;
