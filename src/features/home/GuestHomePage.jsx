/**
 * @file GuestHomePage.jsx
 * @description Master Public Patient & Visitor Landing Portal (MEDLINE / macOS Soft UI).
 * Integrates:
 * - Asymmetric Hero with Fast Tracker & 4 Metric Strip
 * - 4-Step Clinical Workflow (ISO 15189)
 * - Service Packages Catalog (UC01) with Mint-Green Positive CTAs
 * - Trust & Cold-Chain IoT Accreditation
 * Conforms to: Soft Medical Telehealth UI Specification & DESIGN SYSTEM PROMPT.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';

export default function GuestHomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [lookupCode, setLookupCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [packages, setPackages] = useState([]);
  const [showRequireLoginModal, setShowRequireLoginModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    fetchServiceCatalog()
      .then(res => {
        if (res?.packages?.length) {
          setPackages(res.packages.slice(0, 4));
        }
      })
      .catch(() => {
        setPackages([
          {
            id: 'PKG-CBC',
            packageName: 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)',
            description: 'Phát hiện sớm thiếu máu, nhiễm trùng, bệnh lý tủy xương và tiểu cầu.',
            price: 180000,
            category: 'Huyết học'
          },
          {
            id: 'PKG-LIVER',
            packageName: 'Tầm soát Viêm gan B & C (HBsAg, Anti-HBs, Anti-HCV)',
            description: 'Sàng lọc nhiễm virus viêm gan B và C mạn tính, đánh giá kháng thể.',
            price: 320000,
            category: 'Gan mật'
          },
          {
            id: 'PKG-LIPID',
            packageName: 'Bộ mỡ máu toàn phần (Cholesterol, Triglyceride, HDL, LDL)',
            description: 'Đánh giá nguy cơ xơ vữa động mạch và bệnh lý mạch vành.',
            price: 200000,
            category: 'Tim mạch'
          },
          {
            id: 'PKG-DIABETES',
            packageName: 'Gói Tầm Soát Đái Tháo Đường Chuyên Sâu',
            description: 'Theo dõi chỉ số Glucose huyết tương và HbA1c đánh giá kiểm soát đường huyết.',
            price: 380000,
            category: 'Tiểu đường'
          }
        ]);
      });
  }, []);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    const code = lookupCode.trim();
    if (!code) return;
    window.location.href = `/tracking?code=${encodeURIComponent(code)}${lookupPhone ? `&phone=${encodeURIComponent(lookupPhone.trim())}` : ''}`;
  };

  const handleBookClick = (pkg) => {
    setSelectedPackage(pkg);
    setShowRequireLoginModal(true);
  };

  return (
    <div className="bms-telehealth-page">
      <PortalNavbar user={null} />

      {/* 1. Hero Section (Asymmetric Dashboard Layout) */}
      <section className="bms-hero-container-wrap">
        <div className="bms-hero-grid">
          {/* Left Column: Hero Narrative & Metrics */}
          <div className="bms-hero-narrative">
            <div className="bms-status-chip d-flex align-items-center gap-2">
              <img src="/bmsicon.ico" alt="BMS" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
              <span>TIÊU CHUẨN ISO 15189 &amp; CHỨNG NHẬN CAP</span>
            </div>

            <h1 className="bms-hero-heading">
              Xét Nghiệm Máu Nhanh Chóng,<br />
              <span className="bms-highlight-blue">Chính Xác &amp; Tin Cậy</span>
            </h1>

            <p className="bms-hero-lead">
              Hệ thống phòng Lab tự động hóa hoàn toàn với 80+ chỉ số huyết học và sinh hóa. Kết quả được thẩm định bởi Bác sĩ Chuyên khoa, trả trực tuyến có chữ ký số điện tử sau 60–90 phút.
            </p>

            {/* Centered Search Pill */}
            <form
              className="bms-search-pill-capsule"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/services?search=${encodeURIComponent(searchTerm)}`;
              }}
            >
              <input
                type="text"
                className="bms-search-input-field"
                placeholder="Tìm gói xét nghiệm theo tên, triệu chứng..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="bms-btn-pill-primary">
                Tìm Kiếm
              </button>
            </form>

            {/* Metric Cards Trio / Quad */}
            <div className="bms-metric-quad">
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number tabular-nums">500,000+</div>
                <div className="bms-metric-label">Lượt xét nghiệm an toàn</div>
              </div>
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number tabular-nums">99.98%</div>
                <div className="bms-metric-label">Độ chính xác chuẩn QC</div>
              </div>
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number tabular-nums">60 – 90</div>
                <div className="bms-metric-label">Phút trả kết quả SLA</div>
              </div>
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number tabular-nums">100%</div>
                <div className="bms-metric-label">Chuỗi lạnh IoT 2-6°C</div>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Utility Card (Fast Tracker) */}
          <div className="bms-hero-tracker-card" id="tra-cuu">
            <div className="bms-tracker-head">
              <h2 className="bms-tracker-title">Tra Cứu Kết Quả Điện Tử</h2>
              <p className="bms-tracker-subtitle">
                Dành cho bệnh nhân đã lấy mẫu tại trung tâm hoặc tại nhà
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="bms-tracker-form">
              <div className="bms-form-field">
                <label className="bms-field-label">Mã phiếu hẹn / Barcode mẫu *</label>
                <input
                  type="text"
                  className="bms-input-soft"
                  required
                  placeholder="Ví dụ: ORD-2026-0881"
                  value={lookupCode}
                  onChange={e => setLookupCode(e.target.value)}
                />
              </div>

              <div className="bms-form-field">
                <label className="bms-field-label">Số điện thoại đăng ký *</label>
                <input
                  type="tel"
                  className="bms-input-soft"
                  required
                  placeholder="Ví dụ: 0912 345 678"
                  value={lookupPhone}
                  onChange={e => setLookupPhone(e.target.value)}
                />
              </div>

              <button type="submit" className="bms-btn-blue-cta w-100 mt-2">
                Tra Cứu Ngay
              </button>
            </form>

            <div className="bms-tracker-footer-note">
              <span>Phiếu kết quả có chữ ký số SHA-256 của Bác sĩ Chuyên khoa</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Clinical Workflow Section (4 Soft Steps) */}
      <section className="bms-section-wrap" id="quy-trinh">
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">QUY TRÌNH TINH GỌN &amp; AN TOÀN</div>
            <h2 className="bms-section-h2">Xét Nghiệm Máu Dễ Dàng Chỉ Với 4 Bước</h2>
            <p className="bms-section-p">
              Toàn bộ tiến trình từ lúc đặt lịch đến khi nhận phiếu kết quả được chuẩn hóa theo quy chuẩn y tế ISO 15189:2022.
            </p>
          </div>

          <div className="bms-steps-quad">
            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums">01</div>
              <h3 className="bms-step-h3">Đăng Ký Trực Tuyến</h3>
              <p className="bms-step-desc">
                Chọn gói khám và thời gian thuận tiện. Lựa chọn lấy mẫu tại trung tâm BMS hoặc dịch vụ lấy mẫu tại nhà.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums">02</div>
              <h3 className="bms-step-h3">Lấy Mẫu Vô Trùng</h3>
              <p className="bms-step-desc">
                Điều dưỡng thực hiện lấy mẫu nhẹ nhàng, mã hóa Barcode một chiều và đưa ngay vào chuỗi lạnh bảo quản 2-6°C.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums">03</div>
              <h3 className="bms-step-h3">Phân Tích Tự Động</h3>
              <p className="bms-step-desc">
                Mẫu được chạy trên hệ thống máy phân tích tự động thế hệ mới, kiểm soát chất lượng nội kiểm Westgard.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums">04</div>
              <h3 className="bms-step-h3">Nhận Kết Quả Ký Số</h3>
              <p className="bms-step-desc">
                Bác sĩ Chuyên khoa thẩm định &amp; ký số. Xem trực tuyến và tải PDF có giá trị pháp lý toàn quốc.
              </p>
            </div>
          </div>

          <div className="text-center mt-4">
            <Link to="/iso-process" className="bms-btn-neutral-pill">
              Khám Phá Chi Tiết Quy Trình ISO 15189:2022 &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Service Packages Catalog (Floating 28px Cards) */}
      <section className="bms-section-wrap">
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h2 className="bms-section-h2">Gói Xét Nghiệm Máu Tiêu Biểu</h2>
            <p className="bms-section-p">
              Bảng giá niêm yết công khai, minh bạch, hỗ trợ chiết tính BHYT tự động theo quy định Bộ Y Tế.
            </p>
          </div>

          <div className="bms-packages-quad">
            {packages.map((pkg, idx) => (
              <div key={pkg.id || idx} className={`bms-package-soft-card ${idx === 0 ? 'promoted' : ''}`}>
                <div className="bms-package-category-chip">{pkg.category || 'Huyết học'}</div>
                <h3 className="bms-pkg-title">{pkg.packageName}</h3>
                <p className="bms-pkg-desc">{pkg.description || 'Xét nghiệm đạt chuẩn y tế ISO 15189.'}</p>
                <div className="bms-pkg-price-row">
                  <span className="bms-price-number tabular-nums">
                    {new Intl.NumberFormat('vi-VN').format(pkg.price || 0)}
                  </span>
                  <span className="bms-price-currency">VNĐ</span>
                </div>
                <button
                  type="button"
                  className="bms-btn-mint-cta w-100 mt-auto"
                  onClick={() => handleBookClick(pkg)}
                >
                  Đặt Lịch Xét Nghiệm
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-5 d-flex justify-content-center flex-wrap gap-3">
            <Link to="/services" className="bms-btn-blue-cta">
              Xem Toàn Bộ Gói Xét Nghiệm &rarr;
            </Link>
            <Link to="/pricing" className="bms-btn-neutral-pill">
              Tra Cứu Bảng Giá Niêm Yết &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Quality & Trust Pillars */}
      <section className="bms-section-wrap">
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">TIÊU CHUẨN QUỐC TẾ</div>
            <h2 className="bms-section-h2">An Toàn Sinh Học &amp; Kiểm Soát Chất Lượng</h2>
          </div>

          <div className="bms-trust-trio">
            <div className="bms-trust-soft-card">
              <h3 className="bms-trust-h3">Chuỗi Lạnh IoT Bảo Quản Mẫu 2-6°C</h3>
              <p className="bms-trust-p">
                Cảm biến IoT giám sát nhiệt độ và độ ẩm liên tục trong suốt hành trình vận chuyển mẫu, phát hiện và cảnh báo vi phạm ngay lập tức.
              </p>
            </div>

            <div className="bms-trust-soft-card">
              <h3 className="bms-trust-h3">Chữ Ký Số Y Tế &amp; Mã QR Xác Thực</h3>
              <p className="bms-trust-p">
                Phiếu kết quả điện tử được cấp dấu thời gian và chữ ký số Bác sĩ chuyên khoa, có giá trị pháp lý tương đương bản giấy.
              </p>
            </div>

            <div className="bms-trust-soft-card">
              <h3 className="bms-trust-h3">Lấy Mẫu Tận Nơi Tiện Lợi</h3>
              <p className="bms-trust-p">
                Đội ngũ điều dưỡng đến tận nhà đúng giờ hẹn, thao tác vô trùng chuẩn mực, tiết kiệm thời gian chờ đợi cho người già và trẻ nhỏ.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modal: Patient Login Requirement Notice */}
      {showRequireLoginModal && (
        <div className="bms-modal-backdrop" onClick={() => setShowRequireLoginModal(false)}>
          <div className="bms-modal-card bms-modal-card-sm" onClick={e => e.stopPropagation()}>
            <div className="bms-modal-head">
              <h3 className="bms-modal-title">Yêu Cầu Đăng Nhập</h3>
              <button
                type="button"
                className="bms-modal-close"
                onClick={() => setShowRequireLoginModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="bms-modal-body text-center py-3">
              <p className="small text-muted mb-4">
                Tuân thủ quy chuẩn bảo mật hồ sơ bệnh án ISO 15189, quý khách vui lòng đăng nhập tài khoản bệnh nhân để tiếp tục đặt lịch.
              </p>
              <a
                className="bms-btn-blue-cta w-100 mb-2 text-center"
                href={`/login?redirect=booking&pkg=${encodeURIComponent(selectedPackage?.packageName || "")}`}
              >
                Đăng Nhập Cổng Y Tế
              </a>
              <a className="bms-btn-neutral-pill w-100 text-center" href="/register">
                Tạo Hồ Sơ Mới
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 5. Mega Footer */}
      <MegaFooter />
    </div>
  );
}
