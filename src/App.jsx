import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import Register from './features/auth/Register';
import ChangePassword from './features/auth/ChangePassword';
import RoleBasedDashboard from './features/manager-dashboard/pages/RoleDashboard';
import SampleQueuePage from './features/laboratory/pages/SampleQueuePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Register />} />
        </Route>

        {/* Protected / Main Routes */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<RoleBasedDashboard />} />
          <Route path="/lab/queue" element={<SampleQueuePage />} />
          <Route path="/change-password" element={
            <div className="container py-4">
              <div className="row justify-content-center">
                <div className="col-md-7">
                  <ChangePassword />
                </div>
              </div>
            </div>
          } />
          {/* Default redirect to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
