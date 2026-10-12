/**
 * @file App.jsx
 * @description Main application component for BMS Web Frontend - Blood Laboratory Management System.
 * Configures application routing for medical portal features and authentication workflows.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ForgotPasswordPage from './features/auth/pages/ForgotPasswordPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<Navigate to="/forgot-password" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
