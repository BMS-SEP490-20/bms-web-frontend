/**
 * @file SkeletonProfile.jsx
 * @description Shimmer skeleton placeholder component displayed while profile data is fetching.
 * Conforms to: AGENTS-DESIGN.md Rule 23 (Skeleton Shimmer Loading).
 */

import React from 'react';
import './SkeletonProfile.css';

export const SkeletonProfile = () => {
  return (
    <div className="row g-4" aria-busy="true" aria-label="Loading profile information">
      {/* Left Column Skeleton */}
      <div className="col-12 col-lg-4">
        <div className="card shadow-sm border-0 p-4 text-center">
          <div className="bms-skeleton bms-skeleton-avatar"></div>
          <div className="bms-skeleton bms-skeleton-title"></div>
          <div className="bms-skeleton bms-skeleton-subtitle"></div>
          <div className="bms-skeleton bms-skeleton-badge"></div>
        </div>
      </div>

      {/* Right Column Skeleton */}
      <div className="col-12 col-lg-8">
        <div className="card shadow-sm border-0 p-4">
          <div className="bms-skeleton mb-4" style={{ height: '24px', width: '35%' }}></div>
          <div className="row g-3">
            <div className="col-md-6"><div className="bms-skeleton bms-skeleton-field"></div></div>
            <div className="col-md-6"><div className="bms-skeleton bms-skeleton-field"></div></div>
            <div className="col-md-6"><div className="bms-skeleton bms-skeleton-field"></div></div>
            <div className="col-md-6"><div className="bms-skeleton bms-skeleton-field"></div></div>
            <div className="col-12"><div className="bms-skeleton bms-skeleton-field"></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonProfile;
