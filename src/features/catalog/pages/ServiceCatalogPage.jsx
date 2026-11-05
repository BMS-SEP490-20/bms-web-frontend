/**
 * @file ServiceCatalogPage.jsx
 * @description Completely Rebuilt Clinical Laboratory Service Catalog Page (Big Tech Clean Grade).
 * Pure Flat Architecture:
 * - Zero artificial shadows, zero neon glow, zero hover jump
 * - Asymmetric Executive Spotlight Hero layout
 * - Horizontal quick-filter category pills & specimen filter
 * - High-contrast Plus Jakarta Sans typography and tabular numerals
 * - Clean Biomarker Specification Drawer/Modal
 * - 100% Real API integration with searchTestPackages, fetchServiceCatalog, fetchServiceById
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Modal, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PortalNavbar from '../../home/components/PortalNavbar';
import MegaFooter from '../../home/components/MegaFooter';
import ServiceCard from '../components/ServiceCard';
import { fetchServiceCatalog, searchTestPackages, fetchServiceById } from '../api/catalogApi';

const DEFAULT_CATEGORIES = [
  'Tất Cả Gói Khám',
  'Hematology',
  'Biochemistry',
  'Immunology',
  'Coagulation'
];

const PRICE_FILTERS = [
  { id: 'all', label: 'Mọi mức giá', min: '', max: '' },
  { id: 'under200', label: '< 200.000 ₫', min: '', max: 200000 },
  { id: '200to350', label: '200k – 350k ₫', min: 200000, max: 350000 },
  { id: 'over350', label: '> 350.000 ₫', min: 350000, max: '' },
];

const SAMPLE_TUBES = [
  { value: '', label: 'Tất cả ống mẫu' },
  { value: 'EDTA', label: 'EDTA (Nắp tím - Huyết học)' },
  { value: 'Serum', label: 'Serum / SST (Nắp vàng/đỏ)' },
  { value: 'Heparin', label: 'Heparin (Nắp xanh lá)' },
  { value: 'Citrate', label: 'Citrate (Nắp xanh dương)' },
];

function normalizePackage(p, idx = 0) {
  const criteriaList = Array.isArray(p.criteria) ? p.criteria : [];
  const testsFromCriteria = criteriaList.map(
    (c) => `${c.code || ''}${c.name ? ` - ${c.name}` : ''}${c.unit ? ` (${c.unit})` : ''}`
  );
  const rawTests = Array.isArray(p.testsIncluded) && p.testsIncluded.length > 0
    ? p.testsIncluded
    : testsFromCriteria;

  return {
    id: p.id || p.packageCode || `PKG-${idx}`,
    packageCode: p.packageCode || p.code || p.id || `PKG-${idx}`,
    packageName: p.packageName || p.name || 'Gói xét nghiệm lâm sàng',
    category: p.category || 'Biochemistry',
    price: typeof p.price === 'number' ? p.price : (Number(p.price) || 250000),
    description: p.description || 'Gói xét nghiệm y khoa đạt chuẩn ISO 15189 tại hệ thống phòng xét nghiệm BMS.',
    sampleTube: p.sampleTube || 'Serum (SST)',
    sampleVolumeMl: p.sampleVolumeMl || 3.0,
    tat: p.tat || '60 - 90 Phút',
    fastingRule: p.fastingRule || (String(p.category).toLowerCase().includes('hematology') ? 'Không cần nhịn ăn' : 'Nhịn ăn sáng 8 - 12 giờ'),
    isPopular: p.isPopular ?? (idx === 0),
    isActive: p.isActive ?? true,
    targetAudience: p.targetAudience || 'Bệnh nhân và khách hàng kiểm tra sức khỏe tổng quát, tầm soát chuyên sâu.',
    criteria: criteriaList,
    testsIncluded: rawTests.length > 0
      ? rawTests
      : [p.packageName || 'Chỉ số xét nghiệm chuyên sâu']
  };
}

export default function ServiceCatalogPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // User state
  const [user] = useState(() => {
    try {
      const raw = localStorage.getItem('bms_user') || sessionStorage.getItem('bms_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Search & Filter state
  const initialKeyword = searchParams.get('search') || searchParams.get('keyword') || '';
  const [searchInput, setSearchInput] = useState(initialKeyword);
  const [debouncedSearch, setDebouncedSearch] = useState(initialKeyword);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('Tất Cả Gói Khám');
  const [sampleTube, setSampleTube] = useState('');
  const [priceFilterId, setPriceFilterId] = useState('all');
  const [sortBy, setSortBy] = useState('category');
  const [sortDir, setSortDir] = useState('asc');

  // Pagination & Data state
  const [packages, setPackages] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Detail Modal State
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Load distinct categories once
  useEffect(() => {
    fetchServiceCatalog()
      .then((res) => {
        if (res?.categories && res.categories.length > 0) {
          const distinct = ['Tất Cả Gói Khám', ...res.categories.filter((c) => c && c !== 'Tất Cả Gói Khám')];
          setCategories(distinct);
        }
      })
      .catch(() => {});
  }, []);

  // Compute price bounds
  const currentPriceRange = useMemo(() => {
    return PRICE_FILTERS.find((p) => p.id === priceFilterId) || PRICE_FILTERS[0];
  }, [priceFilterId]);

  // Fetch packages from backend
  const loadPackages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await searchTestPackages({
        keyword: debouncedSearch || undefined,
        category: selectedCategory !== 'Tất Cả Gói Khám' ? selectedCategory : undefined,
        sampleTube: sampleTube || undefined,
        minPrice: currentPriceRange.min !== '' ? currentPriceRange.min : undefined,
        maxPrice: currentPriceRange.max !== '' ? currentPriceRange.max : undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      });

      const rawItems = res?.items || res?.packages || [];
      const normalized = rawItems.map((p, idx) => normalizePackage(p, idx));
      setPackages(normalized);
      setTotalItems(res?.totalItems ?? res?.totalCount ?? normalized.length);
      setTotalPages(res?.totalPages || Math.ceil((res?.totalItems || normalized.length) / pageSize) || 1);
    } catch (err) {
      console.error('[ServiceCatalogPage] Failed to fetch packages:', err);
      setLoadError(err.response?.data?.message || err.message || 'Không thể tải danh sách gói xét nghiệm.');
      setPackages([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sampleTube, currentPriceRange, sortBy, sortDir, page]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  // Handle open details modal
  const handleOpenDetail = async (pkg) => {
    setSelectedPackage(pkg);
    setShowDetailModal(true);
    if (pkg.id) {
      setDetailLoading(true);
      try {
        const fullDetail = await fetchServiceById(pkg.id);
        if (fullDetail) {
          setSelectedPackage((prev) => ({
            ...prev,
            ...normalizePackage(fullDetail)
          }));
        }
      } catch (e) {
        console.warn('[ServiceCatalogPage] fetchServiceById failed, using cached summary:', e);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  // Direct Book Appointment
  const handleBook = (pkg) => {
    const pkgId = pkg.id || pkg.packageCode;
    const pkgName = encodeURIComponent(pkg.packageName || '');
    navigate(`/appointments/book?packageId=${pkgId}&packageName=${pkgName}`);
  };

  // Featured Spotlight item
  const featuredItem = useMemo(() => {
    if (packages.length === 0) return null;
    return packages.find((p) => p.isPopular) || packages[0];
  }, [packages]);

  return (
    <div className="bms-catalog-page min-vh-100 d-flex flex-column" style={{ background: '#F8FAFC' }}>
      {/* 1. Global Navigation Bar */}
      <PortalNavbar user={user} />

      <main className="flex-grow-1 py-4">
        <div className="container" style={{ maxWidth: '1400px' }}>
          
          {/* 2. Top Spotlight Header (Asymmetrical SaaS Showcase) */}
          <section
            className="mb-4 p-4 p-md-4.5"
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: 'none'
            }}
          >
            <Row className="align-items-center g-4">
              <Col lg={7}>
                <div className="d-flex align-items-center gap-2 mb-2.5">
                  <span
                    style={{
                      background: '#EFF6FF',
                      color: '#1E60E6',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      padding: '4px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    ISO 15189:2022 ACCREDITED LABORATORY
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                    • Hệ Thống BMS Lab
                  </span>
                </div>

                <h1
                  className="fw-bold mb-2.5"
                  style={{
                    fontSize: '24px',
                    lineHeight: '1.25',
                    color: '#0F172A',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Danh Mục Gói Xét Nghiệm Lâm Sàng
                </h1>

                <p
                  className="mb-3.5"
                  style={{
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    color: '#475569',
                    maxWidth: '620px'
                  }}
                >
                  Tra cứu đầy đủ các gói xét nghiệm tiêu chuẩn và chuyên sâu. Toàn bộ mẫu bệnh phẩm được xử lý trên hệ thống máy sinh hóa, huyết học tự động với thời gian trả kết quả nhanh chóng, kết nối trực tuyến với hồ sơ sức khỏe điện tử.
                </p>

                {/* Key Spec Badges */}
                <div className="d-flex flex-wrap gap-2 pt-1">
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      color: '#334155',
                      fontWeight: 600
                    }}
                  >
                    ⚡ Trả KQ trong 60 – 90 phút
                  </div>
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      color: '#334155',
                      fontWeight: 600
                    }}
                  >
                    🔬 Mã hóa Barcode 1D/2D tự động
                  </div>
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      color: '#334155',
                      fontWeight: 600
                    }}
                  >
                    📱 Nhận SMS &amp; Tra cứu trực tuyến
                  </div>
                </div>
              </Col>

              {/* Right: Featured Panel Spotlight Card */}
              {featuredItem && (
                <Col lg={5}>
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '16px',
                      padding: '20px 22px',
                      boxShadow: 'none'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span
                        style={{
                          background: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        GÓI ĐƯỢC CHỈ ĐỊNH NHIỀU NHẤT
                      </span>
                      <span className="font-monospace text-muted" style={{ fontSize: '11.5px' }}>
                        {featuredItem.packageCode}
                      </span>
                    </div>

                    <h4
                      className="fw-bold mb-1.5"
                      style={{ fontSize: '16px', color: '#0F172A', lineHeight: '1.3' }}
                    >
                      {featuredItem.packageName}
                    </h4>

                    <p
                      className="mb-3 text-truncate-2"
                      style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}
                    >
                      {featuredItem.description}
                    </p>

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top border-success-subtle">
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Đơn giá niêm yết:</div>
                        <div className="fw-bold fs-6 tabular-nums" style={{ color: '#0F172A' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(featuredItem.price)}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            padding: '6px 12px'
                          }}
                          onClick={() => handleOpenDetail(featuredItem)}
                        >
                          Chi tiết
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm fw-bold"
                          style={{
                            background: '#10B981',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: '6px 14px'
                          }}
                          onClick={() => handleBook(featuredItem)}
                        >
                          Đặt lịch ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </section>

          {/* 3. Search & Category Filter Bar (Flat, Clean, Spacious) */}
          <section
            className="mb-4 p-3.5"
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              boxShadow: 'none'
            }}
          >
            {/* Top row: Search input + Refinements */}
            <Row className="g-2.5 align-items-center mb-3">
              <Col md={6} lg={5}>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm tên gói xét nghiệm hoặc mã gói..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{
                      height: '38px',
                      fontSize: '13px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      paddingLeft: '14px',
                      paddingRight: searchInput ? '34px' : '14px',
                      boxShadow: 'none'
                    }}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="btn position-absolute top-50 end-0 translate-middle-y me-1 p-1 text-muted"
                      style={{ border: 'none', background: 'transparent', fontSize: '14px' }}
                      onClick={() => setSearchInput('')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </Col>

              <Col sm={6} md={3} lg={3}>
                <select
                  className="form-select"
                  value={sampleTube}
                  onChange={(e) => {
                    setSampleTube(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    height: '38px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    boxShadow: 'none'
                  }}
                >
                  {SAMPLE_TUBES.map((tube) => (
                    <option key={tube.value} value={tube.value}>
                      {tube.label}
                    </option>
                  ))}
                </select>
              </Col>

              <Col sm={6} md={3} lg={2}>
                <select
                  className="form-select"
                  value={priceFilterId}
                  onChange={(e) => {
                    setPriceFilterId(e.target.value);
                    setPage(1);
                  }}
                  style={{
                    height: '38px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    boxShadow: 'none'
                  }}
                >
                  {PRICE_FILTERS.map((pf) => (
                    <option key={pf.id} value={pf.id}>
                      {pf.label}
                    </option>
                  ))}
                </select>
              </Col>

              <Col sm={12} md={12} lg={2}>
                <select
                  className="form-select"
                  value={`${sortBy}-${sortDir}`}
                  onChange={(e) => {
                    const [sb, sd] = e.target.value.split('-');
                    setSortBy(sb);
                    setSortDir(sd);
                    setPage(1);
                  }}
                  style={{
                    height: '38px',
                    fontSize: '13px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    boxShadow: 'none'
                  }}
                >
                  <option value="category-asc">Chuyên khoa</option>
                  <option value="price-asc">Giá: Thấp đến Cao</option>
                  <option value="price-desc">Giá: Cao đến Thấp</option>
                  <option value="name-asc">Tên A → Z</option>
                </select>
              </Col>
            </Row>

            {/* Bottom row: Category Pills track */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 border-top border-light">
              <div className="d-flex flex-wrap gap-1.5 align-items-center">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setSelectedCategory(cat);
                        setPage(1);
                      }}
                      style={{
                        fontSize: '12.5px',
                        fontWeight: isActive ? 650 : 500,
                        backgroundColor: isActive ? '#1E60E6' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#334155',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        boxShadow: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                Hiển thị <strong>{packages.length}</strong> / {totalItems} gói xét nghiệm
              </div>
            </div>
          </section>

          {/* 4. Packages Grid Showcase */}
          {loadError && (
            <Alert variant="danger" className="border-0 rounded-4 p-3 mb-4">
              <div className="fw-bold mb-1">Lỗi tải dữ liệu:</div>
              <div>{loadError}</div>
              <button
                type="button"
                className="btn btn-sm btn-outline-danger mt-2"
                onClick={loadPackages}
              >
                Thử lại
              </button>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" style={{ width: '2.5rem', height: '2.5rem' }} />
              <div className="mt-2 text-muted" style={{ fontSize: '13px' }}>
                Đang tải danh mục gói xét nghiệm từ hệ thống phòng Lab BMS...
              </div>
            </div>
          ) : packages.length === 0 ? (
            <div
              className="text-center py-5 p-4"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid rgba(15, 23, 42, 0.08)'
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔬</div>
              <h4 className="fw-bold mb-1" style={{ fontSize: '17px', color: '#0F172A' }}>
                Không tìm thấy gói xét nghiệm phù hợp
              </h4>
              <p className="text-muted mb-3" style={{ fontSize: '13px' }}>
                Vui lòng thử từ khóa khác hoặc xóa bộ lọc để hiển thị toàn bộ danh mục.
              </p>
              <button
                type="button"
                className="btn btn-sm btn-primary rounded-pill px-3"
                onClick={() => {
                  setSearchInput('');
                  setSelectedCategory('Tất Cả Gói Khám');
                  setSampleTube('');
                  setPriceFilterId('all');
                }}
              >
                Xóa tất cả bộ lọc
              </button>
            </div>
          ) : (
            <Row className="g-3.5 mb-4">
              {packages.map((pkg) => (
                <Col key={pkg.id} xs={12} md={6} lg={4}>
                  <ServiceCard
                    pkg={pkg}
                    onSelectDetail={handleOpenDetail}
                    onBook={handleBook}
                  />
                </Col>
              ))}
            </Row>
          )}

          {/* 5. Pagination Bar */}
          {totalPages > 1 && !loading && (
            <div className="d-flex justify-content-center align-items-center gap-2 py-3">
              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ fontSize: '12.5px', borderRadius: '8px', padding: '6px 12px' }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trang trước
              </button>

              <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                Trang {page} / {totalPages}
              </span>

              <button
                type="button"
                className="btn btn-sm btn-light border"
                style={{ fontSize: '12.5px', borderRadius: '8px', padding: '6px 12px' }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Trang sau →
              </button>
            </div>
          )}

        </div>
      </main>

      {/* 6. Clinical Detail Modal */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        centered
        contentClassName="border-0 rounded-4"
      >
        <Modal.Header closeButton style={{ borderBottom: '1px solid rgba(15, 23, 42, 0.08)', padding: '16px 24px' }}>
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1E60E6',
                background: '#EFF6FF',
                padding: '3px 8px',
                borderRadius: '6px',
                marginRight: '8px'
              }}
            >
              {selectedPackage?.category || 'Chuyên khoa'}
            </span>
            <span className="font-monospace text-muted" style={{ fontSize: '12px' }}>
              {selectedPackage?.packageCode}
            </span>
            <Modal.Title className="fw-bold mt-1" style={{ fontSize: '18px', color: '#0F172A' }}>
              {selectedPackage?.packageName}
            </Modal.Title>
          </div>
        </Modal.Header>

        <Modal.Body style={{ padding: '20px 24px' }}>
          {detailLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" variant="primary" />
              <div className="mt-2 text-muted" style={{ fontSize: '12.5px' }}>Đang tải thông tin chi tiết gói...</div>
            </div>
          ) : selectedPackage ? (
            <div>
              <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.6', marginBottom: '16px' }}>
                {selectedPackage.description}
              </p>

              {/* Pre-analytical Requirements */}
              <div
                className="p-3 mb-3"
                style={{
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12.5px'
                }}
              >
                <Row className="g-2">
                  <Col sm={6}>
                    <div style={{ color: '#64748B' }}>Loại mẫu yêu cầu:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.sampleTube} ({selectedPackage.sampleVolumeMl || 3} ml)
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ color: '#64748B' }}>Chuẩn bị trước lấy mẫu:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.fastingRule}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ color: '#64748B' }}>Thời gian trả kết quả (TAT):</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.tat}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ color: '#64748B' }}>Đối tượng áp dụng:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.targetAudience}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Included Biomarkers List */}
              <h5 className="fw-bold mb-2" style={{ fontSize: '14px', color: '#0F172A' }}>
                Danh Mục Chỉ Số Xét Nghiệm Trong Gói:
              </h5>

              {Array.isArray(selectedPackage.criteria) && selectedPackage.criteria.length > 0 ? (
                <div
                  className="table-responsive"
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px'
                  }}
                >
                  <table className="table table-sm table-striped mb-0" style={{ fontSize: '12px' }}>
                    <thead style={{ background: '#F1F5F9', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Mã</th>
                        <th style={{ padding: '8px 12px' }}>Tên xét nghiệm</th>
                        <th style={{ padding: '8px 12px' }}>Đơn vị</th>
                        <th style={{ padding: '8px 12px' }}>Khoảng tham chiếu chuẩn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPackage.criteria.map((c, i) => (
                        <tr key={i}>
                          <td className="fw-bold font-monospace" style={{ padding: '8px 12px' }}>{c.code || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{c.name || c.testName || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{c.unit || '-'}</td>
                          <td style={{ padding: '8px 12px' }}>{c.referenceRange || c.refRange || 'Theo độ tuổi & giới tính'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-1.5 mb-2">
                  {(selectedPackage.testsIncluded || []).map((t, i) => (
                    <span
                      key={i}
                      style={{
                        background: '#EFF6FF',
                        color: '#1E60E6',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Modal.Body>

        <Modal.Footer
          className="d-flex justify-content-between align-items-center"
          style={{ borderTop: '1px solid rgba(15, 23, 42, 0.08)', padding: '14px 24px' }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Đơn giá trọn gói:</div>
            <div className="fw-bold fs-5 tabular-nums" style={{ color: '#0F172A' }}>
              {selectedPackage && new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedPackage.price)}
            </div>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-light border"
              style={{ fontSize: '13px', borderRadius: '8px', padding: '7px 16px' }}
              onClick={() => setShowDetailModal(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn-sm fw-bold"
              style={{
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                borderRadius: '8px',
                padding: '7px 18px'
              }}
              onClick={() => {
                setShowDetailModal(false);
                handleBook(selectedPackage);
              }}
            >
              Đặt lịch xét nghiệm gói này
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* 7. Global Mega Footer */}
      <MegaFooter />
    </div>
  );
}
