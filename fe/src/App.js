/**
 * Blood Laboratory Management System - Main Application Component
 * 
 * This is the root component of the Blood Laboratory Management System,
 * a comprehensive React application for managing laboratory operations including
 * patient management, appointment scheduling, test result processing, and billing.
 * 
 * @author Blood Laboratory Management Team
 * @version 1.0.0
 * @since 2024
 */

// React and Routing Dependencies
import React from 'react';
import ValidateSample from './pages/lab-user/ValidateSample';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Authentication and Context Providers
import { AuthProvider, useAuth } from './shared/contexts/AuthContext';
import { NotificationProvider as NotificationContextProvider, useNotificationContext } from './shared/contexts/NotificationContext';

// Layout Components
import Layout from './components/Layout/Layout';

// Authentication Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Public Pages
import Home from './pages/public/Home';
import Services from './pages/public/Services';

// Error Pages
import Forbidden403 from './pages/errors/Forbidden403';
import NotFound404 from './pages/errors/NotFound404';

// Patient Pages
import PatientProfileEdit from './features/patient/components/PatientProfileEdit/PatientProfileEdit';
import PatientProfileRequired from './features/patient/components/PatientProfileRequired/PatientProfileRequired';
import PatientRouteWrapper from './shared/components/PatientRouteWrapper/PatientRouteWrapper';
import Profile from './pages/patient/Profile';

// Dashboard Pages (Role-based)
import AdminDashboard from './pages/admin/Dashboard';
import PatientDashboard from './pages/patient/Dashboard';
import DoctorDashboard from './pages/doctor/Dashboard';
// Lab user dashboard will reuse existing pages; no separate Dashboard component
import ManagerDashboard from './pages/manager/Dashboard';
import ReceptionistDashboard from './pages/receptionist/Dashboard';
import ReceptionistCheckInPage from './pages/receptionist/CheckIn';
import ReceptionistCreatePatientPage from './pages/receptionist/CreatePatient';

// Doctor Management Pages
import DoctorPatientProfile from './pages/doctor/PatientProfile';
import DoctorSchedule from './pages/doctor/Schedule';
import DoctorAppointments from './pages/doctor/Appointments';
// import DoctorLabResults from './pages/doctor/LabResults';

// Admin Management Pages
import AdminPatients from './pages/admin/Patients';
import AdminAppointments from './pages/admin/Appointments';
import AdminInvoices from './pages/admin/Invoices';
import AdminReports from './pages/admin/Reports';
import LabRoomManagement from './features/facilities/pages/LabRoomManagementPage';

// Shared Pages
// SampleManagement page not present; reuse AdminAppointments for result workflows

// Feature Pages
import InventoryManagement from './features/inventory/pages/InventoryManagementPage';
import ShiftAssignment from './features/appointments/components/ShiftAssignment/ShiftAssignment';
import UserManagement from './features/users/pages/UserManagementPage';
import DoctorManagement from './features/users/pages/DoctorManagementPage';
import RoleManagement from './features/users/pages/RoleManagementPage';
import MyAppointments from './features/patient/components/MyAppointments/MyAppointments';
import MyResults from './features/lab-results/components/MyResults/MyResults';
import PaymentHistory from './features/patient/components/PaymentHistory/PaymentHistory';
// ResultEntry page removed; using SampleManagement as a fallback for result-entry routes

import AppointmentTest from './pages/AppointmentTest';

// Utility Components
import ErrorBoundary from './shared/components/ErrorBoundary/ErrorBoundary';
import NotificationProvider from './shared/components/Notification/NotificationProvider';

// Styling
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';
import './shared/styles/medical-theme.css';
import './shared/styles/component-overrides.css';


/**
 * Protected Route Component
 * 
 * A higher-order component that protects routes requiring authentication and role authorization.
 * Redirects unauthenticated users to the login page and unauthorized users to their dashboard.
 * Shows loading state while authentication status is being determined.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated and authorized
 * @param {Array<string>} props.allowedRoles - Array of roles allowed to access this route
 * @returns {React.ReactNode} Protected content, redirect to login, or redirect to appropriate dashboard
 */

/**
 * Protected Route Component
 * 
 * A higher-order component that protects routes requiring authentication and role authorization.
 * This component ensures that only authenticated users with the appropriate roles can access
 * protected routes. It performs the following checks:
 * 1. Verifies user is authenticated
 * 2. Checks if user has required role(s) via allowedRoles (strings) or allowedRoleIds (numbers)
 * 3. Redirects unauthenticated users to login
 * 4. Redirects unauthorized users to their appropriate dashboard with access denied message
 * 
 * **Role checking logic:**
 * - If both allowedRoles and allowedRoleIds are provided, user needs to match either
 * - Supports role checking by role keys (strings) or role IDs (numbers)
 * - Handles both string and number roleId formats
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated and authorized
 * @param {Array<string>} [props.allowedRoles] - Array of role keys allowed to access this route (e.g., ['admin', 'doctor'])
 * @param {Array<number>} [props.allowedRoleIds] - Array of role IDs allowed to access this route (e.g., [1, 3])
 * @returns {React.ReactNode} Protected content, redirect to login, or redirect to appropriate dashboard
 * 
 * @example
 * // Protect route for admin only
 * <ProtectedRoute allowedRoles={['admin']}>
 *   <AdminPage />
 * </ProtectedRoute>
 * 
 * // Protect route for multiple roles
 * <ProtectedRoute allowedRoleIds={[3, 4]}>
 *   <DoctorLabPage />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children, allowedRoles, allowedRoleIds }) => {
  const { isAuthenticated, loading, userRole, userRoleId, hasRole, user } = useAuth();


  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" />;
  }

  // Check if user has required role(s)
  // Support both allowedRoles (array of strings) and allowedRoleIds (array of numbers)
  let hasAccess = true;

  // Only check roles if user is authenticated and roles are specified
  if (isAuthenticated && (allowedRoles || allowedRoleIds)) {
    hasAccess = false; // Default to false, will be set to true if user has access

    // Check by role keys (strings) if provided
    if (allowedRoles && allowedRoles.length > 0) {
      try {
        const hasRoleByKey = hasRole(allowedRoles);
        if (hasRoleByKey) {
          hasAccess = true;
        }
      } catch (error) {
        // Ignore error
      }
    }

    // Check by role IDs (numbers) if provided
    // If both allowedRoles and allowedRoleIds are provided, user needs to match either
    if (allowedRoleIds && allowedRoleIds.length > 0) {
      try {
        const hasRoleById = hasRole(allowedRoleIds);
        if (hasRoleById) {
          hasAccess = true;
        }
      } catch (error) {
        // Ignore error
      }
    }

    // If neither check passed and roles were specified, deny access
    if (!hasAccess && (allowedRoles?.length > 0 || allowedRoleIds?.length > 0)) {
      // Access denied - will be handled below
    }
  }

  if (!hasAccess && isAuthenticated) {
    // Check if patient is trying to access admin/management pages
    // If so, redirect to 403 page
    const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;
    const isPatient = roleIdNum === 5 || userRole === 'patient';
    
    // Check if trying to access admin/manager pages (role IDs 1 or 2, or roles 'admin' or 'manager')
    const isAccessingAdminPages = 
      (allowedRoleIds && (allowedRoleIds.includes(1) || allowedRoleIds.includes(2))) ||
      (allowedRoles && (allowedRoles.includes('admin') || allowedRoles.includes('manager')));
    
    // If patient tries to access admin/management pages, redirect to 403
    if (isPatient && isAccessingAdminPages) {
      return <Navigate to="/403" />;
    }

    // Show access denied message (except for admin who should never see this)
    if (userRoleId !== 1 && userRole !== 'admin') {
      // Store access denied message in sessionStorage to show after redirect
      const roleNames = {
        1: 'Quản trị viên',
        2: 'Quản lý',
        3: 'Bác sĩ',
        4: 'Nhân viên Lab',
        5: 'Bệnh nhân',
        6: 'Lễ tân',
        'admin': 'Quản trị viên',
        'manager': 'Quản lý',
        'doctor': 'Bác sĩ',
        'lab_user': 'Nhân viên Lab',
        'patient': 'Bệnh nhân',
        'receptionist': 'Lễ tân'
      };

      const requiredRoles = allowedRoles
        ? allowedRoles.map(r => roleNames[r] || r).join(', ')
        : allowedRoleIds.map(id => roleNames[id] || `Role ${id}`).join(', ');

      sessionStorage.setItem('accessDenied', JSON.stringify({
        message: `Bạn không có quyền truy cập chức năng này. Chức năng này chỉ dành cho: ${requiredRoles}.`,
        timestamp: Date.now()
      }));
    }

    // Redirect to appropriate dashboard based on user's role
    if (roleIdNum && !isNaN(roleIdNum)) {
      switch (roleIdNum) {
        case 1: // Admin
          return <Navigate to="/admin/dashboard" />;
        case 2: // Manager
          return <Navigate to="/manager/dashboard" />;
        case 3: // Doctor
          return <Navigate to="/doctor/dashboard" />;
        case 4: // Lab User
          return <Navigate to="/lab-user/dashboard" />;
        case 5: // Patient
          return <Navigate to="/patient/dashboard" />;
        case 6: // Receptionist
          return <Navigate to="/receptionist/dashboard" />;
        default:
          break;
      }
    }

    // Fallback to role string
    if (userRole) {
      // Fallback to role string for backward compatibility
      switch (userRole) {
        case 'admin':
          return <Navigate to="/admin/dashboard" />;
        case 'manager':
          return <Navigate to="/manager/dashboard" />;
        case 'doctor':
          return <Navigate to="/doctor/dashboard" />;
        case 'lab_user':
        case 'labuser':
        case 'lab user':
        case 'lab-user':
          return <Navigate to="/lab-user/dashboard" />;
        case 'patient':
          return <Navigate to="/patient/dashboard" />;
        case 'receptionist':
          return <Navigate to="/receptionist/dashboard" />;
        default:
          return <Navigate to="/home" />;
      }
    }
  }

  return children;
};

/**
 * Public Route Component
 * 
 * A component that handles public routes (like login, register, forgot password).
 * This component ensures that authenticated users cannot access authentication pages
 * by redirecting them to their appropriate dashboard based on their role.
 * 
 * **Behavior:**
 * - Shows loading spinner while authentication status is being determined
 * - Redirects authenticated users to their role-based dashboard
 * - Allows unauthenticated users to access public pages
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if not authenticated
 * @returns {React.ReactNode} Public content or redirect to dashboard
 * 
 * @example
 * // Public route for login page
 * <PublicRoute>
 *   <Login />
 * </PublicRoute>
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, userRoleId, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to appropriate dashboard based on role
    // Use roleId for more reliable checking (handle both string and number)
    const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;

    if (roleIdNum && !isNaN(roleIdNum)) {
      switch (roleIdNum) {
        case 1: // Admin
          return <Navigate to="/admin/dashboard" />;
        case 2: // Manager
          return <Navigate to="/manager/dashboard" />;
        case 3: // Doctor
          return <Navigate to="/doctor/dashboard" />;
        case 4: // Lab User
          return <Navigate to="/lab-user/dashboard" />;
        case 5: // Patient
          return <Navigate to="/patient/dashboard" />;
        case 6: // Receptionist
          return <Navigate to="/receptionist/dashboard" />;
        default:
          break;
      }
    }

    // Fallback to role string for backward compatibility
    if (userRole) {
      switch (userRole) {
        case 'admin':
          return <Navigate to="/admin/dashboard" />;
        case 'manager':
          return <Navigate to="/manager/dashboard" />;
        case 'doctor':
          return <Navigate to="/doctor/dashboard" />;
        case 'lab_user':
        case 'labuser':
        case 'lab user':
        case 'lab-user':
          return <Navigate to="/lab-user/dashboard" />;
        case 'patient':
          return <Navigate to="/patient/dashboard" />;
        case 'receptionist':
          return <Navigate to="/receptionist/dashboard" />;
        default:
          return <Navigate to="/home" />;
      }
    }

    return <Navigate to="/home" />;
  }

  return children;
};


/**
 * Guest Route Component
 * 
 * A component that handles guest routes (public pages like home, services).
 * This component allows unauthenticated users to access public content while
 * redirecting authenticated users to their appropriate dashboard based on their role.
 * 
 * **Use cases:**
 * - Home page, services page, public information pages
 * - Pages that should be accessible to everyone but redirect logged-in users
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render for guests
 * @returns {React.ReactNode} Guest content or role-based redirect
 * 
 * @example
 * // Guest route for home page
 * <GuestRoute>
 *   <Home />
 * </GuestRoute>
 */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading, userRoleId, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect based on role
    // Use roleId for more reliable checking (handle both string and number)
    const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;

    if (roleIdNum && !isNaN(roleIdNum)) {
      switch (roleIdNum) {
        case 1: // Admin
          return <Navigate to="/admin/dashboard" />;
        case 2: // Manager
          return <Navigate to="/manager/dashboard" />;
        case 3: // Doctor
          return <Navigate to="/doctor/dashboard" />;
        case 4: // Lab User
          return <Navigate to="/lab-user/dashboard" />;
        case 5: // Patient
          return <Navigate to="/patient/dashboard" />;
        case 6: // Receptionist
          return <Navigate to="/receptionist/dashboard" />;
        default:
          break;
      }
    }

    // Fallback to role string for backward compatibility
    if (userRole) {
      switch (userRole) {
        case 'admin':
          return <Navigate to="/admin/dashboard" />;
        case 'manager':
          return <Navigate to="/manager/dashboard" />;
        case 'doctor':
          return <Navigate to="/doctor/dashboard" />;
        case 'lab_user':
        case 'labuser':
        case 'lab user':
        case 'lab-user':
          return <Navigate to="/lab-user/dashboard" />;
        case 'patient':
          return <Navigate to="/patient/dashboard" />;
        case 'receptionist':
          return <Navigate to="/receptionist/dashboard" />;
        default:
          return <Navigate to="/home" />;
      }
    }

    return <Navigate to="/home" />;
  }

  return children;
};

/**
 * Default Redirect Component
 * 
 * A component that handles the root route ("/") by redirecting users to the
 * appropriate page based on their authentication status and role.
 * 
 * **Redirect logic:**
 * - Unauthenticated users → Home page ("/home")
 * - Authenticated users → Role-based dashboard:
 *   - Role ID 1 (Admin) → "/admin/dashboard"
 *   - Role ID 2 (Manager) → "/manager/dashboard"
 *   - Role ID 3 (Doctor) → "/doctor/dashboard"
 *   - Role ID 4 (Lab User) → "/lab-user/dashboard"
 *   - Role ID 5 (Patient) → "/patient/dashboard"
 *   - Role ID 6 (Receptionist) → "/receptionist/dashboard"
 * 
 * Handles both numeric and string roleId formats for backward compatibility.
 * 
 * @returns {React.ReactNode} Redirect component to appropriate route
 * 
 * @example
 * // Root route redirect
 * <Route path="/" element={<DefaultRedirect />} />
 */
const DefaultRedirect = () => {
  const { isAuthenticated, loading, userRoleId, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/home" />;
  }

  // Redirect based on roleId
  // roleId 1, 2, 3, 4 → dashboard pages
  // roleId 5 → patient dashboard
  // Convert roleId to number if it's a string
  const roleIdNum = typeof userRoleId === 'string' ? parseInt(userRoleId, 10) : userRoleId;

  if (roleIdNum && !isNaN(roleIdNum)) {
    switch (roleIdNum) {
      case 1: // Admin
        return <Navigate to="/admin/dashboard" />;
      case 2: // Manager
        return <Navigate to="/manager/dashboard" />;
      case 3: // Doctor
        return <Navigate to="/doctor/dashboard" />;
      case 4: // Lab User
        return <Navigate to="/lab-user/dashboard" />;
      case 5: // Patient
        return <Navigate to="/patient/dashboard" />;
      case 6: // Receptionist
        return <Navigate to="/receptionist/dashboard" />;
      default:
        break;
    }
  }

  // Fallback to role string if roleId is not a valid number
  if (userRole) {
    // Fallback to role string for backward compatibility
    switch (userRole) {
      case 'admin':
        return <Navigate to="/admin/dashboard" />;
      case 'manager':
        return <Navigate to="/manager/dashboard" />;
      case 'doctor':
        return <Navigate to="/doctor/dashboard" />;
      case 'lab_user':
        case 'labuser':
        case 'lab user':
        case 'lab-user':
        return <Navigate to="/lab-user/dashboard" />;
      case 'patient':
        return <Navigate to="/patient/dashboard" />;
      case 'receptionist':
        return <Navigate to="/receptionist/dashboard" />;
      default:
        return <Navigate to="/home" />;
    }
  }
};

/**
 * App Content Component
 * 
 * The main content component that handles routing and notification management.
 * This component defines all application routes and wraps them with appropriate
 * route protection (ProtectedRoute, PublicRoute, GuestRoute).
 * 
 * **Route Categories:**
 * - **Public Routes**: Login, Register, Forgot Password (accessible when not authenticated)
 * - **Guest Routes**: Home, Services (accessible to everyone, redirects authenticated users)
 * - **Patient Routes**: Dashboard, Appointments, Results, Payment History, Profile
 * - **Doctor Routes**: Dashboard, Patient Profile, Schedule
 * - **Lab User Routes**: Dashboard, Appointments, Results, Sample Management
 * - **Receptionist Routes**: Dashboard, Check-in, Create Patient
 * - **Admin Routes**: Dashboard, Patients, Appointments, Invoices, Reports, Management pages
 * - **Manager Routes**: Dashboard, Management pages
 * 
 * The component also manages the notification system for displaying user notifications.
 * 
 * @returns {React.ReactNode} The main application content with routing and notifications
 * 
 * @example
 * // AppContent is used inside App component
 * <AppContent />
 */
const AppContent = () => {
  const { notifications, removeNotification } = useNotificationContext();

  return (
    <>
      <Router>
        <div className="App">
          <Routes>
            {/* Home Route */}
            <Route
              path="/home"
              element={
                <GuestRoute>
                  <Home />
                </GuestRoute>
              }
            />

            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />

            <Route
              path="/test-appointments"
              element={
                <AppointmentTest />
              }
            />

            {/* Patient Routes */}
            <Route
              path="/patient/profile-required"
              element={
                <ProtectedRoute allowedRoles={['patient']} allowedRoleIds={[5]}>
                  <PatientProfileRequired />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute allowedRoles={['patient']} allowedRoleIds={[5]}>
                  <PatientRouteWrapper>
                    <PatientDashboard />
                  </PatientRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/appointments"
              element={
                <ProtectedRoute allowedRoles={['patient']} allowedRoleIds={[5]}>
                  <PatientRouteWrapper>
                    <MyAppointments />
                  </PatientRouteWrapper>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/results"
              element={
                <ProtectedRoute allowedRoles={['patient']} allowedRoleIds={[5]}>
                  <PatientRouteWrapper>
                    <MyResults />
                  </PatientRouteWrapper>
                </ProtectedRoute>
              }
            />

            <Route
              path="/patient/payment-history"
              element={
                <ProtectedRoute allowedRoles={['patient']} allowedRoleIds={[5]}>
                  <PatientRouteWrapper>
                    <PaymentHistory />
                  </PatientRouteWrapper>
                </ProtectedRoute>
              }
            />

            {/* Doctor Routes */}
            <Route
              path="/doctor/dashboard"
              element={
                <ProtectedRoute allowedRoles={['doctor']} allowedRoleIds={[3]}>
                  <Layout>
                    <DoctorDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/patient-profile/:patientId"
              element={
                <ProtectedRoute allowedRoles={['doctor']} allowedRoleIds={[3]}>
                  <Layout>
                    <DoctorPatientProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/schedule"
              element={
                <ProtectedRoute allowedRoles={['doctor']} allowedRoleIds={[3]}>
                  <Layout>
                    <DoctorSchedule />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/doctor/appointments"
              element={
                <ProtectedRoute allowedRoles={['doctor']} allowedRoleIds={[3]}>
                  <Layout>
                    <DoctorAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/doctor/patient-profile/:patientId/:appointmentId?"
              element={
                <ProtectedRoute allowedRoles={['doctor']} allowedRoleIds={[3]}>
                  <Layout>
                    <DoctorPatientProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Lab User Routes */}
            <Route
              path="/lab-user/dashboard"
              element={
                <ProtectedRoute allowedRoles={['lab_user']} allowedRoleIds={[4]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
              <Route
                path="/lab-user/validate-sample"
                element={
                  <ProtectedRoute allowedRoles={['lab_user', 'manager']} allowedRoleIds={[4, 2]}>
                    <Layout>
                      <ValidateSample />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lab-user/lab-rooms"
                element={
                  <ProtectedRoute allowedRoles={['lab_user']} allowedRoleIds={[4]}>
                    <Layout>
                      <LabRoomManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
            <Route
              path="/lab-user/appointments"
              element={
                <ProtectedRoute allowedRoles={['lab_user', 'manager']} allowedRoleIds={[4, 2]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lab-user/results"
              element={
                <ProtectedRoute allowedRoles={['lab_user', 'manager']} allowedRoleIds={[4, 2]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lab-user/sample-management"
              element={
                <ProtectedRoute allowedRoles={['lab_user', 'manager']} allowedRoleIds={[4, 2]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lab-user/result-entry"
              element={
                <ProtectedRoute allowedRoles={['lab_user']} allowedRoleIds={[4]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Receptionist Routes */}
                        <Route
              path="/receptionist/appointments"
              element={
                <ProtectedRoute allowedRoles={['receptionist']} allowedRoleIds={[6]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/receptionist/services"
              element={
                <ProtectedRoute allowedRoles={['receptionist']} allowedRoleIds={[6]}>
                  <Layout>
                    <Services />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/receptionist/dashboard"
              element={
                <ProtectedRoute allowedRoles={['receptionist']} allowedRoleIds={[6]}>
                  <Layout>
                    <ReceptionistDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/receptionist/check-in"
              element={
                <ProtectedRoute allowedRoles={['receptionist']} allowedRoleIds={[6]}>
                  <Layout>
                    <ReceptionistCheckInPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/receptionist/create-patient"
              element={
                <ProtectedRoute allowedRoles={['receptionist']} allowedRoleIds={[6]}>
                  <Layout>
                    <ReceptionistCreatePatientPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Manager Routes */}
            <Route
              path="/manager/dashboard"
              element={
                <ProtectedRoute allowedRoles={['manager']} allowedRoleIds={[2]}>
                  <Layout>
                    <ManagerDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/patients"
              element={
                <ProtectedRoute allowedRoles={['manager']} allowedRoleIds={[2]}>
                  <Layout>
                    <AdminPatients />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/inventory-management"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']} allowedRoleIds={[1, 2]}>
                  <Layout>
                    <InventoryManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/shift-assignment"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']} allowedRoleIds={[1, 2]}>
                  <Layout>
                    <ShiftAssignment />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/services"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']} allowedRoleIds={[1, 2]}>
                  <Layout>
                    <Services />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/appointments"
              element={
                <ProtectedRoute allowedRoles={['manager']} allowedRoleIds={[2]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/results"
              element={
                <ProtectedRoute allowedRoles={['manager']} allowedRoleIds={[2]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/sample-management"
              element={
                <ProtectedRoute allowedRoles={['manager']} allowedRoleIds={[2]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <AdminDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/patients"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <AdminPatients />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/appointments"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <AdminAppointments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/lab-rooms"
              element={
                <ProtectedRoute allowedRoles={['admin', 'manager']} allowedRoleIds={[1, 2]}>
                  <Layout>
                    <LabRoomManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/invoices"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <AdminInvoices />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <AdminReports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* Admin Management Routes */}
            <Route
              path="/admin/user-management"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/doctor-management"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <DoctorManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/role-management"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <RoleManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/inventory-management"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <InventoryManagement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/shift-assignment"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <ShiftAssignment />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/services"
              element={
                <ProtectedRoute allowedRoles={['admin']} allowedRoleIds={[1]}>
                  <Layout>
                    <Services />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* General Dashboard (fallback) - redirect based on roleId */}
            <Route
              path="/dashboard"
              element={<DefaultRedirect />}
            />
            <Route
              path="/doctor/patient-profile/:patientId/:appointmentId?"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DoctorPatientProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/profile-edit"
              element={
                <ProtectedRoute allowedRoles={['patient']} allowedRoleIds={[5]}>
                  <PatientRouteWrapper>
                    <PatientProfileEdit />
                  </PatientRouteWrapper>
                </ProtectedRoute>
              }
            />

            {/* Error Pages */}
            <Route
              path="/403"
              element={<Forbidden403 />}
            />
            <Route
              path="/404"
              element={<NotFound404 />}
            />

            {/* Default redirect - redirect based on authentication and roleId */}
            <Route
              path="/"
              element={<DefaultRedirect />}
            />

            {/* Catch-all route for 404 - must be last */}
            <Route
              path="*"
              element={<NotFound404 />}
            />
          </Routes>
        </div>
      </Router>
      <NotificationProvider
        notifications={notifications}
        removeNotification={removeNotification}
      />
    </>
  );
};

/**
 * Main App Component
 * 
 * The root component of the Blood Laboratory Management System.
 * Wraps the entire application with necessary providers:
 * - ErrorBoundary: Catches and handles JavaScript errors
 * - AuthProvider: Manages authentication state
 * - NotificationContextProvider: Manages notification system
 * 
 * @returns {React.ReactNode} The complete application with all providers
 */
/**
 * Main Application Component
 * 
 * The root component of the Blood Laboratory Management System application.
 * This component sets up the application's core providers and error handling:
 * 
 * **Provider Hierarchy:**
 * 1. ErrorBoundary - Catches and handles React errors
 * 2. AuthProvider - Manages authentication state and user context
 * 3. NotificationContextProvider - Manages notification system
 * 4. AppContent - Main routing and content component
 * 
 * **Responsibilities:**
 * - Initializes global context providers
 * - Provides error boundary for error handling
 * - Wraps entire application with necessary providers
 * 
 * @returns {React.ReactNode} The root application component with all providers
 * 
 * @example
 * // App is the entry point of the application
 * ReactDOM.render(<App />, document.getElementById('root'));
 */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationContextProvider>
          <AppContent />
        </NotificationContextProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;





