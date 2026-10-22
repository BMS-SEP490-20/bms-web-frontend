/** @file uc76-access-checks.mjs
 * @description Tests actual guard/sidebar rendering for clinical history access; no browser/E2E claim.
 */
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
process.env.NODE_ENV = 'production';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'tests', `.uc76-render-${process.pid}.mjs`);
const result = await build({
  stdin: { resolveDir: root, loader: 'jsx', contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { MemoryRouter } from 'react-router-dom';
    import ProtectedRoute from './src/routes/ProtectedRoute.jsx';
    import Sidebar from './src/components/Layout/Sidebar.jsx';
    export function render() {
      return [renderToStaticMarkup(<MemoryRouter><ProtectedRoute allowedRoles={['Admin','Manager','Doctor','LabHead','LabTech','Patient']}><span>HISTORY_ALLOWED</span></ProtectedRoute></MemoryRouter>),
        renderToStaticMarkup(<MemoryRouter><Sidebar isCollapsed={false} onToggle={() => {}} /></MemoryRouter>)];
    }
  ` },
  bundle: true, platform: 'browser', format: 'esm', write: false,
  external: ['react', 'react-dom/*', 'react-router-dom', 'react-bootstrap', 'react-icons/*'], define: { 'import.meta.env': '{}' },
});
try {
  await writeFile(generated, result.outputFiles[0].text);
  const actual = await import(pathToFileURL(generated).href);
  let passed = 0;
  for (const [allowed, roles] of [[true, ['Admin', 'Administrator', 'Manager', 'Doctor', 'LabHead', 'LabTech', 'LabTechnician', 'Patient']], [false, ['Nurse', 'Phlebotomist', 'Receptionist', 'Cashier', 'WarehouseStaff']]]) {
    for (const role of roles) {
      const values = new Map([['bms_access_token', 'fixture-token'], ['bms_user', JSON.stringify({ role })]]);
      globalThis.localStorage = { getItem: (key) => values.get(key) ?? null };
      globalThis.sessionStorage = { getItem: () => null };
      const [guard, menu] = actual.render();
      if (guard.includes('HISTORY_ALLOWED') !== allowed || menu.includes('Lịch Sử Xét Nghiệm') !== allowed) throw new Error(`UC76 role mismatch: ${role}`);
      console.log(`PASS UC76 ${role}: ${allowed ? 'allowed' : 'denied'}`); passed++;
    }
  }
  console.log(`UC76 web: ${passed} role rendering checks passed.`);
} finally {
  await unlink(generated).catch((error) => { if (error.code !== 'ENOENT') throw error; });
  delete globalThis.localStorage; delete globalThis.sessionStorage;
}
