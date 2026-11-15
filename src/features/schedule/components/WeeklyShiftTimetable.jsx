/**
 * @file WeeklyShiftTimetable.jsx
 * @description Weekly Timetable Grid Component for Medical Shifts (ISO 15189 / BMS MedLab).
 * Renders weekly matrix: Slot (rows) x 7 Days of Week (columns), matching university/hospital portal layout.
 */

import React, { useMemo } from 'react';
import './WeeklyShiftTimetable.css';
import {
  FaBook,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMapMarkerAlt,
  FaUserAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaPlus,
  FaWifi,
  FaHospitalAlt,
  FaSpinner
} from 'react-icons/fa';

export const DEFAULT_SLOTS = [
  { id: 1, name: '1', label: 'Ca Sáng', timeWindow: '07h00 - 11h30', startHour: 7, endHour: 11.5 },
  { id: 2, name: '2', label: 'Ca Chiều', timeWindow: '13h00 - 17h00', startHour: 13, endHour: 17 },
  { id: 3, name: '3', label: 'Ca Tối', timeWindow: '17h30 - 20h30', startHour: 17.5, endHour: 20.5 }
];

export const DAY_NAMES = [
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'Chủ nhật'
];

/**
 * Returns Monday Date object for the week containing `d`.
 */
export function getMonday(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Adds `days` to date.
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Format Date to YYYY-MM-DD
 */
export function toIsoDateStr(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format Date to dd/MM
 */
export function formatDayMonth(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Calculate ISO week number
 */
export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Maps a shift to slot 1..4 based on shiftType or shiftStart.
 */
export function resolveShiftSlot(shift) {
  if (shift.slot && [1, 2, 3, 4].includes(Number(shift.slot))) {
    return Number(shift.slot);
  }

  const type = String(shift.shiftType || '').toLowerCase();
  if (type.includes('morning') || type.includes('sáng')) return 1;
  if (type.includes('afternoon') || type.includes('chiều')) return 2;
  if (type.includes('evening') || type.includes('tối') || type.includes('ngoài giờ')) return 3;
  if (type.includes('night') || type.includes('đêm')) return 4;

  if (shift.shiftStart) {
    const hour = parseInt(shift.shiftStart.split(':')[0], 10);
    if (!Number.isNaN(hour)) {
      if (hour < 12) return 1;
      if (hour < 17) return 2;
      if (hour < 21) return 3;
      return 4;
    }
  }

  return 1;
}


/**
 * Resolves a shift to one of the 3 staff categories: 'doctor', 'lab', 'receptionist'.
 */
export function getShiftRoleCategory(shift) {
  if (!shift) return 'doctor';
  const role = String(shift.employeeRole || '').toLowerCase();
  if (role === 'doctor' || role === 'bác sĩ' || role === 'bacsi') return 'doctor';
  if (role.includes('lab') || role === 'labtech' || role === 'labhead' || role.includes('xét nghiệm')) return 'lab';
  if (role.includes('reception') || role.includes('lễ tân') || role === 'letan') return 'receptionist';

  const dept = String(shift.department || shift.specialty || '').toLowerCase();
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

export function WeeklyShiftTimetable({
  shifts = [],
  currentWeekMonday = getMonday(new Date()),
  onChangeWeek,
  onSelectShift,
  onCreateShift,
  canManage = false,
  loading = false,
  slots = DEFAULT_SLOTS
}) {
  const todayStr = useMemo(() => toIsoDateStr(new Date()), []);

  // Compute the 7 days of the week starting from currentWeekMonday
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekMonday, i);
      const dateStr = toIsoDateStr(date);
      const isToday = dateStr === todayStr;
      const isSunday = i === 6;
      return {
        dayIndex: i,
        dayName: DAY_NAMES[i],
        date,
        dateStr,
        dayMonthStr: formatDayMonth(date),
        isToday,
        isSunday
      };
    });
  }, [currentWeekMonday, todayStr]);

  const weekNumber = useMemo(() => getWeekNumber(currentWeekMonday), [currentWeekMonday]);
  const sundayDate = useMemo(() => addDays(currentWeekMonday, 6), [currentWeekMonday]);

  // Group shifts into a map: `dateStr_slotId` -> array of shifts
  const shiftMatrix = useMemo(() => {
    const map = new Map();
    for (const shift of shifts) {
      const shiftDateRaw = shift.shiftDate || shift.date;
      if (!shiftDateRaw) continue;
      const dateStr = toIsoDateStr(shiftDateRaw);
      const slotId = resolveShiftSlot(shift);
      const key = `${dateStr}_${slotId}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(shift);
    }
    return map;
  }, [shifts]);

  const handlePrevWeek = () => {
    if (onChangeWeek) {
      onChangeWeek(addDays(currentWeekMonday, -7));
    }
  };

  const handleNextWeek = () => {
    if (onChangeWeek) {
      onChangeWeek(addDays(currentWeekMonday, 7));
    }
  };

  const handleCurrentWeek = () => {
    if (onChangeWeek) {
      onChangeWeek(getMonday(new Date()));
    }
  };

  const handleDatePick = (e) => {
    const picked = e.target.value;
    if (picked && onChangeWeek) {
      onChangeWeek(getMonday(new Date(picked)));
    }
  };

  // Helper to render shift status
  const renderShiftStatus = (shift) => {
    const st = String(shift.status || 'Approved').toLowerCase();
    if (st === 'cancelled' || st === 'đã hủy' || st === 'rejected' || st === 'từ chối') {
      return (
        <div className="timetable-card-status absent">
          <FaTimesCircle className="flex-shrink-0" />
          <span>Vắng mặt</span>
        </div>
      );
    }
    if (st === 'active' || st === 'đang diễn ra' || st === 'đang trực') {
      return (
        <div className="timetable-card-status active">
          <FaClock className="flex-shrink-0" />
          <span>Đang trực</span>
        </div>
      );
    }
    if (st === 'pending' || st === 'chờ duyệt') {
      return (
        <div className="timetable-card-status pending">
          <FaClock className="flex-shrink-0" />
          <span>Chờ duyệt</span>
        </div>
      );
    }
    return (
      <div className="timetable-card-status present">
        <FaCheckCircle className="flex-shrink-0" />
        <span>Có mặt</span>
      </div>
    );
  };

  // Helper to format code & title
  const getShiftTitle = (shift) => {
    const raw = shift.shiftId || shift.id;
    const code = raw ? (String(raw).startsWith('CA-') ? String(raw) : `CA-${String(raw).slice(-6).toUpperCase()}`) : 'CA-01';
    let dept = shift.department || shift.specialty || shift.shiftType || 'Khoa Khám Bệnh';
    const lowerDept = String(dept).toLowerCase();
    if (lowerDept.includes('morning') || lowerDept.includes('sáng')) dept = 'Ca Sáng';
    else if (lowerDept.includes('afternoon') || lowerDept.includes('chiều')) dept = 'Ca Chiều';
    else if (lowerDept.includes('evening') || lowerDept.includes('tối')) dept = 'Ca Tối';
    return `${code} - ${dept}`;
  };

  return (
    <div className="timetable-container">
      {/* 1. Week Navigation & Quick Actions Toolbar */}
      <div className="timetable-toolbar">
        <div className="timetable-week-nav">
          <button
            type="button"
            className="btn btn-outline-secondary timetable-week-btn"
            onClick={handlePrevWeek}
            title="Xem tuần trước"
          >
            <FaChevronLeft size={11} /> Tuần trước
          </button>
          <button
            type="button"
            className="btn btn-primary timetable-week-btn text-white"
            onClick={handleCurrentWeek}
            style={{ backgroundColor: '#1E60E6', borderColor: '#1E60E6' }}
            title="Về tuần hiện tại"
          >
            <FaCalendarDay size={11} /> Tuần này
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary timetable-week-btn"
            onClick={handleNextWeek}
            title="Xem tuần tiếp theo"
          >
            Tuần sau <FaChevronRight size={11} />
          </button>

          <span className="timetable-current-range">
            {formatDayMonth(currentWeekMonday)}/{currentWeekMonday.getFullYear()} – {formatDayMonth(sundayDate)}/{sundayDate.getFullYear()} (Tuần {weekNumber})
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted fw-semibold">Chọn ngày:</span>
          <input
            type="date"
            className="form-control form-control-sm"
            value={toIsoDateStr(currentWeekMonday)}
            onChange={handleDatePick}
            style={{ width: '145px', borderRadius: '9999px', height: '36px' }}
          />
          {loading && (
            <div className="d-flex align-items-center text-primary ms-2 small fw-semibold">
              <FaSpinner className="fa-spin me-1" /> Đang tải...
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Timetable Matrix Table */}
      <div className="timetable-scroll-wrapper">
        <table className="timetable-grid">
          <thead>
            <tr>
              <th className="timetable-header-slot">Slot</th>
              {weekDays.map((day) => {
                let thClass = 'timetable-header-day';
                if (day.isToday) thClass += ' is-today';
                else if (day.isSunday) thClass += ' is-sunday';

                return (
                  <th key={day.dateStr} className={thClass}>
                    <span className="day-title">{day.dayName}</span>
                    <span className="day-date">({day.dayMonthStr})</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id}>
                {/* Slot index cell */}
                <td className="timetable-slot-cell">
                  <span className="timetable-slot-num">{slot.name}</span>
                  <span className="timetable-slot-time">{slot.timeWindow}</span>
                </td>

                {/* 7 Days cells */}
                {weekDays.map((day) => {
                  const key = `${day.dateStr}_${slot.id}`;
                  const slotShifts = shiftMatrix.get(key) || [];
                  const isCellToday = day.isToday;

                  return (
                    <td
                      key={key}
                      className={`timetable-content-cell ${isCellToday ? 'is-today-column' : ''}`}
                    >
                      {slotShifts.length > 0 ? (
                        slotShifts.map((shift, idx) => {
                          const sid = shift.shiftId || shift.id || `${key}_${idx}`;
                          const timeStr = shift.shiftStart && shift.shiftEnd
                            ? `${shift.shiftStart.replace(':', 'h')} - ${shift.shiftEnd.replace(':', 'h')}`
                            : slot.timeWindow;
                          const roomStr = shift.roomName || shift.roomId || 'Phòng P.101';
                          const staffStr = shift.employeeName || shift.doctorName || 'BS. Trực ban';

                          return (
                            <div
                              key={sid}
                              className={`timetable-shift-card ${String(shift.status || '').toLowerCase() === 'cancelled' ? 'status-cancelled' : ''}`}
                              onClick={() => onSelectShift && onSelectShift(shift)}
                              title="Nhấn để xem chi tiết ca trực"
                            >
                              {/* Line 1: Title */}
                              <div className="timetable-card-title text-truncate">
                                <FaBook className="card-icon" />
                                <span className="text-truncate">{getShiftTitle(shift)}</span>
                              </div>

                              

                              {/* Line 3: Time & Mode */}
                              <div className="timetable-card-time">
                                <FaClock size={11} className="flex-shrink-0" />
                                <span>{timeStr}</span>
                                <span className="badge-mode">
                                  <FaHospitalAlt size={9} className="me-1 opacity-75" /> Tại viện
                                </span>
                              </div>

                              {/* Line 4: Location */}
                              <div className="timetable-card-room text-truncate">
                                <FaMapMarkerAlt size={11} className="flex-shrink-0 text-muted" />
                                <span className="text-truncate">{roomStr}</span>
                              </div>

                              {/* Line 5: Staff */}
                              <div className="timetable-card-staff text-truncate">
                                <FaUserAlt size={10} className="flex-shrink-0 text-muted" />
                                <span className="text-truncate">{staffStr}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="timetable-empty-cell">
                          <span>-</span>
                          {canManage && onCreateShift && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary btn-add-quick"
                              onClick={() => onCreateShift({
                                dateStr: day.dateStr,
                                slotId: slot.id,
                                shiftType: slot.label,
                                shiftStart: slot.timeWindow.split(' - ')[0]?.replace('h', ':') || '07:00',
                                shiftEnd: slot.timeWindow.split(' - ')[1]?.replace('h', ':') || '11:30'
                              })}
                              title={`Xếp ca trực ${slot.label} ngày ${day.dayMonthStr}`}
                            >
                              <FaPlus size={9} /> Thêm ca
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Small Legend Footer */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 text-muted small px-1">
        <div className="d-flex align-items-center gap-3">
          <span className="d-flex align-items-center gap-1 text-primary fw-semibold">
            <FaClock className="text-primary" /> Khung giờ ca: Slot 1 (Sáng: 07h00 - 11h30) • Slot 2 (Chiều: 13h00 - 17h00) • Slot 3 (Tối: 17h30 - 20h30)
          </span>
        </div>
        <div>
          <span>Tip: Nhấn vào ô ca trực để xem toàn bộ thông tin chi tiết hoặc điều phối.</span>
        </div>
      </div>
    </div>
  );
}

export default WeeklyShiftTimetable;
