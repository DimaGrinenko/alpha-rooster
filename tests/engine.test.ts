import test from'node:test';
import assert from'node:assert/strict';
import{getLaunch,Rgs,readEvents,validLevels,DEMO_CONFIG,formatMoney,moneyDigits}from'../lib/game/rgs.ts';
import{GameAudio}from'../lib/game/audio.ts';
import{createBook,seeded,evaluate,INITIAL_BOARD}from'../lib/game/math.ts';
import{visibleDelay}from'../lib/game/presentation.ts';
void test('presentation waits retain their remaining time while the scene is hidden',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:0});const page=Object.assign(new EventTarget(),{hidden:false});const original=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:page,configurable:true});
 try{let complete=false;const wait=visibleDelay(1000).then(()=>{complete=true;});t.mock.timers.tick(400);page.hidden=true;page.dispatchEvent(new Event('visibilitychange'));t.mock.timers.tick(10000);await Promise.resolve();assert.equal(complete,false);page.hidden=false;page.dispatchEvent(new Event('visibilitychange'));t.mock.timers.tick(599);await Promise.resolve();assert.equal(complete,false);t.mock.timers.tick(1);await wait;assert.equal(complete,true);
  const controller=new AbortController();page.hidden=true;const cancelled=visibleDelay(1000,controller.signal);controller.abort();await cancelled;
 }finally{if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');t.mock.timers.reset();}
});
void test('launch uses supplied RGS hostname, English fallback and replay without session',()=>{assert.equal(getLaunch('?sessionID=s&rgs_url=rgs.example.test&lang=de').lang,'en');assert.equal(getLaunch('?sessionID=s&rgs_url=rgs.example.test').origin,'https://rgs.example.test');assert.equal(getLaunch('?replay=true&rgs_url=rgs.example.test').kind,'replay');assert.throws(()=>getLaunch('?rgs_url=example.test'));assert.throws(()=>getLaunch('?sessionID=s&rgs_url=javascript:alert(1)'));});
void test('small wins remain exact and special currencies render',()=>{assert.match(formatMoney(1000,'USD','en',true),/0.001 USD/);assert.match(formatMoney(10000,'XSC','en'),/0.01 SC/);assert.equal(validLevels(DEMO_CONFIG)[0],10000);});
void test('animated money keeps final precision without dropping fractional micro-wins',()=>{
 for(const [raw,expected] of [[1,'0.000001 CR'],[637500,'0.6375 CR'],[6315000,'6.315 CR'],[12000000,'12.00 CR']] as const){
  const digits=moneyDigits(raw);assert.equal(formatMoney(raw,'DEMO','en',true,digits),expected);
  assert.equal(formatMoney(0,'DEMO','en',true,digits),'0.'+'0'.repeat(digits)+' CR');
  assert.equal(formatMoney(raw/2,'DEMO','en',true,digits).split('.')[1].split(' ')[0].length,digits);
 }
});
void test('mute immediately silences already playing effects as well as music',async()=>{
 const originals=['Audio','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const),instances:MockAudio[]=[];
 class MockAudio{muted=false;volume=0;loop=false;onended:(()=>void)|null=null;playing=false;constructor(){instances.push(this);}play(){this.playing=true;return Promise.resolve();}pause(){this.playing=false;}}
 Object.defineProperty(globalThis,'Audio',{value:MockAudio,configurable:true});Object.defineProperty(globalThis,'document',{value:{hidden:false,visibilityState:'visible'},configurable:true});
 try{const audio=new GameAudio();audio.unlock();audio.sfx('crow');assert.equal(instances.length,2);assert.ok(instances[1].playing);
  audio.sfx('crow');audio.sfx('crow');assert.equal(instances.length,2,'one crow voice at a time');
  audio.muted=true;audio.sync();assert.ok(instances.every(a=>a.muted));audio.sfx('win');assert.equal(instances.length,2);
  audio.muted=false;audio.sync();assert.ok(instances.every(a=>!a.muted));instances[1].playing=false;instances[1].onended?.();audio.sfx('crow');assert.equal(instances.length,3,'voice can play again after completion');audio.dispose();assert.ok(instances.every(a=>!a.playing));
 }finally{for(const[key,descriptor]of originals)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
});
void test('paid bonus always triggers; capped events disclose raw adjustment; state validates',()=>{for(let i=1;i<=500;i++){const book=createBook(seeded(i),'BONUS');assert.equal(book.events.filter(e=>e.type==='bonus').length,1);readEvents(book.events);}const capped=createBook(()=>0,'BONUS');assert.equal(capped.payoutMultiplier,500000);assert.ok(capped.events.some(e=>e.type==='reveal'&&e.capApplied));readEvents(capped.events);});
void test('payline wild multipliers add and no wins after a gap',()=>{assert.equal(evaluate(INITIAL_BOARD)[0].multiplier,5);const b=structuredClone(INITIAL_BOARD);b[1][1]={id:'K'};assert.ok(!evaluate(b).some(w=>w.line===0));});
void test('RGS requests use integer money and exact session; replay makes no wallet call',async()=>{const original=globalThis.fetch;const calls:{url:string;body:Record<string,string|number>|null}[]=[];globalThis.fetch=async(url,options)=>{if(typeof url!=='string')throw Error('Unexpected URL type');if(options?.body&&typeof options.body!=='string')throw Error('Unexpected body type');calls.push({url,body:options?.body?JSON.parse(options.body as string):null});return new Response(JSON.stringify({balance:{amount:123456,currency:'USD'},round:{active:false},costMultiplier:1,state:[]}));};try{const api=new Rgs(getLaunch('?sessionID=secret&rgs_url=example.test'));await api.authenticate();await api.play(10000,'BONUS');await api.event(4);await api.end();assert.equal(calls[0].url,'https://example.test/wallet/authenticate');assert.deepEqual(calls[1].body,{sessionID:'secret',amount:10000,mode:'BONUS'});assert.equal(calls[2].body!.event,'4');calls.length=0;const rp=new Rgs(getLaunch('?replay=true&rgs_url=example.test&game=g&version=1&mode=BASE&event=42'));await rp.replay();assert.equal(calls.length,1);assert.equal(calls[0].url,'https://example.test/bet/replay/g/1/BASE/42');assert.equal(calls[0].body,null);}finally{globalThis.fetch=original;}});
void test('malformed server events are rejected without a local replacement',()=>{const b=createBook(seeded(8));const broken=structuredClone(b.events);if(broken[0].type==='reveal')broken[0].board[0][0]={id:'wild',mult:2};assert.throws(()=>readEvents(broken));assert.throws(()=>readEvents([]));});
