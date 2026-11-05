/**
 * @file PageHeader.jsx
 * @description Shared page header: one title, one lead paragraph, optional muted meta line
 * (compliance / legal notes) and optional actions. Replaces the per-page "chip + H1 + grey text" recipe.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * @param {Object} props
 * @param {string} props.title - Page title.
 * @param {React.ReactNode} [props.lead] - Lead paragraph (may contain <strong> for the key sentence).
 * @param {string[]} [props.meta] - Muted facts rendered on one line separated by dots (full text is kept).
 * @param {React.ReactNode} [props.actions] - Buttons aligned to the right.
 */
export default function PageHeader({ title, lead, meta, actions }) {
  return (
    <header className="bms-page-header">
      <div>
        <h1 className="bms-page-title">{title}</h1>
        {lead && <p className="bms-page-lead">{lead}</p>}
        {Array.isArray(meta) && meta.length > 0 && (
          <p className="bms-page-meta">
            {meta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </p>
        )}
      </div>
      {actions && <div className="bms-page-actions">{actions}</div>}
    </header>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  lead: PropTypes.node,
  meta: PropTypes.arrayOf(PropTypes.string),
  actions: PropTypes.node
};
