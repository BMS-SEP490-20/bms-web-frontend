/** Regression checks for UC49–UC52: response/error handling must await fetch. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({
  entryPoints: ['src/features/schedule/api/scheduleApi.js'], bundle: true,
  platform: 'node', format: 'esm', write: false,
  plugins: [{name: 'fixture-auth', setup(builder) {
    builder.onResolve({filter: /config\/api$/}, () => ({path: 'auth', namespace: 'fixture'}));
    builder.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: "export const API_URL='http://fixture.invalid/api'; export const getToken=()=> 'fixture-token';"}));
  }}],
});
const { scheduleApi } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const original = globalThis.fetch;
let calls = 0;
try {
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.headers.Authorization, 'Bearer fixture-token');
    return options.method === 'DELETE' ? new Response(null, {status: 204}) : Response.json([{id: 'shift-fixture'}]);
  };
  assert.deepEqual(await scheduleApi.list('doctor-fixture'), [{id: 'shift-fixture'}]);
  await scheduleApi.create({doctorId: 'doctor-fixture'});
  await scheduleApi.update('shift-fixture', {notes: 'updated'});
  assert.equal(await scheduleApi.remove('shift-fixture'), undefined);
  assert.deepEqual(await scheduleApi.getRooms(), [{id: 'shift-fixture'}]);
  assert.equal(calls, 5);
  globalThis.fetch = async () => Response.json({message: 'Fixture denied'}, {status: 403});
  await assert.rejects(scheduleApi.list('doctor-fixture'), /Fixture denied/);
  console.log('Personal schedule client: list/create/update/delete/rooms and API error checks passed');
} finally { globalThis.fetch = original; }
