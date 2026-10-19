import '../schedule.css';
import React, { useCallback, useEffect, useState } from 'react';
import { scheduleApi } from '../api/scheduleApi';


const defaultRooms = [
  { id: 'ROOM-101', name: 'Clinic room 01' },
  { id: 'ROOM-102', name: 'Consultation room 02' },
  { id: 'ROOM-103', name: 'Doctor office' },
];

/** UC31 – Personal schedule. English UI, KPI cards + table. */
export function ManageSchedulePage({ doctorId, rooms = defaultRooms }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    doctorId,
    shiftDate: '',
    shiftType: 'Morning',
    roomId: rooms[0]?.id ?? 'ROOM-101',
    maxPatients: 30,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await scheduleApi.list(doctorId, undefined, undefined);
      setShifts(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
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
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  };

  const statusBadge = (st) => {
    const map = {
      Approved: 'text-bg-primary',
      Active: 'text-bg-primary',
      Completed: 'text-bg-secondary',
      Cancelled: 'text-bg-light border',
      Pending: 'text-bg-warning',
    };
    return <span className={`badge ${map[st] ?? 'text-bg-light border'}`}>{st || 'Approved'}</span>;
  };

  return (
    <div className="container-fluid py-3" style={{ background: '#f5f7fb', minHeight: '100vh' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div className="text-muted small">BMS / Personal schedule</div>
          <h3 className="fw-bold mb-0">Personal schedule</h3>
          <p className="text-muted small mb-0">Manage catalog and status · BMS District 1</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
          onClick={() => setShowForm((v) => !v)}
        >
          + Create schedule
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Catalog overview</div>
              <div className="fs-3 fw-bold">{shifts.length} schedules</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Usage status</div>
              <div className="fs-3 fw-bold">{upcoming} upcoming</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Extra info</div>
              <div className="fs-5 fw-bold">No time conflicts</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <form className="card border-0 shadow-sm mb-4" onSubmit={onCreate}>
          <div className="card-body row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small text-muted">Date</label>
              <input
                type="date"
                className="form-control"
                style={{ minHeight: 44 }}
                required
                value={form.shiftDate}
                onChange={(e) => setForm({ ...form, shiftDate: e.target.value })}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted">Shift</label>
              <select
                className="form-select"
                style={{ minHeight: 44 }}
                value={form.shiftType}
                onChange={(e) =>
                  setForm({ ...form, shiftType: e.target.value })
                }
              >
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="FullDay">Full day</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label small text-muted">Room</label>
              <select
                className="form-select"
                style={{ minHeight: 44 }}
                value={form.roomId}
                onChange={(e) => setForm({ ...form, roomId: e.target.value })}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted">Max patients</label>
              <input
                type="number"
                className="form-control"
                style={{ minHeight: 44 }}
                value={form.maxPatients ?? 30}
                onChange={(e) => setForm({ ...form, maxPatients: Number(e.target.value) })}
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn btn-primary w-100" style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}>
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="d-flex gap-2 mb-3">
        {([
          ['all', 'All'],
          ['active', 'Active'],
          ['unused', 'Unused'],
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

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h6>Personal schedule list</h6>
          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr className="text-muted small">
                    <th>Code</th>
                    <th>Activity</th>
                    <th>Date / time</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.id.slice(-8).toUpperCase()}</td>
                      <td>{s.shiftType}</td>
                      <td>{new Date(s.shiftDate).toLocaleDateString('en-GB')}</td>
                      <td>{s.roomId}</td>
                      <td>{statusBadge(s.status)}</td>
                      <td className="text-end">
                        <span className="text-primary small">Details →</span>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No schedules
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm mt-3" style={{ background: '#eff6ff' }}>
        <div className="card-body small text-muted mb-0">
          <strong>Management rules.</strong> Personal schedule for the signed-in doctor. Break
          11:00–13:00; the system checks overlap with clinic and consultation slots.
        </div>
      </div>
    </div>
  );
}

export default ManageSchedulePage;
