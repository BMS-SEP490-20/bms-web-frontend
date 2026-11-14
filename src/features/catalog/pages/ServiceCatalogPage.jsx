/**
 * @file ServiceCatalogPage.jsx
 * @description Completely Rebuilt Clinical Laboratory Service Catalog Page (Big Tech Clean Grade).
 * Pure Flat Architecture:
 * - Zero artificial shadows, zero neon glow, zero hover jump
 * - Asymmetric Executive Spotlight Hero layout
 * - Horizontal quick-filter category pills & specimen filter
 * - High-contrast Geist typography and tabular numerals
 * - Clean Biomarker Specification Drawer/Modal
 * - 100% Real API integration with searchTestPackages, fetchServiceCatalog, fetchServiceById
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Modal, Spinner, Alert, Badge } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaVial, FaClock, FaList, FaThLarge } from 'react-icons/fa';
import PortalNavbar from '../../home/components/PortalNavbar';
import MegaFooter from '../../home/components/MegaFooter';
import ServiceCard from '../components/ServiceCard';
import BmsPackageIcon from '../../../shared/components/kit/BmsPackageIcon';
import { getCategoryIconKey } from '../../../shared/components/kit/bmsIconMaps';
import usePageTransition from '../../../shared/hooks/usePageTransition';
import { fetchServiceCatalog, searchTestPackages, fetchServiceById } from '../api/catalogApi';

const DEFAULT_CATEGORIES = [
  'Tất Cả Gói Khám',
  'Huyết học',
  'Sinh hóa',
  'Miễn dịch',
  'Đông máu'
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

/**
 * Resolves biomarker code to SVG icon in /assets/bms/svg/icons/biomarker/
 */
function getBiomarkerIconUrl(code) {
  if (!code) return null;
  const c = code.toLowerCase().trim();
  const map = {
    rbc: 'rbc',
    hgb: 'hgb',
    hct: 'hct',
    wbc: 'wbc',
    plt: 'plt',
    glu: 'glucose',
    glucose: 'glucose',
    alt: 'alt',
    ast: 'ast',
    cre: 'creatinine',
    creatinine: 'creatinine',
    cho: 'cholesterol',
    cholesterol: 'cholesterol',
    tri: 'triglyceride',
    triglyceride: 'triglyceride',
    hdl: 'hdl',
    hdl_c: 'hdl',
    ldl: 'ldl',
    ldl_c: 'ldl',
    hbsag: 'hbsag',
    hbs: 'hbsag',
    hcv: 'anti-hcv',
    hcv_ab: 'anti-hcv',
    hba1c: 'hba1c',
    ggt: 'ggt',
    pt: 'pt-inr',
    pt_sec: 'pt-inr',
    inr: 'pt-inr',
    pt_inr: 'pt-inr',
    fibrin: 'fibrinogen',
    fibrinogen: 'fibrinogen',
    ure: 'urea',
    urea: 'urea',
    crp: 'crp',
    ferritin: 'ferritin'
  };
  const key = map[c];
  return key ? `/assets/bms/svg/icons/biomarker/${key}.svg` : null;
}

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
    category: p.category || '',
    price: Number(p.price) || 0,
    description: p.description || '',
    sampleTube: p.sampleTube || '',
    sampleVolumeMl: p.sampleVolumeMl || null,
    tat: p.tat || '',
    fastingRule: p.fastingRule || '',
    isPopular: p.isPopular ?? false,
    isActive: p.isActive ?? true,
    targetAudience: p.targetAudience || '',
    criteria: criteriaList,
    testsIncluded: rawTests
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
  const [viewMode, setViewMode] = useState('list');

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
    const lookupId = pkg.id || pkg.packageCode;
    if (lookupId) {
      setDetailLoading(true);
      try {
        let fullDetail = await fetchServiceById(lookupId);
        if (!fullDetail && pkg.packageCode && pkg.packageCode !== lookupId) {
          fullDetail = await fetchServiceById(pkg.packageCode);
        }
        if (fullDetail) {
          setSelectedPackage((prev) => {
            const normalized = normalizePackage(fullDetail);
            return {
              ...prev,
              ...normalized,
              criteria: (normalized.criteria && normalized.criteria.length > 0) ? normalized.criteria : (prev?.criteria || [])
            };
          });
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
    const pkgId = pkg.packageCode || pkg.code || pkg.id;
    const pkgName = encodeURIComponent(pkg.packageName || pkg.name || '');
    navigate(`/appointments/book?packageId=${encodeURIComponent(pkgId)}&packageName=${pkgName}`);
  };

  // Featured Spotlight item
  const featuredItem = useMemo(() => {
    if (packages.length === 0) return null;
    return packages.find((p) => p.isPopular);
  }, [packages]);

  const pageTransitionClass = usePageTransition();

  return (
    <div className="bms-catalog-page min-vh-100 d-flex flex-column" style={{ background: '#F8FAFC' }}>
      {/* 1. Global Navigation Bar */}
      <PortalNavbar user={user} />

      <main className={`flex-grow-1 py-4 bms-page-directional-content ${pageTransitionClass}`}>
        <div className="container" style={{ maxWidth: '1400px' }}>
          
          {/* 2. Top Spotlight Header (Pure Flat, High Contrast SaaS Showcase) */}
          <section
            className="mb-5"
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: 'none',
              boxShadow: 'none',
              padding: '36px 40px'
            }}
          >
            <Row className="align-items-center g-4">
              <Col lg={7}>
                <div className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 650, letterSpacing: '0.04em' }}>
                  <img src="/assets/lab-icon.png" alt="" style={{ width: '15px', height: '15px', objectFit: 'contain' }} />
                  <span>ISO 15189:2022 ACCREDITED LABORATORY · HỆ THỐNG BMS LAB</span>
                </div>

                <h1
                  className="fw-bold mb-3"
                  style={{
                    fontSize: '34px',
                    lineHeight: '1.18',
                    color: '#0F172A',
                    letterSpacing: '-0.03em'
                  }}
                >
                  Danh Mục Gói Xét Nghiệm Lâm Sàng
                </h1>

                <p
                  className="mb-4"
                  style={{
                    fontSize: '13px',
                    lineHeight: '1.7',
                    color: '#64748B',
                    maxWidth: '640px'
                  }}
                >
                  Tra cứu toàn bộ danh mục gói xét nghiệm chuẩn y tế quốc tế ISO 15189:2022. Mẫu bệnh phẩm được xử lý trên hệ thống máy phân tích tự động thế hệ mới, kết quả chính xác 99.9%, hỗ trợ chiết khấu BHYT trực tiếp và Bác sĩ chuyên khoa giải thích kết quả chu đáo.
                </p>

                {/* Key Spec Badges - Pure Flat, No Emojis, No Borders */}
                <div className="d-flex flex-wrap gap-2 pt-1">
                  <div
                    style={{
                      background: '#EFF6FF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      color: '#1E60E6',
                      fontWeight: 650
                    }}
                  >
                    Chính xác 99.9% (Chuẩn ISO 15189:2022)
                  </div>
                  <div
                    style={{
                      background: '#ECFDF5',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      color: '#059669',
                      fontWeight: 650
                    }}
                  >
                    Hỗ trợ thanh toán BHYT trực tiếp
                  </div>
                  <div
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      color: '#475569',
                      fontWeight: 600
                    }}
                  >
                    Bác sĩ Chuyên khoa tư vấn kết quả
                  </div>
                  <div
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '11.5px',
                      color: '#475569',
                      fontWeight: 600
                    }}
                  >
                    Nhận kết quả SMS/Zalo &amp; Ký số y khoa
                  </div>
                </div>
              </Col>

              {/* Right: Featured Panel Spotlight Card or Catalog Hero Art - Pure Flat, Zero Border */}
              {featuredItem ? (
                <Col lg={5}>
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '26px 28px',
                      boxShadow: 'none'
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '20px' }}>
                      <span
                        style={{
                          color: '#166534',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase'
                        }}
                      >
                        Chỉ định nhiều nhất
                      </span>
                      <span className="font-monospace text-muted" style={{ fontSize: '11.5px' }}>
                        {featuredItem.packageCode}
                      </span>
                    </div>

                    <h4
                      className="fw-bold"
                      style={{ fontSize: '18px', color: '#0F172A', lineHeight: '1.4', marginBottom: '10px' }}
                    >
                      {featuredItem.packageName}
                    </h4>

                    <p
                      className="mb-4 text-truncate-2"
                      style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}
                    >
                      {featuredItem.description}
                    </p>

                    <div className="d-flex justify-content-between align-items-center pt-2" style={{ borderTop: 'none' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Đơn giá niêm yết:</div>
                        <div className="fw-bold fs-5 tabular-nums" style={{ color: '#0F172A' }}>
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(featuredItem.price)}
                        </div>
                      </div>

                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: '#FFFFFF',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '8px',
                            padding: '7px 15px',
                            boxShadow: 'none'
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
                            padding: '7px 18px',
                            boxShadow: 'none'
                          }}
                          onClick={() => handleBook(featuredItem)}
                        >
                          Đặt lịch ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </Col>
              ) : (
                <Col lg={5} className="text-center d-none d-lg-block">
                  <img
                    src="/assets/bms/svg/hero/services/catalog-hero.svg"
                    alt="BMS Clinical Catalog Art"
                    style={{ maxWidth: '280px', height: 'auto', maxHeight: '160px', objectFit: 'contain' }}
                  />
                </Col>
              )}
            </Row>
          </section>

          {/* 3. Search & Category Filter Bar (Compact Toolbar, Pure Flat, No Borders) */}
          <section
            className="mb-5 p-3.5"
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              border: 'none',
              boxShadow: 'none'
            }}
          >
            {/* Top row: Category Pills Track & Result Count */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
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
                        fontSize: '12px',
                        fontWeight: isActive ? 650 : 500,
                        backgroundColor: isActive ? '#1E60E6' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        border: 'none',
                        borderRadius: '999px',
                        padding: '6px 16px',
                        boxShadow: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="d-flex align-items-center gap-2">
                <div style={{ fontSize: '11.5px', color: '#94A3B8', fontWeight: 500 }}>
                  Hiển thị <strong>{packages.length}</strong> / {totalItems} gói xét nghiệm
                </div>
                <div className="btn-group btn-group-sm ms-2" role="group">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setViewMode('list')}
                    title="Dạng danh sách (thoáng chữ, không rớt dòng)"
                    style={{
                      backgroundColor: viewMode === 'list' ? '#1E60E6' : '#F1F5F9',
                      color: viewMode === 'list' ? '#FFFFFF' : '#64748B',
                      border: 'none',
                      borderRadius: '6px 0 0 6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      boxShadow: 'none'
                    }}
                  >
                    <FaList className="me-1" style={{ fontSize: '11px' }} /> Danh sách
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setViewMode('grid')}
                    title="Dạng lưới thẻ"
                    style={{
                      backgroundColor: viewMode === 'grid' ? '#1E60E6' : '#F1F5F9',
                      color: viewMode === 'grid' ? '#FFFFFF' : '#64748B',
                      border: 'none',
                      borderRadius: '0 6px 6px 0',
                      padding: '4px 10px',
                      fontSize: '11px',
                      boxShadow: 'none'
                    }}
                  >
                    <FaThLarge className="me-1" style={{ fontSize: '11px' }} /> Lưới thẻ
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom row: Compact borderless inputs */}
            <Row className="g-2 align-items-center">
              <Col md={6} lg={5}>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tìm tên gói xét nghiệm hoặc mã gói..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    style={{
                      height: '35px',
                      fontSize: '12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#F1F5F9',
                      paddingLeft: '14px',
                      paddingRight: searchInput ? '34px' : '14px',
                      boxShadow: 'none'
                    }}
                  />
                  {searchInput && (
                    <button
                      type="button"
                      className="btn position-absolute top-50 end-0 translate-middle-y me-1 p-1 text-muted"
                      style={{ border: 'none', background: 'transparent', fontSize: '13px' }}
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
                    height: '35px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F1F5F9',
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
                    height: '35px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F1F5F9',
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
                    height: '35px',
                    fontSize: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#F1F5F9',
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
                borderRadius: '20px',
                border: 'none',
                boxShadow: 'none'
              }}
            >
              <div className="mb-3">
                <img
                  src="/assets/bms/svg/sections/packages/empty-state.svg"
                  alt="Không tìm thấy xét nghiệm"
                  style={{ height: '90px', objectFit: 'contain' }}
                />
              </div>
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
          ) : viewMode === 'list' ? (
            /* Spacious Full-Width Horizontal List View (Zero Awkward Line Breaking) */
            <div className="d-flex flex-column gap-3 mb-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '18px',
                    padding: '24px 28px',
                    border: 'none',
                    boxShadow: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  className="d-flex flex-column flex-xl-row align-items-xl-center justify-content-between gap-4"
                >
                  {/* Left Main Clinical Content (Spans Full Available Width, No Crowding) */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="d-flex align-items-center" style={{ gap: '24px' }}>
                      {/* Clinical SVG Specialty Icon (Centered Vertically, 25% Larger, No Background) */}
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

                      {/* Content Stack: Badges -> Full Title -> Description -> Biomarkers */}
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                            {pkg.category || 'Tổng Quát'}
                          </span>
                          <span
                            className="font-monospace text-muted"
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#F1F5F9',
                              padding: '1px 7px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {pkg.packageCode}
                          </span>
                          {pkg.isPopular && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#166534',
                                backgroundColor: '#DCFCE7',
                                padding: '1px 7px',
                                borderRadius: '6px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Phổ Biến
                            </span>
                          )}
                        </div>

                        {/* Row 2: Full Package Title (Full Horizontal Width, No Ellipsis Truncation) */}
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

                        {/* Row 3: Clinical Description */}
                        <p
                          className="mb-2 text-muted"
                          style={{
                            fontSize: '12.5px',
                            lineHeight: '1.6',
                            color: '#475569',
                            maxWidth: '920px'
                          }}
                        >
                          {pkg.description || 'Gói xét nghiệm lâm sàng phục vụ tầm soát và chẩn đoán định kỳ theo quy chuẩn ISO 15189.'}
                        </p>

                        {/* Row 4: Biomarkers / Tests Pills Preview */}
                        {Array.isArray(pkg.criteria) && pkg.criteria.length > 0 ? (
                          <div className="d-flex flex-wrap align-items-center gap-1.5">
                            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginRight: '4px' }}>
                              Chỉ số ({pkg.criteria.length}):
                            </span>
                            {pkg.criteria.slice(0, 8).map((c, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 650,
                                  color: '#334155',
                                  backgroundColor: '#F1F5F9',
                                  padding: '2px 7px',
                                  borderRadius: '5px'
                                }}
                              >
                                {c.code || c.name}
                              </span>
                            ))}
                            {pkg.criteria.length > 8 && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#1E60E6',
                                  backgroundColor: '#EFF6FF',
                                  padding: '2px 7px',
                                  borderRadius: '5px'
                                }}
                              >
                                +{pkg.criteria.length - 8} chỉ số khác
                              </span>
                            )}
                          </div>
                        ) : Array.isArray(pkg.testsIncluded) && pkg.testsIncluded.length > 0 ? (
                          <div className="d-flex flex-wrap align-items-center gap-1.5">
                            {pkg.testsIncluded.slice(0, 6).map((t, i) => (
                              <span
                                key={i}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: '#334155',
                                  backgroundColor: '#F1F5F9',
                                  padding: '2px 7px',
                                  borderRadius: '5px'
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Middle Dedicated Column: Specimen Standards & TAT SLA */}
                  <div
                    className="d-none d-lg-flex flex-column justify-content-center px-4 flex-shrink-0"
                    style={{
                      borderLeft: '1px solid #F1F5F9',
                      minWidth: '220px',
                      maxWidth: '260px'
                    }}
                  >
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      Quy Chuẩn Mẫu &amp; Thời Gian Trả
                    </div>

                    {/* Tube Specimen */}
                    <div className="d-flex align-items-center gap-2.5 mb-2">
                      <div style={{ width: '26px', height: '26px', borderRadius: '7px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FaVial style={{ color: '#1E60E6', fontSize: '12px' }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '10.5px', color: '#64748B', lineHeight: 1.2 }}>Ống lấy mẫu</div>
                        <div style={{ fontSize: '12px', fontWeight: 650, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pkg.sampleTube || 'Serum-Đỏ/Vàng'} {pkg.sampleVolumeMl ? `(${pkg.sampleVolumeMl} ml)` : ''}
                        </div>
                      </div>
                    </div>

                    {/* TAT SLA */}
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

                  {/* Right Commercial Block: Price & CTA Actions (Separated with clean vertical border) */}
                  <div
                    className="d-flex flex-row flex-xl-column align-items-xl-end justify-content-between justify-content-xl-center gap-3 ps-xl-4 flex-shrink-0"
                    style={{
                      borderLeft: '1px solid #F1F5F9',
                      minWidth: '220px'
                    }}
                  >
                    <div className="text-xl-end">
                      <div className="text-muted" style={{ fontSize: '11px', fontWeight: 550 }}>Đơn giá niêm yết:</div>
                      <div className="fw-bold tabular-nums" style={{ fontSize: '19px', color: '#0F172A', lineHeight: '1.2' }}>
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price)}
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 mt-1">
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{
                          backgroundColor: '#F1F5F9',
                          border: 'none',
                          borderRadius: '9999px',
                          padding: '7px 18px',
                          fontSize: '12px',
                          fontWeight: 650,
                          color: '#334155',
                          boxShadow: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleOpenDetail(pkg)}
                      >
                        Chi tiết
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm fw-bold"
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '9999px',
                          padding: '7px 22px',
                          fontSize: '12px',
                          boxShadow: 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleBook(pkg)}
                      >
                        Đặt lịch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Row className="g-4 mb-4">
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
        dialogClassName="bms-package-detail-dialog"
        contentClassName="bms-package-detail-content"
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
              <div className="bms-package-facts mb-3">
                <Row className="g-3">
                  <Col sm={6}>
                    <div style={{ color: '#64748B', fontSize: '11.5px' }}>Loại mẫu yêu cầu:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.sampleTube || 'Mẫu máu tĩnh mạch (Vô trùng)'} {selectedPackage.sampleVolumeMl ? `(${selectedPackage.sampleVolumeMl} ml)` : ''}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ color: '#64748B', fontSize: '11.5px' }}>Chuẩn bị trước lấy mẫu:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.fastingRule || 'Không cần nhịn ăn đặc biệt. Nên uống nhiều nước lọc và nghỉ ngơi 10 phút trước khi lấy mẫu.'}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ color: '#64748B', fontSize: '11.5px' }}>Thời gian trả kết quả:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.tat || '60 – 90 phút (Trả online &amp; SMS/Zalo)'}
                    </div>
                  </Col>
                  <Col sm={6}>
                    <div style={{ color: '#64748B', fontSize: '11.5px' }}>Đối tượng áp dụng:</div>
                    <div className="fw-bold" style={{ color: '#0F172A' }}>
                      {selectedPackage.targetAudience || 'Mọi đối tượng có nhu cầu kiểm tra sức khỏe và tầm soát bệnh lý.'}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* Included Biomarkers List */}
              <h5 className="fw-bold mb-2" style={{ fontSize: '14px', color: '#0F172A' }}>
                Danh Mục Chỉ Số Xét Nghiệm Trong Gói:
              </h5>

              {Array.isArray(selectedPackage.criteria) && selectedPackage.criteria.length > 0 ? (
                <div className="table-responsive bms-package-criteria">
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
                      {selectedPackage.criteria.map((c, i) => {
                        const iconUrl = getBiomarkerIconUrl(c.code);
                        return (
                          <tr key={i}>
                            <td className="fw-bold font-monospace" style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                              <div className="d-flex align-items-center gap-2">
                                {iconUrl && (
                                  <img
                                    src={iconUrl}
                                    alt=""
                                    style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }}
                                  />
                                )}
                                <span>{c.code || '-'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px' }}>{c.name || c.testName || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>{c.unit || '-'}</td>
                            <td style={{ padding: '8px 12px' }}>{c.referenceRange || c.refRange || 'Theo độ tuổi & giới tính'}</td>
                          </tr>
                        );
                      })}
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

              {/* Quality & Insurance Trust Callout */}
              <div className="mt-3 p-2.5 rounded-3 d-flex align-items-center gap-2" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '11.5px', color: '#475569' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>✓ Cam kết BMS:</span>
                <span>Kết quả chuẩn ISO 15189:2022, thẩm định chuyên môn 2 cấp, hỗ trợ chiết khấu BHYT và có Bác sĩ liên hệ tư vấn.</span>
              </div>
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
