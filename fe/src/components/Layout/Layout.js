/**
 * Layout Component
 * 
 * Main layout component for the Blood Laboratory Management System.
 * Provides consistent layout structure with header, sidebar, and content area.
 * Supports responsive design and mobile-friendly sidebar toggle.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import AdminHeader from './AdminHeader';
import Sidebar from './Sidebar';

/**
 * Layout Component
 * 
 * Main layout wrapper that provides consistent structure for all pages.
 * Includes responsive sidebar and header with mobile support.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render in content area
 * @returns {React.ReactNode} Layout component with header, sidebar, and content
 */
const Layout = ({ children }) => {
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Desktop sidebar collapsed state (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save to localStorage when collapsed state changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-vh-100 bg-light" style={{ overflowX: 'hidden', maxWidth: '100vw', width: '100%' }}>
      <AdminHeader onToggleSidebar={toggleSidebar} />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay d-md-none position-fixed w-100 h-100 bg-dark bg-opacity-50"
          style={{ zIndex: 1040 }}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Fixed position on desktop, relative on mobile */}
      <div
        className={`sidebar-container ${isMobile ? 'd-md-none' : 'd-none d-md-block'} ${sidebarOpen ? 'd-block' : ''}`}
        style={{
          position: isMobile ? 'fixed' : 'fixed',
          zIndex: isMobile ? 1050 : 1000,
          width: isMobile ? '280px' : '0',
          height: isMobile ? '100vh' : 'auto',
          left: isMobile ? '0' : '0',
          top: isMobile ? '0' : '0',
          overflow: isMobile ? 'visible' : 'visible',
          pointerEvents: isMobile ? 'auto' : 'none'
        }}
      >
        <Sidebar
          onClose={toggleSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          isMobile={isMobile}
        />
      </div>

      {/* Main Content */}
      <Container fluid className="p-0" style={{ 
        maxWidth: '100%', 
        overflowX: 'hidden',
        marginLeft: isMobile ? '0' : (sidebarCollapsed ? '80px' : '280px'),
        width: isMobile ? '100%' : (sidebarCollapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)'),
        transition: 'all 0.3s ease',
        marginTop: '70px',
        paddingTop: '10px'
      }}>
        <div className="main-content d-flex flex-column">
          <div className="content-wrapper flex-grow-1 p-3 p-md-4" style={{ 
            width: '100%', 
            maxWidth: '100%',
            overflowX: 'hidden',
            boxSizing: 'border-box'
          }}>
            {children}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Layout;