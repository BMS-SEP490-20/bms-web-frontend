/**
 * @file GuestHomePage.jsx
 * @description Public Patient & Visitor Portal Landing Page.
 * Clean, concise patient-focused overview: search packages, real DB service catalog, and 4-step visit guide.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, TestTube2, X, CalendarCheck, FileCheck2, ShieldCheck, Search } from 'lucide-react';
import { searchTestPackages } from '../catalog/api/catalogApi';
import MegaFooter from './components/MegaFooter';
import PortalNavbar from './components/PortalNavbar';
import BmsPackageIcon from '../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../shared/components/kit/bmsIconMaps';
import usePageTransition from '../../shared/hooks/usePageTransition';
import { ROLES, resolveRoleId, getStoredUser } from '../../constants/roles';
import './landing-sections.css';

const SIMPLE_STEPS = [
  {
    num: '01',
    title: 'Chọn Gói & Đặt Lịch',
    desc: 'Chọn gói xét nghiệm phù hợp và khung giờ khám trực tuyến để giảm thời gian chờ tại quầy.'
  },
  {
    num: '02',
    title: 'Check-in & Lấy Mẫu',
    desc: 'Quét mã QR lịch hẹn tại quầy tiếp đón, đối chiếu thông tin cá nhân và lấy mẫu xét nghiệm.'
  },
  {
    num: '03',
    title: 'Phân Tích & Kiểm Tra',
    desc: 'Mẫu được tiếp nhận, phân tích tại phòng xét nghiệm và kiểm tra kết quả trước khi trả.'
  },
  {
    num: '04',
    title: 'Xem Kết Quả Trực Tuyến',
    desc: 'Tra cứu tiến trình mẫu theo mã và tải phiếu kết quả sau khi Bác sĩ hoàn tất duyệt.'
  }
];

export default function GuestHomePage({ user: propUser }) {
  const navigate = useNavigate();
  const pageTransitionClass = usePageTransition();
  const signedInUser = propUser !== undefined ? propUser : getStoredUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [packages, setPackages] = useState([]);
  const [showRequireLoginModal, setShowRequireLoginModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    searchTestPackages({ pageSize: 4 })
      .then(res => {
        const list = res?.items || res?.packages || [];
        if (list.length > 0) {
          setPackages(list.slice(0, 4));
        }
      })
      .catch(() => {
        setPackages([]);
      });
  }, []);

  const handleBookClick = (pkg) => {
    const pkgId = pkg?.packageCode || pkg?.packageId || pkg?.id || '';
    const bookTarget = pkgId
      ? `/appointments/book?packageId=${encodeURIComponent(pkgId)}`
      : '/appointments/book';
    const signedIn = getStoredUser();
    if (signedIn && resolveRoleId(signedIn) === ROLES.PATIENT) {
      navigate(bookTarget);
      return;
    }
    setSelectedPackage({ pkg, bookTarget });
    setShowRequireLoginModal(true);
  };

  return (
    <div className="bms-telehealth-page" style={{ backgroundColor: '#F4F7FB', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar user={signedInUser} />

      <div className={`bms-page-directional-content ${pageTransitionClass}`}>
        {/* 1. Hero Section */}
        <section className="bms-hero-container-wrap pt-5 pb-4" style={{ marginTop: '16px', marginBottom: '48px' }}>
          <div className="container" style={{ maxWidth: '1360px' }}>
            <div className="bms-kit-hero">
              <div className="bms-hero-narrative">
                <div className="bms-status-chip d-inline-flex align-items-center gap-2 mb-3">
                  <ShieldCheck size={14} />
                  <span>CỔNG THÔNG TIN XÉT NGHIỆM BMS</span>
                </div>

                <h1 className="bms-hero-heading mb-3" style={{ fontSize: '34px', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.025em', color: '#0F172A' }}>
                  Đặt Lịch &amp; Tra Cứu Xét Nghiệm Máu Trực Tuyến
                </h1>

                <p className="bms-hero-lead mb-4" style={{ fontSize: '14px', color: '#475569', lineHeight: '1.65', maxWidth: '520px' }}>
                  Tra cứu danh mục gói xét nghiệm công khai, đặt lịch hẹn theo khung giờ bác sĩ và theo dõi tiến trình trả kết quả trực tuyến.
                </p>

                {/* Search Pill */}
                <form
                  className="bms-search-pill-capsule mb-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate(`/services?search=${encodeURIComponent(searchTerm)}`);
                  }}
                >
                  <input
                    type="text"
                    className="bms-search-input-field"
                    placeholder="Tìm gói xét nghiệm theo tên hoặc mã gói..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                  <button type="submit" className="bms-btn-pill-primary">
                    Tìm Kiếm
                  </button>
                </form>

                {/* 4 Clean Action Summary Cards */}
                <div className="bms-hero-page-metrics">
                  <Link to="/appointments/book" className="bms-metric-item-v3 text-decoration-none">
                    <CalendarCheck size={22} color="#1E60E6" />
                    <div>
                      <div className="metric-number" style={{ fontSize: '15px' }}>Đặt Lịch Khám</div>
                      <div className="metric-label">Chọn gói &amp; khung giờ hẹn</div>
                    </div>
                  </Link>
                  <Link to="/tracking" className="bms-metric-item-v3 text-decoration-none">
                    <Search size={22} color="#10B981" />
                    <div>
                      <div className="metric-number" style={{ fontSize: '15px' }}>Theo Dõi Mẫu</div>
                      <div className="metric-label">Tra cứu theo mã lịch hẹn</div>
                    </div>
                  </Link>
                  <Link to="/services" className="bms-metric-item-v3 text-decoration-none">
                    <TestTube2 size={22} color="#0284C7" />
                    <div>
                      <div className="metric-number" style={{ fontSize: '15px' }}>Danh Mục Gói</div>
                      <div className="metric-label">Xem chi tiết chỉ số &amp; giá</div>
                    </div>
                  </Link>
                  <Link to="/login" className="bms-metric-item-v3 text-decoration-none">
                    <FileCheck2 size={22} color="#7C3AED" />
                    <div>
                      <div className="metric-number" style={{ fontSize: '15px' }}>Kết Quả Online</div>
                      <div className="metric-label">Lưu trữ &amp; xem phiếu PDF</div>
                    </div>
                  </Link>
                </div>
              </div>

              <div className="bms-hero-art--big">
                <img
                  src="/assets/bms/svg/hero/home/hero-lab-narrative-A.svg?v=clean-20261106-1408"
                  alt="Minh họa phòng xét nghiệm BMS"
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Featured Service Packages (Real DB Only) */}
        <section className="bms-section-wrap py-4" id="danh-muc" style={{ marginBottom: '48px' }}>
          <div className="container" style={{ maxWidth: '1360px' }}>
            <div className="bms-section-lead-center text-center mb-4">
              <div className="bms-status-chip d-inline-block">DANH MỤC DỊCH VỤ</div>
              <h2 className="bms-section-h2 mt-2 mb-2">Gói Xét Nghiệm Tiêu Biểu</h2>
              <p className="bms-section-p">
                Bảng giá được đồng bộ trực tiếp từ danh mục dịch vụ của phòng khám.
              </p>
            </div>

            {packages.length === 0 ? (
              <div className="bg-white rounded-4 p-5 text-center text-muted mb-4">
                Hiện chưa tải được danh sách gói xét nghiệm. Vui lòng xem trong trang <Link to="/services">Gói Xét Nghiệm</Link>.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {packages.map((pkg, idx) => (
                  <div
                    key={pkg.id || pkg.packageCode || idx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '20px 26px',
                      border: 'none',
                      boxShadow: 'none'
                    }}
                    className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-4"
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="d-flex align-items-center" style={{ gap: '20px' }}>
                        <div
                          style={{
                            width: '56px',
                            height: '56px',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <BmsPackageIcon name={getCategoryIconKey(pkg.category)} size={54} />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                            {pkg.category && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 650,
                                  color: '#1E60E6',
                                  backgroundColor: '#EFF6FF',
                                  padding: '2px 9px',
                                  borderRadius: '9999px'
                                }}
                              >
                                {pkg.category}
                              </span>
                            )}
                            {(pkg.packageCode || pkg.id) && (
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono, monospace)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#475569',
                                  backgroundColor: '#F1F5F9',
                                  padding: '1px 7px',
                                  borderRadius: '6px'
                                }}
                              >
                                {pkg.packageCode || pkg.id}
                              </span>
                            )}
                          </div>

                          <h3 className="mb-1" style={{ fontSize: '15px', fontWeight: 650, color: '#0F172A', lineHeight: 1.4 }}>
                            {pkg.packageName}
                          </h3>

                          {pkg.description && (
                            <p className="mb-0 text-muted" style={{ fontSize: '13px', lineHeight: 1.55, maxWidth: '820px' }}>
                              {pkg.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {pkg.tat && (
                      <div className="d-none d-lg-flex align-items-center gap-2 px-4 flex-shrink-0" style={{ borderLeft: '1px solid #F1F5F9', minWidth: '200px' }}>
                        <Clock size={15} color="#10B981" />
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Thời gian trả KQ</div>
                          <div style={{ fontSize: '12.5px', fontWeight: 650, color: '#0F172A' }}>{pkg.tat}</div>
                        </div>
                      </div>
                    )}

                    <div
                      className="d-flex flex-row flex-xl-column align-items-xl-end justify-content-between justify-content-xl-center gap-2 ps-xl-4 flex-shrink-0"
                      style={{ borderLeft: '1px solid #F1F5F9', minWidth: '200px' }}
                    >
                      <div className="text-xl-end">
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Đơn giá</div>
                        <div className="fw-bold tabular-nums" style={{ fontSize: '18px', color: '#0F172A' }}>
                          {new Intl.NumberFormat('vi-VN').format(pkg.price || 0)} <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748B' }}>VNĐ</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '9999px',
                          padding: '8px 20px',
                          fontSize: '12.5px',
                          fontWeight: 650,
                          whiteSpace: 'nowrap',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleBookClick(pkg)}
                      >
                        Đặt Lịch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center mt-4 d-flex justify-content-center flex-wrap gap-3">
              <Link to="/services" className="bms-btn-blue-cta">
                Xem Tất Cả Gói Xét Nghiệm &rarr;
              </Link>
              <Link to="/pricing" className="bms-btn-neutral-pill">
                Bảng Giá Dịch Vụ &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Simple 4-Step Patient Visit Flow */}
        <section className="bms-section-wrap py-4" id="quy-trinh" style={{ marginBottom: '48px' }}>
          <div className="container" style={{ maxWidth: '1360px' }}>
            <div className="bms-section-lead-center text-center mb-4">
              <div className="bms-status-chip d-inline-block">HƯỚNG DẪN THĂM KHÁM</div>
              <h2 className="bms-section-h2 mt-2 mb-2">Quy Trình 4 Bước Tại BMS</h2>
            </div>

            <div className="bms-steps-quad">
              {SIMPLE_STEPS.map((st) => (
                <div key={st.num} className="bms-step-soft-card d-flex flex-column align-items-start">
                  <div className="bms-step-badge-num tabular-nums" style={{ color: '#1E60E6', fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                    {st.num}
                  </div>
                  <h3 className="bms-step-h3">{st.title}</h3>
                  <p className="bms-step-desc">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modal: Login Required */}
        {showRequireLoginModal && (
          <div className="bms-modal-backdrop" onClick={() => setShowRequireLoginModal(false)}>
            <div className="bms-modal-card bms-modal-card-sm" onClick={e => e.stopPropagation()}>
              <div className="bms-modal-head">
                <h3 className="bms-modal-title">Yêu Cầu Đăng Nhập</h3>
                <button
                  type="button"
                  className="bms-modal-close"
                  onClick={() => setShowRequireLoginModal(false)}
                  aria-label="Đóng"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="bms-modal-body text-center py-3">
                <p className="small text-muted mb-4">
                  Vui lòng đăng nhập tài khoản bệnh nhân để đặt lịch xét nghiệm{selectedPackage?.pkg?.packageName ? ` (${selectedPackage.pkg.packageName})` : ''}.
                </p>
                <Link
                  className="bms-btn-blue-cta w-100 mb-2 text-center"
                  to={`/login?redirect=${encodeURIComponent(selectedPackage?.bookTarget || '/appointments/book')}`}
                >
                  Đăng Nhập
                </Link>
                <Link className="bms-btn-neutral-pill w-100 text-center" to="/register">
                  Đăng Ký Tài Khoản Mới
                </Link>
              </div>
            </div>
          </div>
        )}

        <MegaFooter />
      </div>
    </div>
  );
}
