/**
 * @file uc48-track-progress-checks.mjs
 * @description Verification test suite for UC48 Track Test Progress Web (Issue I3-002).
 */
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.NODE_ENV = 'production';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'tests', `.uc48-render-${process.pid}.mjs`);

const result = await build({
  stdin: {
    resolveDir: root,
    loader: 'jsx',
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { MemoryRouter } from 'react-router-dom';
      import TrackTestProgressPage from './src/features/patient/pages/TrackTestProgressPage.jsx';

      export function renderTrackingPage() {
        return renderToStaticMarkup(
          <MemoryRouter initialEntries={['/tracking']}>
            <TrackTestProgressPage />
          </MemoryRouter>
        );
      }
    `,
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  write: false,
  loader: { '.css': 'empty' },
  external: ['react', 'react-dom/*', 'react-router-dom', 'react-bootstrap', 'react-icons/*'],
  define: { 'import.meta.env': '{}' },
});

try {
  await writeFile(generated, result.outputFiles[0].text);
  const rendered = await import(pathToFileURL(generated).href);
  let passed = 0;

  const check = (condition, message) => {
    if (!condition) throw new Error(message);
    passed++;
    console.log(`PASS: ${message}`);
  };

  const html = rendered.renderTrackingPage();

  check(html.includes('Lộ Trình Mẫu'), 'Page renders main header and title');
  check(html.includes('ISO 15189'), 'Page displays ISO 15189 accreditation badge');
  check(html.toLowerCase().includes('nhập mã đơn xét nghiệm') || html.includes('ORD-'), 'Page displays search input bar with guide');
  check(html.includes('Tra Cứu'), 'Page renders search button');
  check(html.includes('1900 6868'), 'Page displays medical hotline assistance button');

  console.log(`\n=================================================`);
  console.log(`UC48 Web: ${passed} / 5 checks passed cleanly.`);
  console.log(`=================================================`);
} finally {
  try { await unlink(generated); } catch {}
}
