/**
 * @fileoverview Card component that displays a single laboratory service package.
 * Design follows the mockup: category-tinted header, name, description, price, and book button.
 */

import PropTypes from 'prop-types';

/**
 * Formats a number as VND currency.
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Returns accent color and label for a given category.
 * @param {string} category
 */
function getCategoryStyle(category) {
  const map = {
    'Huyết học': { accent: '#e11d48', label: 'Huyết học' },
    'Sinh hóa': { accent: '#2563eb', label: 'Sinh hóa' },
    'Miễn dịch': { accent: '#7c3aed', label: 'Miễn dịch' },
    'Đông máu': { accent: '#059669', label: 'Đông máu' },
  };
  return map[category] || { accent: '#0ea5e9', label: category || 'Other' };
}

/**
 * ServiceCard component.
 *
 * @param {Object} props
 * @param {Object} props.package - Package data from the API.
 * @param {Function} [props.onBook] - Callback when the "Book appointment" button is clicked.
 */
export default function ServiceCard({ package: pkg, onBook }) {
  const style = getCategoryStyle(pkg.category);

  return (
    <article
      className="service-card"
      style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(15, 23, 42, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(15, 23, 42, 0.08)';
      }}
    >
      {/* Category-tinted header */}
      <div
        style={{
          height: 140,
          background: `linear-gradient(135deg, ${style.accent}22 0%, ${style.accent}55 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ fontSize: 28, color: style.accent }}>🔬</span>
        </div>
        <span
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: style.accent,
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 20,
          }}
        >
          {style.label}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: 16,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.35,
          }}
        >
          {pkg.packageName}
        </h3>

        <p
          style={{
            margin: '0 0 12px',
            fontSize: 13,
            color: '#64748b',
            lineHeight: 1.5,
            flex: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {pkg.description}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            fontSize: 12,
            color: '#94a3b8',
          }}
        >
          <span>Tube: {pkg.sampleTube || '—'}</span>
          <span>{pkg.sampleVolumeMl ? `${pkg.sampleVolumeMl} ml` : ''}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <strong style={{ fontSize: 18, color: style.accent }}>
            {formatPrice(pkg.price)}
          </strong>

          <button
            type="button"
            onClick={() => onBook?.(pkg)}
            style={{
              background: `linear-gradient(135deg, ${style.accent} 0%, ${style.accent}cc 100%)`,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <span>📅</span> Book appointment
          </button>
        </div>
      </div>
    </article>
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
  }).isRequired,
  onBook: PropTypes.func,
};