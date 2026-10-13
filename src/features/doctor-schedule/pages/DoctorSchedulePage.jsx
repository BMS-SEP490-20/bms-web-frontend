/**
 * @fileoverview Doctor Schedule day-view page (UC16 – Web).
 * Roles: Doctor, Manager, Administrator, Receptionist.
 * UI: date navigation, search, day grid of doctor columns × time slots.
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchDoctorSchedule } from '../api/scheduleApi';

/** Format a Date as yyyy-MM-dd */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date as dd/MM/yyyy */
function toDisplayDate(d) {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${m}/${d.getFullYear()}`;
}

/**
 * DoctorSchedulePage – UC16 Web.
 */
export default function DoctorSchedulePage() {
  const [date, setDate] = useState(() => new Date());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('day'); // day | week | list

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDoctorSchedule({
        date: toDateStr(date),
        search: search || undefined,
      });
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load schedule.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [date, search]);

  useEffect(() => {
    load();
  }, [load]);

  const prevDay = () => setDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
  const nextDay = () => setDate((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const doctors = data?.doctors ?? data?.Doctors ?? [];
  const timeRows = data?.timeRows ?? data?.TimeRows ?? [];
  const dateLabel = data?.dateLabel ?? data?.DateLabel ?? '';
  const note = data?.note ?? data?.Note ?? '';

  const statusLabel = (s) => {
    if (!s) return 'Approved';
    if (s === 'Approved' || s === 'Đã duyệt') return 'Approved';
    if (s === 'Pending') return 'Pending';
    return s;
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ color: '#2563eb', fontWeight: 800, fontSize: 20 }}>+ BMS</span>
        </div>
        <nav style={styles.nav}>
          <div style={styles.navSection}>OPERATIONS</div>
          <NavItem label="Overview" />
          <NavItem label="Appointments" />
          <NavItem label="Reception" />
          <NavItem label="Patients" />
          <div style={styles.navSection}>CLINICAL</div>
          <NavItem label="Doctor Schedule" active />
          <NavItem label="Lab Queue" />
          <NavItem label="Medical Records" />
          <NavItem label="Personal Schedule" />
          <div style={styles.navSection}>CATALOG & ADMIN</div>
          <NavItem label="Service Packages" />
          <NavItem label="Test Criteria" />
          <NavItem label="Test Packages" />
          <NavItem label="Lab Rooms" />
          <NavItem label="Shifts" />
          <NavItem label="Employees" />
          <NavItem label="Roles" />
        </nav>
        <div style={styles.sidebarFooter}>
          Support Center<br />1900 6868 · 07:00-17:00
        </div>
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.topBar}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            Role: Staff · User ▾
          </span>
        </div>

        <div style={styles.content}>
          <div style={{ marginBottom: 4, fontSize: 12, color: '#94a3b8' }}>
            DOCTOR SCHEDULE · BMS
          </div>
          <h1 style={styles.title}>Doctor Schedule</h1>
          <p style={styles.subtitle}>
            Coordinate consultations and counseling · {dateLabel || toDisplayDate(date)}
          </p>

          {/* Filters */}
          <div style={styles.filterRow}>
            <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 8 }}>
              <input
                type="search"
                placeholder="Search doctor or specialty..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={styles.searchInput}
              />
            </form>
            <select style={styles.select}>
              <option>All doctors</option>
            </select>
            <input
              type="date"
              value={toDateStr(date)}
              onChange={(e) => setDate(new Date(e.target.value + 'T00:00:00'))}
              style={styles.select}
            />
          </div>

          {/* Date nav + view mode */}
          <div style={styles.dateNavRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button type="button" onClick={prevDay} style={styles.navBtn}>‹</button>
              <span style={styles.datePill}>{toDisplayDate(date)}</span>
              <button type="button" onClick={nextDay} style={styles.navBtn}>›</button>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['day', 'week', 'list'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  style={{
                    ...styles.viewBtn,
                    ...(viewMode === m ? styles.viewBtnActive : {}),
                  }}
                >
                  {m === 'day' ? 'Day' : m === 'week' ? 'Week' : 'List'}
                </button>
              ))}
            </div>
          </div>

          {/* Grid card */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Daily Work Schedule</h2>

            {loading && (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                Loading schedule...
              </div>
            )}

            {error && !loading && (
              <div style={styles.errorBox}>
                {error}
                <div style={{ marginTop: 12 }}>
                  <button type="button" onClick={load} style={styles.retryBtn}>Retry</button>
                </div>
              </div>
            )}

            {!loading && !error && doctors.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                No doctors scheduled for this date.
              </div>
            )}

            {!loading && !error && doctors.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.th, width: 110 }}>Time</th>
                      {doctors.map((doc) => (
                        <th key={doc.doctorId || doc.DoctorId} style={styles.th}>
                          <div style={{ fontWeight: 700, color: '#1e3a8a' }}>
                            {doc.fullName || doc.FullName}
                          </div>
                          <span style={styles.badge}>
                            {statusLabel(doc.status || doc.Status)}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(timeRows.length
                      ? timeRows
                      : ['07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-14:00', '14:00-17:00']
                    ).map((row, rowIdx) => (
                      <tr key={row}>
                        <td style={styles.timeCell}>{row}</td>
                        {doctors.map((doc) => {
                          const slots = doc.slots || doc.Slots || [];
                          const slot = slots[rowIdx] || {};
                          const isBreak = slot.isBreak || slot.IsBreak;
                          const isAvailable = slot.isAvailable || slot.IsAvailable;
                          return (
                            <td key={doc.doctorId || doc.DoctorId} style={styles.td}>
                              <div
                                style={{
                                  ...styles.slotCard,
                                  ...(isBreak ? styles.slotBreak : {}),
                                  ...(isAvailable ? styles.slotAvailable : {}),
                                }}
                              >
                                <div style={styles.slotActivity}>
                                  {slot.activity || slot.Activity || '—'}
                                </div>
                                {!isBreak && (
                                  <div style={styles.slotDetail}>
                                    {slot.roomName || slot.RoomName || ''}
                                    {(slot.detail || slot.Detail)
                                      ? ` · ${slot.detail || slot.Detail}`
                                      : ''}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {note && (
            <div style={styles.noteBox}>
              <strong>Non-overlapping schedule</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#475569' }}>{note}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ label, active }) {
  return (
    <div
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        margin: '2px 8px',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? '#1e3a8a' : '#64748b',
        background: active ? '#dbeafe' : 'transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    background: '#f1f5f9',
  },
  sidebar: {
    width: 220,
    background: '#fff',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  logo: { padding: '20px 16px', borderBottom: '1px solid #f1f5f9' },
  nav: { flex: 1, paddingTop: 8, overflowY: 'auto' },
  navSection: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.06em',
    padding: '12px 16px 4px',
  },
  sidebarFooter: {
    padding: 16,
    fontSize: 11,
    color: '#94a3b8',
    borderTop: '1px solid #f1f5f9',
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topBar: {
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '12px 28px',
    textAlign: 'right',
  },
  content: { padding: '24px 28px 48px', maxWidth: 1200 },
  title: { margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: '#0f172a' },
  subtitle: { margin: '0 0 20px', fontSize: 14, color: '#64748b' },
  filterRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  searchInput: {
    flex: 1,
    minWidth: 200,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 14,
    outline: 'none',
    background: '#fff',
  },
  select: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    fontSize: 13,
    background: '#fff',
    color: '#334155',
  },
  dateNavRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: '1px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    fontSize: 16,
    color: '#475569',
  },
  datePill: {
    padding: '6px 16px',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
  },
  viewBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1px solid #e2e8f0',
    background: '#fff',
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
  },
  viewBtnActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
  },
  cardTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a' },
  table: { width: '100%', borderCollapse: 'separate', borderSpacing: '8px 8px' },
  th: {
    textAlign: 'left',
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    padding: '4px 8px',
    verticalAlign: 'bottom',
  },
  badge: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 8px',
    borderRadius: 10,
    background: '#dbeafe',
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: 600,
  },
  timeCell: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    whiteSpace: 'nowrap',
    verticalAlign: 'top',
    paddingTop: 12,
  },
  td: { verticalAlign: 'top', minWidth: 160 },
  slotCard: {
    background: '#eff6ff',
    borderRadius: 10,
    padding: '10px 12px',
    minHeight: 52,
  },
  slotBreak: { background: '#f8fafc', color: '#94a3b8' },
  slotAvailable: { background: '#f0fdf4' },
  slotActivity: { fontSize: 13, fontWeight: 600, color: '#1e3a8a' },
  slotDetail: { fontSize: 11, color: '#64748b', marginTop: 4 },
  noteBox: {
    marginTop: 16,
    background: '#eff6ff',
    borderRadius: 12,
    padding: '14px 18px',
    fontSize: 13,
    color: '#1e3a8a',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: 20,
    color: '#b91c1c',
    textAlign: 'center',
  },
  retryBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #b91c1c',
    background: '#fff',
    color: '#b91c1c',
    cursor: 'pointer',
  },
};