/** @file uc71-access-checks.mjs
 * @description UC71 Hành trình mẫu, web guard + menu for the 6 roles (TIEU-CHI-DOT2-DOT3 table 1.2, R17).
 * Allowed: Lab, Manager, Doctor. Denied: Admin, Receptionist, Patient (patients use UC48 tracking instead).
 * Web guard is UX only; the real 401/403 are tested against the API (BMS.UC71.Checks).
 */
import { runAccessCheck } from './_role-access-harness.mjs';
await runAccessCheck({ uc: 'UC71', routePath: '/laboratory/sample-timeline', menuLabel: 'Hành Trình Mẫu', allowed: ['LAB', 'MANAGER', 'DOCTOR'] });
