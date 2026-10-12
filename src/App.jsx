/**
 * @file App.jsx
 * @description Ứng dụng chính BMS Web Frontend - Blood Laboratory Management System.
 * Định tuyến các trang chức năng y tế và luồng xác thực người dùng.
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
