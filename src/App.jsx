/**
 * @file App.jsx
 * @description Main application component for BMS Web Frontend - Blood Laboratory Management System.
 * Configures application routing for medical portal features and authentication workflows.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';
import UserProfilePage from './features/patient-portal/pages/UserProfilePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
