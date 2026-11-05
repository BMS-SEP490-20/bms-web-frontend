/**
 * @file StatRow.jsx
 * @description Inline metrics row (big number + small label). Replaces rows of equal icon KPI cards.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * @param {Object} props
 * @param {{label: string, value: React.ReactNode, primary?: boolean}[]} props.items
 */
export default function StatRow({ items }) {
  return (
    <div className="bms-statrow">
      {items.map((item) => (
        <div key={item.label}>
          <span className={`bms-stat-value${item.primary ? ' is-primary' : ''}`}>{item.value}</span>
          <span className="bms-stat-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

StatRow.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.node,
      primary: PropTypes.bool
    })
  ).isRequired
};
