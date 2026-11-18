/**
 * Resolve KTV / phòng từ ca trực đã phân công — không cho chọn tay lệch nghiệp vụ.
 */
import { getStoredUser } from '../../constants/roles';
import { viewShiftApi } from '../../features/view-shifts/api/viewShiftApi';

function todayYmd() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pickActiveShift(shifts, userId) {
  const list = Array.isArray(shifts) ? shifts : [];
  const uid = String(userId || '').trim();
  const mine = list.filter((s) => {
    const eid = String(s.employeeId || s.EmployeeId || s.doctorId || s.userId || '').trim();
    return !uid || eid === uid || eid.endsWith(uid) || uid.endsWith(eid);
  });
  const pool = mine.length > 0 ? mine : list;
  const preferred = pool.find((s) => {
    const st = String(s.status || s.Status || '').toLowerCase();
    return st.includes('active') || st.includes('đang') || st.includes('approved') || st.includes('duyệt');
  });
  return preferred || pool[0] || null;
}

/**
 * @returns {Promise<{ technicianName: string, technicianId: string, roomId: string, roomName: string, shift: object|null }>}
 */
export async function resolveDutyAssignment() {
  const user = getStoredUser() || {};
  const technicianName = user.fullName || user.name || user.username || 'KTV đang đăng nhập';
  const technicianId = String(user.id || user.userId || user.username || '').trim();

  let shift = null;
  try {
    const day = todayYmd();
    const shifts = await viewShiftApi.list(day, day, undefined, technicianId || undefined);
    shift = pickActiveShift(shifts, technicianId);
  } catch {
    shift = null;
  }

  const roomId = String(
    shift?.roomId || shift?.RoomId || shift?.labRoomId || user.roomId || user.labRoomId || ''
  ).trim();
  const roomName = String(
    shift?.roomName ||
      shift?.RoomName ||
      shift?.location ||
      user.roomName ||
      user.department ||
      (roomId ? roomId : 'Chưa phân công phòng trên lịch trực')
  ).trim();

  return {
    technicianName,
    technicianId,
    roomId: roomId || 'UNASSIGNED',
    roomName,
    shift
  };
}
