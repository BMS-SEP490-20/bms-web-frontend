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
export default function PageHeader({ title, lead, meta, actions, icon }) {
  const chipText = Array.isArray(meta) && meta.length > 0 ? meta[0] : null;
  const remainingMeta = Array.isArray(meta) && meta.length > 1 ? meta.slice(1) : [];

  return (
    <header className="bms-page-header">
      <div className="bms-page-header-content">
        {chipText && (
          <div className="bms-page-chip">
            <span>{chipText}</span>
          </div>
        )}
        <div className="bms-page-title-row">
          {icon && <span className="bms-page-title-icon">{icon}</span>}
          <h1 className="bms-page-title">{title}</h1>
        </div>
        {lead && <p className="bms-page-lead">{lead}</p>}
        {remainingMeta.length > 0 && (
          <p className="bms-page-meta">
            {remainingMeta.map((item) => (
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
  actions: PropTypes.node,
  icon: PropTypes.node
};

