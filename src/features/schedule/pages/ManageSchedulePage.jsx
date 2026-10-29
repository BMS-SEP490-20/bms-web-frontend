import '../schedule.css';
import React, { useCallback, useEffect, useState } from 'react';
import { scheduleApi } from '../api/scheduleApi';

/** UC31 – Personal schedule. English UI, KPI cards + table. */
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
        .catch((err) => console.error('Failed to load rooms:', err));
    }
  }, [initialRooms]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await scheduleApi.list(doctorId, undefined, undefined);
      setShifts(list || []);
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
                <option value="">-- Select Room --</option>
                {rooms.map((r) => (
                  <option key={r.id || r.roomNumber} value={r.id || r.roomNumber}>
                    {r.name ? `${r.id || r.roomNumber} - ${r.name}` : (r.id || r.roomNumber)}
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
                min={1}
                max={100}
                value={form.maxPatients}
                onChange={(e) =>
                  setForm({ ...form, maxPatients: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="col-md-2 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary flex-grow-1"
                style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
              >
                Save
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                style={{ minHeight: 44 }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 py-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
          <ul className="nav nav-pills card-header-pills">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${filter === 'all' ? 'active' : ''}`}
                style={filter === 'all' ? { backgroundColor: '#1e40af' } : {}}
                onClick={() => setFilter('all')}
              >
                All schedules ({shifts.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${filter === 'active' ? 'active' : ''}`}
                style={filter === 'active' ? { backgroundColor: '#1e40af' } : {}}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${filter === 'unused' ? 'active' : ''}`}
                style={filter === 'unused' ? { backgroundColor: '#1e40af' } : {}}
                onClick={() => setFilter('unused')}
              >
                Unused / Cancelled
              </button>
            </li>
          </ul>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Date</th>
                <th>Shift</th>
                <th>Room</th>
                <th>Patients</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    Loading schedules...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-muted">
                    No schedules found.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.shiftDate).toLocaleDateString()}</td>
                    <td>{s.shiftType}</td>
                    <td>
                      <code>{s.roomId}</code>
                      {s.roomName ? ` (${s.roomName})` : ''}
                    </td>
                    <td>
                      {s.currentPatientsCount ?? 0} / {s.maxPatients}
                    </td>
                    <td>{statusBadge(s.status)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={async () => {
                          if (!window.confirm('Delete this schedule?')) return;
                          try {
                            await scheduleApi.remove(s.id);
                            await load();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Delete failed');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManageSchedulePage;
