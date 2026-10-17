/**
 * @file ServiceCard.jsx
 * @description Premium Clinical Laboratory Service Card Component.
 * Implements the approved Medical Design System: rounded-4, soft shadows, category accents,
 * clear healthcare value proposition, sample tube indicators, turnaround time, transparent pricing,
 * and high-converting action buttons.
 * Conforms to: Production Medical Standards, ISO 15189 & AGENTS-DESIGN.md.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FaClock, FaVial, FaCheckCircle, FaInfoCircle, FaCalendarCheck, FaShieldAlt } from 'react-icons/fa';

/**
 * Formats numeric price into standard Vietnamese currency string.
 *
 * @param {number} price Price amount
 * @returns {string} Formatted currency
 */
function formatVnd(price) {
  if (typeof price !== 'number') return '0 đ';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(price);
}

/**
 * Returns medical category styling with proper clinical accent colors.
 *
 * @param {string} category Category name
 * @returns {{ accent: string, label: string, bg: string }} Category style
 */
function getCategoryBadge(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('ung thư') || cat.includes('cancer')) {
    return { accent: '#e11d48', label: 'Tầm Soát Ung Thư', bg: '#ffe4e6' };
  }
  if (cat.includes('tổng quát') || cat.includes('wellness')) {
    return { accent: '#2563eb', label: 'Khám Tổng Quát', bg: '#dbeafe' };
  }
  if (cat.includes('gan') || cat.includes('thận') || cat.includes('sinh hóa')) {
    return { accent: '#0284c7', label: 'Gan - Mật - Thận', bg: '#e0f2fe' };
  }
  if (cat.includes('tiểu đường') || cat.includes('tim mạch') || cat.includes('mỡ máu')) {
    return { accent: '#7c3aed', label: 'Tiểu Đường & Tim Mạch', bg: '#f3e8ff' };
  }
  if (cat.includes('tiền hôn nhân') || cat.includes('sản khoa') || cat.includes('mẹ')) {
    return { accent: '#db2777', label: 'Tiền Hôn Nhân & Mẹ Bầu', bg: '#fce7f3' };
  }
  if (cat.includes('huyết học') || cat.includes('đông máu')) {
    return { accent: '#059669', label: 'Huyết Học & Đông Máu', bg: '#d1fae5' };
  }
  return { accent: '#1e40af', label: category || 'Gói Xét Nghiệm Tiêu Chuẩn', bg: '#eff6ff' };
}

/**
 * Clinical Service Card component.
 */
export default function ServiceCard({ package: pkgProp, pkg: directPkg, onSelectDetail, onBook }) {
  const pkg = directPkg || pkgProp || {};
  const badge = getCategoryBadge(pkg.category);
  const sampleTube = pkg.sampleTube || 'EDTA (Nắp Tím)';
  const tat = pkg.tat || '90 - 120 Phút';
  const fastRule = pkg.fastingRule || 'Nhịn ăn 8h';
  const isPopular = pkg.isPopular || false;

  return (
    <div className={`card h-100 shadow-sm border rounded-4 overflow-hidden bms-catalog-card d-flex flex-column bg-white position-relative ${isPopular ? 'border-primary' : ''}`}
         style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
      
      {/* Category Accent Top Border */}
      <div style={{ height: '4px', backgroundColor: badge.accent }} />

      {/* Popular Ribbon if marked */}
      {isPopular && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '-28px',
          background: 'linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)',
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: '700',
          padding: '3px 30px',
          transform: 'rotate(45deg)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          zIndex: 2,
          letterSpacing: '0.05em'
        }}>
          PHỔ BIẾN
        </div>
      )}

      <div className="card-body p-4 d-flex flex-column">
        {/* Category & Service Code */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span
            className="badge rounded-pill fw-semibold px-2 py-1"
            style={{ backgroundColor: badge.bg, color: badge.accent, fontSize: '11px', letterSpacing: '0.02em' }}
          >
            {badge.label}
          </span>
          <span className="text-muted small fw-bold font-monospace" style={{ fontSize: '11px' }}>
            {pkg.packageCode || pkg.id || 'BMS-LAB'}
          </span>
        </div>

        {/* Package Title */}
        <h3 className="card-title fw-bold text-dark mb-2" style={{ fontSize: '17px', lineHeight: '1.4', minHeight: '48px' }}>
          {pkg.packageName}
        </h3>

        {/* Marketing / Health Value Proposition */}
        <p className="card-text text-muted small mb-3 flex-grow-1" style={{ lineHeight: '1.6', minHeight: '52px' }}>
          {pkg.description || 'Xét nghiệm chuyên sâu hỗ trợ tầm soát sớm và phát hiện bất thường sức khỏe theo tiêu chuẩn y tế.'}
        </p>

        {/* Clinical Specs Box */}
        <div className="p-2 rounded-3 bg-light border mb-3 small d-flex flex-wrap justify-content-between align-items-center text-secondary gap-1"
             style={{ fontSize: '12px' }}>
          <div className="d-flex align-items-center gap-1">
            <FaVial style={{ color: badge.accent }} />
            <span>Mẫu: <strong>{sampleTube}</strong></span>
          </div>
          <div className="d-flex align-items-center gap-1">
            <FaClock className="text-primary" />
            <span>Trả kết quả: <strong>{tat}</strong></span>
          </div>
        </div>

        {/* Fasting Notice Pill */}
        <div className="d-flex align-items-center gap-2 mb-3 px-2 py-1 rounded-2" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', fontSize: '11px', color: '#92400e' }}>
          <FaShieldAlt className="text-warning" />
          <span>Lưu ý: <strong>{fastRule}</strong></span>
        </div>

        {/* Price & Action Buttons */}
        <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
          <div>
            <div className="text-muted" style={{ fontSize: '11px' }}>Giá trọn gói niêm yết:</div>
            <div className="fw-bold fs-5" style={{ color: '#1e40af' }}>
              {formatVnd(pkg.price)}
            </div>
          </div>

          <div className="d-flex gap-2">
            {onSelectDetail && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center gap-1"
                style={{ fontSize: '12px', fontWeight: '500' }}
                onClick={() => onSelectDetail(pkg)}
              >
                <FaInfoCircle />
                <span>Chi tiết</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary rounded-pill px-3 d-flex align-items-center gap-1 fw-semibold"
              style={{ backgroundColor: '#1e40af', borderColor: '#1e40af', fontSize: '12px' }}
              onClick={() => onBook(pkg)}
            >
              <FaCalendarCheck />
              <span>Đặt lịch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ServiceCard.propTypes = {
  package: PropTypes.shape({
    id: PropTypes.string,
    packageCode: PropTypes.string,
    packageName: PropTypes.string.isRequired,
    category: PropTypes.string,
    price: PropTypes.number.isRequired,
    description: PropTypes.string,
    sampleTube: PropTypes.string,
    sampleVolumeMl: PropTypes.number,
    tat: PropTypes.string,
    fastingRule: PropTypes.string,
    isPopular: PropTypes.bool
  }).isRequired,
  onSelectDetail: PropTypes.func,
  onBook: PropTypes.func.isRequired
};