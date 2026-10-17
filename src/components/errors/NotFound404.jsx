/**
 * @file NotFound404.jsx
 * @description Clinical 404 Page Not Found screen.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { FaHospitalAlt, FaHome, FaTachometerAlt } from 'react-icons/fa';

export default function NotFound404() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card shadow-lg border-0 rounded-4 text-center p-4 p-md-5" style={{ maxWidth: 540 }}>
        <div className="d-inline-flex p-2 rounded-3 bg-white shadow-sm border mb-4 mx-auto" style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <h1 className="display-4 fw-bold text-dark mb-1">404</h1>
        <h3 className="fw-bold text-secondary mb-3">Không Tìm Thấy Trang</h3>
        <p className="text-muted mb-4">
          Đường dẫn y tế bạn đang tìm kiếm không tồn tại, đã được di dời hoặc tạm ngừng hoạt động trong hệ thống phòng lab BMS.
        </p>

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <Link to="/dashboard" className="btn btn-primary px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaTachometerAlt />
            <span>Về Bảng Điều Khiển</span>
          </Link>
          <Link to="/" className="btn btn-outline-secondary px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <FaHome />
            <span>Về Trang Chủ BMS</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
