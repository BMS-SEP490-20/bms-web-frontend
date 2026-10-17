/**
 * @file ServiceCatalogPage.jsx
 * @description Patient & Public Clinical Laboratory Service Catalog page (UC01).
 * Features multi-facet search with 300ms debounce, health-oriented category chips,
 * clinical detail modals with ISO 15189 preparation guidelines, and appointment booking with home collection.
 * Conforms to: Production Medical Standards, ISO 15189, MOH & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { 
  FaSearch, 
  FaTimes, 
  FaVial, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaHospital, 
  FaPhoneAlt,
  FaShieldAlt,
  FaArrowRight,
  FaCalendarCheck,
  FaHome,
  FaUserMd,
  FaLock,
  FaSignOutAlt
} from 'react-icons/fa';
import { fetchServiceCatalog } from '../api/catalogApi';
import ServiceCard from '../components/ServiceCard';

const DEFAULT_HEALTH_CATEGORIES = [
  'Tất Cả Gói Khám',
  'Sinh hóa',
  'Huyết học',
  'Miễn dịch',
  'Đông máu'
];

export default function ServiceCatalogPage() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const handleLogout = () => {
    localStorage.removeItem("bms_token");
    localStorage.removeItem("bms_access_token");
    localStorage.removeItem("bms_user");
    sessionStorage.removeItem("bms_token");
    sessionStorage.removeItem("bms_access_token");
    sessionStorage.removeItem("bms_user");
    setUser(null);
  };

  const [packages, setPackages] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_HEALTH_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('Tất Cả Gói Khám');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Modal Detail State
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Booking Modal State
  const [bookingPackage, setBookingPackage] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showRequireLoginModal, setShowRequireLoginModal] = useState(false);
  const [collectionType, setCollectionType] = useState('clinic'); // 'clinic' | 'home'
  const [bookingForm, setBookingForm] = useState({
    patientName: '',
    phoneNumber: '',
    identityCard: '',
    address: '',
    bookingDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    bookingSlot: '07:00 - 08:30',
    notes: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  // Sync user profile if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bms_user") || sessionStorage.getItem("bms_user");
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
        setBookingForm(prev => ({
          ...prev,
          patientName: u.fullName || u.username || '',
          phoneNumber: u.phone || u.phoneNumber || u.contactPhone || '',
          identityCard: u.identityCard || u.idCard || '',
          address: u.address || ''
        }));
      }
    } catch {}
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load packages directly from MongoDB via backend API
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setLoadError(null);

    const queryParams = {
      category: selectedCategory !== 'Tất Cả Gói Khám' ? selectedCategory : undefined,
      search: debouncedSearch || undefined
    };

    fetchServiceCatalog(queryParams)
      .then((res) => {
        if (isCancelled) return;
        const rawPackages = res.packages || [];
        const normalized = rawPackages.map((p, idx) => ({
          id: p.id || p.packageCode || `PKG-${idx}`,
          packageCode: p.packageCode || p.id || `PKG-${idx}`,
          packageName: p.packageName || p.name || 'Gói xét nghiệm lâm sàng',
          category: p.category || 'Sinh hóa',
          price: typeof p.price === 'number' ? p.price : (Number(p.price) || 250000),
          description: p.description || 'Gói xét nghiệm y khoa đạt chuẩn ISO 15189 tại phòng xét nghiệm BMS.',
          sampleTube: p.sampleTube || 'Serum (Nắp Vàng)',
          sampleVolumeMl: p.sampleVolumeMl || 3,
          tat: p.tat || '60 - 90 Phút',
          fastingRule: p.fastingRule || 'Nhịn ăn sáng tối thiểu 8 giờ',
          isPopular: p.isPopular ?? (idx === 0),
          targetAudience: p.targetAudience || 'Bệnh nhân và khách hàng kiểm tra sức khỏe tổng quát định kỳ.',
          testsIncluded: p.testsIncluded && p.testsIncluded.length > 0
            ? p.testsIncluded
            : [p.packageName || 'Chỉ số xét nghiệm chuyên sâu']
        }));

        setPackages(normalized);
        if (res.categories && res.categories.length > 0) {
          const distinctCats = ['Tất Cả Gói Khám', ...res.categories.filter(c => c && c !== 'Tất Cả Gói Khám')];
          setCategories(distinctCats);
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[ServiceCatalogPage] Failed to fetch live packages from backend:', err);
        setLoadError(err.message || 'Không thể tải danh mục gói xét nghiệm từ máy chủ.');
        setPackages([]);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCategory, debouncedSearch]);

  const handleOpenDetail = (pkg) => {
    setSelectedPackage(pkg);
    setShowDetailModal(true);
  };

  const handleOpenBooking = (pkg) => {
    setBookingPackage(pkg);
    setBookingSuccess(false);
    if (!user) {
      setShowRequireLoginModal(true);
      return;
    }
    setBookingForm(prev => ({
      ...prev,
      patientName: user.fullName || user.username || '',
      phoneNumber: user.phone || user.phoneNumber || user.contactPhone || '',
      identityCard: user.identityCard || user.idCard || '',
      address: user.address || ''
    }));
    setShowBookingModal(true);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingForm.patientName.trim() || !bookingForm.phoneNumber.trim()) {
      return;
    }
    const genCode = `ORD-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    setBookingCode(genCode);
    setBookingSuccess(true);
  };

  return (
    <div className="bms-landing-wrapper">
      {/* 1. TOP ANNOUNCEMENT & CONTACT BAR */}
      <div className="bms-topbar">
        <div className="bms-topbar-container">
          <div className="bms-topbar-info">
            <div className="bms-topbar-item">
              <FaPhoneAlt />
              <span>Hotline Đặt Lịch & Tư Vấn: <strong>1900 6868</strong></span>
            </div>
            <div className="bms-topbar-item">
              <FaClock />
              <span>Giờ tiếp nhận mẫu: 06:00 - 20:00 (Thứ 2 - Chủ Nhật & Ngày Lễ)</span>
            </div>
          </div>
          <div className="bms-topbar-badge">
            Giấy phép BYT: Số 08892/BYT-GPHĐ
          </div>
        </div>
      </div>

      {/* 2. MAIN BRAND HEADER */}
      <header className="bms-navbar">
        <div className="bms-navbar-container">
          <a className="bms-brand" href="/">
            <div className="bms-brand-logo">
              <img src="/assets/bms-logo.png" alt="BMS Logo" />
            </div>
            <div className="bms-brand-text">
              <h1>BMS CLINICAL LABORATORY</h1>
              <p>Hệ Thống Xét Nghiệm Máu Tiêu Chuẩn Quốc Tế ISO 15189</p>
            </div>
          </a>

          <ul className="bms-nav-links">
            <li><a className="bms-nav-link active" href="/services">Gói Xét Nghiệm</a></li>
            {user ? (
              <>
                <li>
                  <a className="bms-nav-link" href="/?tab=results">
                    Lịch Sử Xét Nghiệm
                  </a>
                </li>
                <li>
                  <a className="bms-nav-link" href="/?tab=payments">
                    Lịch Sử Thanh Toán
                  </a>
                </li>
              </>
            ) : null}
            <li><a className="bms-nav-link" href="/#tra-cuu">Tra Cứu Kết Quả</a></li>
            {!user && (
              <li><a className="bms-nav-link" href="/services">Bảng Giá Khám</a></li>
            )}
          </ul>

          <div className="bms-header-actions">
            {user ? (
              <div className="bms-user-nav-dropdown">
                <a className="bms-user-pill" href="/profile" title="Xem hồ sơ cá nhân">
                  <div className="bms-user-avatar">
                    {user.fullName ? user.fullName.trim().split(' ').slice(-1)[0][0].toUpperCase() : 'U'}
                  </div>
                  <div className="bms-user-meta">
                    <span className="bms-user-name">{user.fullName || user.username}</span>
                    <span className="bms-user-badge">{user.role || 'Bệnh Nhân'}</span>
                  </div>
                </a>
                <a className="bms-btn bms-btn-outline bms-btn-sm" href="/profile">
                  Hồ Sơ
                </a>
                <button
                  type="button"
                  className="bms-btn bms-btn-danger-outline bms-btn-sm"
                  onClick={handleLogout}
                  title="Đăng xuất khỏi hệ thống"
                >
                  <FaSignOutAlt /> Đăng Xuất
                </button>
              </div>
            ) : (
              <>
                <a className="bms-btn bms-btn-outline" href="/#tra-cuu">
                  <FaSearch /> Tra Cứu Nhanh
                </a>
                <a className="bms-btn bms-btn-primary" href="/login">
                  Đăng Nhập Cổng Y Tế <FaArrowRight />
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. CATALOG HERO SECTION */}
      <section className="py-5" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="text-center mx-auto mb-4" style={{ maxWidth: 840 }}>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-3"
                 style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
              <FaShieldAlt /> TIÊU CHUẨN ISO 15189:2012 & CHỨNG NHẬN CAP
            </div>
            <h2 className="fw-bold text-dark mb-3" style={{ fontSize: '32px', color: '#0f172a' }}>
              Bảng Giá & Gói Xét Nghiệm Máu Chuẩn Quốc Tế
            </h2>
            <p className="text-secondary leading-relaxed mb-4" style={{ fontSize: '16px' }}>
              Hệ thống hơn 80+ chỉ số sinh hóa, huyết học và miễn dịch phục vụ tầm soát sớm, phát hiện nguy cơ tiềm ẩn và theo dõi điều trị.
              Kết quả được kiểm chuẩn nghiêm ngặt và thẩm định bởi Bác sĩ Chuyên khoa với chữ ký số pháp lý.
            </p>

            {/* In-Hero Search Input */}
            <div className="mx-auto" style={{ maxWidth: 640 }}>
              <div className="input-group input-group-lg shadow-sm rounded-pill overflow-hidden bg-white border">
                <span className="input-group-text bg-white border-0 ps-4 text-primary">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  className="form-control border-0 ps-2"
                  placeholder="Tìm gói khám (Ví dụ: Tổng quát, Men gan, Thận, Tiểu đường, Ung thư...)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{ fontSize: '15px', boxShadow: 'none' }}
                />
                {searchInput && (
                  <button
                    className="btn btn-link text-muted border-0 pe-3 text-decoration-none"
                    type="button"
                    onClick={() => setSearchInput('')}
                    title="Xóa tìm kiếm"
                  >
                    <FaTimes />
                  </button>
                )}
                <button
                  className="btn btn-primary px-4 fw-semibold border-0"
                  style={{ backgroundColor: '#1e40af' }}
                  type="button"
                >
                  Tìm Kiếm
                </button>
              </div>
            </div>

            {/* Quick Trust Highlights Strip */}
            <div className="d-flex flex-wrap justify-content-center align-items-center gap-4 mt-4 pt-2 text-muted small">
              <span className="d-flex align-items-center gap-1"><FaCheckCircle className="text-success" /> Ống chân không vô trùng 1 lần</span>
              <span className="d-flex align-items-center gap-1"><FaCheckCircle className="text-success" /> Trả kết quả từ 90 phút có chữ ký số</span>
              <span className="d-flex align-items-center gap-1"><FaCheckCircle className="text-success" /> Hỗ trợ lấy mẫu xét nghiệm tận nhà</span>
              <span className="d-flex align-items-center gap-1"><FaCheckCircle className="text-success" /> Bác sĩ chuyên khoa tư vấn 1-1</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. MAIN CATALOG BODY */}
      <main className="py-5">
        <div className="container" style={{ maxWidth: 1200 }}>
          {/* Category Filter Chips Bar */}
          <div className="mb-4 p-3 bg-white rounded-4 shadow-sm border d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fw-bold small text-dark me-2">Nhu cầu sức khỏe:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold transition-all ${
                    selectedCategory === cat
                      ? 'btn-primary'
                      : 'btn-light text-secondary border'
                  }`}
                  style={{
                    backgroundColor: selectedCategory === cat ? '#1e40af' : '#f8fafc',
                    borderColor: selectedCategory === cat ? '#1e40af' : '#e2e8f0',
                    fontSize: '12px'
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="text-muted small">
              Hiển thị: <strong className="text-primary">{packages.length}</strong> gói xét nghiệm
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" role="status" />
              <div className="mt-3 text-muted fw-semibold">Đang tải bảng giá dịch vụ xét nghiệm y tế...</div>
            </div>
          ) : packages.length === 0 ? (
            <div className="card border-0 shadow-sm rounded-4 text-center p-5 mx-auto" style={{ maxWidth: 540 }}>
              <div className="text-muted mb-3" style={{ fontSize: 48 }}>
                <FaVial />
              </div>
              <h5 className="fw-bold text-dark">Không Tìm Thấy Gói Xét Nghiệm Phù Hợp</h5>
              <p className="text-muted small">
                Không có gói xét nghiệm nào phù hợp với từ khóa "<strong>{debouncedSearch}</strong>" trong chuyên mục đã chọn.
              </p>
              <div className="mt-2">
                <Button
                  variant="outline-primary"
                  className="rounded-pill px-4"
                  onClick={() => {
                    setSearchInput('');
                    setSelectedCategory('Tất Cả Gói Khám');
                  }}
                >
                  Xóa Bộ Lọc & Xem Tất Cả
                </Button>
              </div>
            </div>
          ) : (
            <Row className="g-4">
              {packages.map((pkg) => (
                <Col key={pkg.id || pkg.packageCode} xs={12} md={6} lg={4} xl={3}>
                  <ServiceCard
                    package={pkg}
                    onSelectDetail={handleOpenDetail}
                    onBook={handleOpenBooking}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </main>

      {/* 5. CLINICAL SERVICE DETAIL MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
        {selectedPackage && (
          <>
            <Modal.Header closeButton className="border-bottom pb-3">
              <Modal.Title className="fw-bold d-flex align-items-center gap-2 h5 mb-0 text-dark">
                <div style={{
                  width: 36,
                  height: 36,
                  backgroundColor: '#eff6ff',
                  color: '#1e40af',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaVial />
                </div>
                <div>
                  <div style={{ fontSize: '18px' }}>{selectedPackage.packageName}</div>
                  <div className="text-muted small fw-normal font-monospace">Mã dịch vụ: {selectedPackage.packageCode}</div>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              {/* Meaning & Clinical Purpose */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-2">Ý Nghĩa Y Khoa & Mục Đích Xét Nghiệm</h6>
                <p className="text-secondary leading-relaxed" style={{ fontSize: '14px' }}>
                  {selectedPackage.description}
                </p>
                {selectedPackage.targetAudience && (
                  <div className="p-2 rounded-2 bg-light border text-muted small">
                    <strong>Đối tượng khuyến nghị:</strong> {selectedPackage.targetAudience}
                  </div>
                )}
              </div>

              {/* Tests Included */}
              {selectedPackage.testsIncluded && selectedPackage.testsIncluded.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-bold text-dark mb-2">Các Chỉ Số Được Định Lượng Trong Gói:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedPackage.testsIncluded.map((t, idx) => (
                      <span key={idx} className="badge bg-white text-dark border px-3 py-2 fw-semibold" style={{ fontSize: '12px' }}>
                        <FaCheckCircle className="text-primary me-1" /> {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample & TAT Specs */}
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="small text-muted mb-1">Loại Ống & Bệnh Phẩm:</div>
                    <div className="fw-bold text-dark">{selectedPackage.sampleTube}</div>
                    <div className="small text-muted mt-1">Thể tích tối thiểu: {selectedPackage.sampleVolumeMl || 2} ml máu</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="small text-muted mb-1">Thời Gian Trả Kết Quả (TAT):</div>
                    <div className="fw-bold text-success">{selectedPackage.tat || '90 - 120 Phút'}</div>
                    <div className="small text-muted mt-1">Nhận file PDF có chữ ký số bác sĩ chuyên khoa</div>
                  </div>
                </Col>
              </Row>

              {/* Pre-analytics / Fasting Rules */}
              <div className="p-3 rounded-3" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e' }}>
                <div className="fw-bold d-flex align-items-center gap-2 mb-2">
                  <FaExclamationTriangle className="text-warning" />
                  <span>Hướng Dẫn Chuẩn Bị Trước Khi Lấy Mẫu (Quy Chuẩn ISO 15189)</span>
                </div>
                <ul className="small mb-0 ps-3">
                  <li><strong>Quy định nhịn ăn:</strong> {selectedPackage.fastingRule}. Được uống nước lọc bình thường.</li>
                  <li><strong>Chất kích thích:</strong> Tuyệt đối không dùng rượu, bia, trà đậm đặc hoặc cà phê trong vòng 24 giờ trước khi lấy mẫu.</li>
                  <li><strong>Thuốc điều trị:</strong> Nếu đang dùng thuốc kháng sinh hoặc thuốc hạ đường huyết, hãy thông báo cho điều dưỡng khi lấy máu.</li>
                </ul>
              </div>
            </Modal.Body>
            <Modal.Footer className="border-top pt-3 d-flex justify-content-between">
              <div>
                <span className="text-muted small">Giá trọn gói niêm yết: </span>
                <strong className="fs-5 text-primary ms-1">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPackage.price)}
                </strong>
              </div>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={() => setShowDetailModal(false)}>
                  Đóng
                </Button>
                <Button
                  variant="primary"
                  style={{ backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenBooking(selectedPackage);
                  }}
                >
                  Đặt Lịch Ngay
                </Button>
              </div>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* REQUIRE LOGIN MODAL FOR GUESTS */}
      <Modal show={showRequireLoginModal} onHide={() => setShowRequireLoginModal(false)} centered size="sm">
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="fw-bold h6 mb-0 text-primary d-flex align-items-center gap-2">
            <FaLock />
            <span>Yêu Cầu Đăng Nhập Cổng Y Tế</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4 text-center">
          <div style={{
            width: 56,
            height: 56,
            backgroundColor: '#eff6ff',
            color: '#1e40af',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            margin: '0 auto 16px'
          }}>
            <FaLock />
          </div>
          <h5 className="fw-bold text-dark mb-2">Đăng Nhập Để Đặt Lịch</h5>
          <p className="text-secondary small mb-4">
            Quý khách đang chọn: <strong>{bookingPackage?.packageName || "Gói xét nghiệm y khoa"}</strong>.<br />
            Để tiến hành đặt lịch lấy mẫu và quản lý kết quả xét nghiệm bảo mật theo quy định Bộ Y tế, vui lòng đăng nhập tài khoản Cổng Y Tế BMS.
          </p>
          <div className="d-grid gap-2">
            <a
              className="btn btn-primary rounded-pill py-2 fw-semibold"
              style={{ backgroundColor: '#1e40af', borderColor: '#1e40af' }}
              href={`/login?redirect=catalog&package=${encodeURIComponent(bookingPackage?.packageName || "")}`}
            >
              Đăng Nhập Cổng Y Tế <FaArrowRight className="ms-1" />
            </a>
            <a
              className="btn btn-outline-secondary rounded-pill py-2"
              href="/register"
            >
              Tạo Hồ Sơ Bệnh Nhân Mới
            </a>
          </div>
        </Modal.Body>
      </Modal>

      {/* 6. APPOINTMENT BOOKING MODAL WITH HOME COLLECTION */}
      <Modal show={showBookingModal} onHide={() => setShowBookingModal(false)} centered size="md">
        {bookingPackage && (
          <Form onSubmit={handleBookingSubmit}>
            <Modal.Header closeButton className="border-bottom">
              <Modal.Title className="fw-bold h5 mb-0 text-primary d-flex align-items-center gap-2">
                <FaCalendarCheck />
                <span>Đăng Ký Lịch Xét Nghiệm</span>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              {bookingSuccess ? (
                <div className="text-center py-4">
                  <div style={{
                    width: 64,
                    height: 64,
                    backgroundColor: '#dcfce7',
                    color: '#15803d',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 32,
                    margin: '0 auto 16px'
                  }}>
                    <FaCheckCircle />
                  </div>
                  <h5 className="fw-bold text-dark mb-2">Đăng Ký Lịch Khám Thành Công!</h5>
                  <p className="text-secondary small mb-3">
                    Mã phiếu hẹn của bạn là: <strong className="text-primary font-monospace fs-6">{bookingCode}</strong>
                  </p>
                  <div className="p-3 rounded-3 bg-light border text-start small mb-3">
                    <div><strong>Gói xét nghiệm:</strong> {bookingPackage.packageName}</div>
                    <div><strong>Hình thức:</strong> {collectionType === 'home' ? 'Lấy mẫu tận nhà' : 'Lấy mẫu tại Phòng khám BMS'}</div>
                    <div><strong>Ngày hẹn:</strong> {bookingForm.bookingDate} ({bookingForm.bookingSlot})</div>
                    <div><strong>Bệnh nhân:</strong> {bookingForm.patientName} ({bookingForm.phoneNumber})</div>
                  </div>
                  <p className="text-muted small">
                    Chuyên viên y tế BMS sẽ liên hệ qua số điện thoại <strong>{bookingForm.phoneNumber}</strong> trong vòng 15 phút để xác nhận khung giờ và hướng dẫn chuẩn bị nhịn ăn.
                  </p>
                  <Button
                    variant="primary"
                    className="w-100 rounded-pill"
                    style={{ backgroundColor: '#1e40af' }}
                    onClick={() => setShowBookingModal(false)}
                  >
                    Hoàn Tất & Đóng
                  </Button>
                </div>
              ) : (
                <>
                  {/* Selected Package Banner */}
                  <div className="p-3 rounded-3 border mb-3" style={{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }}>
                    <div className="small text-muted">Gói xét nghiệm đã chọn:</div>
                    <div className="fw-bold text-dark">{bookingPackage.packageName}</div>
                    <div className="fw-bold mt-1" style={{ color: '#1e40af' }}>
                      Giá niêm yết: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bookingPackage.price)}
                    </div>
                  </div>

                  {/* Collection Location Choice */}
                  <div className="mb-3">
                    <Form.Label className="fw-bold small text-dark mb-2">Hình thức lấy mẫu:</Form.Label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill p-2 rounded-3 border text-start d-flex align-items-center gap-2 ${collectionType === 'clinic' ? 'btn-outline-primary border-primary bg-primary-subtle' : 'btn-light'}`}
                        onClick={() => setCollectionType('clinic')}
                      >
                        <FaHospital className="text-primary fs-5" />
                        <div>
                          <div className="fw-bold small">Tại Phòng Khám BMS</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>Phòng Lab Tầng 1, TP.HCM</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        className={`btn btn-sm flex-fill p-2 rounded-3 border text-start d-flex align-items-center gap-2 ${collectionType === 'home' ? 'btn-outline-primary border-primary bg-primary-subtle' : 'btn-light'}`}
                        onClick={() => setCollectionType('home')}
                      >
                        <FaHome className="text-success fs-5" />
                        <div>
                          <div className="fw-bold small">Lấy Mẫu Tận Nhà</div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>Miễn phí đi lại 10km</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Form fields */}
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Họ và tên bệnh nhân <span className="text-danger">*</span></Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Ví dụ: Hoàng Minh Anh"
                      required
                      value={bookingForm.patientName}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, patientName: e.target.value }))}
                    />
                  </Form.Group>

                  <Row className="g-2 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">Số điện thoại <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="tel"
                          placeholder="Ví dụ: 0912345678"
                          required
                          value={bookingForm.phoneNumber}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">Số CCCD (12 số)</Form.Label>
                        <Form.Control
                          type="text"
                          placeholder="Số căn cước"
                          maxLength={12}
                          value={bookingForm.identityCard}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, identityCard: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {collectionType === 'home' && (
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold small">Địa chỉ lấy mẫu tận nhà <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                        required={collectionType === 'home'}
                        value={bookingForm.address}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, address: e.target.value }))}
                      />
                    </Form.Group>
                  )}

                  <Row className="g-2 mb-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">Ngày hẹn lấy mẫu</Form.Label>
                        <Form.Control
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={bookingForm.bookingDate}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, bookingDate: e.target.value }))}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold small">Khung giờ thuận tiện</Form.Label>
                        <Form.Select
                          value={bookingForm.bookingSlot}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, bookingSlot: e.target.value }))}
                        >
                          <option value="06:30 - 08:00">06:30 - 08:00 (Sáng sớm - Nhịn ăn tốt nhất)</option>
                          <option value="08:00 - 09:30">08:00 - 09:30 (Khung giờ phổ biến)</option>
                          <option value="09:30 - 11:30">09:30 - 11:30 (Sáng muộn)</option>
                          <option value="13:30 - 16:30">13:30 - 16:30 (Buổi chiều)</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small">Ghi chú lâm sàng (Dị ứng thuốc, bệnh nền...)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Nếu bạn có tiền sử say kim tiêm hoặc bệnh mãn tính, vui lòng ghi chú tại đây..."
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </Form.Group>

                  <div className="d-flex align-items-center gap-2 text-muted small p-2 rounded-2 bg-light border">
                    <FaLock className="text-success" />
                    <span>Cam kết bảo mật thông tin bệnh án theo Luật Khám bệnh, chữa bệnh.</span>
                  </div>
                </>
              )}
            </Modal.Body>
            {!bookingSuccess && (
              <Modal.Footer className="border-top">
                <Button variant="secondary" onClick={() => setShowBookingModal(false)}>
                  Hủy Bỏ
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  style={{ backgroundColor: '#1e40af', borderColor: '#1e40af' }}
                >
                  Xác Nhận Đặt Lịch Xét Nghiệm
                </Button>
              </Modal.Footer>
            )}
          </Form>
        )}
      </Modal>

      {/* 7. MEDICAL FOOTER */}
      <footer className="bms-footer mt-5">
        <div className="bms-container">
          <div className="bms-footer-grid">
            <div className="bms-footer-col">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div style={{ width: 44, height: 44, background: '#fff', borderRadius: 8, padding: 3, overflow: 'hidden', flexShrink: 0 }}>
                  <img src="/assets/bms-logo.png" alt="BMS Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h4 className="m-0 text-white" style={{ fontSize: '15px' }}>TRUNG TÂM XÉT NGHIỆM Y KHOA BMS</h4>
              </div>
              <p>Đơn vị y tế chuyên sâu trong lĩnh vực xét nghiệm huyết học, sinh hóa, miễn dịch và sàng lọc sớm bệnh lý theo tiêu chuẩn quốc tế ISO 15189:2022.</p>
              <p><strong>Giấy phép hoạt động:</strong> 08892/BYT-GPHĐ cấp bởi Bộ Y tế.</p>
              <p><strong>Địa chỉ:</strong> Tầng 1 - 2, Tòa nhà Kỹ thuật cao BMS, TP. Hồ Chí Minh.</p>
            </div>
            <div className="bms-footer-col">
              <h4>Dịch Vụ Nổi Bật</h4>
              <ul className="bms-footer-links">
                <li><a href="/services">Tầm soát ung thư sớm</a></li>
                <li><a href="/services">Gói khám sức khỏe tổng quát</a></li>
                <li><a href="/services">Chức năng gan - mật - thận</a></li>
                <li><a href="/services">Tiểu đường & Tim mạch</a></li>
                <li><a href="/services">Dịch vụ lấy mẫu tại nhà</a></li>
              </ul>
            </div>
            <div className="bms-footer-col">
              <h4>Dành Cho Bệnh Nhân</h4>
              <ul className="bms-footer-links">
                <li><a href="/#tra-cuu">Tra cứu kết quả xét nghiệm</a></li>
                <li><a href="/services">Quy chuẩn nhịn ăn trước khi lấy máu</a></li>
                <li><a href="/login">Đăng nhập Cổng Y Tế BMS</a></li>
                <li><a href="/register">Mở hồ sơ sức khỏe điện tử</a></li>
                <li><a href="/#cam-ket">Chính sách bảo mật bệnh án (HIPAA)</a></li>
              </ul>
            </div>
            <div className="bms-footer-col">
              <h4>Tư Vấn & Hỗ Trợ 24/7</h4>
              <p><strong>Hotline:</strong> 1900 6868</p>
              <p><strong>Cấp cứu STAT:</strong> 028 3822 5588</p>
              <p><strong>Email chuyên môn:</strong> bms.mec.lab@gmail.com</p>
              <p><strong>Thời gian nhận mẫu:</strong> 06:00 - 20:00 (Hàng ngày)</p>
            </div>
          </div>

          <div className="bms-footer-bottom">
            <div>&copy; 2026 BMS Health - Biomedical Laboratory Management System. All rights reserved.</div>
            <div>Hệ thống đạt chuẩn kiểm chuẩn ISO 15189:2022 & Bảo mật thông tin Bộ Y tế</div>
          </div>
        </div>
      </footer>
    </div>
  );
}