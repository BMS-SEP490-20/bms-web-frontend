/** @file uc76-access-checks.mjs
 * @description UC76 Lịch sử xét nghiệm, web guard + menu for the 6 roles (TIEU-CHI-DOT2-DOT3 R10, R17; decision 10).
 * Allowed: Manager, Lab, Doctor, Patient (own data, enforced server-side). Denied: Admin, Receptionist.
 * Web guard is UX only; the real 401/403 are tested against the API (BMS.UC76.Checks).
 */
import { runAccessCheck } from './_role-access-harness.mjs';
await runAccessCheck({ uc: 'UC76', routePath: '/patient/test-history', menuLabel: 'Lịch Sử Xét Nghiệm', allowed: ['MANAGER', 'LAB', 'DOCTOR', 'PATIENT'] });
