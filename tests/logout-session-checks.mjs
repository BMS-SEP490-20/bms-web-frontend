/** UC06 regression: revoke captured refresh credentials, always clear local session. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result=await build({entryPoints:['src/shared/auth/logoutSession.js'],bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'fixture-session',setup(b){b.onResolve({filter:/config\/api$/},()=>({path:'auth',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const API_URL='http://fixture.invalid/api'; export const getToken=()=> 'access';export const getRefreshToken=()=> 'refresh'; export const clearAuthTokens=()=> {globalThis.sessionCleared=true;};"}));}}]});
const {logoutSession}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const original=globalThis.fetch;
try {
 globalThis.fetch=async(url,options)=>{assert.equal(globalThis.sessionCleared,true);assert.equal(url,'http://fixture.invalid/api/auth/logout');assert.equal(options.headers.Authorization,'Bearer access');assert.equal(JSON.parse(options.body).refreshToken,'refresh');return new Response(null,{status:204});};
 await logoutSession();
 globalThis.sessionCleared=false;globalThis.fetch=async()=>{throw Error('offline')};
 await logoutSession();assert.equal(globalThis.sessionCleared,true);
 console.log('UC06: revocation payload and offline cleanup checks passed');
} finally {globalThis.fetch=original;delete globalThis.sessionCleared;}
