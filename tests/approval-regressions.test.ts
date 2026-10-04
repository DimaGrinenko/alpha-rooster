import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticatedBet,DEMO_CONFIG,getLaunch,Rgs,type Auth} from '../lib/game/rgs.ts';
import {socialText} from '../lib/game/locale.ts';

function auth(amount?:number,active=false):Auth {
 return {balance:{amount:123456789,currency:'USD'},config:structuredClone(DEMO_CONFIG),round:{betID:'saved-round',mode:'BASE',active,amount,state:[]}};
}

void test('refresh restores the last settled zero-win round bet instead of resetting to default',()=>{
 const saved=auth(5_000_000,false);saved.round!.payout=0;
 assert.equal(authenticatedBet(saved),5_000_000);
 assert.equal(authenticatedBet(auth(20_000,true)),20_000);
});

void test('invalid or unsupported saved bets fall back to a permitted configured level',()=>{
 for(const amount of [undefined,0,-1,30_000,Number.NaN,Number.POSITIVE_INFINITY,1.5,Number.MAX_SAFE_INTEGER+1]) {
  assert.equal(authenticatedBet(auth(amount)),DEMO_CONFIG.defaultBetLevel,String(amount));
 }
 const noDefault=auth(30_000);noDefault.config.defaultBetLevel=30_000;
 assert.equal(authenticatedBet(noDefault),DEMO_CONFIG.minBet);
 const noRound=auth();noRound.round=null;
 assert.equal(authenticatedBet(noRound),DEMO_CONFIG.defaultBetLevel);
});

void test('invalid authentication config cannot silently choose an arbitrary bet',()=>{
 const invalid=auth(1_000_000);invalid.config.stepBet=0;
 assert.throws(()=>authenticatedBet(invalid),/^Error: CONFIG$/);
 const noLevels=auth();noLevels.config={...noLevels.config,minBet:10_001,maxBet:19_999,stepBet:10_000,betLevels:[]};
 assert.throws(()=>authenticatedBet(noLevels),/^Error: CONFIG$/);
});

void test('RGS string, nested and root error codes remain actionable for wallet error UI',async()=>{
 const original=globalThis.fetch;
 const api=new Rgs(getLaunch('?sessionID=test-session&rgs_url=example.test'));
 try {
  for(const [body,status,expected] of [
   [{error:'ERR_IPB'},400,'ERR_IPB'],
   [{error:{code:'ERR_VAL'}},400,'ERR_VAL'],
   [{code:'ERR_IS'},401,'ERR_IS'],
   [{error:'ERR_IPB'},200,'ERR_IPB'],
   [{},503,'NETWORK'],
  ] as const) {
   globalThis.fetch=async()=>new Response(JSON.stringify(body),{status});
   await assert.rejects(api.authenticate(),error=>error instanceof Error&&error.message===expected);
  }
  globalThis.fetch=async()=>new Response('upstream unavailable',{status:502});
  await assert.rejects(api.authenticate(),/^Error: ERR_GEN$/);
  globalThis.fetch=async()=>new Response(JSON.stringify({code:'SUCCESS',balance:{amount:1,currency:'USD'}}));
  assert.deepEqual(await api.balance(),{code:'SUCCESS',balance:{amount:1,currency:'USD'}});
 } finally {globalThis.fetch=original;}
});

void test('social mode converts the actual bonus disclaimer and wallet/control vocabulary',()=>{
 const disclaimer='Bonus entry costs 100× the current bet. The maximum total round payout, including free spins, is 5,000× the bet. Buying a bonus does not guarantee a profit.';
 const converted=socialText(disclaimer,false);
 assert.match(converted,/playing a bonus does not guarantee a net gain\./i);
 assert.doesNotMatch(converted,/\b(bet|buying|profit|payout)\b/i);
 assert.equal(socialText('BUY BONUS · Choose bet · Insufficient funds · Total bets',false),'get bonus · Choose play · Insufficient balance · total play');
 // Restrict replacements to complete words so ordinary descriptive copy is intact.
 assert.equal(socialText('Display a playful alphabet and a stakeout story.',false),'Display a playful alphabet and a stakeout story.');
});

 void test('active rounds retain their exact historical stake and reject a missing or corrupt amount',()=>{
 assert.equal(authenticatedBet(auth(30_000,true)),30_000);
 for(const amount of [undefined,0,-1,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]) {
  assert.throws(()=>authenticatedBet(auth(amount,true)),/^Error: STATE$/);
 }
});
