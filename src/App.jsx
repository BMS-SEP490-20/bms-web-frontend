/**
 * @file App.jsx
 * @description Main application routing configuration for BMS Web Frontend - Blood Laboratory Management System.
 * Connects unauthenticated auth flows (Register, Login, Forgot Password / OTP) and protected medical portal layouts (Dashboard, Lab Queue, Change Password, User Profile, Roles Management, Test Criteria).
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Register from './features/auth/Register';
import ChangePassword from './features/auth/ChangePassword';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import UserProfilePage from './features/patient-portal/pages/UserProfilePage';
import RoleBasedDashboard from './features/manager-dashboard/pages/RoleDashboard';
import SampleQueuePage from './features/laboratory/pages/SampleQueuePage';
import RolesManagementPage from './features/user-management/pages/RolesManagementPage';
import TestCriteriaPage from './features/laboratory/pages/TestCriteriaPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Unauthenticated Authentication Workflows (UC02, UC03, UC05, UC10) */}
        <Route element={<AuthLayout />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Authenticated Clinical, Patient, Lab & Administrative Workflows (UC07, UC08, UC12, UC13, UC17, UC18) */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<RoleBasedDashboard />} />
          <Route path="/lab/queue" element={<SampleQueuePage />} />
          <Route path="/criteria" element={<TestCriteriaPage />} />
          <Route path="/laboratory/criteria" element={<TestCriteriaPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/roles" element={<RolesManagementPage />} />
          <Route path="/change-password" element={
            <div className="container py-4">
              <div className="row justify-content-center">
                <div className="col-md-7">
                  <ChangePassword />
                </div>
              </div>
            </div>
          } />

          {/* Fallback Redirection */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
