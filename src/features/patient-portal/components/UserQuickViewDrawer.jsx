/**
 * @file UserQuickViewDrawer.jsx
 * @description Slide-in drawer component for quick user account inspection (UC08).
 * Triggered from top navigation avatar; displays summarized profile, role badges, and quick links.
 * Conforms to: AGENTS-DESIGN.md.
 * @module features/patient-portal/components/UserQuickViewDrawer
 */

import React from 'react';
import './UserQuickViewDrawer.css';

/**
 * Slide-in quick view drawer displaying summarized active session data and profile shortcuts.
 *
 * @param {object} props - Component properties.
 * @param {boolean} props.isOpen - Whether the drawer is visible.
 * @param {object|null} props.user - Active user profile payload.
 * @param {Function} props.onClose - Callback to dismiss the drawer.
 * @param {Function} [props.onNavigate] - Callback for internal navigation actions.
 * @returns {JSX.Element|null} Rendered drawer or null when closed.
 */
export default function UserQuickViewDrawer({ isOpen, user, onClose, onNavigate }) {
  if (!isOpen || !user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(-2)
        .join('')
        .toUpperCase()
    : 'US';

  return (
    <div className="bms-drawer-backdrop" onClick={onClose}>
      <div className="bms-drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="bms-drawer-header">
          <h3 className="bms-drawer-title">Tài Khoản Người Dùng</h3>
          <button
            type="button"
            className="bms-drawer-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="bms-drawer-body">
          <div className="bms-drawer-profile-card">
            <div className="bms-drawer-avatar">{initials}</div>
            <h4 className="bms-drawer-name">{user.fullName || 'Người dùng BMS'}</h4>
            <div className="bms-drawer-email">{user.email || 'N/A'}</div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="bms-role-badge" style={{ fontSize: '11px', padding: '3px 8px' }}>
                {user.roleName || 'Bệnh Nhân'}
              </span>
              <span
                className="bms-status-badge active"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                <span className="bms-pulse-dot" />
                {user.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
              </span>
            </div>
          </div>

          <div className="bms-drawer-shortcuts">
            <div
              className="bms-drawer-item"
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('/profile');
              }}
            >
              <span>&#128100; Xem Hồ Sơ Chi Tiết</span>
              <span>&rarr;</span>
            </div>

            <div
              className="bms-drawer-item"
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('/change-password');
              }}
            >
              <span>&#128273; Đổi Mật Khẩu Bảo Mật</span>
              <span>&rarr;</span>
            </div>

            <div
              className="bms-drawer-item"
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('/criteria');
              }}
            >
              <span>&#129514; Danh Mục Chỉ Số Xét Nghiệm</span>
              <span>&rarr;</span>
            </div>

            <div
              className="bms-drawer-item"
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('/roles');
              }}
            >
              <span>&#128274; Quản Trị Phân Quyền Vai Trò</span>
              <span>&rarr;</span>
            </div>

            <div
              className="bms-drawer-item danger"
              style={{ marginTop: '12px' }}
              onClick={() => {
                onClose();
                alert('Đăng xuất thành công khỏi hệ thống BMS.');
              }}
            >
              <span style={{ color: '#dc2626' }}>&#128682; Đăng Xuất An Toàn</span>
              <span>&rarr;</span>
            </div>
          </div>
        </div>

        <div className="bms-drawer-footer">
          Hệ thống Quản lý Phòng Xét nghiệm Máu BMS &bull; v1.0.0
        </div>
      </div>
    </div>
  );
}
