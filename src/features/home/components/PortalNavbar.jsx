import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaPhoneAlt, 
  FaClock, 
  FaVial, 
  FaArrowRight, 
  FaCalendarCheck, 
  FaSignOutAlt, 
  FaCalendarAlt, 
  FaHistory, 
  FaFileInvoiceDollar, 
  FaUserCircle 
} from 'react-icons/fa';
import { ROLES, ROLE_LABELS, resolveRoleId, getStoredUser } from '../../../constants/roles';

/**
 * PortalNavbar - Unified Header for Public Guests and Authenticated Patients.
 * Guaranteed 100% synchronization across all routes without layout jumping or header morphing.
 */
export default function PortalNavbar({ user: propUser = null }) {
  const location = useLocation();
  const navigate = useNavigate();

  const user = useMemo(() => {
    if (propUser) return propUser;
    return getStoredUser();
  }, [propUser]);

  const roleId = useMemo(() => {
    return resolveRoleId(user);
  }, [user]);

  const isPatient = Boolean(user && roleId === ROLES.PATIENT);
  const isStaff = Boolean(user && roleId && roleId !== ROLES.PATIENT);
  const staffRoleName = roleId ? ROLE_LABELS[roleId] : '';
  const currentPath = location.pathname;

  const staffWorkspacePath = useMemo(() => {
    switch (roleId) {
      case ROLES.RECEPTIONIST:
        return '/receptionist/check-in';
      case ROLES.DOCTOR:
        return '/doctor/console';
      case ROLES.LAB:
        return '/lab/queue';
      case ROLES.MANAGER:
      case ROLES.ADMIN:
      default:
        return '/dashboard';
    }
  }, [roleId]);

  const handleLogout = () => {
    ['bms_token', 'bms_access_token', 'bms_refresh_token', 'bms_user', 'token', 'accessToken'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    window.location.href = '/';
  };

  const patientName = user?.fullName || user?.username || 'Bệnh Nhân';

  return (
    <>
      {/* 1. Master Topbar */}
      <div className="bms-topbar">
        <div className="bms-topbar-container">
          <div className="bms-topbar-info">
            <div className="bms-topbar-item">
              <FaPhoneAlt />
              <span>Hotline Đặt Lịch &amp; Tư Vấn: <strong>1900 6868</strong></span>
            </div>
            <div className="bms-topbar-item">
              <FaClock />
              <span>Tiếp nhận mẫu: 06:00 – 20:30 (Thứ 2 – CN)</span>
            </div>
          </div>
          <div className="bms-topbar-badge">Giấy phép BYT: 08892/BYT-GPHĐ</div>
        </div>
      </div>

      {/* 2. Unified Navbar */}
      <header className="bms-navbar">
        <div className="bms-navbar-container">
          <Link className="bms-brand" to={isPatient ? "/home" : "/"}>
            <div className="bms-brand-logo">
              <img src="/assets/bms-logo.png" alt="BMS Logo" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <div className="bms-brand-text">
              <h1>BMS CLINICAL LABORATORY</h1>
              <p>Tiêu Chuẩn Quốc Tế ISO 15189</p>
            </div>
          </Link>

          <ul className="bms-nav-links" style={{ flexWrap: "nowrap", whiteSpace: "nowrap", display: "flex", alignItems: "center" }}>
            <li>
              <Link 
                style={{ whiteSpace: "nowrap", flexShrink: 0 }} className={`bms-nav-link ${currentPath === '/' || currentPath === '/home' ? 'active text-primary' : ''}`} 
                to={isPatient ? "/home" : "/"}
              >
                Trang Chủ
              </Link>
            </li>
            <li>
              <Link 
                style={{ whiteSpace: "nowrap", flexShrink: 0 }} className={`bms-nav-link ${currentPath.startsWith('/services') || currentPath.startsWith('/catalog') ? 'active text-primary' : ''}`} 
                to="/services"
              >
                Gói Xét Nghiệm
              </Link>
            </li>
            <li>
              <Link 
                style={{ whiteSpace: "nowrap", flexShrink: 0 }} className={`bms-nav-link ${currentPath.startsWith('/tracking') ? 'active text-primary' : ''}`} 
                to="/tracking"
              >
                <FaVial className="text-primary me-1" /> Tiến Trình &amp; Kết Quả
              </Link>
            </li>

            {/* Patient-Only Synced Navigation Items */}
            {isPatient ? (
              <>
                <li>
                  <Link 
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }} className={`bms-nav-link ${currentPath.startsWith('/appointments') ? 'active text-primary' : ''}`} 
                    to="/appointments"
                  >
                    <FaCalendarAlt className="me-1 text-secondary" /> Lịch Khám Của Tôi
                  </Link>
                </li>
                <li>
                  <Link 
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }} className={`bms-nav-link ${currentPath.startsWith('/patient/test-history') ? 'active text-primary' : ''}`} 
                    to="/patient/test-history"
                  >
                    <FaHistory className="me-1 text-secondary" /> Lịch Sử Xét Nghiệm
                  </Link>
                </li>
                <li>
                  <Link 
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }} className={`bms-nav-link ${currentPath.startsWith('/patient/payment-history') || currentPath.startsWith('/patient/payments') || currentPath.startsWith('/invoices') ? 'active text-primary' : ''}`} 
                    to="/patient/payment-history"
                  >
                    <FaFileInvoiceDollar className="me-1 text-secondary" /> Lịch Sử Thanh Toán
                  </Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link className="bms-nav-link" to="/catalog">Bảng Giá &amp; BHYT</Link>
                </li>
                <li>
                  <a className="bms-nav-link" href="#quy-trinh">Quy Trình ISO</a>
                </li>
              </>
            )}
          </ul>

          <div className="bms-header-actions">
            {isPatient ? (
              <div className="bms-user-nav-dropdown">
                <Link className="bms-user-pill" to="/profile" title="Xem hồ sơ cá nhân">
                  <div className="bms-user-avatar">{patientName ? patientName[0].toUpperCase() : 'B'}</div>
                  <div className="bms-user-meta">
                    <span className="bms-user-name">{patientName}</span>
                  </div>
                </Link>
                <button type="button" className="bms-btn bms-btn-danger-outline bms-btn-sm" onClick={handleLogout}>
                  <FaSignOutAlt /> Đăng Xuất
                </button>
              </div>
            ) : isStaff ? (
              <div className="bms-user-nav-dropdown d-flex align-items-center gap-2">
                <Link to={staffWorkspacePath} className="bms-btn bms-btn-primary bms-btn-sm text-nowrap">
                  Vào Bàn Làm Việc <FaArrowRight className="ms-1" />
                </Link>
                <div className="bms-user-pill" title="Tài khoản nhân viên">
                  <div className="bms-user-avatar bg-dark text-white">{patientName ? patientName[0].toUpperCase() : 'N'}</div>
                  <div className="bms-user-meta">
                    <span className="bms-user-name">{patientName}</span>
                    <small className="text-primary fw-semibold" style={{ fontSize: 10 }}>({staffRoleName})</small>
                  </div>
                </div>
                <button type="button" className="bms-btn bms-btn-danger-outline bms-btn-sm" onClick={handleLogout}>
                  <FaSignOutAlt /> Đăng Xuất
                </button>
              </div>
            ) : (
              <>
                <Link className="bms-btn bms-btn-outline" to="/appointments/book">
                  <FaCalendarCheck /> Đặt Lịch Lấy Mẫu
                </Link>
                <Link className="bms-btn bms-btn-primary" to="/login">
                  Đăng Nhập <FaArrowRight />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
