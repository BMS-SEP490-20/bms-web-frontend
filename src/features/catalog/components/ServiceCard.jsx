/**
 * @file ServiceCard.jsx
 * @description Modern Pure Flat Clinical Laboratory Service Card Component (Big Tech Clean Grade).
 * Implements: 20px flat cards, zero blurry glow, crisp emerald CTA,
 * high-contrast Plus Jakarta Sans typography and tabular-nums.
 * Conforms to: Flat Healthcare SaaS Design Standards.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Formats numeric price into standard Vietnamese currency string.
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
 * Returns medical category styling with proper clean flat clinical tinted fills.
 */
function getCategoryBadge(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('ung thư') || cat.includes('cancer')) {
    return { accent: '#EF4444', label: 'Tầm Soát Ung Thư', bg: '#FEE2E2' };
  }
  if (cat.includes('tổng quát') || cat.includes('wellness')) {
    return { accent: '#1E60E6', label: 'Khám Tổng Quát', bg: '#EEF4FD' };
  }
  if (cat.includes('gan') || cat.includes('thận') || cat.includes('sinh hóa')) {
    return { accent: '#0284C7', label: 'Gan - Mật - Thận', bg: '#E0F2FE' };
  }
  if (cat.includes('tiểu đường') || cat.includes('tim mạch') || cat.includes('mỡ máu')) {
    return { accent: '#7C3AED', label: 'Tiểu Đường & Tim Mạch', bg: '#F5F3FF' };
  }
  if (cat.includes('tiền hôn nhân') || cat.includes('sản khoa') || cat.includes('mẹ')) {
    return { accent: '#DB2777', label: 'Tiền Hôn Nhân & Mẹ Bầu', bg: '#FDF2F8' };
  }
  if (cat.includes('huyết học') || cat.includes('đông máu')) {
    return { accent: '#059669', label: 'Huyết Học & Đông Máu', bg: '#ECFDF5' };
  }
  return { accent: '#1E60E6', label: category || 'Gói Xét Nghiệm Tiêu Chuẩn', bg: '#EEF4FD' };
}

export default function ServiceCard({ package: pkgProp, pkg: directPkg, onSelectDetail, onBook }) {
  const pkg = directPkg || pkgProp || {};
  const badge = getCategoryBadge(pkg.category);
  const sampleTube = pkg.sampleTube || 'EDTA (Nắp Tím)';
  const tat = pkg.tat || '60 - 90 Phút';
  const fastRule = pkg.fastingRule || 'Nhịn ăn 8h';
  const isPopular = pkg.isPopular || false;
  const criteriaList = Array.isArray(pkg.criteria) ? pkg.criteria : [];

  return (
    <div
      className="bms-soft-card h-100 d-flex flex-column position-relative"
      style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        boxShadow: 'none',
        border: isPopular ? '1.5px solid #1E60E6' : '1px solid rgba(15, 23, 42, 0.06)',
        padding: '24px 26px',
        transition: 'border-color 0.15s ease'
      }}
    >
      {/* Category & Service Code */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span
          className="badge px-2.5 py-1"
          style={{
            backgroundColor: badge.bg,
            color: badge.accent,
            fontSize: '11.5px',
            fontWeight: 650,
            borderRadius: '8px',
            border: 'none'
          }}
        >
          {badge.label}
        </span>
        <span
          className="font-monospace tabular-nums"
          style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}
        >
          {pkg.packageCode || pkg.id || 'BMS-LAB'}
        </span>
      </div>

      {/* Package Title */}
      <h3
        className="fw-bold mb-2"
        style={{
          fontSize: '17px',
          lineHeight: '1.4',
          color: '#0F172A',
          letterSpacing: '-0.015em',
          minHeight: '48px'
        }}
      >
        {pkg.packageName}
      </h3>

      {/* Health Value Proposition */}
      <p
        className="small mb-3 flex-grow-1"
        style={{
          lineHeight: '1.55',
          fontSize: '13px',
          color: '#475569',
          minHeight: '44px'
        }}
      >
        {pkg.description || 'Xét nghiệm chuyên sâu hỗ trợ tầm soát sớm và phát hiện bất thường sức khỏe theo tiêu chuẩn y tế ISO 15189.'}
      </p>

      {/* Biomarker Pill Tags Preview if present */}
      {criteriaList.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-3">
          {criteriaList.slice(0, 4).map((c, i) => (
            <span
              key={i}
              style={{
                backgroundColor: '#F1F5F9',
                color: '#475569',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px'
              }}
            >
              {c.code || c.name}
            </span>
          ))}
          {criteriaList.length > 4 && (
            <span style={{ fontSize: '11px', color: '#64748B', alignSelf: 'center', marginLeft: '4px' }}>
              +{criteriaList.length - 4} chỉ số
            </span>
          )}
        </div>
      )}

      {/* Clinical Specs Box */}
      <div
        className="p-2.5 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          fontSize: '12px',
          border: '1px solid rgba(15, 23, 42, 0.04)'
        }}
      >
        <div>
          <span style={{ color: '#64748B' }}>Mẫu: </span>
          <strong style={{ color: '#0F172A' }}>{sampleTube}</strong>
        </div>
        <div>
          <span style={{ color: '#64748B' }}>Trả KQ: </span>
          <strong style={{ color: '#0F172A' }}>{tat}</strong>
        </div>
      </div>

      {/* Fasting Notice Pill */}
      <div
        className="d-flex align-items-center gap-1.5 mb-3 px-3 py-1.5"
        style={{
          backgroundColor: '#FEF3C7',
          borderRadius: '10px',
          fontSize: '11.5px',
          color: '#92400E',
          fontWeight: 500
        }}
      >
        <span>Lưu ý: <strong>{fastRule}</strong></span>
      </div>

      {/* Price & Action Buttons */}
      <div
        className="d-flex justify-content-between align-items-center pt-3 mt-auto"
        style={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Đơn giá niêm yết:</div>
          <div
            className="fw-bold fs-5 tabular-nums"
            style={{ color: '#0F172A', letterSpacing: '-0.02em' }}
          >
            {formatVnd(pkg.price)}
          </div>
        </div>

        <div className="d-flex gap-2">
          {onSelectDetail && (
            <button
              type="button"
              className="btn btn-sm rounded-pill px-3"
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor: '#F1F5F9',
                color: '#0F172A',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                boxShadow: 'none'
              }}
              onClick={() => onSelectDetail(pkg)}
              title="Xem chi tiết"
            >
              Chi tiết
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm rounded-pill px-3 fw-bold"
            style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              boxShadow: 'none'
            }}
            onClick={() => onBook(pkg)}
          >
            Đặt lịch
          </button>
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
    isPopular: PropTypes.bool,
    criteria: PropTypes.array
  }),
  pkg: PropTypes.object,
  onSelectDetail: PropTypes.func,
  onBook: PropTypes.func.isRequired
};
