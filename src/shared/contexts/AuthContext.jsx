/**
 * @file AuthContext.jsx
 * @description Shared authentication session context for the BMS web client.
 *
 * WHY this file exists: several modules merged in Iteration 3 (App.jsx route guard,
 * QC flags, feedback, lab rooms, notification history, legacy headers) import
 * `shared/contexts/AuthContext`, but the module was never committed to this repo.
 * It is rebuilt here on top of the session storage contract already used by
 * `features/auth/pages/LoginPage.jsx` (`bms_user` + `bms_access_token`/`bms_token`)
 * and `config/api.js` (`getToken`, `clearAuthTokens`, `bms:session-expired`), so
 * there is still exactly one source of truth for the session.
 *
 * Role IDs are passed through as stored by the backend; mapping them to role keys
 * is intentionally NOT done here (role-ID unification is scheduled for Đợt 2).
 * Client-side role data is a UX hint only; the backend remains the security boundary.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthTokens, getToken } from "../../config/api";

const USER_STORAGE_KEY = "bms_user";
const SESSION_EXPIRED_EVENT = "bms:session-expired";

/**
 * @typedef {object} AuthContextValue
 * @property {object|null} user - Stored user profile (`bms_user`), or null when signed out.
 * @property {boolean} isAuthenticated - True when an access token is present.
 * @property {boolean} loading - True until the stored session has been read.
 * @property {string|null} userRole - Lower-cased role name from the profile (e.g. "admin").
 * @property {number|null} userRoleId - Numeric role ID from the profile, if any.
 * @property {string|null} userRoleName - Role name exactly as returned by the backend.
 * @property {(roles: Array<string|number>) => boolean} hasRole - Case-insensitive role-name / role-ID check.
 * @property {(patch: object) => void} updateUser - Merges a patch into the stored profile.
 * @property {() => void} logout - Clears all session keys and resets context state.
 */

/** @type {React.Context<AuthContextValue|null>} */
const AuthContext = createContext(null);

/**
 * Reads the stored user profile from whichever storage LoginPage used ("remember me" or not).
 *
 * @returns {object|null} Parsed profile or null when absent/corrupt.
 */
function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY) || sessionStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    // Corrupt JSON must not crash the whole app; treat as signed out.
    return null;
  }
}

/**
 * Writes the profile back to the storage area(s) that already hold it, so a
 * session-only login does not silently become persistent.
 *
 * @param {object} profile - Profile to persist.
 */
function writeStoredUser(profile) {
  const serialized = JSON.stringify(profile);
  const inSession = sessionStorage.getItem(USER_STORAGE_KEY) !== null;
  const inLocal = localStorage.getItem(USER_STORAGE_KEY) !== null;
  if (inSession) sessionStorage.setItem(USER_STORAGE_KEY, serialized);
  if (inLocal || !inSession) localStorage.setItem(USER_STORAGE_KEY, serialized);
}

/**
 * Extracts the numeric role ID from a profile, accepting the field names the backend has used.
 *
 * @param {object|null} profile - Stored user profile.
 * @returns {number|null} Role ID or null when not numeric.
 */
function extractRoleId(profile) {
  const raw = profile?.roleId ?? profile?.RoleId;
  const parsed = Number(raw);
  return raw !== undefined && raw !== null && raw !== "" && Number.isFinite(parsed) ? parsed : null;
}

/**
 * Provides the authenticated session to the component tree.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Application subtree.
 * @returns {JSX.Element} Context provider.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(getToken);

  useEffect(() => {
    // Keep tabs in sync and react to the axios refresh-failure signal from config/api.js.
    const resync = () => {
      setUser(readStoredUser());
      setToken(getToken());
    };
    window.addEventListener("storage", resync);
    window.addEventListener(SESSION_EXPIRED_EVENT, resync);
    return () => {
      window.removeEventListener("storage", resync);
      window.removeEventListener(SESSION_EXPIRED_EVENT, resync);
    };
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...(prev || {}), ...(patch || {}) };
      writeStoredUser(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    clearAuthTokens();
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo(() => {
    const userRoleName = user?.role ?? user?.roleName ?? null;
    const userRole = userRoleName ? String(userRoleName).toLowerCase() : null;
    const userRoleId = extractRoleId(user);

    /** @type {AuthContextValue["hasRole"]} */
    const hasRole = (roles = []) =>
      roles.some((r) =>
        typeof r === "number" ? r === userRoleId : userRole !== null && String(r).toLowerCase() === userRole
      );

    return {
      user,
      isAuthenticated: Boolean(token),
      loading: false,
      userRole,
      userRoleId,
      userRoleName,
      hasRole,
      updateUser,
      logout,
    };
  }, [user, token, updateUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Returns the current auth session.
 *
 * @returns {AuthContextValue} Session value.
 * @throws {Error} When used outside {@link AuthProvider}.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}

export default AuthContext;
