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

      {/* Header Container */}
      <div className="container" style={{ maxWidth: '1400px', paddingTop: '32px', paddingBottom: '16px' }}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2" style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 650, letterSpacing: '0.04em' }}>
              <img src="/assets/lab-icon.png" alt="" style={{ width: '15px', height: '15px', objectFit: 'contain' }} />
              <span>TIÊU CHUẨN ISO 15189:2022 · NIÊM YẾT MINH BẠCH 100%</span>
            </div>
            <h1 className="fw-bold mb-2" style={{ fontSize: '28px', color: '#0F172A', letterSpacing: '-0.025em' }}>
              Bảng Giá Niêm Yết Dịch Vụ Xét Nghiệm
            </h1>
            <p className="mb-0 text-muted" style={{ fontSize: '13.5px', maxWidth: '820px', lineHeight: '1.6' }}>
              Toàn bộ đơn giá được công khai minh bạch theo quy chuẩn của Bộ Y Tế. Áp dụng thanh toán BHYT đúng tuyến &amp; thông tuyến, xuất hóa đơn điện tử VAT 0% theo Nghị định 123/2020/NĐ-CP.
            </p>
          </div>
          <div className="d-flex gap-2 align-items-center flex-shrink-0 pt-2 pt-md-0">
            <button
              type="button"
              className="btn btn-sm rounded-pill"
              onClick={() => window.print()}
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                padding: '8px 18px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155'
              }}
            >
              <FaPrint className="me-1.5" style={{ fontSize: '11px', marginRight: '6px' }} /> In Bảng Giá
            </button>
            <Link
              to="/appointments/book"
              className="btn btn-sm rounded-pill"
              style={{
                fontSize: '12.5px',
                fontWeight: 650,
                padding: '8px 20px',
                backgroundColor: '#1E60E6',
                border: 'none',
                color: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(30, 96, 230, 0.25)'
              }}
            >
              <FaCalendarAlt className="me-1.5" style={{ fontSize: '11px', marginRight: '6px' }} /> Đặt Lịch Khám
            </Link>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar + Table */}
      <section className="py-3">
        <Container style={{ maxWidth: '1400px' }}>
          
          {/* Unified Toolbar Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              padding: '16px 20px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)'
            }}
          >
            <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
              
              {/* Search Input with generous padding */}
              <div className="position-relative" style={{ maxWidth: '440px', width: '100%' }}>
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
                    fontSize: '13px',
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
                    height: '42px',
                    paddingLeft: '44px',
                    paddingRight: searchQuery ? '36px' : '16px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '13px',
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
                      padding: '2px 6px'
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
                        padding: '7px 16px',
                        borderRadius: '9999px',
                        fontSize: '12px',
                        fontWeight: isActive ? 650 : 500,
                        border: isActive ? 'none' : '1px solid #E2E8F0',
                        backgroundColor: isActive ? '#1E60E6' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : '#475569',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 2px 6px rgba(30, 96, 230, 0.2)' : 'none'
                      }}
                    >
                      {cat === 'ALL' ? 'Tất Cả Danh Mục' : cat}
                    </button>
                  );
                })}

                <div className="ms-auto text-muted small ps-2" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  Hiển thị <strong>{filteredItems.length}</strong> / {pricingItems.length} dịch vụ
                </div>
              </div>
            </div>
          </div>

          {/* Table Card (Medical Enterprise Container) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)'
            }}
          >
            <div className="table-responsive">
              <Table hover className="align-middle mb-0" style={{ fontSize: '12.5px' }}>
                <thead style={{ backgroundColor: '#F8FAFC' }}>
                  <tr>
                    <th className="ps-4 py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Mã Dịch Vụ</th>
                    <th className="py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', minWidth: '280px' }}>Tên Xét Nghiệm / Chỉ Số Sinh Học</th>
                    <th className="py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Chuyên Khoa</th>
                    <th className="py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Ống Bệnh Phẩm</th>
                    <th className="py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Thời Gian (TAT)</th>
                    <th className="text-end py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Đơn Giá Niêm Yết</th>
                    <th className="text-end pe-4 py-3" style={{ color: '#475569', fontWeight: 650, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Thao Tác</th>
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
                            {item.category || 'Lâm Sàng'}
                          </span>
                        </td>
                        <td className="py-3" style={{ whiteSpace: 'nowrap' }}>
                          <div className="d-flex align-items-center gap-1.5" style={{ color: '#475569', fontSize: '12px' }}>
                            <FaVial style={{ color: '#1E60E6', fontSize: '11px', marginRight: '4px' }} />
                            <span>{item.sampleTube || 'EDTA/Serum'}</span>
                          </div>
                        </td>
                        <td className="py-3" style={{ whiteSpace: 'nowrap' }}>
                          <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: '12px' }}>
                            <FaClock style={{ fontSize: '11px', marginRight: '4px' }} />
                            <span>{item.tat || '60 - 90 Phút'}</span>
                          </div>
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
                              padding: '5px 14px',
                              fontSize: '11.5px',
                              fontWeight: 650,
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease',
                              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
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

          {/* Compliance & Policy Footer Card */}
          <div
            className="mt-4 p-4"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(15, 23, 42, 0.08)',
              borderRadius: '16px'
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

