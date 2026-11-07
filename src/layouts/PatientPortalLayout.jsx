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
    <div className="bms-landing-wrapper min-vh-100 d-flex flex-column bg-light">
      {/* 1. Synced Patient Topbar & Navbar */}
      <PortalNavbar user={user} />

      {/* 2. Patient Module Content Body */}
      <main className="bms-patient-module-container flex-grow-1" style={{ padding: '24px 16px 20px' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <Outlet />
        </div>
      </main>

      {/* 3. Legal 4-Column MegaFooter */}
      <MegaFooter />
    </div>
  );
}

