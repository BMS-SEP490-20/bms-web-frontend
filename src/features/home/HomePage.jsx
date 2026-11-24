/**
 * @file HomePage.jsx
 * @description Master Home Controller resolving between:
 *  1. GuestHomePage for anonymous visitors.
 *  2. PatientHomePage for signed-in patients (navbar "Trang Chủ" → /home).
 *  3. Staff roles redirected to their clinical workstations.
 * Conforms to: Production Medical Standards ISO 15189 & RBAC Matrix.
 */

import React, { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { ROLES, resolveRoleId, getStoredUser } from '../../constants/roles';
import GuestHomePage from './GuestHomePage';
import PatientHomePage from './PatientHomePage';

export default function HomePage() {
  const user = useMemo(() => {
    return getStoredUser();
  }, []);

  const roleId = useMemo(() => {
    return resolveRoleId(user);
  }, [user]);

  // If user is logged in as Staff (Receptionist, Doctor, Lab, Manager, Admin):
  // Immediately redirect to their operational workstation!
  if (user && roleId && roleId !== ROLES.PATIENT) {
    switch (roleId) {
      case ROLES.RECEPTIONIST:
        return <Navigate to="/receptionist/check-in" replace />;
      case ROLES.DOCTOR:
        return <Navigate to="/doctor/console" replace />;
      case ROLES.LAB:
        return <Navigate to="/lab/queue" replace />;
      case ROLES.MANAGER:
      case ROLES.ADMIN:
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // Signed-in patient: keep /home as a real destination (PortalNavbar "Trang Chủ").
  // Redirecting to /appointments made every home click look like a broken route.
  if (user && roleId === ROLES.PATIENT) {
    if (!user.medicalProfileCompleted) {
      return <Navigate to="/patient/medical-profile-setup" replace />;
    }
    return <PatientHomePage user={user} />;
  }

  // If unauthenticated guest
  return <GuestHomePage user={null} isStaff={false} />;
}
