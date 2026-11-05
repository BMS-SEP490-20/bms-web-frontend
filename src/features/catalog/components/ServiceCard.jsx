/**
 * @file ServiceCard.jsx
 * @description Premium Clinical Laboratory Service Card Component (MEDLINE / macOS Grade).
 * Implements: 28px floating cards, diffuse soft shadow, mint-green positive CTA,
 * clean typography hierarchy and tabular-nums.
 * Conforms to: Soft Medical Telehealth UI Specification & DESIGN SYSTEM PROMPT.
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
 * Returns medical category styling with proper soft clinical tinted fills.
 */
function getCategoryBadge(category) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('ung thư') || cat.includes('cancer')) {
    return { accent: '#F04438', label: 'Tầm Soát Ung Thư', bg: '#FEECEC' };
  }
  if (cat.includes('tổng quát') || cat.includes('wellness')) {
    return { accent: '#648CF4', label: 'Khám Tổng Quát', bg: '#E8EFFE' };
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
    return { accent: '#16A34A', label: 'Huyết Học & Đông Máu', bg: '#DCFCE7' };
  }
  return { accent: '#648CF4', label: category || 'Gói Xét Nghiệm Tiêu Chuẩn', bg: '#E8EFFE' };
}

export default function ServiceCard({ package: pkgProp, pkg: directPkg, onSelectDetail, onBook }) {
  const pkg = directPkg || pkgProp || {};
  const badge = getCategoryBadge(pkg.category);
  const sampleTube = pkg.sampleTube || 'EDTA (Nắp Tím)';
  const tat = pkg.tat || '60 - 90 Phút';
  const fastRule = pkg.fastingRule || 'Nhịn ăn 8h';
  const isPopular = pkg.isPopular || false;

  return (
    <div
      className="bms-soft-card h-100 d-flex flex-column position-relative"
      style={{
        background: '#FFFFFF',
        borderRadius: '28px',
        boxShadow: isPopular ? '0 12px 36px rgba(100, 140, 244, 0.12)' : '0 8px 28px rgba(28, 39, 61, 0.07)',
        border: isPopular ? '1.5px solid #648CF4' : '1px solid rgba(15, 23, 42, 0.04)',
        padding: '24px 26px',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
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
            borderRadius: '10px'
          }}
        >
          {badge.label}
        </span>
        <span
          className="text-muted small fw-semibold font-monospace tabular-nums"
          style={{ fontSize: '11px', color: '#6B7280' }}
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
          color: '#1A1D21',
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
          color: '#6B7280',
          minHeight: '44px'
        }}
      >
        {pkg.description || 'Xét nghiệm chuyên sâu hỗ trợ tầm soát sớm và phát hiện bất thường sức khỏe theo tiêu chuẩn y tế ISO 15189.'}
      </p>

      {/* Clinical Specs Box */}
      <div
        className="p-2.5 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2"
        style={{
          backgroundColor: '#EEF2F6',
          borderRadius: '16px',
          fontSize: '12px'
        }}
      >
        <div>
          <span style={{ color: '#6B7280' }}>Mẫu: </span>
          <strong style={{ color: '#1A1D21' }}>{sampleTube}</strong>
        </div>
        <div>
          <span style={{ color: '#6B7280' }}>Trả KQ: </span>
          <strong style={{ color: '#1A1D21' }}>{tat}</strong>
        </div>
      </div>

      {/* Fasting Notice Pill */}
      <div
        className="d-flex align-items-center gap-1.5 mb-3 px-3 py-1.5"
        style={{
          backgroundColor: '#FFF4E5',
          borderRadius: '12px',
          fontSize: '11.5px',
          color: '#8C5300',
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
          <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>Giá niêm yết:</div>
          <div
            className="fw-bold fs-5 tabular-nums"
            style={{ color: '#1A1D21', letterSpacing: '-0.02em' }}
          >
            {formatVnd(pkg.price)}
          </div>
        </div>

        <div className="d-flex gap-2">
          {onSelectDetail && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                color: '#1A1D21',
                borderColor: 'rgba(15, 23, 42, 0.08)'
              }}
              onClick={() => onSelectDetail(pkg)}
            >
              Chi tiết
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm rounded-pill px-3 fw-bold"
            style={{
              backgroundColor: '#A3E687',
              color: '#0F3D1A',
              border: 'none',
              fontSize: '12.5px',
              boxShadow: '0 4px 14px rgba(163, 230, 135, 0.35)'
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
    isPopular: PropTypes.bool
  }),
  pkg: PropTypes.object,
  onSelectDetail: PropTypes.func,
  onBook: PropTypes.func.isRequired
};
