/**
 * @file PatientHomePage.jsx
 * @description Clean Patient Portal Home Page.
 * Displays real patient profile code, real latest test history & upcoming appointment, and DB-backed packages.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Calendar, FileText, CreditCard, Activity } from 'lucide-react';
import { fetchServiceCatalog } from '../catalog/api/catalogApi';
import { getTestHistory } from '../patient/api/testHistoryApi';
import api from '../../config/api';
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
  const [nextAppointment, setNextAppointment] = useState(null);
  const [resolvedPatientCode, setResolvedPatientCode] = useState(
    () => user?.patientCode || user?.medicalRecordNumber || user?.patientId || ''
  );

  useEffect(() => {
    api.get('/patients/me')
      .then(res => {
        const profile = res?.data?.data || res?.data;
        const code = profile?.patientCode || profile?.id;
        if (code) setResolvedPatientCode(code);
      })
      .catch(() => {});

    fetchServiceCatalog()
      .then(res => {
        if (res?.packages?.length) {
          setPackages(res.packages.slice(0, 4));
        }
      })
      .catch(() => setPackages([]));

    // TestHistorySummary fields: id, resultCode, patientId, sampleId, packageName, createdAt, approvedAt, available
    getTestHistory({ pageSize: 1 })
      .then(res => {
        const items = res?.items || res?.data || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          setRecentTest(items[0]);
        }
      })
      .catch(() => setRecentTest(null));

    api.get('/appointments', { params: { page: 1, pageSize: 5 } })
      .then(res => {
        const raw = res?.data?.data || res?.data?.items || res?.data || [];
        const list = Array.isArray(raw) ? raw : [];
        const upcoming = list.find(a => {
          const st = String(a?.status || '').toLowerCase();
          return st !== 'cancelled' && st !== 'completed' && st !== 'noshow';
        }) || list[0] || null;
        setNextAppointment(upcoming);
      })
      .catch(() => setNextAppointment(null));
  }, []);

  const handleBookClick = (pkg) => {
    const pkgId = pkg?.packageCode || pkg?.id || '';
    navigate(pkgId ? `/appointments/book?packageId=${encodeURIComponent(pkgId)}` : '/appointments/book');
  };

  const patientCode = resolvedPatientCode || user?.patientCode || user?.medicalRecordNumber || user?.patientId || 'Chưa cấp mã';

  const recentTestAvailable = Boolean(recentTest?.available || recentTest?.approvedAt);
  const recentTestDate = recentTest?.approvedAt || recentTest?.createdAt;

  return (
    <div className="bms-telehealth-page" style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar user={user} />

      <div className={`bms-page-directional-content ${pageTransitionClass}`}>
        {/* 1. Patient Hero + Real Activity Summary */}
        <section className="bms-hero-container-wrap" style={{ marginBottom: '48px' }}>
          <div className="bms-hero-grid">
            <div className="bms-hero-narrative">
              <div className="bms-status-chip">
                CỔNG SỨC KHỎE BỆNH NHÂN
              </div>

              <h1 className="bms-hero-heading mb-3" style={{ fontSize: '32px', lineHeight: 1.25, letterSpacing: '-0.025em' }}>
                Xin chào, {user?.fullName || user?.username || 'Quý khách'}
              </h1>

              <p className="bms-hero-lead" style={{ fontSize: '14px', lineHeight: '1.65', maxWidth: '520px' }}>
                Quản lý lịch hẹn xét nghiệm, theo dõi tiến trình xử lý mẫu và xem kết quả trực tuyến của bạn tại một nơi.
              </p>

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
                  placeholder="Tìm gói xét nghiệm..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button type="submit" className="bms-btn-pill-primary">
                  Tìm Kiếm
                </button>
              </form>

              {/* 4 Patient Quick-Access Cards (No internal lab jargon) */}
              <div className="bms-metric-quad">
                <Link to="/appointments" className="bms-metric-soft-card text-decoration-none">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Calendar size={16} color="#1E60E6" />
                    <span className="bms-metric-number" style={{ fontSize: '15px' }}>Lịch Hẹn</span>
                  </div>
                  <div className="bms-metric-label">Xem hoặc đặt lịch khám mới</div>
                </Link>
                <Link to="/patient/tracking" className="bms-metric-soft-card text-decoration-none">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Activity size={16} color="#10B981" />
                    <span className="bms-metric-number" style={{ fontSize: '15px' }}>Tiến Trình Mẫu</span>
                  </div>
                  <div className="bms-metric-label">Theo dõi trạng thái xét nghiệm</div>
                </Link>
                <Link to="/patient/test-history" className="bms-metric-soft-card text-decoration-none">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <FileText size={16} color="#0284C7" />
                    <span className="bms-metric-number" style={{ fontSize: '15px' }}>Kết Quả XN</span>
                  </div>
                  <div className="bms-metric-label">Lịch sử &amp; tải phiếu PDF</div>
                </Link>
                <Link to="/patient/payment-history" className="bms-metric-soft-card text-decoration-none">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <CreditCard size={16} color="#7C3AED" />
                    <span className="bms-metric-number" style={{ fontSize: '15px' }}>Viện Phí</span>
                  </div>
                  <div className="bms-metric-label">Hóa đơn &amp; lịch sử thanh toán</div>
                </Link>
              </div>
            </div>

            {/* Right Column: Real Recent Result & Upcoming Appointment */}
            <div className="bms-hero-tracker-card" id="tra-cuu">
              <div className="bms-tracker-head">
                <h2 className="bms-tracker-title">Hồ Sơ Gần Nhất</h2>
                <p className="bms-tracker-subtitle">
                  Mã bệnh nhân: <strong className="bms-highlight-blue tabular-nums">{patientCode}</strong>
                </p>
              </div>

              {recentTest ? (
                <div className="bms-recent-result-dock">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold bms-ink-text tabular-nums">
                      {recentTest.resultCode || recentTest.sampleId || recentTest.id}
                    </span>
                    <span className={`bms-status-chip ${recentTestAvailable ? 'bms-status-success' : 'bms-status-warning'}`}>
                      {recentTestAvailable ? 'Đã có kết quả' : 'Đang xử lý'}
                    </span>
                  </div>
                  <div className="bms-result-order-title">
                    {recentTest.packageName || 'Phiếu xét nghiệm'}
                  </div>
                  <div className="bms-result-order-meta">
                    Ngày ghi nhận: <strong>{recentTestDate ? new Date(recentTestDate).toLocaleDateString('vi-VN') : '—'}</strong>
                  </div>
                  <Link
                    to="/patient/test-history"
                    className="bms-btn-mint-cta w-100 mt-3 text-center"
                  >
                    Xem Kết Quả Xét Nghiệm
                  </Link>
                </div>
              ) : (
                <div className="bms-recent-result-dock text-center p-3">
                  <div className="text-muted small mb-2">Chưa có kết quả xét nghiệm nào</div>
                  <Link to="/appointments/book" className="bms-btn-mint-cta w-100 text-center">
                    Đặt Lịch Xét Nghiệm
                  </Link>
                </div>
              )}

              <div className="bms-appointment-soft-tile mt-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="bms-appointment-label">Lịch Hẹn Của Bạn</span>
                  <Link to="/appointments" className="small text-primary text-decoration-none">Xem tất cả</Link>
                </div>
                {nextAppointment ? (
                  <div className="small text-dark">
                    <div className="fw-semibold">
                      {nextAppointment.packageName || nextAppointment.serviceName || nextAppointment.appointmentCode || 'Lịch hẹn xét nghiệm'}
                    </div>
                    <div className="text-muted mt-1">
                      {nextAppointment.appointmentDate ? new Date(nextAppointment.appointmentDate).toLocaleDateString('vi-VN') : ''}
                      {nextAppointment.slotTime || nextAppointment.timeSlot ? ` · ${nextAppointment.slotTime || nextAppointment.timeSlot}` : ''}
                      {nextAppointment.status ? ` · ${nextAppointment.status}` : ''}
                    </div>
                  </div>
                ) : (
                  <div className="bms-appointment-location text-muted small">
                    Chưa có lịch hẹn sắp tới. Bạn có thể đặt lịch mới trực tuyến.
                  </div>
                )}
              </div>

              <div className="text-center mt-3">
                <Link to="/patient/tracking" className="bms-link-quiet">
                  Tra cứu tiến trình mẫu theo mã &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Real Service Packages */}
        <section className="bms-section-wrap" id="danh-muc" style={{ marginBottom: '56px' }}>
          <div className="bms-inner-container">
            <div className="bms-section-lead-center">
              <div className="bms-status-chip">DANH MỤC DỊCH VỤ</div>
              <h2 className="bms-section-h2">Gói Xét Nghiệm Máu Tiêu Biểu</h2>
            </div>

            {packages.length === 0 ? (
              <div className="bg-white rounded-4 p-4 text-center text-muted mb-4">
                Chưa tải được danh sách gói khám. <Link to="/services">Mở danh mục gói xét nghiệm</Link>.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {packages.map((pkg, idx) => (
                  <div
                    key={pkg.id || idx}
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
                        <div style={{ width: '56px', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <BmsPackageIcon name={getCategoryIconKey(pkg.category)} size={54} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                            {pkg.category && (
                              <span style={{ fontSize: '11px', fontWeight: 650, color: '#1E60E6', backgroundColor: '#EFF6FF', padding: '2px 9px', borderRadius: '9999px' }}>
                                {pkg.category}
                              </span>
                            )}
                            {(pkg.packageCode || pkg.id) && (
                              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', fontWeight: 600, color: '#475569', backgroundColor: '#F1F5F9', padding: '1px 7px', borderRadius: '6px' }}>
                                {pkg.packageCode || pkg.id}
                              </span>
                            )}
                          </div>
                          <h3 className="mb-1" style={{ fontSize: '15px', fontWeight: 650, color: '#0F172A' }}>
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

                    <div className="d-flex flex-row flex-xl-column align-items-xl-end justify-content-between justify-content-xl-center gap-2 ps-xl-4 flex-shrink-0" style={{ borderLeft: '1px solid #F1F5F9', minWidth: '200px' }}>
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
                Xem Toàn Bộ Gói Xét Nghiệm &rarr;
              </Link>
              <Link to="/feedback" className="bms-btn-neutral-pill">
                Gửi Đánh Giá Dịch Vụ &rarr;
              </Link>
            </div>
          </div>
        </section>

        <MegaFooter />
      </div>
    </div>
  );
}
