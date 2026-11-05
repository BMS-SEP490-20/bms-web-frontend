/**
 * @file Sidebar.jsx - BMS Strict Role-Based Navigation Sidebar (RBAC Separation of Duties)
 * Conforms to: Production Medical Standards ISO 15189, ROLE-PERMISSION-MATRIX & AGENTS-DESIGN.md
 */

import React, { useMemo } from 'react';
import { Nav, OverlayTrigger, Tooltip, Badge, Button } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt, FaVial, FaUserMd, FaStethoscope, FaUsersCog,
  FaShieldAlt, FaBoxOpen, FaNotesMedical, FaKey, FaChevronLeft, FaChevronRight,
  FaHeartbeat, FaDatabase, FaBell, FaHistory, FaQrcode, FaUserPlus, FaCheckCircle,
  FaDoorOpen, FaFlask, FaStar, FaReceipt, FaChartBar, FaClock, FaUsers, FaUserCog, FaTimes, FaCalendarAlt
} from 'react-icons/fa';

import { ROLES, ROLE_LABELS, ALL_ROLES, resolveRoleId } from '../../constants/roles';

const { ADMIN, MANAGER, LAB, DOCTOR, RECEPTIONIST, PATIENT } = ROLES;

/**
 * Strict Role-Permission Matrix (Separation of Duties):
 * - ADMIN: System infrastructure, IAM accounts, roles RBAC, audit, database backup, packages. NO clinical data.
 * - MANAGER: High-level medical oversight: result sign-off, QC review, reports (TAT/Revenue), lab config, roster.
 * - LAB: Laboratory operations: sample queue, check-in, results entry, batches, QC Westgard, reagents.
 * - DOCTOR: Clinical patient care: examination console, blood test order creation, EMR, ICD-10 assessment.
 * - RECEPTIONIST: Front-desk patient intake: QR check-in, queue board, patient creation, fee calculation, invoices.
 */
const MENU_SECTIONS = [
  // ================= ADMIN SECTIONS =================
  {
    category: 'QUẢN TRỊ HỆ THỐNG',
    roles: [ADMIN],
    items: [
      { id: 'admin-dash', path: '/dashboard', label: 'Bảng Điều Khiển Admin', icon: FaTachometerAlt, roles: [ADMIN] },
      { id: 'admin-users', path: '/admin/user-management', label: 'Quản Lý Tài Khoản (IAM)', icon: FaUserCog, roles: [ADMIN] },
      { id: 'admin-roles', path: '/roles', label: 'Phân Quyền Vai Trò (RBAC)', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-audit', path: '/admin/audit-logs', label: 'Nhật Ký Audit Hệ Thống', icon: FaShieldAlt, roles: [ADMIN] },
      { id: 'admin-backup', path: '/admin/backup', label: 'Sao Lưu & Khôi Phục Dữ Liệu', icon: FaDatabase, roles: [ADMIN] },
      { id: 'admin-packages', path: '/admin/packages', label: 'Danh Mục Gói Dịch Vụ', icon: FaBoxOpen, roles: [ADMIN] },
      { id: 'admin-rev', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu Viện Phí', icon: FaChartBar, roles: [ADMIN] },
      { id: 'admin-tat', path: '/reports/tat', label: 'Thống Kê Thời Gian TAT', icon: FaChartBar, roles: [ADMIN] }
    ]
  },

  // ================= MANAGER SECTIONS =================
  {
    category: 'QUẢN LÝ & BÁO CÁO',
    roles: [MANAGER],
    items: [
      { id: 'mgr-dash', path: '/dashboard', label: 'Bảng Điều Khiển Tổng Quan', icon: FaTachometerAlt, roles: [MANAGER] },
      { id: 'mgr-approval', path: '/laboratory/verify-results', label: 'Duyệt & Ký Số Kết Quả', icon: FaCheckCircle, roles: [MANAGER] },
      { id: 'mgr-tat', path: '/reports/tat', label: 'Báo Cáo Hiệu Suất TAT', icon: FaChartBar, roles: [MANAGER] },
      { id: 'mgr-revenue', path: '/reports/revenue', label: 'Báo Cáo Doanh Thu Viện Phí', icon: FaChartBar, roles: [MANAGER] },
      { id: 'mgr-feedback', path: '/feedback', label: 'Đánh Giá & Khảo Sát Bệnh Nhân', icon: FaStar, roles: [MANAGER] },
      { id: 'mgr-notifications', path: '/laboratory/notifications', label: 'Cảnh Báo & Thông Báo Khẩn', icon: FaBell, roles: [MANAGER] }
    ]
  },
  {
    category: 'GIÁM SÁT LAB & CẤU HÌNH Y TẾ',
    roles: [MANAGER],
    items: [
      { id: 'mgr-lab-queue', path: '/lab/queue', label: 'Giám Sát Hàng Đợi Mẫu', icon: FaVial, roles: [MANAGER] },
      { id: 'mgr-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (QC)', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-westgard', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [MANAGER] },
      { id: 'mgr-criteria', path: '/criteria', label: 'Danh Mục Chỉ Số Xét Nghiệm', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-intervals', path: '/laboratory/reference-intervals', label: 'Khoảng Tham Chiếu Y Tế', icon: FaHeartbeat, roles: [MANAGER] },
      { id: 'mgr-rooms', path: '/laboratory/rooms', label: 'Phòng Xét Nghiệm & Lấy Mẫu', icon: FaDoorOpen, roles: [MANAGER] },
      { id: 'mgr-profiles', path: '/laboratory/lab-profiles', label: 'Hồ Sơ Kỹ Thuật Máy Lab', icon: FaUsersCog, roles: [MANAGER] },
      { id: 'mgr-iot', path: '/manager/iot-thresholds', label: 'Cảm Biến IoT & Tủ Trữ Mẫu', icon: FaHeartbeat, roles: [MANAGER] },
      { id: 'mgr-schedule', path: '/manage/schedule', label: 'Phân Bổ & Xếp Lịch Ca Trực', icon: FaClock, roles: [MANAGER] },
      { id: 'mgr-emr', path: '/doctor/emr', label: 'Tra Cứu Bệnh Án Điện Tử (EMR)', icon: FaNotesMedical, roles: [MANAGER] },
      { id: 'mgr-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [MANAGER] },
      { id: 'mgr-test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [MANAGER] }
    ]
  },

  // ================= LAB TECHNICIAN SECTIONS =================
  {
    category: 'NGHIỆP VỤ XÉT NGHIỆM',
    roles: [LAB],
    items: [
      { id: 'lab-queue', path: '/lab/queue', label: 'Hàng Đợi Mẫu Bệnh Phẩm', icon: FaVial, roles: [LAB] },
      { id: 'lab-checkin', path: '/laboratory/checkinsample', label: 'Tiếp Nhận Ống Mẫu Máu', icon: FaVial, roles: [LAB] },
      { id: 'lab-enter-res', path: '/laboratory/enter-test-results', label: 'Nhập Kết Quả Xét Nghiệm', icon: FaNotesMedical, roles: [LAB] },
      { id: 'lab-batches', path: '/laboratory/batches', label: 'Quản Lý Lô Mẫu Phân Tích', icon: FaFlask, roles: [LAB] },
      { id: 'lab-qc', path: '/qc/management', label: 'Kiểm Soát Chất Lượng (IQC/EQA)', icon: FaFlask, roles: [LAB] },
      { id: 'lab-flags', path: '/laboratory/qc-flags', label: 'Cờ Kiểm Chuẩn Westgard', icon: FaFlask, roles: [LAB] },
      { id: 'lab-validate', path: '/lab-user/validate-sample', label: 'Kiểm Chuẩn Mẫu Tiền Phân Tích', icon: FaVial, roles: [LAB] }
    ]
  },
  {
    category: 'VẬN HÀNH & KHO LAB',
    roles: [LAB],
    items: [
      { id: 'lab-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-test-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-history', path: '/laboratory/specimens/history', label: 'Lịch Sử Mẫu Bệnh Phẩm', icon: FaHistory, roles: [LAB] },
      { id: 'lab-inventory', path: '/inventory', label: 'Quản Lý Kho Hóa Chất & Vật Tư', icon: FaBoxOpen, roles: [LAB] },
      { id: 'lab-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [LAB] },
      { id: 'lab-notifs', path: '/laboratory/notifications', label: 'Thông Báo Nội Bộ Lab', icon: FaBell, roles: [LAB] }
    ]
  },

  // ================= DOCTOR SECTIONS =================
  {
    category: 'BÀN KHÁM & ĐIỀU TRỊ',
    roles: [DOCTOR],
    items: [
      { id: 'doc-console', path: '/doctor/console', label: 'Bàn Khám Bác Sĩ & Gọi Số', icon: FaStethoscope, roles: [DOCTOR] },
      { id: 'doc-order', path: '/doctor/orders/create', label: 'Chỉ Định Xét Nghiệm Máu', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-emr', path: '/doctor/emr', label: 'Bệnh Án Điện Tử (EMR)', icon: FaNotesMedical, roles: [DOCTOR] },
      { id: 'doc-assessment', path: '/medical-assessments', label: 'Chẩn Đoán Lâm Sàng (ICD-10)', icon: FaStethoscope, roles: [DOCTOR] },
      { id: 'doc-notes', path: '/doctor/medical-notes', label: 'Ghi Chú Y Khoa Tiến Trình', icon: FaNotesMedical, roles: [DOCTOR] }
    ]
  },
  {
    category: 'LỊCH HẸN & THEO DÕI',
    roles: [DOCTOR],
    items: [
      { id: 'doc-appointments', path: '/appointments', label: 'Danh Sách Lịch Hẹn Khám', icon: FaClock, roles: [DOCTOR] },
      { id: 'doc-patient-hist', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [DOCTOR] },
      { id: 'doc-timeline', path: '/laboratory/sample-timeline', label: 'Hành Trình Mẫu Bệnh Phẩm', icon: FaHistory, roles: [DOCTOR] },
      { id: 'doc-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Bác Sĩ', icon: FaClock, roles: [DOCTOR] }
    ]
  },

  // ================= RECEPTIONIST SECTIONS =================
  {
    category: 'TIẾP ĐÓN & ĐIỀU PHỐI BỆNH NHÂN',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-checkin', path: '/receptionist/check-in', label: '1. Quầy Tiếp Đón & Check-in QR', icon: FaQrcode, roles: [RECEPTIONIST] },
      { id: 'rec-queue', path: '/reception/queue', label: '2. Bảng Gọi Số & Hàng Đợi', icon: FaClock, roles: [RECEPTIONIST] },
      { id: 'rec-create-pt', path: '/receptionist/create-patient', label: '3. Tạo Hồ Sơ Bệnh Nhân (Vãng Lai)', icon: FaUserPlus, roles: [RECEPTIONIST] },
      { id: 'rec-appointments', path: '/appointments', label: '4. Sổ Lịch Hẹn & Khung Giờ', icon: FaCalendarAlt, roles: [RECEPTIONIST] },
      { id: 'rec-patients', path: '/patients', label: '5. Tra Cứu Hồ Sơ Bệnh Nhân', icon: FaUsers, roles: [RECEPTIONIST] }
    ]
  },
  {
    category: 'VIỆN PHÍ & THU NGÂN',
    roles: [RECEPTIONIST],
    items: [
      { id: 'rec-invoices', path: '/invoices', label: 'Quầy Thu Viện Phí & Hóa Đơn VAT', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-fees', path: '/calculate-fees', label: 'Tra Cứu Bảng Giá & Dự Toán BHYT', icon: FaReceipt, roles: [RECEPTIONIST] },
      { id: 'rec-shifts', path: '/shifts/view', label: 'Lịch Ca Trực Của Tôi', icon: FaClock, roles: [RECEPTIONIST] }
    ]
  },

  // ================= PATIENT SECTION =================
  {
    category: 'CỔNG BỆNH NHÂN',
    roles: [PATIENT],
    items: [
      { id: 'pt-tracking', path: '/tracking', label: 'Tiến Trình & Kết Quả', icon: FaHeartbeat, roles: [PATIENT] },
      { id: 'pt-history', path: '/patient/test-history', label: 'Lịch Sử Xét Nghiệm', icon: FaHistory, roles: [PATIENT] }
    ]
  },

  // ================= COMMON ACCOUNT SECTION =================
  {
    category: 'TÀI KHOẢN CÁ NHÂN',
    roles: ALL_ROLES,
    items: [
      { id: 'common-profile', path: '/profile', label: 'Thông Tin Tài Khoản', icon: FaUserMd, roles: ALL_ROLES },
      { id: 'common-pwd', path: '/change-password', label: 'Thay Đổi Mật Khẩu', icon: FaKey, roles: ALL_ROLES }
    ]
  }
];

export default function Sidebar({
  isCollapsed = false,
  onToggle,
  onToggleCollapse,
  isMobile = false,
  onCloseMobile,
  onClose,
  auth
}) {
  const location = useLocation();
  const toggleSidebar = onToggle || onToggleCollapse;
  const closeSidebar = onCloseMobile || onClose;

  // Safe user & role resolution
  const user = useMemo(() => {
    if (auth?.user) return auth.user;
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [auth?.user]);

  const roleId = useMemo(() => resolveRoleId(user) ?? resolveRoleId(auth?.userRoleId ?? auth?.userRole), [auth, user]);
  const currentRole = roleId ? ROLE_LABELS[roleId] : 'Nhân viên y tế';

  // Filter sections strictly by current roleId
  const filteredSections = useMemo(() => {
    return MENU_SECTIONS
      .filter(sec => roleId !== null && sec.roles.includes(roleId))
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => roleId !== null && item.roles.includes(roleId))
      }))
      .filter(sec => sec.items.length > 0);
  }, [roleId]);

  const isActive = (path) => {
    const base = path.split('?')[0];
    return base === '/dashboard' ? location.pathname.endsWith('/dashboard') : location.pathname.startsWith(base);
  };

  return (
    <aside
      className={`bms-sidebar d-flex flex-column text-white ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        width: isCollapsed ? '78px' : '260px',
        height: '100vh',
        backgroundColor: '#0f172a',
        position: isMobile ? 'relative' : 'fixed',
        left: 0, top: 0, zIndex: 1050,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRight: '1px solid #1e293b'
      }}
    >
      {/* 1. Header & Brand */}
      <div
        className="d-flex align-items-center justify-content-between px-3 border-bottom"
        style={{ height: '64px', borderColor: '#1e293b' }}
      >
        <Link
          to="/"
          className="d-flex align-items-center text-decoration-none text-white gap-2 overflow-hidden"
          onClick={() => isMobile && closeSidebar?.()}
        >
          <div
            className="rounded-3 bg-primary d-flex align-items-center justify-content-center text-white flex-shrink-0 shadow-sm"
            style={{ width: '34px', height: '34px', fontWeight: 800, fontSize: '15px' }}
          >
            B
          </div>
          {!isCollapsed && (
            <div className="text-truncate lh-sm">
              <span className="fw-bold tracking-wide d-block text-white" style={{ fontSize: '0.92rem' }}>BMS MEDLAB</span>
              <small className="text-secondary" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>HỆ THỐNG Y TẾ ISO 15189</small>
            </div>
          )}
        </Link>
        {isMobile && (
          <Button variant="link" className="text-secondary p-0" onClick={closeSidebar}>
            <FaTimes size={18} />
          </Button>
        )}
      </div>

      {/* 2. Active Role Banner */}
      {!isCollapsed && (
        <div
          className="px-3 py-2 border-bottom d-flex justify-content-between align-items-center"
          style={{ backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: '#1e293b' }}
        >
          <span className="text-secondary text-uppercase fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
            Phân hệ làm việc
          </span>
          <Badge
            bg="primary"
            className="px-2 py-1 text-uppercase fw-bold rounded-pill"
            style={{ fontSize: '0.65rem', letterSpacing: '0.3px', backgroundColor: '#2563eb' }}
          >
            {currentRole}
          </Badge>
        </div>
      )}

      {/* 3. Navigation List */}
      <div className="flex-grow-1 overflow-auto custom-scrollbar p-2" style={{ minHeight: 0 }}>
        <Nav className="flex-column gap-1">
          {filteredSections.map((sec, idx) => (
            <div key={sec.category} className="mb-2">
              {!isCollapsed ? (
                <div
                  className="px-3 pt-2.5 pb-1 text-uppercase fw-bold text-secondary"
                  style={{ fontSize: '0.65rem', letterSpacing: '0.6px', color: '#64748b' }}
                >
                  {sec.category}
                </div>
              ) : (
                idx > 0 && <hr className="my-2 border-secondary opacity-25 w-75 mx-auto" style={{ borderColor: '#334155' }} />
              )}

              {sec.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);

                const link = (
                  <Nav.Link
                    as={Link}
                    to={item.path}
                    onClick={() => isMobile && closeSidebar?.()}
                    className={`d-flex align-items-center rounded-3 px-3 py-2 text-decoration-none transition-all ${
                      active
                        ? 'text-white shadow-sm fw-semibold'
                        : 'text-slate-300 hover-item'
                    }`}
                    style={{
                      fontSize: '0.86rem',
                      color: active ? '#ffffff' : '#cbd5e1',
                      backgroundColor: active ? '#1e40af' : 'transparent',
                      borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent'
                    }}
                  >
                    <Icon
                      size={isCollapsed ? 18 : 16}
                      className={isCollapsed ? 'mx-auto' : 'me-3 flex-shrink-0'}
                      style={{ color: active ? '#ffffff' : '#94a3b8' }}
                    />
                    {!isCollapsed && (
                      <span className="flex-grow-1 text-truncate">{item.label}</span>
                    )}
                  </Nav.Link>
                );

                return isCollapsed ? (
                  <OverlayTrigger
                    key={item.id}
                    placement="right"
                    overlay={<Tooltip id={`t-${item.id}`}>{item.label}</Tooltip>}
                  >
                    <div>{link}</div>
                  </OverlayTrigger>
                ) : (
                  <React.Fragment key={item.id}>{link}</React.Fragment>
                );
              })}
            </div>
          ))}
        </Nav>
      </div>

      {/* 4. Logged-in Staff Card */}
      <div
        className="p-3 border-top d-flex align-items-center"
        style={{ borderColor: '#1e293b', backgroundColor: '#090d16' }}
      >
        <div
          className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold shadow-sm"
          style={{ width: '36px', height: '36px', fontSize: '14px', backgroundColor: '#2563eb' }}
        >
          {user?.fullName?.[0]?.toUpperCase() || currentRole[0]}
        </div>
        {!isCollapsed && (
          <div className="ms-2.5 overflow-hidden flex-grow-1 lh-sm">
            <div className="text-white small fw-bold text-truncate">
              {user?.fullName || user?.name || 'Nhân viên y tế'}
            </div>
            <div className="text-secondary text-truncate" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              {currentRole} • BMS
            </div>
          </div>
        )}
      </div>

      {/* 5. Collapse Toggle (Desktop) */}
      {!isMobile && (
        <Button
          variant="link"
          className="text-secondary text-decoration-none py-2 text-center border-top rounded-0"
          onClick={toggleSidebar}
          style={{ fontSize: '0.8rem', borderColor: '#1e293b', color: '#94a3b8' }}
        >
          {isCollapsed ? (
            <FaChevronRight size={13} />
          ) : (
            <>
              <FaChevronLeft className="me-1" size={12} />
              <span>Thu gọn thanh bên</span>
            </>
          )}
        </Button>
      )}

      <style>{`
        .bms-sidebar .hover-item:hover {
          background-color: rgba(255, 255, 255, 0.06) !important;
          color: #ffffff !important;
        }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .bms-sidebar .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
      `}</style>
    </aside>
  );
}
