/** @file uc71-access-checks.mjs
 * @description Exercises actual guard/sidebar rendering for UC71 role recognition; no browser/E2E claim.
 */
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.NODE_ENV = 'production';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'tests', `.uc71-render-${process.pid}.mjs`);
const result = await build({
  stdin: {
    resolveDir: root, loader: 'jsx', contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter } from 'react-router-dom';
      import ProtectedRoute from './src/routes/ProtectedRoute.jsx';
      import Sidebar from './src/components/Layout/Sidebar.jsx';
      export function guard(roles) {
        return renderToStaticMarkup(<MemoryRouter><ProtectedRoute allowedRoles={roles}><span>ACCESS_GRANTED</span></ProtectedRoute></MemoryRouter>);
      }
      export function sidebar() {
        return renderToStaticMarkup(<MemoryRouter><Sidebar isCollapsed={false} onToggle={() => {}} /></MemoryRouter>);
      }
    `,
  },
  bundle: true, platform: 'browser', format: 'esm', write: false,
  external: ['react', 'react-dom/*', 'react-router-dom', 'react-bootstrap', 'react-icons/*'],
  define: { 'import.meta.env': '{}' },
});
try {
  await writeFile(generated, result.outputFiles[0].text);
  const rendered = await import(pathToFileURL(generated).href);
  let passed = 0;
  const signIn = (role) => {
    const values = new Map([['bms_access_token', 'fixture-token'], ['bms_user', JSON.stringify({ role })]]);
    globalThis.localStorage = { getItem: (key) => values.get(key) ?? null };
    globalThis.sessionStorage = { getItem: () => null };
  };
  const check = (condition, message) => { if (!condition) throw new Error(message); passed++; console.log(`PASS ${message}`); };
  for (const role of ['Nurse', 'Phlebotomist']) {
    signIn(role);
    check(rendered.guard(['Nurse']).includes('ACCESS_GRANTED'), `${role} resolves to the nursing role`);
    check(!rendered.guard(['Patient']).includes('ACCESS_GRANTED'), `${role} does not inherit patient-only access`);
    const menu = rendered.sidebar();
    check(menu.includes('Hành Trình Mẫu') && menu.includes('Hồ Sơ Cá Nhân') && menu.includes('Bảng Điều Khiển'), `${role} sees timeline and common navigation`);
  }
  for (const role of ['WarehouseStaff', 'Cashier']) {
    signIn(role);
    check(!rendered.guard(['Patient', 'Nurse', 'LabTech']).includes('ACCESS_GRANTED'), `${role} cannot inherit timeline access`);
    const menu = rendered.sidebar();
    check(!menu.includes('Hành Trình Mẫu') && menu.includes('Hồ Sơ Cá Nhân'), `${role} retains account navigation without timeline menu`);
  }
  signIn('Patient');
  check(rendered.guard(['Patient']).includes('ACCESS_GRANTED') && rendered.sidebar().includes('Hành Trình Mẫu'), 'Patient can navigate to server-scoped progress');
  signIn('LabTechnician');
  check(rendered.guard(['LabTech']).includes('ACCESS_GRANTED') && rendered.sidebar().includes('Hành Trình Mẫu'), 'LabTechnician alias retains LabTech access');
  console.log(`UC71 web: ${passed} rendering checks passed.`);
} finally {
  await unlink(generated).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  delete globalThis.localStorage;
  delete globalThis.sessionStorage;
}
