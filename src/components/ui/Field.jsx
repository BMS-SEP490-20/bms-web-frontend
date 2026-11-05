/**
 * @file Field.jsx
 * @description Label above value pair for read-only record details.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {React.ReactNode} props.value
 */
export default function Field({ label, value }) {
  return (
    <div className="bms-field">
      <span className="bms-field-label">{label}</span>
      <span className="bms-field-value">{value ?? '-'}</span>
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node
};
