/**
 * The only page header. Title on the left, optional actions on the right.
 */
import React from 'react';
import PropTypes from 'prop-types';

export default function PageHeader({ title, actions }) {
  return (
    <header className="bms-page-header">
      <div className="bms-page-header-content">
        <h1 className="bms-page-title">{title}</h1>
      </div>
      {actions ? <div className="bms-page-actions">{actions}</div> : null}
    </header>
  );
}

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  actions: PropTypes.node
};
