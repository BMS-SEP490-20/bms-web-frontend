/** @file _role-access-harness.mjs
 * @description Shared harness for UC71/UC76 web access tests (6-role matrix, decision 30/10/2026).
 * Renders the real ProtectedRoute + Sidebar for every role ID 1–6 plus unknown/no-session cases, and reads the
 * allowedRoles that App.jsx actually wraps around the route. Exits non-zero on the first mismatch.
 */
import { build } from 'esbuild';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Returns the role constant names in the closest `allowedRoles={[...]}` wrapper above `routePath` in App.jsx. */
async function appRouteRoles(routePath) {
  const app = await readFile(path.join(root, 'src', 'App.jsx'), 'utf8');
  const at = app.indexOf(`path="${routePath}"`);
  if (at < 0) throw new Error(`App.jsx has no route ${routePath}`);
  const before = app.slice(0, at);
  const m = [...before.matchAll(/allowedRoles=\{\[([^\]]*)\]\}/g)].pop();
  if (!m) throw new Error(`Route ${routePath} is not wrapped by ProtectedRoute`);
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

export async function runAccessCheck({ uc, routePath, menuLabel, allowed }) {
  const generated = path.join(root, 'tests', `.${uc}-render-${process.pid}.mjs`);
  const result = await build({
    stdin: { resolveDir: root, loader: 'jsx', contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter, Routes, Route } from 'react-router-dom';
      import ProtectedRoute from './src/routes/ProtectedRoute.jsx';
      import Sidebar from './src/components/Layout/Sidebar.jsx';
      export { ROLES } from './src/constants/roles.js';
      export function guard(roles) {
        return renderToStaticMarkup(<MemoryRouter initialEntries={['/x']}><Routes>
          <Route element={<ProtectedRoute allowedRoles={roles} />}><Route path="/x" element={<span>ACCESS_GRANTED</span>} /></Route>
          <Route path="/login" element={<span>AT_LOGIN</span>} /><Route path="/403" element={<span>AT_403</span>} />
        </Routes></MemoryRouter>);
      }
      export function sidebar() { return renderToStaticMarkup(<MemoryRouter><Sidebar isCollapsed={false} onToggle={() => {}} /></MemoryRouter>); }
    ` },
    bundle: true, platform: 'browser', format: 'esm', write: false,
    external: ['react', 'react-dom/*', 'react-router-dom', 'react-bootstrap', 'react-icons/*'], define: { 'import.meta.env': '{}' },
  });
  let passed = 0;
  const check = (ok, msg) => { if (!ok) throw new Error(`${uc} FAIL: ${msg}`); passed++; console.log(`PASS ${msg}`); };
  const session = (user) => {
    const values = new Map(user ? [['bms_access_token', 'fixture-token'], ['bms_user', JSON.stringify(user)]] : []);
    globalThis.localStorage = { getItem: (k) => values.get(k) ?? null };
    globalThis.sessionStorage = { getItem: () => null };
  };
  try {
    await writeFile(generated, result.outputFiles[0].text);
    const r = await import(pathToFileURL(generated).href);
    const { ROLES } = r;
    const allowedIds = allowed.map((k) => ROLES[k]);
    const routeRoles = (await appRouteRoles(routePath)).map((k) => ROLES[k]);
    check(JSON.stringify([...routeRoles].sort()) === JSON.stringify([...allowedIds].sort()),
      `App.jsx ${routePath} allowedRoles = [${allowed.join(', ')}]`);
    for (const [name, id] of Object.entries(ROLES)) {
      const want = allowedIds.includes(id);
      session({ roleId: id });
      const g = r.guard(routeRoles);
      check(g.includes('ACCESS_GRANTED') === want, `role ${id} ${name} route ${want ? 'allowed' : 'denied'}`);
      check(r.sidebar().includes(menuLabel) === want, `role ${id} ${name} menu "${menuLabel}" ${want ? 'shown' : 'hidden'}`);
    }
    for (const bad of [{ roleId: 7 }, { roleId: 0 }, { role: 'Hacker' }, {}]) {
      session(bad);
      const g = r.guard(routeRoles);
      check(!g.includes('ACCESS_GRANTED'), `unknown role ${JSON.stringify(bad)} denied`);
      check(!r.sidebar().includes(menuLabel), `unknown role ${JSON.stringify(bad)} has no "${menuLabel}" menu`);
    }
    session(null);
    check(!r.guard(routeRoles).includes('ACCESS_GRANTED'), 'no session denied (static render cannot follow <Navigate>; target /login is covered by SMK-ALL-07)');
    console.log(`${uc} web: ${passed} checks passed.`);
  } finally {
    await unlink(generated).catch((e) => { if (e.code !== 'ENOENT') throw e; });
    delete globalThis.localStorage; delete globalThis.sessionStorage;
  }
}
