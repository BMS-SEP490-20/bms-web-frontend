/**
 * @file ProtectedRoute.jsx
 * @description Route guard component enforcing authentication and RBAC authorization (BR-IAM-02).
 * Verifies JWT session token and user role before granting access to clinical/management modules.
 * Conforms to: Production Engineering Standards & AGENTS-DESIGN.md.
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../config/api";
import Forbidden403 from "../components/errors/Forbidden403";

/**
 * Normalizes role string to standard uppercase format.
 *
 * @param {string} role Raw role string
 * @returns {string} Normalized role
 */
function normalizeRole(role) {
  if (!role) return "PATIENT";
  const r = role.toString().trim().toUpperCase();
  if (r.includes("ADMIN")) return "ADMIN";
  if (r.includes("MANAGER")) return "MANAGER";
  if (r.includes("DOCTOR") || r.includes("BACSI")) return "DOCTOR";
  if (r.includes("HEAD") || r.includes("TRUONGPHONG")) return "LABHEAD";
  if (r.includes("TECH") || r.includes("LAB") || r.includes("KTV")) return "LABTECH";
  if (r.includes("RECEPT") || r.includes("LETAN")) return "RECEPTIONIST";
  if (r === "NURSE" || r === "PHLEBOTOMIST") return "NURSE";
  if (r === "WAREHOUSESTAFF") return "WAREHOUSESTAFF";
  if (r.includes("CASHIER") || r.includes("THUNGAN")) return "CASHIER";
  return "PATIENT";
}

/**
 * Retrieves the current authenticated user profile from browser storage.
 *
 * @returns {object|null} The parsed user object if present, otherwise null.
 */
function getCurrentUser() {
  try {
    const raw =
      localStorage.getItem("bms_user") ||
      sessionStorage.getItem("bms_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Route guard component protecting private internal BMS application routes.
 * Checks for authentication token and verifies whether current user role matches allowed roles.
 *
 * @param {object} props - Component properties.
 * @param {string[]} [props.allowedRoles] - List of permitted role names (e.g. ['ADMIN', 'MANAGER', 'DOCTOR']).
 * @param {React.ReactNode} [props.children] - Child elements if not using nested route Outlet.
 * @returns {JSX.Element} Rendered child routes, redirect to login, or 403 Forbidden screen.
 */
export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const token = getToken();
  const user = getCurrentUser();

  // 1. Verify authentication status
  if (!token && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Verify Role-Based Access Control (RBAC) permissions
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = normalizeRole(user?.role || user?.roleName);
    const normalizedAllowedRoles = allowedRoles.map(r => normalizeRole(r));
    const hasPermission = normalizedAllowedRoles.includes(userRole);

    if (!hasPermission) {
      return (
        <Forbidden403
          requiredRole={allowedRoles.join(", ")}
          userRole={userRole}
        />
      );
    }
  }

  return children ? children : <Outlet />;
}
