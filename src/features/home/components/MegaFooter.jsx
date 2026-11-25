import React from 'react';
import { Link } from 'react-router-dom';
import './MegaFooter.css';

/**
 * MegaFooter - clean soft-healthcare footer with real navigation links only.
 */
export default function MegaFooter() {
  return (
    <footer className="bms-ft">
      <div className="bms-ft-inner">
        <div className="bms-ft-grid">
          <div>
            <img src="/assets/bms-logo.png" alt="BMS Clinical Laboratory" className="bms-ft-brand-logo" />
            <p className="bms-ft-about">
              Hệ thống quản lý phòng xét nghiệm máu BMS — hỗ trợ đặt lịch khám, theo dõi tiến trình mẫu và tra cứu kết quả trực tuyến.
            </p>
          </div>

          <div>
            <h4 className="bms-ft-title">Dịch vụ</h4>
            <ul className="bms-ft-list">
              <li><Link to="/services">Gói xét nghiệm</Link></li>
              <li><Link to="/pricing">Bảng giá dịch vụ</Link></li>
              <li><Link to="/tracking">Tiến trình &amp; kết quả</Link></li>
              <li><Link to="/appointments/book">Đặt lịch lấy mẫu</Link></li>
              <li><Link to="/iso-process">Quy trình xét nghiệm</Link></li>
              <li><Link to="/feedback">Đánh giá dịch vụ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="bms-ft-title">Tiếp nhận mẫu</h4>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Giờ tiếp đón</div>
              <div className="bms-ft-text">07:00 – 20:30 hàng ngày</div>
            </div>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Tra cứu trực tuyến</div>
              <div className="bms-ft-text">Hỗ trợ tra cứu mã lịch hẹn &amp; kết quả 24/7</div>
            </div>
          </div>

          <div>
            <h4 className="bms-ft-title">Liên hệ hỗ trợ</h4>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Tổng đài hỗ trợ</div>
              <a href="tel:19006868" className="bms-ft-phone">1900 6868</a>
            </div>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Email CSKH</div>
              <div className="bms-ft-text">cskh@bmsmedlab.vn</div>
            </div>
          </div>
        </div>

        <div className="bms-ft-bottom">
          <div>
            &copy; {new Date().getFullYear()} BMS Clinical Laboratory.
          </div>
          <div className="bms-ft-bottom-links">
            <Link to="/terms">Điều khoản dịch vụ</Link>
            <Link to="/privacy">Chính sách bảo mật</Link>
            <Link to="/insurance-policy">Chính sách BHYT</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
