/**
 * @file shiftStaffUtils.js
 * @description Shift display helpers + staff profile resolution from live shift/user fields
 * (no invented CCCD/CCHN). ISO 15189-oriented labels only.
 */

export function formatShiftCode(sid) {
  if (!sid) return 'CA-001';
  const s = String(sid).trim();
  if (s.startsWith('SHF-') || s.startsWith('CA-')) return s;
  return `CA-${s.slice(-6).toUpperCase()}`;
}

export function formatShiftType(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('morning') || t.includes('sáng')) return 'Ca Sáng (07:00 – 11:30)';
  if (t.includes('afternoon') || t.includes('chiều')) return 'Ca Chiều (13:00 – 17:00)';
  if (t.includes('evening') || t.includes('tối') || t.includes('ngoài giờ')) return 'Ca Tối (17:30 – 20:30)';
  if (t.includes('night') || t.includes('đêm')) return 'Ca Đêm (21:00 – 06:00)';
  if (t.includes('fullday') || t.includes('toàn')) return 'Ca Toàn Ngày (07:00 – 17:00)';
  return type || 'Ca Sáng (07:00 – 11:30)';
}

export function formatShiftStatus(status) {
  const st = String(status || 'Approved').toLowerCase();
  if (st === 'approved' || st === 'đã phê duyệt' || st === 'đã duyệt') return 'Đã phê duyệt';
  if (st === 'active' || st === 'đang diễn ra' || st === 'đang trực') return 'Đang trực';
  if (st === 'scheduled' || st === 'đã lên lịch') return 'Đã lên lịch';
  if (st === 'pending' || st === 'chờ duyệt') return 'Chờ duyệt';
  if (st === 'completed' || st === 'hoàn thành') return 'Hoàn thành';
  if (st === 'cancelled' || st === 'đã hủy' || st === 'đã huỷ') return 'Đã hủy';
  return status || 'Đã phê duyệt';
}

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

/**
 * Resolves staff display profile for a shift from live shift/user fields.
 * Does not invent CCCD/CCHN/phone — only shows what the shift or session already has.
 */
export function resolveStaffProfileMOH(shift, currentUser) {
  const rawName = String(shift?.employeeName || shift?.doctorName || currentUser?.fullName || '').trim();
  const rawId = String(shift?.employeeId || shift?.doctorId || currentUser?.id || '').trim();
  const roleCat = getShiftRoleCategory(shift);
  const roleVi = roleCat === 'lab' ? 'Kỹ Thuật Viên Xét Nghiệm' : roleCat === 'receptionist' ? 'Nhân Viên Lễ Tân Tiếp Đón' : 'Bác Sĩ Điều Trị';
  const title = roleCat === 'lab' ? 'Kỹ thuật viên Xét nghiệm' : roleCat === 'receptionist' ? 'Chuyên viên Tiếp đón' : 'Bác sĩ Khám Bệnh';

  return {
    name: rawName || 'Chưa phân công',
    code: rawId ? String(rawId).slice(-6).toUpperCase() : '—',
    cccd: shift?.cccd || shift?.identityNumber || currentUser?.identityNumber || null,
    license: shift?.licenseNumber || shift?.license || currentUser?.licenseNumber || null,
    title,
    qualification: '—',
    specialty: shift?.specialty || shift?.department || '—',
    department: shift?.department || shift?.roomName || '—',
    phone: shift?.phone || currentUser?.phone || '—',
    email: shift?.email || currentUser?.email || '—',
    roleVi,
    scope: roleCat === 'doctor'
      ? 'Khám bệnh lâm sàng và chỉ định xét nghiệm'
      : roleCat === 'lab'
        ? 'Thực hiện xét nghiệm và kiểm soát chất lượng IQC'
        : 'Tiếp đón, check-in và hướng dẫn người bệnh'
  };
}
