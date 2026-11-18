/**
 * Unified Soft Healthcare SaaS Page Header Card across all roles.
 */
import React from 'react';
import PropTypes from 'prop-types';

export default function PageHeader({ title, subtitle, lead, actions }) {
  const subText = subtitle || lead;
  return (
    <div className="bms-page-header-card mb-4">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 w-100">
        <div className="bms-page-header-content">
          <h1 className="bms-page-title m-0">{title}</h1>
          {subText ? <p className="text-muted small m-0 mt-1">{subText}</p> : null}
        </div>
        {actions ? <div className="bms-page-actions">{actions}</div> : null}
      </div>
    </div>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  lead: PropTypes.string,
  actions: PropTypes.node
};
