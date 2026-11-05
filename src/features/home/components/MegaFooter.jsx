import React from 'react';
import { 
  FaPhoneAlt, 
  FaEnvelope, 
  FaMapMarkerAlt, 
  FaClock, 
  FaShieldAlt, 
  FaVial, 
  FaCalendarCheck, 
  FaCreditCard, 
  FaHeartbeat 
} from 'react-icons/fa';

/**
 * MegaFooter Component - Conforms 100% to native BMS app.css design system
 * Features: 4 Columns (Legal BYT/ISO, Facilities, Services & Tracking, 24/7 Hotline).
 */
export default function MegaFooter() {
  return (
    <footer className="bms-footer">
      <div className="bms-container">
        <div className="bms-footer-grid">
          
          {/* Column 1: Brand & MOH License */}
          <div className="bms-footer-col">
            <h4 style={{ color: '#ffffff', fontSize: 16, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/bmsicon.ico" alt="BMS" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
              <span>BMS CLINICAL LABORATORY</span>
            </h4>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>
              Hệ thống phòng xét nghiệm y khoa tự động hóa đạt tiêu chuẩn quốc tế <strong>ISO 15189:2022</strong>. Chuyên sâu huyết học, sinh hóa, miễn dịch và sàng lọc sớm với độ chính xác và tin cậy cao nhất.
            </p>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #1e293b' }}>
              <div style={{ marginBottom: 6, fontSize: 12 }}>
                <span className="bms-topbar-badge me-2" style={{ background: '#1e3a8a', color: '#93c5fd', padding: '2px 8px', borderRadius: 4 }}>
                  GIẤY PHÉP BYT
                </span>
                <span style={{ color: '#cbd5e1' }}>Số <strong>08892/BYT-GPHĐ</strong></span>
              </div>
              <div style={{ fontSize: 12 }}>
                <span className="bms-topbar-badge me-2" style={{ background: '#065f46', color: '#6ee7b7', padding: '2px 8px', borderRadius: 4 }}>
                  ISO 15189:2022
                </span>
                <span style={{ color: '#cbd5e1' }}>Mã hiệu công nhận VILAS Med 124</span>
              </div>
            </div>
          </div>

          {/* Column 2: Facilities */}
          <div className="bms-footer-col">
            <h4>CƠ SỞ &amp; TIẾP NHẬN</h4>
            <ul className="bms-footer-links" style={{ fontSize: 13 }}>
              <li style={{ marginBottom: 12 }}>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>Cơ sở 1 (Trung tâm xét nghiệm):</div>
                <div style={{ color: '#94a3b8' }}>120 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh</div>
              </li>
              <li style={{ marginBottom: 12 }}>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>Cơ sở 2 (Khu Lab Tự Động):</div>
                <div style={{ color: '#94a3b8' }}>Đường D1, Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh</div>
              </li>
              <li>
                <div style={{ color: '#ffffff', fontWeight: 600 }}>Giờ nhận mẫu:</div>
                <div style={{ color: '#38bdf8' }}>06:00 – 20:30 (Thứ 2 – Chủ Nhật, kể cả Lễ &amp; Tết)</div>
              </li>
            </ul>
          </div>

          {/* Column 3: Services & Lookup */}
          <div className="bms-footer-col">
            <h4>DỊCH VỤ &amp; TRA CỨU</h4>
            <ul className="bms-footer-links" style={{ fontSize: 13 }}>
              <li><a href="/services"><FaVial className="me-2 text-primary" /> Gói xét nghiệm niêm yết</a></li>
              <li><a href="/tracking"><FaShieldAlt className="me-2 text-success" /> Tra cứu tiến trình &amp; kết quả 2-in-1</a></li>
              <li><a href="/appointments/book"><FaCalendarCheck className="me-2 text-primary" /> Đặt lịch lấy mẫu tại nhà</a></li>
              <li><a href="/catalog"><FaCreditCard className="me-2 text-primary" /> Bảng giá &amp; Chính sách BHYT</a></li>
              <li><a href="/feedback"><FaHeartbeat className="me-2 text-danger" /> Đánh giá &amp; Góp ý y tế</a></li>
            </ul>
          </div>

          {/* Column 4: Hotline & Support */}
          <div className="bms-footer-col">
            <h4>TỔNG ĐÀI HỖ TRỢ 24/7</h4>
            <div style={{ background: '#1e293b', padding: '14px 16px', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Hotline Đặt Lịch &amp; Kết Quả:</div>
              <a href="tel:19006868" style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FaPhoneAlt style={{ fontSize: 16 }} /> 1900 6868
              </a>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Cước phí: 1.000đ/phút</div>
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 6px' }}>
              Cấp cứu mẫu STAT: <strong style={{ color: '#ffffff' }}>(028) 3822 5555</strong>
            </p>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              Email CSKH: <strong style={{ color: '#cbd5e1' }}>cskh@bmsmedlab.vn</strong>
            </p>
          </div>

        </div>

        {/* Bottom Legal Disclaimer */}
        <div className="bms-footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} BMS Clinical Laboratory. Tiêu chuẩn ISO 15189:2022 &amp; Nghị định 13/2023/NĐ-CP bảo mật dữ liệu y tế.
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="/catalog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Điều khoản dịch vụ</a>
            <span style={{ color: '#475569' }}>•</span>
            <a href="/catalog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Chính sách bảo mật EMR</a>
            <span style={{ color: '#475569' }}>•</span>
            <a href="/catalog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Chính sách chi trả BHYT</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
