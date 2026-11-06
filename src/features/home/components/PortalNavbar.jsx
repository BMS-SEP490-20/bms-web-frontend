/**
 * @file PortalNavbar.jsx
 * @description Master Centered-Pill Navigation Bar (MEDLINE / Apple macOS Grade).
 * Features:
 * - Brand logo (high-res BMS cross mark + wordmark)
 * - Centered capsule pill track with solid active segment and soft hover wash
 * - Top-right identity & CTA cluster with mint-green positive CTA and soft-blue primary actions
 * Conforms to: Soft Medical Telehealth UI Specification & DESIGN SYSTEM PROMPT.
 */

import React, { useMemo, useRef, useState, useLayoutEffect, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROLES, ROLE_LABELS, resolveRoleId, getStoredUser } from '../../../constants/roles';

// Module-level persistent cache across route transitions
let lastKnownPillPos = { left: 0, width: 0, initialized: false };

export default function PortalNavbar({ user: propUser = null }) {
  const location = useLocation();
  const trackRef = useRef(null);
  const [sliderStyle, setSliderStyle] = useState(() => ({
    left: lastKnownPillPos.left,
    width: lastKnownPillPos.width,
    opacity: lastKnownPillPos.initialized ? 1 : 0,
    animate: lastKnownPillPos.initialized
  }));

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

  // Quantum slider position calculation with persistent start position
  useLayoutEffect(() => {
    const updateSlider = () => {
      if (!trackRef.current) return;
      const activeEl = trackRef.current.querySelector('.bms-capsule-item.active');
      if (activeEl) {
        const trackRect = trackRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        const newPos = {
          left: activeRect.left - trackRect.left,
          width: activeRect.width,
          opacity: 1,
          animate: true
        };
        lastKnownPillPos = { left: newPos.left, width: newPos.width, initialized: true };
        setSliderStyle(newPos);
      }
    };

    updateSlider();
    // Run an additional micro-delay measurement in case fonts/styles shift
    const t = setTimeout(updateSlider, 40);
    window.addEventListener('resize', updateSlider);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateSlider);
    };
  }, [currentPath, isPatient]);

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
            style={{
              height: '24px',
              maxHeight: '24px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </Link>

        {/* 2. Center: Capsule Pill Track Navigation (Quantum Smooth Glide) */}
        <nav
          className="bms-nav-capsule-track"
          ref={trackRef}
          aria-label="Main Navigation"
          style={{ position: 'relative' }}
        >
          {/* Quantum Sliding Indicator Pill */}
          <div
            className="bms-quantum-slider"
            style={{
              position: 'absolute',
              top: '5.5px',
              bottom: '5.5px',
              left: `${sliderStyle.left}px`,
              width: `${sliderStyle.width}px`,
              backgroundColor: '#1E60E6',
              borderRadius: '999px',
              transition: sliderStyle.animate
                ? 'left 0.38s cubic-bezier(0.2, 0.9, 0.2, 1), width 0.38s cubic-bezier(0.2, 0.9, 0.2, 1), opacity 0.2s ease'
                : 'opacity 0.2s ease',
              pointerEvents: 'none',
              zIndex: 1,
              opacity: sliderStyle.opacity
            }}
          />

          <Link
            className={`bms-capsule-item ${currentPath === '/' || currentPath === '/home' ? 'active' : ''}`}
            to={isPatient ? "/home" : "/"}
            style={{ position: 'relative', zIndex: 2 }}
          >
            Trang Chủ
          </Link>
          <Link
            className={`bms-capsule-item ${currentPath === '/services' || (currentPath.startsWith('/services/') && !currentPath.startsWith('/services/pricing')) ? 'active' : ''}`}
            to="/services"
            style={{ position: 'relative', zIndex: 2 }}
          >
            Gói Xét Nghiệm
          </Link>
          <Link
            className={`bms-capsule-item ${currentPath.startsWith('/tracking') || currentPath.startsWith('/patient/track-progress') ? 'active' : ''}`}
            to="/tracking"
            style={{ position: 'relative', zIndex: 2 }}
          >
            Tiến Trình &amp; Kết Quả
          </Link>

          {isPatient ? (
            <>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/appointments') ? 'active' : ''}`}
                to="/appointments"
                style={{ position: 'relative', zIndex: 2 }}
              >
                Lịch Khám Của Tôi
              </Link>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/patient/test-history') ? 'active' : ''}`}
                to="/patient/test-history"
                style={{ position: 'relative', zIndex: 2 }}
              >
                Lịch Sử Xét Nghiệm
              </Link>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/patient/payment-history') || currentPath.startsWith('/invoices') ? 'active' : ''}`}
                to="/patient/payment-history"
                style={{ position: 'relative', zIndex: 2 }}
              >
                Lịch Sử Thanh Toán
              </Link>
            </>
          ) : (
            <>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/pricing') || currentPath.startsWith('/catalog') ? 'active' : ''}`}
                to="/pricing"
                style={{ position: 'relative', zIndex: 2 }}
              >
                Bảng Giá Niêm Yết
              </Link>
              <Link
                className={`bms-capsule-item ${currentPath.startsWith('/iso-process') ? 'active' : ''}`}
                to="/iso-process"
                style={{ position: 'relative', zIndex: 2 }}
              >
                Quy Trình ISO
              </Link>
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
              <Link
                to={staffWorkspacePath}
                className="bms-btn-mint-cta"
                style={{
                  height: '32px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 650,
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  lineHeight: '1'
                }}
              >
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
              <Link
                className="bms-btn-mint-cta"
                to="/appointments/book"
                style={{
                  height: '32px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 650,
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  lineHeight: '1'
                }}
              >
                Đặt Lịch Lấy Mẫu
              </Link>
              <Link
                className="bms-btn-blue-cta"
                to="/login"
                style={{
                  height: '32px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  lineHeight: '1'
                }}
              >
                Đăng Nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
