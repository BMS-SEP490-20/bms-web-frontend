/**
 * @file Section.jsx
 * @description Flat white content block with an optional title; blocks are separated by whitespace only.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * @param {Object} props
 * @param {string} [props.title]
 * @param {React.ReactNode} [props.aside] - Right-aligned content next to the title (filters, counts).
 * @param {React.ReactNode} props.children
 */
export default function Section({ title, aside, children }) {
  return (
    <section className="bms-section">
      {(title || aside) && (
        <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: 18 }}>
          {title && <h2 className="bms-section-title" style={{ margin: 0 }}>{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

Section.propTypes = {
  title: PropTypes.string,
  aside: PropTypes.node,
  children: PropTypes.node
};

