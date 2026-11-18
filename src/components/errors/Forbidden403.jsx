/**
 * @file Forbidden403.jsx
 * @description Clinical 403 Access Denied screen for RBAC authorization protection.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaSignOutAlt, FaTachometerAlt, FaLock } from 'react-icons/fa';
import { ROLES, resolveRoleId, getStoredUser } from '../../constants/roles';

export default function Forbidden403({ requiredRole, userRole }) {
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const isPatient = useMemo(() => resolveRoleId(user) === ROLES.PATIENT, [user]);

  const handleLogout = () => {
    localStorage.removeItem('bms_token');
    localStorage.removeItem('bms_access_token');
    localStorage.removeItem('bms_refresh_token');
    localStorage.removeItem('bms_user');
    sessionStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border rounded-4 text-center p-4 p-md-5 shadow-none" style={{ maxWidth: 560, borderColor: '#EAEEF4' }}>
        <div className="d-inline-flex p-3 rounded-circle bg-danger-subtle text-danger mb-4 mx-auto" style={{ width: 80, height: 80, fontSize: 36, alignItems: 'center', justifyContent: 'center' }}>
          <FaLock />
        </div>

        <h2 className="fw-bold text-dark mb-2">Truy Cập Bị Từ Chối (403)</h2>
        <p className="text-muted mb-4">
          Tài khoản của bạn hiện không có quyền truy cập vào chức năng này theo quy định phân quyền nội bộ.
        </p>

        {userRole && (
          <div className="p-3 bg-light border rounded-3 mb-4 text-start">
            <div className="small text-muted mb-1">Thông tin phiên làm việc:</div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-dark">Vai trò hiện tại:</span>
              <span className="badge bg-secondary-subtle text-secondary rounded-pill px-3 py-1.5 text-uppercase">{userRole}</span>
            </div>
          </div>
        )}

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          {isPatient ? (
            <Link to="/home" className="btn btn-primary rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2">
              <FaHome />
              <span>Về Trang Chủ Bệnh Nhân</span>
            </Link>
          ) : (
            <Link to="/dashboard" className="btn btn-primary rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2">
              <FaTachometerAlt />
              <span>Về Bảng Điều Khiển</span>
            </Link>
          )}
          <Link to="/" className="btn btn-outline-secondary rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaHome />
            <span>Cổng Thông Tin</span>
          </Link>
          <button onClick={handleLogout} className="btn btn-outline-danger rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaSignOutAlt />
            <span>Đổi Tài Khoản</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-top text-muted small">
          Hệ Thống Quản Lý Xét Nghiệm Máu BMS
        </div>
      </div>
    </div>
  );
}
