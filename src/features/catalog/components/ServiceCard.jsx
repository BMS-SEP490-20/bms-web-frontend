/**
 * @file ServiceCard.jsx
 * @description Modern Pure 2D Flat Clinical Laboratory Service Card Component (Big Tech Clean Grade).
 * Implements: 20px flat cards, zero blurry glow, crisp emerald CTA,
 * high-contrast Plus Jakarta Sans & Be Vietnam Pro typography, precision lab manifest.
 * Conforms to: Flat Healthcare SaaS Design Standards.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FaVial, FaClock, FaExclamationCircle } from 'react-icons/fa';

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
    return { accent: '#EF4444', label: 'Tầm Soát Ung Thư', bg: '#FEE2E2', tubeColor: '#EF4444' };
  }
  if (cat.includes('tổng quát') || cat.includes('wellness')) {
    return { accent: '#1E60E6', label: 'Khám Tổng Quát', bg: '#EEF4FD', tubeColor: '#1E60E6' };
  }
  if (cat.includes('gan') || cat.includes('thận') || cat.includes('sinh hóa')) {
    return { accent: '#0284C7', label: 'Gan - Mật - Thận', bg: '#E0F2FE', tubeColor: '#0284C7' };
  }
  if (cat.includes('tiểu đường') || cat.includes('tim mạch') || cat.includes('mỡ máu')) {
    return { accent: '#7C3AED', label: 'Tiểu Đường & Tim Mạch', bg: '#F5F3FF', tubeColor: '#7C3AED' };
  }
  if (cat.includes('tiền hôn nhân') || cat.includes('sản khoa') || cat.includes('mẹ')) {
    return { accent: '#DB2777', label: 'Tiền Hôn Nhân & Mẹ Bầu', bg: '#FDF2F8', tubeColor: '#DB2777' };
  }
  if (cat.includes('huyết học') || cat.includes('đông máu')) {
    return { accent: '#059669', label: 'Huyết Học & Đông Máu', bg: '#ECFDF5', tubeColor: '#059669' };
  }
  return { accent: '#1E60E6', label: category || 'Gói Xét Nghiệm Tiêu Chuẩn', bg: '#EEF4FD', tubeColor: '#1E60E6' };
}

export default function ServiceCard({ package: pkgProp, pkg: directPkg, onSelectDetail, onBook }) {
  const pkg = directPkg || pkgProp || {};
  const badge = getCategoryBadge(pkg.category);
  const sampleTube = pkg.sampleTube || '';
  const tat = pkg.tat || '';
  const fastRule = pkg.fastingRule || '';
  const criteriaList = Array.isArray(pkg.criteria) ? pkg.criteria : [];

  return (
    <div
      className="bms-soft-card h-100 d-flex flex-column position-relative"
      style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        boxShadow: 'none',
        border: 'none',
        padding: '28px 30px',
        fontFamily: 'var(--font-sans)'
      }}
    >
      {/* Category & Service Code Header */}
      <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: '16px' }}>
        <span
          style={{
            backgroundColor: badge.bg,
            color: badge.accent,
            fontSize: '11.5px',
            fontWeight: 700,
            borderRadius: '9999px',
            border: 'none',
            padding: '5px 12px',
            letterSpacing: '0.02em'
          }}
        >
          {badge.label}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '11.5px',
            color: '#64748B',
            fontWeight: 700,
            backgroundColor: '#F1F5F9',
            padding: '3px 8px',
            borderRadius: '6px'
          }}
        >
          {pkg.packageCode || pkg.id || 'BMS-LAB'}
        </span>
      </div>

      {/* Stylized Package Title */}
      <h3
        className="fw-bold"
        style={{
          fontSize: '18px',
          lineHeight: '1.38',
          color: '#0F172A',
          letterSpacing: '-0.02em',
          marginBottom: '10px',
          minHeight: '50px'
        }}
      >
        {pkg.packageName}
      </h3>

      {/* Health Value Proposition */}
      <p
        className="small flex-grow-1"
        style={{
          lineHeight: '1.65',
          fontSize: '13px',
          color: '#475569',
          marginBottom: '18px',
          minHeight: '44px'
        }}
      >
        {pkg.description}
      </p>

      {/* Biomarker Pill Tags Preview */}
      {criteriaList.length > 0 && (
        <div className="d-flex flex-wrap align-items-center" style={{ gap: '6px', marginBottom: '18px' }}>
          {criteriaList.slice(0, 4).map((c, i) => (
            <span
              key={i}
              style={{
                backgroundColor: '#F1F5F9',
                color: '#334155',
                fontSize: '11px',
                fontWeight: 650,
                padding: '3px 9px',
                borderRadius: '6px'
              }}
            >
              {c.code || c.name}
            </span>
          ))}
          {criteriaList.length > 4 && (
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginLeft: '4px' }}>
              +{criteriaList.length - 4} chỉ số
            </span>
          )}
        </div>
      )}

      {/* Clinical Laboratory Manifest (Precision Details Box - Real Data Only) */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '18px',
          padding: '16px 18px',
          marginBottom: '22px',
          border: 'none',
          boxShadow: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '12px',
          lineHeight: '1.5'
        }}
      >
        {sampleTube ? (
          <div className="d-flex justify-content-between align-items-center" style={{ gap: '14px' }}>
            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaVial style={{ color: '#1E60E6', fontSize: '11px' }} />
              Mẫu bệnh phẩm
            </span>
            <strong style={{ color: '#0F172A', textAlign: 'right', fontWeight: 650 }}>
              {sampleTube}
            </strong>
          </div>
        ) : null}

        {tat ? (
          <div className="d-flex justify-content-between align-items-center" style={{ gap: '14px' }}>
            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaClock style={{ color: '#0284C7', fontSize: '11px' }} />
              Trả kết quả (TAT)
            </span>
            <strong style={{ color: '#0F172A', textAlign: 'right', fontWeight: 650 }}>
              {tat}
            </strong>
          </div>
        ) : null}

        {!sampleTube && !tat && (
          <div style={{ color: '#94A3B8', fontSize: '11.5px', fontStyle: 'italic' }}>
            Thông số lấy mẫu sẽ được cập nhật.
          </div>
        )}

        {fastRule ? (
          <div className="d-flex justify-content-between align-items-center" style={{ gap: '14px', paddingTop: '4px' }}>
            <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaExclamationCircle style={{ color: '#D97706', fontSize: '11px' }} />
              Lưu ý
            </span>
            <strong style={{ color: '#B45309', textAlign: 'right', fontWeight: 650 }}>
              {fastRule}
            </strong>
          </div>
        ) : null}
      </div>

      {/* Price & Action Buttons - 100% 2D Flat */}
      <div
        className="d-flex justify-content-between align-items-center mt-auto"
        style={{ border: 'none', paddingTop: '2px' }}
      >
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 550 }}>Đơn giá niêm yết:</div>
          <div
            className="fw-bold tabular-nums"
            style={{ color: '#0F172A', fontSize: '20px', letterSpacing: '-0.025em', lineHeight: '1.2' }}
          >
            {formatVnd(pkg.price)}
          </div>
        </div>

        <div className="d-flex gap-2">
          {onSelectDetail && (
            <button
              type="button"
              className="btn btn-sm rounded-pill"
              style={{
                fontSize: '12.5px',
                fontWeight: 650,
                backgroundColor: '#F1F5F9',
                color: '#0F172A',
                border: 'none',
                boxShadow: 'none',
                padding: '7px 16px'
              }}
              onClick={() => onSelectDetail(pkg)}
              title="Xem chi tiết"
            >
              Chi tiết
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm rounded-pill fw-bold"
            style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              boxShadow: 'none',
              padding: '7px 20px'
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
