/**
 * @file PortalNavbar.jsx
 * @description Master Centered-Pill Navigation Bar (MEDLINE / Apple macOS Grade).
 * Features:
 * - Brand logo (high-res BMS cross mark + wordmark)
 * - Centered capsule pill track with solid active segment and soft hover wash
 * - Top-right identity & CTA cluster with mint-green positive CTA and soft-blue primary actions
 * Conforms to: Soft Medical Telehealth UI Specification & DESIGN SYSTEM PROMPT.
 */

import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROLES, ROLE_LABELS, resolveRoleId, getStoredUser } from '../../../constants/roles';

export default function PortalNavbar({ user: propUser = null }) {
  const location = useLocation();

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
  const initial = patientName ? patientName.trim().charAt(0).toUpperCase() : 'B';

  return (
    <header className="bms-telehealth-header">
      <div className="bms-telehealth-header-inner">
        {/* 1. Left: Brand Logo & Title */}
        <Link className="bms-brand-cluster" to={isPatient ? "/home" : "/"}>
          <img
            src="/assets/bms-logo.png"
            alt="BMS Clinical Laboratory"
            className="bms-brand-img"
          />
        </Link>

        {/* 2. Center: Capsule Pill Track Navigation */}
        <nav className="bms-nav-capsule-track" aria-label="Main Navigation">
          <Link
            className={`bms-capsule-item ${currentPath === '/' || currentPath === '/home' ? 'active' : ''}`}
            to={isPatient ? "/home" : "/"}
          >
            Trang Chủ
          </Link>
          <Link
            className={`bms-capsule-item ${currentPath.startsWith('/services') || currentPath.startsWith('/catalog') ? 'active' : ''}`}
            to="/services"
          >
            Gói Xét Nghiệm
          </Link>
          <Link
            className={`bms-capsule-item ${currentPath.startsWith('/tracking') ? 'active' : ''}`}
            to="/tracking"
          >
            Tiến Trình &amp; Kết Quả
          </Link>

          {isPatient ? (
            <>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/appointments') ? 'active' : ''}`}
                to="/appointments"
              >
                Lịch Khám Của Tôi
              </Link>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/patient/test-history') ? 'active' : ''}`}
                to="/patient/test-history"
              >
                Lịch Sử Xét Nghiệm
              </Link>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/patient/payment-history') || currentPath.startsWith('/invoices') ? 'active' : ''}`}
                to="/patient/payment-history"
              >
                Lịch Sử Thanh Toán
              </Link>
            </>
          ) : (
            <>
              <Link
                className={`bms-capsule-item ${currentPath === '/catalog' ? 'active' : ''}`}
                to="/catalog"
              >
                Bảng Giá Niêm Yết
              </Link>
              <a className="bms-capsule-item" href="#quy-trinh">
                Quy Trình ISO
              </a>
            </>
          )}
        </nav>

        {/* 3. Right: Identity & Positive CTA Cluster */}
        <div className="bms-identity-cluster">
          {isPatient ? (
            <div className="bms-user-dock">
              <Link className="bms-user-profile-tile" to="/profile" title="Xem hồ sơ y tế">
                <div className="bms-avatar-circle">{initial}</div>
                <div className="bms-user-text">
                  <span className="bms-user-fullname">{patientName}</span>
                  <span className="bms-user-sub">Bệnh nhân</span>
                </div>
              </Link>
              <button
                type="button"
                className="bms-btn-ghost-danger"
                onClick={handleLogout}
                title="Đăng xuất khỏi hệ thống"
              >
                Đăng Xuất
              </button>
            </div>
          ) : isStaff ? (
            <div className="bms-user-dock">
              <Link to={staffWorkspacePath} className="bms-btn-mint-cta">
                Bàn Làm Việc
              </Link>
              <div className="bms-user-profile-tile">
                <div className="bms-avatar-circle bms-avatar-staff">{initial}</div>
                <div className="bms-user-text">
                  <span className="bms-user-fullname">{patientName}</span>
                  <span className="bms-user-sub">{staffRoleName}</span>
                </div>
              </div>
              <button
                type="button"
                className="bms-btn-ghost-danger"
                onClick={handleLogout}
              >
                Đăng Xuất
              </button>
            </div>
          ) : (
            <div className="bms-guest-actions">
              <Link className="bms-btn-mint-cta" to="/appointments/book">
                Đặt Lịch Lấy Mẫu
              </Link>
              <Link className="bms-btn-blue-cta" to="/login">
                Đăng Nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
