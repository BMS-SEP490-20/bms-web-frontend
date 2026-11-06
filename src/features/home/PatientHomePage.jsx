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
import { Link } from 'react-router-dom';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';
import BmsPackageIcon from '../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../shared/components/kit/bmsIconMaps';

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
      <section className="bms-hero-container-wrap" style={{ marginBottom: '56px' }}>
        <div className="bms-hero-grid">
          {/* Left Column: Narrative & Metrics */}
          <div className="bms-hero-narrative">
            <div className="bms-status-chip">
              TIÊU CHUẨN ISO 15189 · HỆ THỐNG BMS LAB
            </div>

            <h1 className="bms-hero-heading" style={{ fontSize: '30px', lineHeight: 1.25, letterSpacing: '-0.025em' }}>
              Quản Lý Xét Nghiệm Máu<br />
              <span className="bms-highlight-blue">Chính Xác, Khép Kín &amp; Tin Cậy</span>
            </h1>

            <p className="bms-hero-lead" style={{ fontSize: '13.5px', lineHeight: '1.65', maxWidth: '520px' }}>
              Quản lý khép kín quy trình xét nghiệm từ khâu tiếp nhận chỉ định, dán mã vạch Barcode đến phân tích LIS, bác sĩ thẩm định và trả kết quả trực tuyến.
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
                <div className="bms-metric-number" style={{ fontSize: '18px' }}>Mã Vạch 1D/2D</div>
                <div className="bms-metric-label">Định danh duy nhất mẫu máu</div>
              </div>
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number" style={{ fontSize: '18px' }}>Nội Kiểm QC</div>
                <div className="bms-metric-label">Kiểm soát quy tắc Westgard</div>
              </div>
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number" style={{ fontSize: '18px' }}>Bác Sĩ Xác Nhận</div>
                <div className="bms-metric-label">Thẩm định chuyên môn y khoa</div>
              </div>
              <div className="bms-metric-soft-card">
                <div className="bms-metric-number" style={{ fontSize: '18px' }}>Chuỗi Lạnh IoT</div>
                <div className="bms-metric-label">Giám sát nhiệt độ 2-6°C</div>
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
      <section className="bms-section-wrap" id="quy-trinh" style={{ marginBottom: '56px' }}>
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
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>01</div>
              <h3 className="bms-step-h3">Đăng Ký Trực Tuyến</h3>
              <p className="bms-step-desc">
                Chọn gói khám và thời gian thuận tiện. Lựa chọn lấy mẫu tại trung tâm BMS hoặc dịch vụ lấy mẫu tại nhà.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>02</div>
              <h3 className="bms-step-h3">Lấy Mẫu Vô Trùng</h3>
              <p className="bms-step-desc">
                Điều dưỡng thực hiện lấy mẫu nhẹ nhàng, mã hóa Barcode một chiều và đưa ngay vào chuỗi lạnh bảo quản 2-6°C.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>03</div>
              <h3 className="bms-step-h3">Phân Tích Tự Động</h3>
              <p className="bms-step-desc">
                Mẫu được chạy trên hệ thống máy phân tích tự động thế hệ mới, kiểm soát chất lượng nội kiểm Westgard.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>04</div>
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
      <section className="bms-section-wrap" style={{ marginBottom: '56px' }}>
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h2 className="bms-section-h2">Gói Xét Nghiệm Máu Tiêu Biểu</h2>
            <p className="bms-section-p">
              Bảng giá niêm yết công khai, minh bạch, hỗ trợ chiết tính BHYT tự động theo quy định Bộ Y Tế.
            </p>
          </div>

          <div className="d-flex flex-column gap-3 mb-4">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '22px 28px',
                  border: 'none',
                  boxShadow: 'none',
                  transition: 'background-color 0.15s ease'
                }}
                className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-4"
              >
                {/* Left: Specialty Icon + Full-Width Content Stack (Zero Awkward Breaks) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-start gap-3">
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        marginTop: '2px'
                      }}
                    >
                      <BmsPackageIcon name={getCategoryIconKey(pkg.category)} size={42} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Row 1: Badges */}
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1.5">
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#1E60E6',
                            backgroundColor: '#EFF6FF',
                            padding: '2px 9px',
                            borderRadius: '9999px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {pkg.category || 'Huyết học'}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#475569',
                            backgroundColor: '#F1F5F9',
                            padding: '1px 7px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {pkg.packageCode || pkg.id || 'BMS'}
                        </span>
                      </div>

                      {/* Row 2: Full Package Title (No Ellipsis, Full Available Width) */}
                      <h3
                        className="mb-1.5"
                        style={{
                          fontSize: '15px',
                          fontWeight: 650,
                          color: '#0F172A',
                          letterSpacing: '-0.01em',
                          lineHeight: '1.4',
                          wordBreak: 'break-word'
                        }}
                      >
                        {pkg.packageName}
                      </h3>

                      {/* Row 3: Clinical Scope & Description */}
                      <p
                        className="mb-0 text-muted"
                        style={{
                          fontSize: '13px',
                          lineHeight: '1.6',
                          color: '#475569',
                          maxWidth: '850px'
                        }}
                      >
                        {pkg.description || 'Chỉ định lâm sàng theo dõi các chỉ số sinh hóa và huyết học chuyên sâu.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Price & CTA Action Button (Clean Vertical Border Divider) */}
                <div
                  className="d-flex flex-row flex-xl-column align-items-xl-end justify-content-between justify-content-xl-center gap-3 ps-xl-4 flex-shrink-0"
                  style={{
                    borderLeft: '1px solid #F1F5F9',
                    minWidth: '220px'
                  }}
                >
                  <div className="text-xl-end">
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 550 }}>Đơn giá niêm yết:</div>
                    <div className="fw-bold tabular-nums" style={{ fontSize: '19px', color: '#0F172A', lineHeight: '1.2' }}>
                      {new Intl.NumberFormat('vi-VN').format(pkg.price || 0)} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>VNĐ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '8px 22px',
                      fontSize: '12px',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      transition: 'background-color 0.15s ease'
                    }}
                    onClick={() => handleBookClick(pkg)}
                  >
                    Đặt Lịch Xét Nghiệm
                  </button>
                </div>
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
      <section className="bms-section-wrap" style={{ marginBottom: '56px' }}>
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
