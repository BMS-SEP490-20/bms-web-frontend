/**
 * @file NotFound404.jsx
 * @description Clinical 404 Page Not Found screen.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Calendar } from 'lucide-react';

export default function NotFound404() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card border rounded-4 text-center p-4 p-md-5 shadow-none" style={{ maxWidth: 520, borderColor: '#EAEEF4' }}>
        <div className="d-inline-flex p-2 rounded-3 bg-white border mb-4 mx-auto" style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <h1 className="display-4 fw-bold text-dark mb-1">404</h1>
        <h3 className="fw-bold text-secondary mb-3">Không Tìm Thấy Trang</h3>
        <p className="text-muted mb-4">
          Đường dẫn bạn tìm kiếm không tồn tại hoặc đã được chuyển sang địa chỉ khác.
        </p>

        <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
          <Link to="/" className="btn btn-primary rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <Home  size="1em"/>
            <span>Về Trang Chủ BMS</span>
          </Link>
          <Link to="/services" className="btn btn-outline-secondary rounded-pill px-4 py-2 d-flex align-items-center justify-content-center gap-2">
            <Calendar  size="1em"/>
            <span>Danh Mục Xét Nghiệm</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
