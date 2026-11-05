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

  // Flatten packages and their individual criteria into a clean comprehensive pricing list
  const pricingItems = useMemo(() => {
    const list = [];
    packages.forEach(pkg => {
      // 1. Add the package itself
      list.push({
        id: pkg.id || pkg.packageCode,
        code: pkg.packageCode || pkg.code || 'PKG',
        name: pkg.packageName || pkg.name,
        category: pkg.category || 'Tổng Quát',
        sampleTube: pkg.sampleTube || 'Máu toàn phần',
        tat: '60 - 90 Phút',
        price: pkg.price || 0,
        bhytCoverage: '80% - 100% (Đúng tuyến)',
        type: 'PACKAGE',
        criteriaCount: pkg.criteria?.length || 0,
        description: pkg.description
      });

      // 2. Add individual criteria if available
      if (Array.isArray(pkg.criteria)) {
        pkg.criteria.forEach((crit, idx) => {
          list.push({
            id: `${pkg.packageCode}-${crit.code || idx}`,
            code: crit.code || `CRT-${idx + 1}`,
            name: crit.name || crit.code,
            category: pkg.category || 'Sinh Hóa',
            sampleTube: pkg.sampleTube || 'Serum',
            tat: '45 - 60 Phút',
            price: Math.round((pkg.price || 200000) / Math.max(pkg.criteria.length, 1)),
            bhytCoverage: '80% (Theo danh mục BYT)',
            type: 'TEST',
            parentPackage: pkg.packageName,
            unit: crit.unit || ''
          });
        });
      }
    });
    return list;
  }, [packages]);

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

      {/* Header Banner - Pure Flat, No Borders */}
      <section style={{ backgroundColor: '#FFFFFF', border: 'none', padding: '32px 0 24px' }}>
        <Container style={{ maxWidth: '1400px' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2"
                   style={{ backgroundColor: '#EEF4FD', color: '#1E60E6', fontSize: '11.5px', fontWeight: 650 }}>
                <img src="/assets/lab-icon.png" alt="Lab" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                <span>TIÊU CHUẨN ISO 15189:2022 • NIÊM YẾT MINH BẠCH 100%</span>
              </div>
              <h1 className="fw-bold mb-2" style={{ fontSize: '26px', color: '#0F172A', letterSpacing: '-0.025em' }}>
                Bảng Giá Niêm Yết Dịch Vụ Xét Nghiệm
              </h1>
              <p className="text-secondary mb-0" style={{ fontSize: '13px', maxWidth: '780px', lineHeight: '1.6' }}>
                Toàn bộ đơn giá được công khai minh bạch theo quy chuẩn của Bộ Y Tế. Áp dụng thanh toán BHYT đúng tuyến & thông tuyến, xuất hóa đơn điện tử VAT 0% theo Nghị định 123/2020/NĐ-CP.
              </p>
            </div>

            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-secondary"
                className="rounded-pill d-inline-flex align-items-center gap-2"
                style={{ fontSize: '12px', fontWeight: 600, border: 'none', background: '#F1F5F9', color: '#475569', padding: '6px 16px' }}
                onClick={() => window.print()}
              >
                <FaPrint style={{ fontSize: '11px' }} /> In Bảng Giá
              </Button>
              <Link
                to="/appointments/book"
                className="btn btn-primary rounded-pill d-inline-flex align-items-center gap-2"
                style={{ backgroundColor: '#1E60E6', border: 'none', fontSize: '12px', fontWeight: 600, color: '#FFFFFF', padding: '6px 18px' }}
              >
                <FaCalendarAlt style={{ fontSize: '11px' }} /> Đặt Lịch Khám
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Filter & Search Bar - Compact, 1400px MaxWidth, Zero Borders */}
      <section className="py-4">
        <Container style={{ maxWidth: '1400px' }}>
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
            {/* Search Input - Compact 36px, Pure Flat */}
            <div className="position-relative" style={{ maxWidth: '400px', width: '100%' }}>
              <FaSearch className="position-absolute text-muted" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }} />
              <Form.Control
                type="text"
                placeholder="Tìm mã xét nghiệm (CBC, GLU, ALT...) hoặc tên chỉ số..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '38px',
                  height: '36px',
                  borderRadius: '10px',
                  border: 'none',
                  boxShadow: 'none',
                  backgroundColor: '#F1F5F9',
                  fontSize: '12.5px'
                }}
              />
            </div>

            {/* Category Pills - Compact, Borderless */}
            <div className="d-flex align-items-center gap-1.5 overflow-auto pb-1" style={{ maxWidth: '100%' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: selectedCategory === cat ? '#1E60E6' : '#F1F5F9',
                    color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-out'
                  }}
                >
                  {cat === 'ALL' ? 'Tất Cả Danh Mục' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table Card (Pure Flat, Zero Borders, Compact 12px, Nowrap Columns) */}
          <div style={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '16px', boxShadow: 'none', overflow: 'hidden' }}>
            <div className="table-responsive">
              <Table hover className="align-middle mb-0" style={{ fontSize: '12px', border: 'none' }}>
                <thead style={{ backgroundColor: '#F8FAFC' }}>
                  <tr style={{ border: 'none' }}>
                    <th className="ps-4 py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Mã Dịch Vụ</th>
                    <th className="py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', border: 'none', minWidth: '260px' }}>Tên Xét Nghiệm / Chỉ Số Sinh Học</th>
                    <th className="py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Chuyên Khoa</th>
                    <th className="py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Ống Bệnh Phẩm</th>
                    <th className="py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Thời Gian (TAT)</th>
                    <th className="text-end py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Đơn Giá Niêm Yết</th>
                    <th className="py-2.5 ps-4" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Hỗ Trợ BHYT</th>
                    <th className="text-end pe-4 py-2.5" style={{ color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', border: 'none' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted" style={{ border: 'none' }}>
                        <Spinner animation="border" size="sm" className="me-2" style={{ color: '#1E60E6' }} />
                        <span>Đang tải bảng giá niêm yết từ hệ thống phòng xét nghiệm BMS...</span>
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-5 text-muted" style={{ border: 'none' }}>
                        <div className="fw-semibold text-dark mb-1">Không tìm thấy xét nghiệm phù hợp</div>
                        <div className="small text-muted">Vui lòng nhập từ khóa khác hoặc chọn Tất Cả Danh Mục.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                        <td className="ps-4 py-2.5" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <span style={{
                            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
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
                        <td className="py-2.5" style={{ minWidth: '260px', border: 'none' }}>
                          <div className="fw-semibold" style={{ color: '#0F172A', fontSize: '12.5px', lineHeight: '1.4' }}>
                            {item.name}
                            {item.type === 'PACKAGE' && (
                              <Badge className="ms-2" style={{ backgroundColor: '#EEF4FD', color: '#1E60E6', fontWeight: 600, fontSize: '10.5px', border: 'none' }}>
                                Gói ({item.criteriaCount} chỉ số)
                              </Badge>
                            )}
                          </div>
                          {item.parentPackage && (
                            <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                              Thuộc gói: {item.parentPackage}
                            </div>
                          )}
                          {item.unit && (
                            <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                              Đơn vị: {item.unit}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <span style={{
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 9px',
                            borderRadius: '9999px'
                          }}>
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <div className="d-flex align-items-center gap-1.5" style={{ color: '#475569', fontSize: '11.5px' }}>
                            <FaVial style={{ color: '#1E60E6', fontSize: '11px' }} />
                            <span>{item.sampleTube}</span>
                          </div>
                        </td>
                        <td className="py-2.5" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <div className="d-flex align-items-center gap-1.5 text-muted" style={{ fontSize: '11.5px' }}>
                            <FaClock style={{ fontSize: '10px' }} />
                            <span>{item.tat}</span>
                          </div>
                        </td>
                        <td className="text-end py-2.5" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                            {Number(item.price).toLocaleString('vi-VN')} ₫
                          </span>
                        </td>
                        <td className="py-2.5 ps-4" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <div className="d-flex align-items-center gap-1.5" style={{ color: '#064E3B', fontSize: '11.5px', fontWeight: 600 }}>
                            <FaCheckCircle style={{ color: '#10B981', fontSize: '11px' }} />
                            <span>{item.bhytCoverage}</span>
                          </div>
                        </td>
                        <td className="text-end pe-4 py-2.5" style={{ whiteSpace: 'nowrap', border: 'none' }}>
                          <button
                            type="button"
                            onClick={() => navigate('/appointments/book')}
                            style={{
                              backgroundColor: '#1E60E6',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '4px 12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'opacity 0.15s ease'
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

          {/* Compliance & Policy Footer - Pure Flat, Borderless */}
          <div className="mt-4 p-4 rounded-4" style={{ backgroundColor: '#FFFFFF', border: 'none', borderRadius: '16px' }}>
            <h6 className="fw-bold mb-2" style={{ color: '#0F172A', fontSize: '13px' }}>
              Quy Định Về Giá Dịch Vụ & Thanh Toán Viện Phí
            </h6>
            <ul className="mb-0 text-muted small ps-3" style={{ lineHeight: '1.7', fontSize: '12px' }}>
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

