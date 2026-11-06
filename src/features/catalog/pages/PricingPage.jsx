/**
 * @file PricingPage.jsx
 * @description Official Medical Laboratory Fee Schedule & Tariff (Bảng Giá Niêm Yết Dịch Vụ Xét Nghiệm).
 * Conforms to: Ministry of Health (Thông tư 13/2019/TT-BYT & Nghị định 123/2020/NĐ-CP), ISO 15189:2022.
 * Pure Flat Design: Geist typography, high contrast, zero blurry shadows.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Table, Spinner, Badge, Button, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaVial, FaClock, FaCheckCircle, FaShieldAlt, FaPrint, FaCalendarAlt } from 'react-icons/fa';
import PortalNavbar from '../../home/components/PortalNavbar';
import PageHeader from '../../../components/ui/PageHeader';
import MegaFooter from '../../home/components/MegaFooter';
import { searchTestPackages } from '../api/catalogApi';

export default function PricingPage() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await searchTestPackages({ pageSize: 50 });
        if (isMounted) {
          setPackages(Array.isArray(res?.items) ? res.items : []);
        }
      } catch (err) {
        console.error('Error fetching pricing items:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  // One row per real service package returned by the API (no derived or invented prices)
  const pricingItems = useMemo(
    () =>
      packages.map((pkg) => ({
        id: pkg.id || pkg.packageCode,
        code: pkg.packageCode || pkg.code || '',
        name: pkg.packageName || pkg.name || '',
        category: pkg.category || '',
        sampleTube: pkg.sampleTube || '',
        tat: pkg.tat || '',
        price: Number(pkg.price) || 0,
        type: 'PACKAGE',
        criteriaCount: Array.isArray(pkg.criteria) ? pkg.criteria.length : 0
      })),
    [packages]
  );

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set();
    pricingItems.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [pricingItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return pricingItems.filter(item => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [pricingItems, selectedCategory, searchQuery]);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      <PortalNavbar />

      {/* 1. Top Executive Spotlight Header (Pure 2D Flat Card Container) */}
      <section className="pt-4 pb-2">
        <div className="container" style={{ maxWidth: '1400px' }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: 'none',
              boxShadow: 'none',
              padding: '36px 40px'
            }}
          >
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-4">
              <div>
                <div className="d-flex align-items-center gap-2 mb-3" style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, letterSpacing: '0.04em' }}>
                  <img src="/assets/lab-icon.png" alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
                  <span>TIÊU CHUẨN ISO 15189:2022 · NIÊM YẾT MINH BẠCH 100%</span>
                </div>
                <h1 className="fw-bold mb-3" style={{ fontSize: '32px', color: '#0F172A', letterSpacing: '-0.03em', lineHeight: '1.2' }}>
                  Bảng Giá Niêm Yết Dịch Vụ Xét Nghiệm
                </h1>
                <p className="mb-0 text-muted" style={{ fontSize: '13.5px', maxWidth: '820px', lineHeight: '1.7', color: '#475569' }}>
                  Toàn bộ đơn giá được công khai minh bạch theo quy chuẩn của Bộ Y Tế. Áp dụng thanh toán BHYT đúng tuyến &amp; thông tuyến, xuất hóa đơn điện tử VAT 0% theo Nghị định 123/2020/NĐ-CP.
                </p>
              </div>
              <div className="d-flex gap-2 align-items-center flex-shrink-0">
                <button
                  type="button"
                  className="btn"
                  onClick={() => window.print()}
                  style={{
                    fontSize: '13px',
                    fontWeight: 650,
                    padding: '9px 20px',
                    backgroundColor: '#F1F5F9',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#334155',
                    boxShadow: 'none'
                  }}
                >
                  <FaPrint className="me-2" style={{ fontSize: '12px' }} /> In Bảng Giá
                </button>
                <Link
                  to="/appointments/book"
                  className="btn"
                  style={{
                    fontSize: '13px',
                    fontWeight: 650,
                    padding: '9px 22px',
                    backgroundColor: '#1E60E6',
                    border: 'none',
                    borderRadius: '9999px',
                    color: '#FFFFFF',
                    boxShadow: 'none'
                  }}
                >
                  <FaCalendarAlt className="me-2" style={{ fontSize: '12px' }} /> Đặt Lịch Khám
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filter & Search Toolbar Section */}
      <section className="pt-2 pb-1">
        <Container style={{ maxWidth: '1400px' }}>
          
          {/* Unified Toolbar Card - Pure 2D Flat, Zero Border */}
          <div
            className="mb-2"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: 'none',
              boxShadow: 'none',
              padding: '20px 24px'
            }}
          >
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              
              {/* Search Input - Clean High-Contrast Input with No Collision */}
              <div className="position-relative" style={{ maxWidth: '460px', width: '100%' }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#1E60E6',
                    fontSize: '14px',
                    pointerEvents: 'none',
                    zIndex: 2
                  }}
                />
                <input
                  type="text"
                  placeholder="Tìm mã xét nghiệm (CBC, GLU, ALT...) hoặc tên chỉ số..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: '44px',
                    paddingLeft: '46px',
                    paddingRight: searchQuery ? '38px' : '18px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#F1F5F9',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#0F172A',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      fontSize: '13px',
                      padding: '4px 6px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills & Count */}
              <div className="d-flex flex-wrap align-items-center gap-2">
                {categories.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '9999px',
                        fontSize: '12.5px',
                        fontWeight: isActive ? 700 : 550,
                        border: 'none',
                        backgroundColor: isActive ? '#1E60E6' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                        boxShadow: 'none'
                      }}
                    >
                      {cat === 'ALL' ? 'Tất Cả Danh Mục' : cat}
                    </button>
                  );
                })}

                <div className="ms-auto text-muted small ps-2" style={{ fontSize: '12px', fontWeight: 550, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                  Hiển thị <strong>{filteredItems.length}</strong> / {pricingItems.length} dịch vụ
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 3. Independent Table Section (Pure 2D Flat Canvas Section - Zero Border) */}
      <section className="bms-pricing-table-section py-2">
        <Container style={{ maxWidth: '1400px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: 'none',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: 'none'
            }}
          >
            <div className="table-responsive">
              <Table hover className="align-middle mb-0" style={{ fontSize: '13px' }}>
                <thead style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1' }}>
                  <tr>
                    <th className="ps-4 py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: '#F1F5F9' }}>Mã Dịch Vụ</th>
                    <th className="py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '280px', backgroundColor: '#F1F5F9' }}>Tên Xét Nghiệm / Chỉ Số Sinh Học</th>
                    <th className="py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: '#F1F5F9' }}>Chuyên Khoa</th>
                    <th className="py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: '#F1F5F9' }}>Ống Bệnh Phẩm</th>
                    <th className="py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: '#F1F5F9' }}>Thời Gian (TAT)</th>
                    <th className="text-end py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: '#F1F5F9' }}>Đơn Giá Niêm Yết</th>
                    <th className="text-end pe-4 py-3" style={{ color: '#0F172A', fontWeight: 750, fontSize: '11.5px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: '#F1F5F9' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        <Spinner animation="border" size="sm" className="me-2" style={{ color: '#1E60E6' }} />
                        <span>Đang tải bảng giá niêm yết từ hệ thống phòng xét nghiệm BMS...</span>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        <div className="fw-semibold text-dark mb-1">Không tìm thấy xét nghiệm phù hợp</div>
                        <div className="small text-muted">Vui lòng nhập từ khóa khác hoặc chọn Tất Cả Danh Mục.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id}>
                        <td className="ps-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontWeight: 700,
                            fontSize: '11.5px',
                            backgroundColor: item.type === 'PACKAGE' ? '#EEF4FD' : '#F1F5F9',
                            color: item.type === 'PACKAGE' ? '#1E60E6' : '#475569',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3" style={{ minWidth: '280px' }}>
                          <div className="fw-semibold" style={{ color: '#0F172A', fontSize: '13px', lineHeight: '1.4' }}>
                            {item.name}
                            {item.type === 'PACKAGE' && item.criteriaCount > 0 && (
                              <Badge className="ms-2" style={{ backgroundColor: '#EEF4FD', color: '#1E60E6', fontWeight: 600, fontSize: '10.5px', border: 'none' }}>
                                Gói ({item.criteriaCount} chỉ số)
                              </Badge>
                            )}
                          </div>
                          {item.parentPackage && (
                            <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                              Thuộc gói: {item.parentPackage}
                            </div>
                          )}
                          {item.unit && (
                            <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                              Đơn vị: {item.unit}
                            </div>
                          )}
                        </td>
                        <td className="py-3" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '9999px'
                          }}>
                            {item.category || '-'}
                          </span>
                        </td>
                        <td className="py-3" style={{ whiteSpace: 'nowrap' }}>
                          {item.sampleTube ? (
                            <div className="d-flex align-items-center gap-1.5" style={{ color: '#475569', fontSize: '12px' }}>
                              <FaVial style={{ color: '#1E60E6', fontSize: '11px', marginRight: '4px' }} />
                              <span>{item.sampleTube}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>-</span>
                          )}
                        </td>
                        <td className="py-3" style={{ whiteSpace: 'nowrap' }}>
                          {item.tat ? (
                            <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: '12px' }}>
                              <FaClock style={{ fontSize: '11px', marginRight: '4px' }} />
                              <span>{item.tat}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>-</span>
                          )}
                        </td>
                        <td className="text-end py-3" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(item.price).toLocaleString('vi-VN')} ₫
                          </span>
                        </td>
                        <td className="text-end pe-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/appointments/book?packageId=${item.id}&packageName=${encodeURIComponent(item.name)}`)}
                            style={{
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '9999px',
                              padding: '6px 16px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: 'none'
                            }}
                          >
                            Đặt Lịch
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          </div>
        </Container>
      </section>

      {/* 4. Compliance & Policy Footer Card (Pure 2D Flat, Zero Border) */}
      <section className="py-3 pb-5">
        <Container style={{ maxWidth: '1400px' }}>
          <div
            className="p-4"
            style={{
              backgroundColor: '#FFFFFF',
              border: 'none',
              borderRadius: '20px',
              boxShadow: 'none'
            }}
          >
            <h6 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '13.5px' }}>
              Quy Định Về Giá Dịch Vụ &amp; Thanh Toán Viện Phí
            </h6>
            <ul className="mb-0 text-muted small ps-3" style={{ lineHeight: '1.7', fontSize: '12.5px' }}>
              <li>Bảng giá đã bao gồm toàn bộ vật tư y tế tiêu hao (kim lấy máu chân không, ống chân không có gel tách huyết thanh, bông cồn sát khuẩn). Không phụ thu bất kỳ khoản chi phí ẩn nào.</li>
              <li>Bệnh nhân có thẻ Bảo Hiểm Y Tế (BHYT) được hưởng mức chi trả theo quy định hiện hành khi có chỉ định của bác sĩ tại phòng khám BMS.</li>
              <li>Miễn phí tư vấn giải thích kết quả và định hướng điều trị lâm sàng từ Bác sĩ chuyên khoa xét nghiệm.</li>
            </ul>
          </div>
        </Container>
      </section>

      <MegaFooter />
    </div>
  );
}

