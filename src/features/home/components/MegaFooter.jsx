import React from 'react';
import { Link } from 'react-router-dom';
import './MegaFooter.css';

/**
 * MegaFooter - flat soft-healthcare footer.
 * Light surface, zero borders, zero icons; hierarchy is built from typography and whitespace only.
 */
export default function MegaFooter() {
  return (
    <footer className="bms-ft">
      <div className="bms-ft-inner">
        <div className="bms-ft-grid">
          {/* Brand & accreditation */}
          <div>
            <img src="/assets/bms-logo.png" alt="BMS Clinical Laboratory" className="bms-ft-brand-logo" />
            <p className="bms-ft-about">
              Hệ thống phòng xét nghiệm y khoa tự động hóa đạt tiêu chuẩn quốc tế ISO 15189:2022. Chuyên sâu huyết học,
              sinh hóa, miễn dịch và sàng lọc sớm với độ chính xác và tin cậy cao.
            </p>
            <div className="bms-ft-license">
              <div className="bms-ft-license-row">
                <span className="bms-ft-license-key">Giấy phép</span>
                <span className="bms-ft-license-val">08892/BYT-GPHĐ</span>
              </div>
              <div className="bms-ft-license-row">
                <span className="bms-ft-license-key">Chứng nhận</span>
                <span className="bms-ft-license-val">ISO 15189:2022 · VILAS Med 124</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="bms-ft-title">Dịch vụ</h4>
            <ul className="bms-ft-list">
              <li><Link to="/services">Gói xét nghiệm</Link></li>
              <li><Link to="/pricing">Bảng giá niêm yết</Link></li>
              <li><Link to="/tracking">Tiến trình &amp; kết quả</Link></li>
              <li><Link to="/appointments/book">Đặt lịch lấy mẫu</Link></li>
              <li><Link to="/iso-process">Quy trình ISO</Link></li>
            </ul>
          </div>

          {/* Facilities */}
          <div>
            <h4 className="bms-ft-title">Cơ sở tiếp nhận</h4>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Cơ sở 1 · Trung tâm xét nghiệm</div>
              <div className="bms-ft-text">120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh</div>
            </div>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Cơ sở 2 · Khu Lab tự động</div>
              <div className="bms-ft-text">Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</div>
            </div>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Giờ nhận mẫu</div>
              <div className="bms-ft-text">06:00 – 20:30, cả tuần kể cả lễ &amp; Tết</div>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="bms-ft-title">Hỗ trợ 24/7</h4>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Hotline đặt lịch &amp; kết quả</div>
              <a href="tel:19006868" className="bms-ft-phone">1900 6868</a>
            </div>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Cấp cứu mẫu STAT</div>
              <div className="bms-ft-text">(028) 3822 5555</div>
            </div>
            <div className="bms-ft-block">
              <div className="bms-ft-label">Email CSKH</div>
              <div className="bms-ft-text">cskh@bmsmedlab.vn</div>
            </div>
          </div>
        </div>

        <div className="bms-ft-bottom">
          <div>
            &copy; {new Date().getFullYear()} BMS Clinical Laboratory. ISO 15189:2022 &amp; Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
          </div>
          <div className="bms-ft-bottom-links">
            <Link to="/terms">Điều khoản dịch vụ</Link>
            <Link to="/privacy">Chính sách bảo mật</Link>
            <Link to="/insurance-policy">Chính sách chi trả BHYT</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
