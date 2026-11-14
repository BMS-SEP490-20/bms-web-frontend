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
import { Link, useNavigate } from 'react-router-dom';
import { FaVial, FaClock } from 'react-icons/fa';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import { getTestHistory } from '../patient/api/testHistoryApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';
import BmsPackageIcon from '../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../shared/components/kit/bmsIconMaps';
import usePageTransition from '../../shared/hooks/usePageTransition';

export default function PatientHomePage({ user: propUser }) {
  const navigate = useNavigate();
  const pageTransitionClass = usePageTransition();
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
  const [recentTest, setRecentTest] = useState(null);

  useEffect(() => {
    // Load service packages
    fetchServiceCatalog()
      .then(res => {
        if (res?.packages?.length) {
          setPackages(res.packages.slice(0, 4));
        }
      })
      .catch(() => {
        setPackages([]);
      });

    // Load recent test order from real patient database
    getTestHistory({ pageSize: 1 })
      .then(res => {
        const items = res?.items || res?.data || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setRecentTest(items[0]);
        }
      })
      .catch(() => {
        setRecentTest(null);
      });
  }, []);

  const handleBookClick = (pkg) => {
    const pkgId = pkg?.packageCode || pkg?.id || '';
    navigate(pkgId ? `/appointments/book?packageId=${encodeURIComponent(pkgId)}` : '/appointments/book');
  };

  const patientCode = user?.patientCode || user?.medicalRecordNumber || user?.patientId || 'Chờ kích hoạt tại Lễ tân';

  const mapOrderStatus = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'verified' || s.includes('hoàn tất') || s.includes('có kết quả')) {
      return { label: 'Đã có kết quả', chipClass: 'bms-status-success' };
    }
    if (s === 'processing' || s === 'in_progress' || s.includes('đang')) {
      return { label: 'Đang xử lý / Phân tích', chipClass: 'bms-status-warning' };
    }
    if (s === 'pending' || s.includes('chờ')) {
      return { label: 'Chờ lấy mẫu', chipClass: 'bms-status-neutral' };
    }
    if (s === 'cancelled' || s.includes('hủy')) {
      return { label: 'Đã hủy', chipClass: 'bms-status-danger' };
    }
    return { label: status || 'Đang cập nhật', chipClass: 'bms-status-neutral' };
  };

  return (
    <div className="bms-telehealth-page" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar user={user} />

      <div className={`bms-page-directional-content ${pageTransitionClass}`}>
        {/* 1. Hero Section (Asymmetric Dashboard Layout) */}
      <section className="bms-hero-container-wrap" style={{ marginBottom: '56px' }}>
        <div className="bms-hero-grid">
          {/* Left Column: Narrative & Metrics */}
          <div className="bms-hero-narrative">
            <div className="bms-status-chip">
              TIÊU CHUẨN ISO 15189 · HỆ THỐNG BMS LAB
            </div>

            <h1 className="bms-hero-heading mb-3" style={{ fontSize: '30px', lineHeight: 1.25, letterSpacing: '-0.025em' }}>
              Quản Lý Xét Nghiệm Máu
              <img
                src="/assets/bms/svg/hero/home/hrroooo.svg"
                alt="Chính Xác, Khép Kín &amp; Tin Cậy"
                style={{
                  display: 'block',
                  height: '132px',
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  marginTop: '6px',
                  marginBottom: '8px'
                }}
              />
            </h1>

            <p className="bms-hero-lead" style={{ fontSize: '13.5px', lineHeight: '1.65', maxWidth: '520px' }}>
              Quản lý khép kín quy trình xét nghiệm từ khâu tiếp nhận chỉ định, dán mã vạch Barcode đến phân tích máy tự động, bác sĩ thẩm định và trả kết quả trực tuyến.
            </p>

            {/* Search Pill */}
            <form
              className="bms-search-pill-capsule"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/services?search=${encodeURIComponent(searchTerm)}`);
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
            {recentTest ? (
              <div className="bms-recent-result-dock">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold bms-ink-text tabular-nums">{recentTest.orderId || recentTest.orderCode || recentTest.id}</span>
                  {(() => {
                    const st = mapOrderStatus(recentTest.status);
                    return <span className={`bms-status-chip ${st.chipClass}`}>{st.label}</span>;
                  })()}
                </div>
                <div className="bms-result-order-title">
                  {recentTest.packageName || recentTest.testName || 'Gói xét nghiệm lâm sàng'}
                </div>
                <div className="bms-result-order-meta">
                  Ngày tiếp nhận: <strong>{recentTest.orderDate || recentTest.createdAt ? new Date(recentTest.orderDate || recentTest.createdAt).toLocaleDateString('vi-VN') : '—'}</strong>
                </div>
                <a
                  href={`/results/${encodeURIComponent(recentTest.orderId || recentTest.id)}/report`}
                  className="bms-btn-mint-cta w-100 mt-3"
                >
                  Xem Phiếu Kết Quả (PDF)
                </a>
              </div>
            ) : (
              <div className="bms-recent-result-dock text-center p-3">
                <div className="text-muted small mb-2">Chưa ghi nhận kết quả xét nghiệm gần đây</div>
                <a href="/appointments/book" className="bms-btn-mint-cta w-100">
                  Đặt Lịch Xét Nghiệm Mới
                </a>
              </div>
            )}

            {/* Upcoming Appointment Tile */}
            <div className="bms-appointment-soft-tile mt-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="bms-appointment-label">Lịch Hẹn Của Bạn</span>
                <Link to="/patient/appointments" className="small text-primary text-decoration-none">Xem tất cả</Link>
              </div>
              <div className="bms-appointment-location text-muted small">
                Tra cứu hoặc quản lý lịch hẹn khám và xét nghiệm trực tuyến.
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

      {/* 2. Service Packages Catalog (Moved to Top) */}
      <section className="bms-section-wrap" id="danh-muc" style={{ marginBottom: '56px' }}>
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">DANH MỤC DỊCH VỤ NIÊM YẾT</div>
            <h2 className="bms-section-h2">Gói Xét Nghiệm Máu Tiêu Biểu</h2>
            <p className="bms-section-p">
              Bảng giá dịch vụ công khai minh bạch 100%, hỗ trợ chiết tính bảo hiểm y tế tự động và xuất hóa đơn điện tử VAT theo quy định Bộ Y Tế.
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
                {/* Left: Specialty Icon + Full-Width Content Stack */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="d-flex align-items-center" style={{ gap: '24px' }}>
                    <div
                      style={{
                        width: '68px',
                        height: '68px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                        backgroundColor: 'transparent'
                      }}
                    >
                      <BmsPackageIcon name={getCategoryIconKey(pkg.category)} size={64} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      {/* Row 1: Badges */}
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2.5">
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

                      {/* Row 2: Full Package Title */}
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

                {/* Middle Dedicated Column: Specimen Standards & TAT */}
                <div
                  className="d-none d-lg-flex flex-column justify-content-center px-4 flex-shrink-0"
                  style={{
                    borderLeft: '1px solid #F1F5F9',
                    minWidth: '220px',
                    maxWidth: '260px'
                  }}
                >
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Tiêu Chuẩn Lấy Mẫu &amp; Kết Quả
                  </div>

                  {/* Tube Specimen */}
                  <div className="d-flex align-items-center gap-2.5 mb-2">
                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FaVial style={{ color: '#1E60E6', fontSize: '12px' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.2 }}>Ống lấy mẫu</div>
                      <div style={{ fontSize: '12px', fontWeight: 650, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pkg.sampleTube || 'Serum-Đỏ/Vàng'} {pkg.sampleVolumeMl ? `(${pkg.sampleVolumeMl} ml)` : '(3 ml)'}
                      </div>
                    </div>
                  </div>

                  {/* TAT */}
                  <div className="d-flex align-items-center gap-2.5">
                    <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FaClock style={{ color: '#10B981', fontSize: '12px' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.2 }}>Thời gian trả kết quả</div>
                      <div style={{ fontSize: '12px', fontWeight: 650, color: '#0F172A', whiteSpace: 'nowrap' }}>
                        {pkg.tat || '60 – 90 phút'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Price & CTA Action Button */}
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

      {/* 3. Clinical Workflow Section (4 Soft Steps - Moved Below Catalog) */}
      <section className="bms-section-wrap" id="quy-trinh" style={{ marginBottom: '56px' }}>
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">QUY TRÌNH TINH GỌN &amp; AN TOÀN</div>
            <h2 className="bms-section-h2">Xét Nghiệm Máu Dễ Dàng Chỉ Với 4 Bước</h2>
            <p className="bms-section-p">
              Toàn bộ tiến trình từ lúc đặt lịch hẹn đến khi Bác sĩ tư vấn kết quả được chuẩn hóa theo quy chuẩn y tế quốc tế ISO 15189:2022.
            </p>
          </div>

          <div className="bms-steps-quad">
            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>01</div>
              <h3 className="bms-step-h3">Đăng Ký Linh Hoạt</h3>
              <p className="bms-step-desc">
                Lựa chọn gói xét nghiệm và khung giờ thuận tiện. Đặt lịch lấy mẫu tận nơi hoặc tại phòng khám BMS chỉ trong 30 giây.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>02</div>
              <h3 className="bms-step-h3">Lấy Mẫu Êm Ái &amp; An Toàn</h3>
              <p className="bms-step-desc">
                Điều dưỡng giàu kinh nghiệm thao tác nhẹ nhàng, không đau. Dụng cụ chân không vô khuẩn một lần, dán mã định danh chuẩn xác 100%.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>03</div>
              <h3 className="bms-step-h3">Phân Tích Tự Động Chính Xác</h3>
              <p className="bms-step-desc">
                Mẫu máu được phân tích trên hệ thống máy xét nghiệm hiện đại tự động hoàn toàn, vận hành dưới quy chuẩn kiểm định nghiêm ngặt đạt độ chính xác trên 99.9%.
              </p>
            </div>

            <div className="bms-step-soft-card">
              <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '34px', fontWeight: 800, marginBottom: '14px' }}>04</div>
              <h3 className="bms-step-h3">Nhận Kết Quả &amp; Bác Sĩ Tư Vấn</h3>
              <p className="bms-step-desc">
                Tra cứu kết quả online tức thời, tải bản PDF có chữ ký số pháp lý và được Bác sĩ Chuyên khoa gọi điện tư vấn chi tiết từng chỉ số.
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

      {/* 4. Quality & Trust Pillars */}
      <section className="bms-section-wrap" style={{ marginBottom: '56px' }}>
        <div className="bms-inner-container">
          <div className="bms-section-lead-center">
            <div className="bms-status-chip">TIÊU CHUẨN QUỐC TẾ</div>
            <h2 className="bms-section-h2">An Toàn Sinh Học &amp; Kiểm Soát Chất Lượng</h2>
          </div>

          <div className="bms-trust-trio">
            <div className="bms-trust-soft-card">
              <h3 className="bms-trust-h3">Bảo Quản Chuẩn Chuỗi Lạnh 2-6°C</h3>
              <p className="bms-trust-p">
                Mẫu máu luôn được bảo quản trong dải nhiệt độ tối ưu 2-6°C từ lúc lấy mẫu đến phòng Lab, bảo toàn trọn vẹn chất lượng chỉ số sinh học.
              </p>
            </div>

            <div className="bms-trust-soft-card">
              <h3 className="bms-trust-h3">Kết Quả Điện Tử Có Chữ Ký Số Bác Sĩ</h3>
              <p className="bms-trust-p">
                Phiếu kết quả được Bác sĩ Chuyên khoa xét nghiệm thẩm định kỹ lưỡng, cấp chữ ký số pháp lý toàn quốc để bạn an tâm sử dụng khi tái khám hoặc bảo hiểm.
              </p>
            </div>

            <div className="bms-trust-soft-card">
              <h3 className="bms-trust-h3">Lấy Mẫu Tận Nơi Nhẹ Nhàng, Không Đau</h3>
              <p className="bms-trust-p">
                Đội ngũ điều dưỡng chuyên nghiệp thao tác nhẹ nhàng, kim siêu nhỏ vô trùng 1 lần, mang lại trải nghiệm y tế êm ái ngay tại không gian quen thuộc của gia đình bạn.
              </p>
            </div>
          </div>
        </div>
      </section>

        {/* 5. Mega Footer */}
        <MegaFooter />
      </div>
    </div>
  );
}
