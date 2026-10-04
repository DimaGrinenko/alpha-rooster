import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_CONFIG,getLaunch,Rgs} from '../lib/game/rgs.ts';

// Official response envelopes: StatusObject and res_authenticate/res_play/
// res_end_round/res_event in engineio/web-sdk packages/rgs-fetcher/src/schema.ts.
// https://github.com/engineio/web-sdk/blob/main/packages/rgs-fetcher/src/schema.ts
const api=()=>new Rgs(getLaunch('?sessionID=test-session&rgs_url=example.test'));

void test('official nested status failures retain their code at HTTP 200 and 400',async()=>{
 const original=globalThis.fetch;
 try{
  for(const status of [200,400])for(const code of ['ERR_IS','ERR_IPB','ERR_ATE','ERR_GLE','ERR_BNF']){
   globalThis.fetch=async()=>new Response(JSON.stringify({status:{statusCode:code,statusMessage:'Request rejected'}}),{status});
   await assert.rejects(api().authenticate(),error=>error instanceof Error&&error.message===code);
  }
 }finally{globalThis.fetch=original;}
});

void test('nested status is checked for every wallet and event response',async()=>{
 const original=globalThis.fetch,rgs=api();
 try{
  globalThis.fetch=async()=>new Response(JSON.stringify({status:{statusCode:'ERR_BNF',statusMessage:'Bet not found'}}));
  for(const operation of [()=>rgs.play(1_000_000,'BASE'),()=>rgs.end(),()=>rgs.balance(),()=>rgs.event(2)]){
   await assert.rejects(operation(),/^Error: ERR_BNF$/);
  }
 }finally{globalThis.fetch=original;}
});

void test('SUCCESS is accepted with existing payloads and an absent status stays compatible',async()=>{
 const original=globalThis.fetch;
 try{
  const payload={balance:{amount:10_000_000,currency:'USD'},config:DEMO_CONFIG,round:null};
  for(const envelope of [{},{code:'SUCCESS'},{status:{statusCode:'SUCCESS',statusMessage:'Operation Completed Successfully'}},{code:'SUCCESS',status:{statusCode:'SUCCESS'}}]){
   const response={...payload,...envelope};globalThis.fetch=async()=>new Response(JSON.stringify(response));
   assert.deepEqual(await api().authenticate(),response);
  }
 }finally{globalThis.fetch=original;}
});

void test('root and legacy error envelopes remain supported alongside status',async()=>{
 const original=globalThis.fetch;
 try{
  for(const [response,code] of [
   [{code:'ERR_VAL'},'ERR_VAL'],
   [{error:'ERR_IPB'},'ERR_IPB'],
   [{error:{code:'ERR_IS'}},'ERR_IS'],
   [{code:'SUCCESS',status:{statusCode:'ERR_GLE'}},'ERR_GLE'],
   [{code:'SUCCESS',error:'ERR_IPB',status:{statusCode:'SUCCESS'}},'ERR_IPB'],
   [{code:'ERR_VAL',status:{statusCode:'SUCCESS'}},'ERR_VAL'],
  ] as const){
   globalThis.fetch=async()=>new Response(JSON.stringify(response));
   await assert.rejects(api().authenticate(),error=>error instanceof Error&&error.message===code);
  }
 }finally{globalThis.fetch=original;}
});

void test('unknown status failures and server messages never leak response text',async()=>{
 const original=globalThis.fetch;
 try{
  for(const response of [
   {status:{statusCode:'FAILED',statusMessage:'sensitive request details'}},
   {status:{statusCode:''}},
   {status:{statusCode:0}},
   {status:{statusCode:null}},
   {status:{statusCode:'ERR_IS token=private-session',statusMessage:'sensitive request details'}},
   {error:'server message containing private-session'},
   {code:'ERR_VAL\nprivate-session'},
  ]){
   globalThis.fetch=async()=>new Response(JSON.stringify(response));
   await assert.rejects(api().authenticate(),/^Error: NETWORK$/);
  }
  globalThis.fetch=async()=>new Response(JSON.stringify({status:{statusCode:'SUCCESS'}}),{status:500});
  await assert.rejects(api().authenticate(),/^Error: NETWORK$/);
 }finally{globalThis.fetch=original;}
});
