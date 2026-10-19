import '../view-shifts.css';
import React, { useEffect, useState } from 'react';
import { viewShiftApi } from '../api/viewShiftApi';


/** UC36 – Work shifts catalog. English UI matching BMS shift list mock. */
export function ViewShiftsPage() {
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
        if (!cancelled) setShifts(list);
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

  const activeCount = shifts.filter((s) => (s.status || 'Approved') !== 'Cancelled').length;
  const unassigned = shifts.filter((s) => s.currentPatientsCount === 0).length;

  const filtered = shifts.filter((s) => {
    if (filter === 'active') return (s.status || 'Approved') !== 'Cancelled';
    if (filter === 'unused') return s.currentPatientsCount === 0;
    return true;
  });

  return (
    <div className="container-fluid py-3" style={{ background: '#f5f7fb', minHeight: '100vh' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <div className="text-muted small">BMS / Work shifts</div>
          <h3 className="fw-bold mb-0">Work shifts</h3>
          <p className="text-muted small mb-0">Manage catalog and status · BMS District 1</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minHeight: 44, backgroundColor: '#1e40af', borderColor: '#1e40af' }}
          disabled
          title="Create is managed in shift admin (UC35)"
        >
          + Create shift
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Catalog overview</div>
              <div className="fs-3 fw-bold">{shifts.length} shifts</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Usage status</div>
              <div className="fs-3 fw-bold">{activeCount} in effect</div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Extra info</div>
              <div className="fs-5 fw-bold">{unassigned} unassigned</div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <input type="date" className="form-control" style={{ maxWidth: 160, minHeight: 40 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-muted">→</span>
        <input type="date" className="form-control" style={{ maxWidth: 160, minHeight: 40 }} value={to} onChange={(e) => setTo(e.target.value)} />
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

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-2">
            <h6 className="mb-0">Shift list</h6>
            <span className="text-muted small">{filtered.length} records</span>
          </div>
          {loading ? (
            <p className="text-muted">Loading…</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr className="text-muted small">
                    <th>Code</th>
                    <th>Name</th>
                    <th>Time window</th>
                    <th>Dept / assignment</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.shiftId}>
                      <td className="fw-semibold">{s.shiftId.slice(-6).toUpperCase()}</td>
                      <td>
                        {s.shiftType}
                        {s.employeeName || s.doctorName ? ` · ${s.employeeName || s.doctorName}` : ''}
                      </td>
                      <td>
                        {s.shiftStart && s.shiftEnd
                          ? `${s.shiftStart}–${s.shiftEnd}`
                          : new Date(s.shiftDate).toLocaleDateString('en-GB')}
                      </td>
                      <td>
                        {s.department || s.specialty || s.roomName} · {s.currentPatientsCount}/{s.maxPatients} pts
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            (s.status || 'Approved') === 'Cancelled'
                              ? 'text-bg-light border'
                              : 'text-bg-primary'
                          }`}
                        >
                          {s.status || 'In effect'}
                        </span>
                      </td>
                      <td className="text-end text-primary small">Details →</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        No shifts in range
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
          <strong>Management rules.</strong> Morning 07:00–11:00 and afternoon 13:00–17:00 must not
          overlap. Break 11:00–13:00; check staff schedule before assignment.
        </div>
      </div>
    </div>
  );
}

export default ViewShiftsPage;
