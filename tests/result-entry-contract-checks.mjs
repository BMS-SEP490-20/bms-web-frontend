/** UC78 result entry uses real identifiers and transmits panic confirmations. */
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/features/test-results/api/resultApi.js'],bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'fixture-api',setup(b){b.onResolve({filter:/config\/api$/},()=>({path:'api',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export default {post:(...args)=>globalThis.fixturePost(...args)};'}));}}]});
const {resultApi}=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
try {
 globalThis.fixturePost=async(path,body)=>{assert.equal(path,'/TestOrder/TestResult');assert.equal(body.appointmentId,undefined);assert.equal(body.confirmRerunChecked,true);assert.equal(body.reviewedBy,undefined);return {data:{data:{testResultId:'real-result',isPanic:true}}};};
 const stored=await resultApi.enter({sampleId:'sample',packageId:'batch-not-an-order',confirmRerunChecked:true,parameters:[]});
 assert.equal(stored.resultId,'real-result');assert.equal(stored.isPanic,true);
 globalThis.fixturePost=async()=>({data:{}});
 await assert.rejects(resultApi.enter({sampleId:'sample'}),/chưa xác nhận/);
 console.log('UC78 Web contract: real response ID, order resolution and panic confirmation checks passed');
} finally {delete globalThis.fixturePost;}
