/**
 * @file roles.js
 * @description Single source of truth for the six BMS roles (decision 30/10/2026, ROLE-PERMISSION-MATRIX §0).
 * IDs match the backend `role_id` claim: 1 Admin, 2 Manager, 3 Lab, 4 Doctor, 5 Receptionist, 6 Patient.
 * Every guard, menu and role label in the web app must import from here instead of keeping its own map.
 */

/** Canonical role IDs (same numbers as the backend RoleId / `role_id` claim). */
export const ROLES = Object.freeze({ ADMIN: 1, MANAGER: 2, LAB: 3, DOCTOR: 4, RECEPTIONIST: 5, PATIENT: 6 });

/** Vietnamese display labels keyed by role ID. */
export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Quản lý',
  [ROLES.LAB]: 'Lab',
  [ROLES.DOCTOR]: 'Bác sĩ',
  [ROLES.RECEPTIONIST]: 'Lễ tân',
  [ROLES.PATIENT]: 'Bệnh nhân',
});

/** Every role; use for screens open to any signed-in user (profile, password, own notifications). */
export const ALL_ROLES = Object.freeze(Object.values(ROLES));

// Old self-registration accounts were stored with RoleId 9; the backend now issues them as Patient (6).
const LEGACY_PATIENT_ROLE_ID = 9;

// Exact (case-insensitive) names only. WHY: the old guards used substring matching and defaulted unknown
// roles to PATIENT, so any odd string gained patient access. Unknown now resolves to null and is denied.
const NAME_TO_ID = Object.freeze({
  admin: ROLES.ADMIN, administrator: ROLES.ADMIN,
  manager: ROLES.MANAGER, labhead: ROLES.MANAGER, labmanager: ROLES.MANAGER, lab_manager: ROLES.MANAGER,
  lab: ROLES.LAB, labtech: ROLES.LAB, labtechnician: ROLES.LAB, labuser: ROLES.LAB, lab_user: ROLES.LAB,
  laboratoryuser: ROLES.LAB, phlebotomist: ROLES.LAB, warehousestaff: ROLES.LAB,
  doctor: ROLES.DOCTOR,
  receptionist: ROLES.RECEPTIONIST, cashier: ROLES.RECEPTIONIST, nurse: ROLES.RECEPTIONIST,
  patient: ROLES.PATIENT,
});

/**
 * Resolves a role ID from a user object, a numeric ID, or a role name.
 * Legacy names (LabHead, LabTech, WarehouseStaff, Cashier, Nurse…) map to their merged role (matrix §0).
 *
 * @param {object|string|number|null|undefined} source User ({ roleId, role, roleName }) or a raw role value.
 * @returns {number|null} Role ID 1–6, or null when the role is missing or unknown (callers must deny).
 */
export function resolveRoleId(source) {
  if (source === null || source === undefined || source === '') return null;
  if (typeof source === 'object') {
    const byId = resolveRoleId(source.roleId ?? source.RoleId ?? source.role_id);
    return byId ?? resolveRoleId(source.role ?? source.roleName ?? source.RoleName);
  }
  const text = String(source).trim();
  if (/^\d+$/.test(text)) {
    const id = Number(text);
    if (id === LEGACY_PATIENT_ROLE_ID) return ROLES.PATIENT;
    return ALL_ROLES.includes(id) ? id : null;
  }
  return NAME_TO_ID[text.toLowerCase().replace(/[\s-]/g, '')] ?? null;
}

/**
 * True when the user holds one of the given roles.
 *
 * @param {object|string|number|null|undefined} user User object (or raw role value).
 * @param {...number} roleIds Allowed role IDs from {@link ROLES}.
 * @returns {boolean}
 */
export function hasRole(user, ...roleIds) {
  const id = resolveRoleId(user);
  return id !== null && roleIds.flat().includes(id);
}

/**
 * Reads the signed-in user saved at login (localStorage first, then sessionStorage).
 *
 * @returns {object|null} Parsed user, or null when absent/corrupt.
 */
export function getStoredUser() {
  try {
    const raw = globalThis.localStorage?.getItem('bms_user') || globalThis.sessionStorage?.getItem('bms_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
