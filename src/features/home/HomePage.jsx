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

  if (user && roleId === ROLES.PATIENT) {
    return <PatientHomePage user={user} />;
  }

  return <GuestHomePage user={null} isStaff={false} />;
}
