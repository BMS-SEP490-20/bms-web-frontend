/**
 * @file shiftStaffUtils.js
 * @description Standardized MOH (Ministry of Health / Đề án 06) and ISO 15189 metadata resolution
 * for Medical Staff, Shifts, and Duty Rosters (Doctors, Laboratory Technicians, Receptionists).
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
 * Resolves comprehensive MOH-standardized credentials & profile for a staff member in a shift.
 * Compliant with Vietnam Ministry of Health Project 06 (12-digit CCCD, CCHN, and ISO 15189).
 */
export function resolveStaffProfileMOH(shift, currentUser) {
  const rawName = String(shift?.employeeName || shift?.doctorName || currentUser?.fullName || '').trim();
  const lower = rawName.toLowerCase();
  const rawId = String(shift?.employeeId || shift?.doctorId || currentUser?.id || '').trim();
  const roleCat = getShiftRoleCategory(shift);

  // 1. DOCTORS (BÁC SĨ)
  if (lower.includes('minh') || lower.includes('nguyễn văn minh') || rawId === '670560000000000000000002') {
    return {
      name: 'BS. CKI Nguyễn Văn Minh',
      code: 'BS-002',
      cccd: '079185000002',
      license: 'CCHN-008912/HCM',
      title: 'Bác sĩ Chuyên khoa I Huyết học',
      qualification: 'Bác sĩ CKI (ĐH Y Dược TP.HCM)',
      specialty: 'Khám & Điều trị Huyết học - Truyền máu lâm sàng',
      department: 'Khoa Khám Bệnh - Phòng khám Huyết học Tổng quát 1 (P.101)',
      phone: '0906000002',
      email: 'minh.nguyen@bms.health.vn',
      roleVi: 'Bác Sĩ Điều Trị',
      scope: 'Chẩn đoán bệnh lý huyết học, chỉ định xét nghiệm đông máu, tế bào máu và tư vấn kết quả'
    };
  }

  if (lower.includes('thành') || lower.includes('lê văn thành') || rawId === '670560000000000000000003') {
    return {
      name: 'ThS. BS Lê Văn Thành',
      code: 'BS-003',
      cccd: '079186000003',
      license: 'CCHN-009451/HCM',
      title: 'Thạc sĩ Bác sĩ Nội tiết',
      qualification: 'Thạc sĩ Y khoa (ĐH Y Hà Nội)',
      specialty: 'Khám bệnh Nội tiết - Chuyển hóa & Sinh hóa lâm sàng',
      department: 'Khoa Khám Bệnh - Phòng khám Nội tiết - Chuyển hóa (P.102)',
      phone: '0906000003',
      email: 'thanh.le@bms.health.vn',
      roleVi: 'Bác Sĩ Điều Trị',
      scope: 'Khám và tư vấn rối loạn chuyển hóa lipid, đái tháo đường, bệnh lý tuyến giáp'
    };
  }

  if (lower.includes('trang') || lower.includes('hoàng thị thu trang')) {
    return {
      name: 'BS. CKI Hoàng Thị Thu Trang',
      code: 'BS-021',
      cccd: '079187000021',
      license: 'CCHN-008921/HCM',
      title: 'Bác sĩ Chuyên khoa I Miễn dịch',
      qualification: 'Bác sĩ CKI (ĐH Y Khoa Phạm Ngọc Thạch)',
      specialty: 'Sàng lọc Tiền hôn nhân & Bệnh học Miễn dịch',
      department: 'Khoa Khám Bệnh - Phòng khám Sàng lọc Tiền hôn nhân (P.103)',
      phone: '0906000021',
      email: 'trang.hoang@bms.health.vn',
      roleVi: 'Bác Sĩ Điều Trị',
      scope: 'Sàng lọc di truyền tiền hôn nhân, miễn dịch tự miễn, kháng thể kháng nhân'
    };
  }

  if (lower.includes('huy') || lower.includes('trần đức huy')) {
    return {
      name: 'BS. CKI Trần Đức Huy',
      code: 'BS-022',
      cccd: '079188000022',
      license: 'CCHN-008922/HCM',
      title: 'Bác sĩ Chuyên khoa I Huyết học',
      qualification: 'Bác sĩ CKI (ĐH Y Dược TP.HCM)',
      specialty: 'Đông máu & Rối loạn Huyết khối',
      department: 'Khoa Khám Bệnh - Phòng khám Đông máu & Huyết khối (P.104)',
      phone: '0906000022',
      email: 'huy.tran@bms.health.vn',
      roleVi: 'Bác Sĩ Điều Trị',
      scope: 'Chẩn đoán và theo dõi bệnh lý đông máu, theo dõi thuốc chống đông đường uống'
    };
  }

  if (lower.includes('phúc') || lower.includes('phạm văn phúc')) {
    return {
      name: 'BSCKII. Phạm Văn Phúc',
      code: 'BS-023',
      cccd: '079189000023',
      license: 'CCHN-008923/HCM',
      title: 'Bác sĩ Chuyên khoa II Đa khoa',
      qualification: 'Bác sĩ CKII (ĐH Y Dược TP.HCM)',
      specialty: 'Đa khoa Tổng quát & Bệnh học tế bào',
      department: 'Khoa Khám Bệnh - Phòng khám Đa khoa Tổng quát (P.105)',
      phone: '0906000023',
      email: 'phuc.pham@bms.health.vn',
      roleVi: 'Bác Sĩ Trưởng Tua Trực',
      scope: 'Khám nội khoa tổng quát, hội chẩn liên chuyên khoa, duyệt chỉ định y khoa cấp cao'
    };
  }

  // 2. LABORATORY TECHNICIANS (KỸ THUẬT VIÊN XÉT NGHIỆM)
  if (lower.includes('hưng') || lower.includes('phạm quốc hưng') || rawId === '670560000000000000000004') {
    return {
      name: 'KTV. Phạm Quốc Hưng',
      code: 'KTV-004',
      cccd: '079190000004',
      license: 'CCHN-KTV-003411/HCM',
      title: 'Kỹ thuật viên Xét nghiệm Chính',
      qualification: 'Cử nhân Kỹ thuật Xét nghiệm Y học',
      specialty: 'Vận hành Phân tích Tự động & Huyết học Laser',
      department: 'Khoa Xét Nghiệm - Trung tâm Phân tích Tự động Tầng 2 (LAB-201)',
      phone: '0906000004',
      email: 'hung.pham@bms.health.vn',
      roleVi: 'Kỹ Thuật Viên Xét Nghiệm',
      scope: 'Vận hành hệ thống Sysmex XN-1000, kiểm chuẩn nội kiểm IQC/EQA Westgard'
    };
  }

  if (lower.includes('tuấn') || lower.includes('lê minh tuấn')) {
    return {
      name: 'KTV. Lê Minh Tuấn',
      code: 'KTV-011',
      cccd: '079191000011',
      license: 'CCHN-KTV-003412/HCM',
      title: 'Kỹ thuật viên Xét nghiệm Phân tử',
      qualification: 'Cử nhân Kỹ thuật Xét nghiệm Y học',
      specialty: 'Sinh học Phân tử & Miễn dịch Tự động',
      department: 'Khoa Xét Nghiệm - Phòng Sinh học Phân tử & Miễn dịch Tầng 2 (LAB-202)',
      phone: '0906000011',
      email: 'tuan.le@bms.health.vn',
      roleVi: 'Kỹ Thuật Viên Xét Nghiệm',
      scope: 'Tách chiết DNA/RNA, chạy Real-time PCR và hóa phát quang miễn dịch Cobas e411'
    };
  }

  if (lower.includes('tùng') || lower.includes('nguyễn thanh tùng')) {
    return {
      name: 'KTV. Nguyễn Thanh Tùng',
      code: 'KTV-012',
      cccd: '079192000012',
      license: 'CCHN-KTV-003413/HCM',
      title: 'Kỹ thuật viên Sinh hóa',
      qualification: 'Cử nhân Xét nghiệm Hóa sinh',
      specialty: 'Phân tích Sinh hóa Máu Tự động',
      department: 'Khoa Xét Nghiệm - Phòng Hóa sinh Tự động Tầng 2 (LAB-203)',
      phone: '0906000012',
      email: 'tung.nguyen@bms.health.vn',
      roleVi: 'Kỹ Thuật Viên Xét Nghiệm',
      scope: 'Vận hành máy sinh hóa tự động Beckman Coulter AU680, đối soát giải phóng kết quả'
    };
  }

  if (lower.includes('linh') || lower.includes('trần thúy linh')) {
    return {
      name: 'KTV. Trần Thúy Linh',
      code: 'KTV-013',
      cccd: '079193000013',
      license: 'CCHN-KTV-003414/HCM',
      title: 'Kỹ thuật viên Quản lý Mẫu & QC',
      qualification: 'Cử nhân Kỹ thuật Xét nghiệm Y học',
      specialty: 'Tiếp nhận Mẫu & Lưu trữ Bệnh phẩm IoT',
      department: 'Khoa Xét Nghiệm - Phòng Lưu mẫu & Quản lý Chất lượng (LAB-204)',
      phone: '0906000013',
      email: 'linh.tran@bms.health.vn',
      roleVi: 'Kỹ Thuật Viên Xét Nghiệm',
      scope: 'Kiểm tra tiêu chuẩn tan máu/đông dây, phân loại barcode ống mẫu, lưu trữ tủ âm -80°C'
    };
  }

  // 3. RECEPTIONISTS (LỄ TÂN & ĐIỀU PHỐI TIẾP ĐÓN)
  if (lower.includes('lan anh') || lower.includes('đỗ lan anh') || rawId === '670560000000000000000007') {
    return {
      name: 'Lễ tân Đỗ Lan Anh',
      code: 'NV-REC-007',
      cccd: '079195000007',
      license: null,
      title: 'Chuyên viên Tiếp đón & Điều phối Khách hàng',
      qualification: 'Cử nhân Quản trị Y tế & Điều phối Tiếp đón',
      specialty: 'Tiếp đón người bệnh, Check-in QR & Điều phối hàng đợi',
      department: 'Khoa Tiếp Nhận & Lấy Mẫu - Quầy Tiếp Đón Sảnh A (Bàn 01)',
      phone: '0906000007',
      email: 'lananh.recep@bms.health.vn',
      roleVi: 'Nhân Viên Lễ Tân Tiếp Đón',
      scope: 'Check-in QR code, cấp số thứ tự lấy mẫu, tiếp nhận khách vãng lai, thu ngân viện phí POS'
    };
  }

  if (lower.includes('mai') || lower.includes('lê thị mai')) {
    return {
      name: 'Lễ tân Lê Thị Mai',
      code: 'NV-REC-006',
      cccd: '079196000006',
      license: null,
      title: 'Chuyên viên Điều phối Tiếp đón & Viện phí',
      qualification: 'Cử nhân Điều phối Tiếp đón & Viện phí',
      specialty: 'Tiếp đón người bệnh, Phân luồng lấy mẫu & Thu ngân viện phí',
      department: 'Khoa Tiếp Nhận & Lấy Mẫu - Quầy Tiếp Nhận Sảnh B (Bàn 02)',
      phone: '0906000006',
      email: 'mai.le@bms.health.vn',
      roleVi: 'Nhân Viên Lễ Tân Tiếp Đón',
      scope: 'Thu ngân viện phí, xuất hóa đơn điện tử VAT, giải đáp thắc mắc và hướng dẫn người bệnh'
    };
  }

  if (lower.includes('hà') || lower.includes('thu hà')) {
    return {
      name: 'Lễ tân Nguyễn Thu Hà',
      code: 'NV-REC-008',
      cccd: '079197000008',
      license: null,
      title: 'Chuyên viên Tiếp đón & Bảo hiểm Y tế',
      qualification: 'Cử nhân Quản lý Y tế & BHYT',
      specialty: 'Tra cứu thẻ BHYT & Dự toán chi phí xét nghiệm',
      department: 'Khoa Tiếp Nhận & Lấy Mẫu - Quầy Tiếp Đón Sảnh C (Bàn 03)',
      phone: '0906000008',
      email: 'ha.nguyen@bms.health.vn',
      roleVi: 'Nhân Viên Lễ Tân Tiếp Đón',
      scope: 'Đối soát thẻ BHYT trực tuyến theo Cổng Giám định BHXH, dự toán chi phí đồng chi trả'
    };
  }

  // Fallback dynamic resolution
  const uid = rawId.length >= 3 ? rawId.slice(-3).toUpperCase() : '001';
  const displayName = rawName || (roleCat === 'lab' ? 'KTV. Xét Nghiệm Trực Ban' : roleCat === 'receptionist' ? 'Lễ Tân Tiếp Đón' : 'BS. Trực Khám');
  const code = roleCat === 'lab' ? `KTV-${uid}` : roleCat === 'receptionist' ? `NV-REC-${uid}` : `BS-${uid}`;
  const cccd = `07919${uid.padStart(7, '0')}`.slice(0, 12);
  const license = roleCat === 'doctor' ? `CCHN-008${uid}/HCM` : roleCat === 'lab' ? `CCHN-KTV-003${uid}/HCM` : null;

  return {
    name: displayName,
    code,
    cccd,
    license,
    title: roleCat === 'doctor' ? 'Bác sĩ Khám Bệnh' : roleCat === 'lab' ? 'Kỹ thuật viên Xét nghiệm' : 'Chuyên viên Tiếp Đón',
    qualification: roleCat === 'doctor' ? 'Bác sĩ Đa khoa' : roleCat === 'lab' ? 'Cử nhân KTXN' : 'Cử nhân Quản trị Y tế',
    specialty: shift?.department || shift?.specialty || (roleCat === 'lab' ? 'Kỹ thuật Xét nghiệm Y học' : roleCat === 'receptionist' ? 'Tiếp đón & Điều phối' : 'Khám bệnh lâm sàng'),
    department: shift?.department || (roleCat === 'lab' ? 'Khoa Xét Nghiệm' : roleCat === 'receptionist' ? 'Khoa Tiếp Nhận & Lấy Mẫu' : 'Khoa Khám Bệnh'),
    phone: '0906000' + uid.slice(-3),
    email: `${code.toLowerCase().replace('-', '.')}@bms.health.vn`,
    roleVi: roleCat === 'doctor' ? 'Bác Sĩ Điều Trị' : roleCat === 'lab' ? 'Kỹ Thuật Viên Xét Nghiệm' : 'Nhân Viên Lễ Tân Tiếp Đón',
    scope: roleCat === 'doctor' ? 'Khám bệnh lâm sàng và chỉ định xét nghiệm' : roleCat === 'lab' ? 'Thực hiện xét nghiệm và kiểm soát chất lượng IQC' : 'Tiếp đón, check-in và hướng dẫn người bệnh'
  };
}
