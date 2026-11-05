/**
 * @file ServiceCatalogPage.jsx
 * @description Patient & Public Clinical Laboratory Service Catalog & Search Test Packages page (UC01 & UC20).
 * @issue I2-002 | BR-063 | Assignee: Hứa Khánh Duy | Reviewer: Võ Gia Huy
 * Features multi-facet search with 300ms debounce, category chips, sample tube filter, price range filter,
 * sorting, pagination, Table/Grid toggle (matching screens/02-patient.html UC20),
 * clinical detail modal with biomarker criteria table, and appointment booking.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Modal, Button, Form, Spinner, Alert, Table, Badge, Pagination } from 'react-bootstrap';
import { 
  FaSearch, 
  FaTimes, 
  FaVial, 
  FaClock, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaHospital,
  FaUserMd, 
  FaPhoneAlt,
  FaShieldAlt,
  FaArrowRight,
  FaCalendarCheck,
  FaHome,
  FaLock,
  FaSignOutAlt,
  FaThLarge,
  FaListUl,
  FaFilter,
  FaSortAmountDown
} from 'react-icons/fa';
import PortalNavbar from '../../home/components/PortalNavbar';
import MegaFooter from '../../home/components/MegaFooter';
import { useNavigate } from 'react-router-dom';
import { fetchServiceCatalog, searchTestPackages, fetchServiceById } from '../api/catalogApi';
import { getAvailableDoctors, getAvailableSlots, bookAppointment } from '../../appointment/api/appointmentApi';
import ServiceCard from '../components/ServiceCard';

const DEFAULT_HEALTH_CATEGORIES = [
  'Tất Cả Gói Khám',
  'Hematology',
  'Biochemistry',
  'Immunology',
  'Coagulation'
];

const PRICE_RANGES = [
  { id: 'all', label: 'Mọi mức giá', minPrice: '', maxPrice: '' },
  { id: 'under200', label: 'Dưới 200.000 ₫', minPrice: '', maxPrice: 200000 },
  { id: '200to350', label: '200.000 ₫ – 350.000 ₫', minPrice: 200000, maxPrice: 350000 },
  { id: 'over350', label: 'Trên 350.000 ₫', minPrice: 350000, maxPrice: '' },
];

const SAMPLE_TUBES = [
  { value: '', label: 'Tất cả ống mẫu (Specimen)' },
  { value: 'EDTA', label: 'EDTA (Ống nắp tím - Huyết học)' },
  { value: 'Serum', label: 'Serum / SST (Ống nắp vàng/đỏ - Sinh hóa)' },
  { value: 'Heparin', label: 'Lithium Heparin (Ống nắp xanh lá)' },
  { value: 'Citrate', label: 'Sodium Citrate (Ống nắp xanh dương - Đông máu)' },
];

function normalizePackageItem(p, idx = 0) {
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
    description: p.description || 'Gói xét nghiệm y khoa đạt chuẩn ISO 15189 tại phòng xét nghiệm BMS.',
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

  // Read initial ?search= param from URL
  const [searchInput, setSearchInput] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('search') || params.get('keyword') || '';
    } catch {
      return '';
    }
  });
  const [debouncedSearch, setDebouncedSearch] = useState(searchInput);
  const [categories, setCategories] = useState(DEFAULT_HEALTH_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('Tất Cả Gói Khám');
  const [sampleTube, setSampleTube] = useState('');
  const [priceRangeId, setPriceRangeId] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('category');
  const [sortDir, setSortDir] = useState('asc');
  const [viewMode, setViewMode] = useState('table'); // 'table' (UC20 default) | 'grid'

  // Pagination state
  const [packages, setPackages] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Modal Detail State
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

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
  const navigate = useNavigate();
  const [selectedShiftId, setSelectedShiftId] = useState('Morning');
  const [availableShifts, setAvailableShifts] = useState([]);
  const [shiftSlots, setShiftSlots] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);

  // Load shifts & assigned rooms for booking date
  useEffect(() => {
    if (!bookingForm.bookingDate) return;
    let isMounted = true;
    getAvailableDoctors(bookingForm.bookingDate)
      .then((list) => {
        if (isMounted) setAvailableShifts(list || []);
      })
      .catch(() => {
        if (isMounted) setAvailableShifts([]);
      });
    return () => { isMounted = false; };
  }, [bookingForm.bookingDate]);

  // Map active shift to doctor & room
  const activeShiftData = React.useMemo(() => {
    const found = availableShifts.find(
      (s) => (s.shiftType || '').toLowerCase() === selectedShiftId.toLowerCase()
    );
    if (found) return found;

    if (selectedShiftId === 'Afternoon') {
      return {
        doctorId: '670560000000000000000002',
        doctorName: 'BS. CKI Nguyễn Văn Minh',
        specialty: 'Huyết học & Miễn dịch học lâm sàng',
        shiftType: 'Afternoon',
        shiftStart: '13:00',
        shiftEnd: '17:00',
        roomId: 'ROOM-102',
        roomName: 'Phòng Lấy Mẫu & Khám Chuyên Sâu 102',
        roomNumber: '102',
        floor: 'Tầng 1 - Khu A'
      };
    }
    if (selectedShiftId === 'Evening') {
      return {
        doctorId: '670560000000000000000002',
        doctorName: 'BS. CKI Nguyễn Văn Minh',
        specialty: 'Huyết học & Miễn dịch học lâm sàng',
        shiftType: 'Evening',
        shiftStart: '17:30',
        shiftEnd: '20:30',
        roomId: 'ROOM-103',
        roomName: 'Phòng Tư Vấn Kết Quả & Xét Nghiệm Nhanh',
        roomNumber: '103',
        floor: 'Tầng 1 - Khu A'
      };
    }
    return {
      doctorId: '670560000000000000000002',
      doctorName: 'BS. CKI Nguyễn Văn Minh',
      specialty: 'Huyết học & Miễn dịch học lâm sàng',
      shiftType: 'Morning',
      shiftStart: '07:00',
      shiftEnd: '11:30',
      roomId: 'ROOM-101',
      roomName: 'Phòng khám Huyết học Tổng quát 1',
      roomNumber: '101',
      floor: 'Tầng 1 - Khu A'
    };
  }, [availableShifts, selectedShiftId]);

  // Load available slots inside active shift
  useEffect(() => {
    if (!activeShiftData?.doctorId || !bookingForm.bookingDate) return;
    let isMounted = true;
    getAvailableSlots(activeShiftData.doctorId, bookingForm.bookingDate)
      .then((res) => {
        if (!isMounted) return;
        const all = res?.slots || [];
        const start = activeShiftData.shiftStart || '07:00';
        const end = activeShiftData.shiftEnd || '11:30';
        const filtered = all.filter((s) => s >= start && s < end);
        const finalSlots = filtered.length > 0 ? filtered : (
          selectedShiftId === 'Morning'
            ? ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']
            : selectedShiftId === 'Afternoon'
              ? ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
              : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00']
        );
        setShiftSlots(finalSlots);
        if (!finalSlots.includes(bookingForm.bookingSlot)) {
          setBookingForm((prev) => ({ ...prev, bookingSlot: finalSlots[0] || '08:00' }));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const defaultSlots = selectedShiftId === 'Morning'
          ? ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00']
          : selectedShiftId === 'Afternoon'
            ? ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']
            : ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
        setShiftSlots(defaultSlots);
        setBookingForm((prev) => ({ ...prev, bookingSlot: defaultSlots[0] }));
      });
    return () => { isMounted = false; };
  }, [activeShiftData, bookingForm.bookingDate, selectedShiftId]);


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

  // Load distinct categories once from catalog endpoint
  useEffect(() => {
    fetchServiceCatalog()
      .then((res) => {
        if (res?.categories && res.categories.length > 0) {
          const distinctCats = ['Tất Cả Gói Khám', ...res.categories.filter(c => c && c !== 'Tất Cả Gói Khám')];
          setCategories(distinctCats);
        }
      })
      .catch(() => {});
  }, []);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Handle price range preset change
  const handlePriceRangeChange = (rangeId) => {
    setPriceRangeId(rangeId);
    const found = PRICE_RANGES.find(r => r.id === rangeId);
    if (found) {
      setMinPrice(found.minPrice);
      setMaxPrice(found.maxPrice);
    }
    setPage(1);
  };

  // Execute searchTestPackages against backend API (UC20)
  const executeSearch = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const res = await searchTestPackages({
        keyword: debouncedSearch || undefined,
        category: selectedCategory !== 'Tất Cả Gói Khám' ? selectedCategory : undefined,
        sampleTube: sampleTube || undefined,
        minPrice: minPrice !== '' ? minPrice : undefined,
        maxPrice: maxPrice !== '' ? maxPrice : undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      });

      const rawItems = res?.items || res?.packages || [];
      const normalized = rawItems.map((p, idx) => normalizePackageItem(p, idx));
      setPackages(normalized);
      setTotalItems(res?.totalItems ?? res?.totalCount ?? normalized.length);
      setTotalPages(res?.totalPages || Math.ceil((res?.totalItems || normalized.length) / pageSize) || 1);
    } catch (err) {
      console.error('[ServiceCatalogPage] Failed to search test packages:', err);
      setLoadError(err.response?.data?.message || err.response?.data?.title || err.message || 'Không thể tìm kiếm danh mục gói xét nghiệm từ máy chủ.');
      setPackages([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, sampleTube, minPrice, maxPrice, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleClearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('Tất Cả Gói Khám');
    setSampleTube('');
    setPriceRangeId('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('category');
    setSortDir('asc');
    setPage(1);
  };

  const handleOpenDetail = async (pkg) => {
    setSelectedPackage(pkg);
    setShowDetailModal(true);
    if (pkg?.id || pkg?.packageCode) {
      setDetailLoading(true);
      try {
        const detail = await fetchServiceById(pkg.id || pkg.packageCode);
        if (detail) {
          setSelectedPackage(normalizePackageItem(detail));
        }
      } catch {
        // Keep existing package object if detail endpoint fails
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleOpenBooking = (pkg) => {
    if (!user) {
      setShowRequireLoginModal(true);
      return;
    }
    const pkgId = pkg?.packageCode || pkg?.id || '';
    navigate(pkgId ? `/appointments/book?packageId=${encodeURIComponent(pkgId)}` : '/appointments/book');
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingForm.patientName.trim() || !bookingForm.phoneNumber.trim()) {
      return;
    }
    setBookingLoading(true);
    setBookingError(null);
    try {
      const payload = {
        patientId: user?.patientId || user?.id || 'BN-2026-670560000000000000000010',
        doctorId: activeShiftData.doctorId,
        appointmentDate: bookingForm.bookingDate,
        slotTime: bookingForm.bookingSlot,
        packageIds: [bookingPackage.id || bookingPackage.packageCode],
        notes: bookingForm.notes
          ? `${bookingForm.notes} (Bác sĩ: ${activeShiftData.doctorName} - Phòng: ${activeShiftData.roomName})`
          : `Phòng khám: ${activeShiftData.roomName} (${activeShiftData.roomNumber})`,
        type: 'ClinicVisit'
      };
      const res = await bookAppointment(payload);
      setBookingCode(res?.appointmentCode || `APT-${Date.now().toString().slice(-6)}`);
      setBookingSuccess(true);
    } catch (err) {
      setBookingError(err?.message || 'Không thể tạo cuộc hẹn. Vui lòng thử lại.');
    } finally {
      setBookingLoading(false);
    }
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    selectedCategory !== 'Tất Cả Gói Khám' ||
    Boolean(sampleTube) ||
    minPrice !== '' ||
    maxPrice !== '';

  return (
    <div className="bms-landing-wrapper">
      <PortalNavbar user={user} />

      {/* 3. CATALOG HERO SECTION */}
      <section className="py-4" style={{ background: 'linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%)', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div className="text-center mx-auto mb-3" style={{ maxWidth: 840 }}>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2"
                 style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em' }}>
              <FaShieldAlt /> TRA CỨU & TÌM KIẾM GÓI XÉT NGHIỆM (UC20 - ISO 15189:2012)
            </div>
            <h2 className="fw-bold text-dark mb-2" style={{ fontSize: '28px', color: '#0f172a' }}>
              Tìm Kiếm Gói Xét Nghiệm & Chỉ Số Lâm Sàng
            </h2>
            <p className="text-secondary mb-3" style={{ fontSize: '15px' }}>
              Tra cứu theo tên gói, mã gói (CBC, LIPID, LFT...), tên chỉ số sinh học (WBC, GLU, HbA1c, ALT...), loại ống mẫu hoặc khoảng giá.
            </p>
          </div>

          {/* Advanced Multi-Facet Search Toolbar Card (matching UC20 screen) */}
          <div className="bg-white p-3 rounded-4 shadow-sm border">
            <Row className="g-2 align-items-center">
              <Col xs={12} lg={4}>
                <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-primary">
                    <FaSearch />
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Nhập từ khóa, mã gói, chỉ số (VD: Lipid, CBC, GLU, EDTA...)"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      className="btn btn-outline-secondary border-start-0"
                      type="button"
                      onClick={() => setSearchInput('')}
                      title="Xóa từ khóa"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
              </Col>

              <Col xs={6} md={3} lg={2}>
                <Form.Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'Tất Cả Gói Khám' ? 'Tất cả chuyên khoa' : cat}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={6} md={3} lg={2}>
                <Form.Select
                  value={sampleTube}
                  onChange={(e) => {
                    setSampleTube(e.target.value);
                    setPage(1);
                  }}
                >
                  {SAMPLE_TUBES.map((tube) => (
                    <option key={tube.value} value={tube.value}>
                      {tube.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={6} md={3} lg={2}>
                <Form.Select
                  value={priceRangeId}
                  onChange={(e) => handlePriceRangeChange(e.target.value)}
                >
                  {PRICE_RANGES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={6} md={3} lg={2}>
                <div className="d-flex gap-1">
                  <Form.Select
                    value={`${sortBy}:${sortDir}`}
                    onChange={(e) => {
                      const [sb, sd] = e.target.value.split(':');
                      setSortBy(sb);
                      setSortDir(sd);
                      setPage(1);
                    }}
                    title="Sắp xếp kết quả"
                  >
                    <option value="category:asc">Sắp xếp: Chuyên khoa</option>
                    <option value="price:asc">Giá: Thấp → Cao</option>
                    <option value="price:desc">Giá: Cao → Thấp</option>
                    <option value="name:asc">Tên gói: A → Z</option>
                    <option value="code:asc">Mã gói: A → Z</option>
                  </Form.Select>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </section>

      {/* 4. MAIN CATALOG BODY */}
      <main className="py-4">
        <div className="container" style={{ maxWidth: 1200 }}>
          {/* Category Quick Chips + View Switcher Bar */}
          <div className="mb-3 p-3 bg-white rounded-4 shadow-sm border d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="fw-bold small text-dark me-1"><FaFilter className="me-1 text-primary" />Chuyên khoa:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                    selectedCategory === cat
                      ? 'btn-primary'
                      : 'btn-light text-secondary border'
                  }`}
                  style={{
                    backgroundColor: selectedCategory === cat ? '#1e40af' : '#f8fafc',
                    borderColor: selectedCategory === cat ? '#1e40af' : '#e2e8f0',
                    fontSize: '12px'
                  }}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="text-muted small">
                Tìm thấy: <strong className="text-primary">{totalItems}</strong> gói xét nghiệm
              </div>
              <div className="btn-group btn-group-sm" role="group" aria-label="Chế độ hiển thị">
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                  onClick={() => setViewMode('table')}
                  title="Hiển thị dạng bảng (Chuẩn UC20)"
                >
                  <FaListUl className="me-1" /> Bảng
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'outline-secondary'}
                  onClick={() => setViewMode('grid')}
                  title="Hiển thị dạng thẻ"
                >
                  <FaThLarge className="me-1" /> Thẻ
                </Button>
              </div>
            </div>
          </div>

          {/* Active Filter Chips Banner */}
          {hasActiveFilters && (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 px-2">
              <div className="d-flex flex-wrap align-items-center gap-2 small">
                <span className="text-muted">Đang lọc theo:</span>
                {debouncedSearch && (
                  <Badge bg="primary" className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-normal">
                    Từ khóa: "{debouncedSearch}"
                    <FaTimes style={{ cursor: 'pointer' }} onClick={() => setSearchInput('')} />
                  </Badge>
                )}
                {selectedCategory !== 'Tất Cả Gói Khám' && (
                  <Badge bg="info" text="dark" className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-normal">
                    Chuyên khoa: {selectedCategory}
                    <FaTimes style={{ cursor: 'pointer' }} onClick={() => setSelectedCategory('Tất Cả Gói Khám')} />
                  </Badge>
                )}
                {sampleTube && (
                  <Badge bg="secondary" className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-normal">
                    Ống mẫu: {sampleTube}
                    <FaTimes style={{ cursor: 'pointer' }} onClick={() => setSampleTube('')} />
                  </Badge>
                )}
                {priceRangeId !== 'all' && (
                  <Badge bg="warning" text="dark" className="d-inline-flex align-items-center gap-1 px-2 py-1 fw-normal">
                    Giá: {PRICE_RANGES.find(r => r.id === priceRangeId)?.label}
                    <FaTimes style={{ cursor: 'pointer' }} onClick={() => handlePriceRangeChange('all')} />
                  </Badge>
                )}
              </div>
              <Button variant="link" size="sm" className="text-decoration-none p-0" onClick={handleClearAllFilters}>
                Xóa tất cả bộ lọc
              </Button>
            </div>
          )}

          {loadError && (
            <Alert variant="danger" dismissible onClose={() => setLoadError(null)} className="mb-3">
              <FaExclamationTriangle className="me-2" />
              {loadError}
            </Alert>
          )}

          {/* Results Body */}
          {viewMode === 'table' ? (
            /* UC20 Table View with FIXED column layout and persistent structure */
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
              <div className="w-100 overflow-hidden">
                <Table hover className="align-middle mb-0 table-sm" style={{ tableLayout: 'fixed', width: '100%', fontSize: '0.86rem' }}>
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4" style={{ width: '28%' }}>Tên Gói Xét Nghiệm & Mô Tả</th>
                      <th style={{ width: '10%' }}>Mã Gói</th>
                      <th style={{ width: '12%' }}>Chuyên Khoa</th>
                      <th className="text-center" style={{ width: '8%' }}>Chỉ Số</th>
                      <th style={{ width: '14%' }}>Ống Mẫu (Specimen)</th>
                      <th style={{ width: '11%' }}>Chuẩn Bị</th>
                      <th className="text-end" style={{ width: '10%' }}>Đơn Giá (₫)</th>
                      <th className="text-end pe-4" style={{ width: '7%' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-5 text-muted">
                          <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                          <span className="fw-semibold">Đang tìm kiếm gói xét nghiệm từ máy chủ BMS...</span>
                        </td>
                      </tr>
                    ) : packages.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-5">
                          <div className="text-muted mb-2 fs-2">
                            <FaVial />
                          </div>
                          <div className="fw-bold text-dark fs-6 mb-1">Không Tìm Thấy Gói Xét Nghiệm Phù Hợp</div>
                          <p className="text-muted small mb-3">
                            Không có gói xét nghiệm nào khớp với điều kiện tìm kiếm hiện tại. Vui lòng thử từ khóa khác hoặc xóa bộ lọc.
                          </p>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={handleClearAllFilters}
                          >
                            Xóa Bộ Lọc & Xem Tất Cả
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      packages.map((pkg) => (
                        <tr key={pkg.id || pkg.packageCode}>
                          <td className="ps-4 text-truncate">
                            <div className="fw-bold text-dark text-truncate" title={pkg.packageName}>{pkg.packageName}</div>
                            <div
                              className="text-muted small text-truncate"
                              title={pkg.criteria?.length > 0 ? pkg.criteria.map(c => c.code || c.name).join(', ') : pkg.description}
                            >
                              {pkg.criteria?.length > 0
                                ? pkg.criteria.map(c => c.code || c.name).join(', ')
                                : pkg.description}
                            </div>
                          </td>
                          <td className="text-truncate">
                            <span className="badge bg-light text-dark border font-monospace text-truncate d-inline-block" style={{ maxWidth: '100%' }}>
                              {pkg.packageCode}
                            </span>
                          </td>
                          <td className="text-truncate">
                            <Badge bg="primary" className="bg-opacity-10 text-primary fw-semibold px-2 py-1 text-truncate d-inline-block" style={{ maxWidth: '100%' }}>
                              {pkg.category}
                            </Badge>
                          </td>
                          <td className="text-center text-truncate">
                            <Badge bg="info" text="dark" className="bg-opacity-15 fw-semibold">
                              {pkg.criteria?.length || pkg.testsIncluded?.length || 1} chỉ số
                            </Badge>
                          </td>
                          <td className="text-truncate">
                            <span className="badge bg-warning bg-opacity-15 text-dark border border-warning-subtle text-truncate d-inline-flex align-items-center" style={{ maxWidth: '100%' }}>
                              <FaVial className="me-1 text-warning flex-shrink-0" />
                              <span className="text-truncate">{pkg.sampleTube}</span>
                            </span>
                          </td>
                          <td className="text-truncate">
                            <span className="small text-secondary text-truncate d-block" title={pkg.fastingRule}>{pkg.fastingRule}</span>
                          </td>
                          <td className="text-end fw-bold font-monospace text-danger text-truncate">
                            {Number(pkg.price).toLocaleString('vi-VN')} ₫
                          </td>
                          <td className="text-end pe-4">
                            <div className="d-inline-flex gap-1">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                className="px-2 py-1"
                                style={{ fontSize: '0.78rem' }}
                                onClick={() => handleOpenDetail(pkg)}
                                title="Xem chi tiết"
                              >
                                Chi tiết
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                className="px-2 py-1"
                                style={{ backgroundColor: '#1e40af', borderColor: '#1e40af', fontSize: '0.78rem' }}
                                onClick={() => handleOpenBooking(pkg)}
                                title="Đặt lịch"
                              >
                                Đặt
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Persistent Table Footer */}
              <div className="card-footer bg-light border-top p-3 d-flex flex-wrap justify-content-between align-items-center small text-muted">
                <span>
                  Hiển thị <strong>{packages.length}</strong> / <strong>{totalItems}</strong> gói xét nghiệm. Giá đã bao gồm phí lấy mẫu và phân tích chuẩn ISO 15189.
                </span>
                {totalPages > 1 && (
                  <Pagination size="sm" className="m-0">
                    <Pagination.Prev disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} />
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                      <Pagination.Item key={pNum} active={pNum === page} onClick={() => setPage(pNum)}>
                        {pNum}
                      </Pagination.Item>
                    ))}
                    <Pagination.Next disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} />
                  </Pagination>
                )}
              </div>
            </div>
          ) : (
            /* Grid Card View */
            <>
              {loading ? (
                <div className="text-center py-5 bg-white rounded-4 shadow-sm border mb-4">
                  <Spinner animation="border" variant="primary" role="status" />
                  <div className="mt-3 text-muted fw-semibold">Đang tìm kiếm gói xét nghiệm từ máy chủ BMS...</div>
                </div>
              ) : packages.length === 0 ? (
                <div className="card border-0 shadow-sm rounded-4 text-center p-5 mx-auto mb-4" style={{ maxWidth: 540 }}>
                  <div className="text-muted mb-3" style={{ fontSize: 48 }}>
                    <FaVial />
                  </div>
                  <h5 className="fw-bold text-dark">Không Tìm Thấy Gói Xét Nghiệm Phù Hợp</h5>
                  <p className="text-muted small">
                    Không có gói xét nghiệm nào khớp với điều kiện tìm kiếm hiện tại. Vui lòng thử từ khóa khác hoặc xóa bộ lọc.
                  </p>
                  <div className="mt-2">
                    <Button
                      variant="outline-primary"
                      className="rounded-pill px-4"
                      onClick={handleClearAllFilters}
                    >
                      Xóa Bộ Lọc & Xem Tất Cả
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Row className="g-4 mb-4">
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
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center mt-4">
                      <Pagination>
                        <Pagination.Prev disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} />
                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pNum) => (
                          <Pagination.Item key={pNum} active={pNum === page} onClick={() => setPage(pNum)}>
                            {pNum}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      {/* 5. CLINICAL SERVICE DETAIL POPUP MODAL */}
      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} centered size="lg">
        {selectedPackage && (
          <>
            <Modal.Header closeButton className="border-bottom pb-3 bg-light">
              <Modal.Title className="fw-bold d-flex align-items-center gap-2 h5 mb-0 text-dark">
                <div style={{
                  width: 38,
                  height: 38,
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
                  <div className="text-muted small fw-normal font-monospace">
                    Mã gói: {selectedPackage.packageCode} · Chuyên khoa: {selectedPackage.category}
                  </div>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              {detailLoading && (
                <div className="text-center py-2 mb-3">
                  <Spinner animation="border" size="sm" variant="primary" className="me-2" />
                  <span className="small text-muted">Đang đồng bộ chi tiết chỉ số...</span>
                </div>
              )}

              {/* Meaning & Clinical Purpose */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-2">Ý Nghĩa Y Khoa & Mô Tả Gói Xét Nghiệm</h6>
                <p className="text-secondary mb-2" style={{ fontSize: '14px' }}>
                  {selectedPackage.description}
                </p>
                {selectedPackage.targetAudience && (
                  <div className="p-2 rounded-2 bg-light border text-muted small">
                    <strong>Đối tượng khuyến nghị:</strong> {selectedPackage.targetAudience}
                  </div>
                )}
              </div>

              {/* Biomarker Criteria Table from BE */}
              <div className="mb-4">
                <h6 className="fw-bold text-dark mb-2">
                  Danh Sách Chỉ Số Sinh Học Trong Gói ({selectedPackage.criteria?.length || selectedPackage.testsIncluded?.length || 0} chỉ số)
                </h6>
                {selectedPackage.criteria && selectedPackage.criteria.length > 0 ? (
                  <div className="table-responsive border rounded-3">
                    <Table size="sm" hover className="mb-0 align-middle">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">#</th>
                          <th>Mã Chỉ Số</th>
                          <th>Tên Chỉ Số Xét Nghiệm</th>
                          <th>Đơn Vị Đo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPackage.criteria.map((c, idx) => (
                          <tr key={c.criterionId || c.code || idx}>
                            <td className="ps-3 text-muted small">{c.displayOrder || idx + 1}</td>
                            <td>
                              <span className="badge bg-primary bg-opacity-10 text-primary font-monospace">
                                {c.code}
                              </span>
                            </td>
                            <td className="fw-medium text-dark">{c.name}</td>
                            <td className="text-muted font-monospace small">{c.unit || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {(selectedPackage.testsIncluded || []).map((t, idx) => (
                      <span key={idx} className="badge bg-white text-dark border px-3 py-2 fw-semibold" style={{ fontSize: '12px' }}>
                        <FaCheckCircle className="text-primary me-1" /> {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Sample & TAT Specs */}
              <Row className="g-3 mb-4">
                <Col md={6}>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="small text-muted mb-1">Loại Ống Mẫu & Thể Tích:</div>
                    <div className="fw-bold text-dark">{selectedPackage.sampleTube}</div>
                    <div className="small text-muted mt-1">Thể tích yêu cầu: {selectedPackage.sampleVolumeMl || 2} mL</div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="p-3 bg-light rounded-3 border">
                    <div className="small text-muted mb-1">Thời Gian Trả Kết Quả (TAT):</div>
                    <div className="fw-bold text-success">{selectedPackage.tat || '90 - 120 Phút'}</div>
                    <div className="small text-muted mt-1">Trả kết quả trực tuyến kèm chữ ký số Bác sĩ</div>
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
                  <li><strong>Chất kích thích:</strong> Không dùng rượu, bia, cà phê trong vòng 12–24 giờ trước khi lấy mẫu.</li>
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
            Để tiến hành đặt lịch lấy mẫu và quản lý kết quả xét nghiệm bảo mật, vui lòng đăng nhập tài khoản BMS.
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
      

      <MegaFooter />
    </div>
  );
}
