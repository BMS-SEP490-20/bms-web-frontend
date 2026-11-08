/** UC25 legacy helper must attach the same session token as the active shifts client. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/features/doctor-schedule/api/scheduleApi.js'],bundle:true,platform:'node',format:'esm',write:false,
 define:{'import.meta.env':'{}'},plugins:[{name:'fixture-auth',setup(b){b.onResolve({filter:/config\/api$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const getToken=()=> 'fixture-token'; export default {};"}));}}]});
const {fetchDoctorSchedule}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const original=globalThis.fetch;
try{globalThis.fetch=async(url,options)=>{assert.ok(url.includes('/api/v1/schedules/doctors'));assert.equal(options.headers.Authorization,'Bearer fixture-token');return Response.json({doctors:[]});};await fetchDoctorSchedule();console.log('Doctor schedule helper bearer regression passed');}
finally{globalThis.fetch=original;}
