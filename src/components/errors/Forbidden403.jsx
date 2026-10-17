/**
 * @file Forbidden403.jsx
 * @description Clinical 403 Access Denied screen for RBAC authorization protection.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaHome, FaSignOutAlt, FaTachometerAlt } from 'react-icons/fa';

export default function Forbidden403({ requiredRole, userRole }) {
  const navigate = useNavigate();

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
      <div className="card shadow-lg border-0 rounded-4 text-center p-4 p-md-5" style={{ maxWidth: 580 }}>
        <div className="d-inline-flex p-3 rounded-circle bg-danger-subtle text-danger mb-4 mx-auto" style={{ width: 88, height: 88, fontSize: 44, alignItems: 'center', justifyContent: 'center' }}>
          <FaShieldAlt />
        </div>

        <h2 className="fw-bold text-dark mb-2">Truy Cập Bị Từ Chối (403 Forbidden)</h2>
        <p className="text-muted mb-4">
          Phân hệ hoặc chức năng này chỉ dành cho nhân sự y tế có thẩm quyền. Tài khoản của bạn hiện không có quyền truy cập vào đường dẫn này theo quy định phân quyền <strong>BR-IAM-02</strong>.
        </p>

        {userRole && (
          <div className="p-3 bg-light border rounded-3 mb-4 text-start">
            <div className="small text-muted mb-1">Thông tin phiên làm việc:</div>
            <div className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold text-dark">Vai trò hiện tại:</span>
              <span className="badge bg-secondary px-3 py-2 text-uppercase">{userRole}</span>
            </div>
          </div>
        )}

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <Link to="/dashboard" className="btn btn-primary px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaTachometerAlt />
            <span>Về Bảng Điều Khiển</span>
          </Link>
          <Link to="/" className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaHome />
            <span>Về Trang Chủ</span>
          </Link>
          <button onClick={handleLogout} className="btn btn-outline-danger px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaSignOutAlt />
            <span>Đổi Tài Khoản</span>
          </button>
        </div>

        <div className="mt-4 pt-3 border-top text-muted small">
          Hệ Thống Quản Lý Xét Nghiệm Máu BMS • Chuẩn An Ninh Dữ Liệu Y Tế
        </div>
      </div>
    </div>
  );
}
