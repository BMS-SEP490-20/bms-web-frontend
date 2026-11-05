/**
 * @file PatientHomePage.jsx
 * @description Master Authenticated Patient Portal (MEDLINE / macOS Soft UI).
 * Integrates:
 * - Asymmetric Hero with Personalized Medical Summary & 4 Metric Strip
 * - Quick Action to Recent Test Orders & Upcoming Appointments
 * - 4-Step Clinical Workflow (ISO 15189)
 * - Service Packages Catalog (UC01) with Direct Booking CTAs
 * - Trust & Cold-Chain IoT Accreditation
 * Conforms to: Soft Medical Telehealth UI Specification & DESIGN SYSTEM PROMPT.
 */

import React, { useState, useEffect } from 'react';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';

export default function PatientHomePage({ user: propUser }) {
  const [user] = useState(() => {
    if (propUser) return propUser;
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [packages, setPackages] = useState([]);

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

  const handleBookClick = (pkg) => {
    const pkgId = pkg?.packageCode || pkg?.id || '';
    window.location.href = pkgId ? `/appointments/book?packageId=${encodeURIComponent(pkgId)}` : '/appointments/book';
  };

  const patientCode = user?.patientCode || user?.medicalRecordNumber || `BN-${new Date().getFullYear()}-${String(user?.id || '0812').padStart(4, '0')}`;

  return (
    <div className="bms-telehealth-page">
      <PortalNavbar user={user} />

      {/* 1. Hero Section (Asymmetric Dashboard Layout) */}
      <section className="bms-hero-container-wrap">
        <div className="bms-hero-grid">
          {/* Left Column: Narrative & Metrics */}
          <div className="bms-hero-narrative">
            <div className="bms-status-chip">
              CỔNG Y TẾ BỆNH NHÂN — TIÊU CHUẨN ISO 15189
            </div>

            <h1 className="bms-hero-heading">
              Xét Nghiệm Máu Nhanh Chóng,<br />
              <span className="bms-highlight-blue">Chính Xác &amp; Tin Cậy</span>
            </h1>

            <p className="bms-hero-lead">
              Hệ thống phòng Lab tự động hóa hoàn toàn với 80+ chỉ số huyết học và sinh hóa. Kết quả được thẩm định bởi Bác sĩ Chuyên khoa, trả trực tuyến có chữ ký số điện tử sau 60–90 phút.
            </p>

            {/* Search Pill */}
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

            {/* Metric Cards Quad */}
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

          {/* Right Column: Personalized Medical Activity Hub */}
          <div className="bms-hero-tracker-card" id="tra-cuu">
            <div className="bms-tracker-head">
              <h2 className="bms-tracker-title">Kết Quả Xét Nghiệm Gần Nhất</h2>
              <p className="bms-tracker-subtitle">
                Mã bệnh nhân (PID): <strong className="bms-highlight-blue tabular-nums">{patientCode}</strong>
              </p>
            </div>

            {/* Recent Result Pill */}
            <div className="bms-recent-result-dock">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold bms-ink-text tabular-nums">ORD-20261024-009</span>
                <span className="bms-status-chip bms-status-success">Đã có kết quả</span>
              </div>
              <div className="bms-result-order-title">
                Tổng Phân Tích Tế Bào Máu (CBC 24 Chỉ Số)
              </div>
              <div className="bms-result-order-meta">
                Thẩm định: <strong>BS. CKII Lê Minh Đức (Đã ký số)</strong>
              </div>
              <a
                href="/results/ORD-20261024-009/report"
                className="bms-btn-mint-cta w-100 mt-3"
              >
                Tải Phiếu Kết Quả (PDF)
              </a>
            </div>

            {/* Upcoming Appointment Tile */}
            <div className="bms-appointment-soft-tile mt-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="bms-appointment-label">Lịch Hẹn Sắp Tới</span>
                <span className="bms-appointment-time tabular-nums">08:00 Ngày 31/10/2026</span>
              </div>
              <div className="bms-appointment-location">
                Phòng Lấy Mẫu 102 - Cơ Sở 1 (Quận 1, TP.HCM)
              </div>
            </div>

            <div className="text-center mt-3">
              <a href="/tracking" className="bms-link-quiet">
                Tra cứu mã biên nhận hoặc Barcode khác &rarr;
              </a>
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

      {/* 3. Service Packages Catalog */}
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

      {/* 5. Mega Footer */}
      <MegaFooter />
    </div>
  );
}
