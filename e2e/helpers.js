// @ts-check
import { ROLES } from '../src/constants/roles.js';

/**
 * Injects a mock authenticated session into the browser context.
 * @param {import('@playwright/test').Page} page
 * @param {number} roleId
 * @param {string} username
 * @param {string} fullName
 */
export async function injectSession(page, roleId, username = 'testuser', fullName = 'Test User') {
  await page.addInitScript(({ roleId, username, fullName }) => {
    const user = {
      id: 'USR-TEST-001',
      username,
      fullName,
      roleId,
      role: roleId === 1 ? 'ADMIN' : roleId === 2 ? 'MANAGER' : roleId === 3 ? 'LAB' : roleId === 4 ? 'DOCTOR' : roleId === 5 ? 'RECEPTIONIST' : 'PATIENT',
      email: `${username}@bms.health.vn`
    };
    window.localStorage.setItem('bms_token', 'MOCK_PLAYWRIGHT_JWT_TOKEN');
    window.localStorage.setItem('bms_access_token', 'MOCK_PLAYWRIGHT_JWT_TOKEN');
    window.localStorage.setItem('bms_user', JSON.stringify(user));
  }, { roleId, username, fullName });
}

export { ROLES };

