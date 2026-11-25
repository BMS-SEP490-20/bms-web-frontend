import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import PortalNavbar from '../features/home/components/PortalNavbar';
import MegaFooter from '../features/home/components/MegaFooter';
import { getStoredUser } from '../constants/roles';

/**
 * Dedicated Layout for Logged-In Patients.
 * Retains 100% header, footer, and styling synchronization with the Patient Home and Guest portals.
 * Strictly separates patient consumers from clinical/staff management shell.
 */
export default function PatientPortalLayout() {
  const user = useMemo(() => getStoredUser(), []);

  return (
    <div className="bms-landing-wrapper min-vh-100 d-flex flex-column" style={{ background: 'var(--bg-page)' }}>
      {/* 1. Synced Patient Topbar & Navbar */}
      <PortalNavbar user={user} />

      {/* 2. Patient Module Content Body with unified bms-workbench surface */}
      <main className="bms-patient-module-container bms-app-layout flex-grow-1" style={{ padding: '20px 16px 28px' }}>
        <div className="container bms-page-content" style={{ maxWidth: 1240, background: 'transparent' }}>
          <Outlet />
        </div>
      </main>

      {/* 3. Legal 4-Column MegaFooter */}
      <MegaFooter />
    </div>
  );
}

