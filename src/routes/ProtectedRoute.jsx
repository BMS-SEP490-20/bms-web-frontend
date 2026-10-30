/**
 * @file ProtectedRoute.jsx
 * @description The single route guard for BMS web (BR-IAM-02). Replaces the second copy that lived in App.jsx.
 * UX only: the backend `[Authorize(Roles=…)]` attributes remain the security boundary.
 *
 * - not signed in            -> redirect to /login (remembers the target in location state)
 * - signed in, role unknown  -> redirect to /403 (unknown roles are never treated as Patient)
 * - signed in, wrong role    -> redirect to /403
 * - allowed                  -> render children, or <Outlet/> when used as a layout route
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../config/api";
import { getStoredUser, resolveRoleId } from "../constants/roles";

/**
 * @param {object} props
 * @param {Array<number|string>} [props.allowedRoles] Role IDs from ROLES (role names are accepted and
 *   resolved through the same alias table). Empty or missing = any signed-in user with a known role.
 * @param {React.ReactNode} [props.children] Content to render instead of nested routes.
 * @returns {JSX.Element}
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const token = getToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roleId = resolveRoleId(user);
  const allowedIds = (allowedRoles ?? []).map(resolveRoleId).filter((id) => id !== null);
  const allowed = roleId !== null && (allowedIds.length === 0 || allowedIds.includes(roleId));

  if (!allowed) {
    return <Navigate to="/403" state={{ from: location }} replace />;
  }

  return children ?? <Outlet />;
}
