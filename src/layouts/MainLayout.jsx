/**
 * @file MainLayout.jsx
 * @description Primary authenticated application layout with global collapsible Sidebar, AppHeader and Footer.
 * Unifies all clinical and administration modules in Iteration 1 into a consistent Hospital Management Shell.
 * Conforms to: Production Medical Standards & AGENTS-DESIGN.md.
 */

import React, { useState, useEffect, useMemo } from 'react';
import PatientPortalLayout from './PatientPortalLayout';
import { ROLES, resolveRoleId, getStoredUser } from '../constants/roles';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar.jsx';
import AppHeader from '../components/Layout/AppHeader';

/**
 * Main application layout enclosing authenticated screens with responsive navigation.
 *
 * @returns {JSX.Element} The rendered main layout.
 */
export default function MainLayout() {
  const user = useMemo(() => getStoredUser(), []);
  const roleId = useMemo(() => resolveRoleId(user), [user]);

  // Logged-in Patient is a healthcare consumer: delegate to synchronized PatientPortalLayout
  if (user && roleId === ROLES.PATIENT) {
    return <PatientPortalLayout />;
  }
  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);

  // Desktop sidebar collapsed state (persisted in localStorage)
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('bms_sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Track window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save desktop collapsed state
  useEffect(() => {
    try {
      localStorage.setItem('bms_sidebar_collapsed', JSON.stringify(desktopCollapsed));
    } catch {
      // Ignore storage errors
    }
  }, [desktopCollapsed]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setDesktopCollapsed(!desktopCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const sidebarWidth = desktopCollapsed ? '80px' : '260px';

  return (
    <div className="bms-app-layout min-vh-100 d-flex flex-column" style={{ background: 'var(--bg-page, #F4F7F9)', overflowX: 'hidden' }}>
      {/* Mobile Backdrop Overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          className="bms-mobile-overlay position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Responsive Sidebar */}
      <div
        className={`bms-sidebar-container ${isMobile ? (mobileSidebarOpen ? 'd-block' : 'd-none') : 'd-block'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: isMobile ? 1050 : 1000,
          width: isMobile ? '280px' : sidebarWidth,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        <Sidebar
          isCollapsed={isMobile ? false : desktopCollapsed}
          onToggle={toggleSidebar}
          isMobile={isMobile}
          onCloseMobile={closeMobileSidebar}
        />
      </div>

      {/* Main Layout Area: Header + Content + Footer */}
      <div
        className="bms-main-content-wrapper d-flex flex-column flex-grow-1"
        style={{
          marginLeft: isMobile ? '0' : sidebarWidth,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '100vh'
        }}
      >
        {/* Unified Application Header */}
        <AppHeader onToggleSidebar={toggleSidebar} />

        {/* Dynamic Page Content Outlet - 100% full width layout */}
        <main className="bms-page-content flex-grow-1 px-3 py-3 px-xl-4 w-100" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
          <Outlet />
        </main>

        {/* Soft Telehealth Minimal Footer */}
        <footer className="bms-main-footer py-3 px-4 text-muted small" style={{ borderTop: '1px solid rgba(15, 23, 42, 0.04)', background: 'transparent' }}>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
            <div style={{ color: '#6B7280', fontSize: '12px' }}>
              &copy; {new Date().getFullYear()} <strong>BMS Health</strong> — Clinical Laboratory Diagnostics Platform.
            </div>
            <div className="d-flex align-items-center gap-3" style={{ fontSize: '12px' }}>
              <span className="text-muted">ISO 15189 Quality System</span>
              <span className="text-secondary">•</span>
              <span style={{ color: '#0F3D1A', backgroundColor: '#EEF8EB', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>v1.0 Production</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
