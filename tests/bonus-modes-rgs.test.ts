import test from 'node:test';
import assert from 'node:assert/strict';
import {createBook,seeded,MODE_COSTS,type GameMode,type HatchEvent} from '../lib/game/math.ts';
import {readEvents,Rgs,getLaunch} from '../lib/game/rgs.ts';
import {pickDemo,type DemoLibrary} from '../lib/game/demo.ts';

void test('all paid feature books pass the same authoritative reader used by live and demo playback',()=>{
 for(const mode of ['BONUS','CASCADE','COLLECT','HATCH'] as const){
  for(let seed=1;seed<=500;seed++){
   const book=createBook(seeded(seed),mode,seed),events=readEvents(book.events);
   assert.equal(events.at(-1)?.type,'complete');
   const bonus=events.find(event=>event.type==='bonus');assert.ok(bonus);
   assert.equal(bonus.feature,({BONUS:'GOLDEN_ROOST',CASCADE:'BARN_CASCADES',COLLECT:'GOLDEN_COLLECT',HATCH:'GOLDEN_HATCH'})[mode]);
  }
 }
});

void test('legacy Golden Roost event books remain replayable without feature tags',()=>{
 const events=createBook(seeded(12),'BONUS').events;
 for(const event of events)if(event.type==='bonus'||event.type==='reveal')delete event.feature;
 assert.equal(readEvents(events),events);
});

void test('unknown or contradictory feature tags stop playback instead of mislabelling a paid outcome',()=>{
 const events=createBook(seeded(12),'CASCADE').events;
 const first=events.find(event=>event.type==='cascade');assert.ok(first);
 Reflect.set(first,'feature','GOLDEN_ROOST');assert.throws(()=>readEvents(events),/^Error: STATE$/);
 const unsupported=createBook(seeded(12),'BONUS').events;
 const bonus=unsupported.find(event=>event.type==='bonus');assert.ok(bonus);Reflect.set(bonus,'feature','UNKNOWN_FEATURE');
 assert.throws(()=>readEvents(unsupported),/^Error: STATE$/);
});

void test('Hatch rejects moving locked egg values, unsolicited new values and early credits',()=>{
 const original=createBook(seeded(1),'HATCH').events;
 const hatchIndices=original.flatMap((event,index)=>event.type==='hatch'?[index]:[]);assert.ok(hatchIndices.length>2);
 const first=original[hatchIndices[0]] as HatchEvent,locked=first.grid.findIndex(value=>value>0);
 const moved=structuredClone(original),event=moved[hatchIndices[1]] as HatchEvent;
 event.grid[locked]+=1;event.collected+=1;assert.throws(()=>readEvents(moved),/^Error: STATE$/);
 const credited=structuredClone(original),early=credited[hatchIndices[0]] as HatchEvent;
 early.win=1;early.totalWin+=1;assert.throws(()=>readEvents(credited),/^Error: STATE$/);
 const noInitial=structuredClone(original);(noInitial[hatchIndices[0]] as HatchEvent).initial=false;
 assert.throws(()=>readEvents(noInitial),/^Error: STATE$/);
});

void test('RGS sends all four exact mode names with the base bet, never the multiplied cost',async()=>{
 const oldFetch=globalThis.fetch,calls:Record<string,unknown>[]=[];
 globalThis.fetch=async(_url,init)=>{assert.equal(typeof init?.body,'string');calls.push(JSON.parse(init!.body as string));return new Response(JSON.stringify({balance:{amount:0,currency:'CR'},round:{active:true}}));};
 try{
  const api=new Rgs(getLaunch('?sessionID=mode-test&rgs_url=example.test'));
  for(const mode of ['BONUS','CASCADE','COLLECT','HATCH'] as const)await api.play(1_000_000,mode);
  assert.deepEqual(calls.map(call=>[call.mode,call.amount]),[['BONUS',1_000_000],['CASCADE',1_000_000],['COLLECT',1_000_000],['HATCH',1_000_000]]);
 }finally{globalThis.fetch=oldFetch;}
});

void test('demo chooses a book from the requested mode and rejects incomplete old libraries',()=>{
 const modes=['BASE','BONUS','CASCADE','COLLECT','HATCH'] as const;
 const library={modes:Object.fromEntries(modes.map((mode,i)=>[mode,{cost:MODE_COSTS[mode],totalWeight:1,entries:[{weight:1,book:createBook(seeded(i+1),mode,i+1)}]}]))} as DemoLibrary;
 for(const [index,mode] of modes.entries())assert.equal(pickDemo(library,mode).id,index+1);
 const missing=structuredClone(library);delete (missing.modes as Partial<Record<GameMode,unknown>>).HATCH;
 assert.throws(()=>pickDemo(missing,'HATCH'),/^Error: STATE$/);
});

void test('resume indices and completion events cannot skip or silently terminate a feature',()=>{
 const skipped=createBook(seeded(4),'HATCH').events;skipped[1].index=10;
 assert.throws(()=>readEvents(skipped),/^Error: STATE$/);
 const unfinished=createBook(seeded(4),'HATCH').events;unfinished.splice(3,unfinished.length-4);
 const unfinishedComplete=unfinished.at(-1)!;unfinishedComplete.index=3;if(unfinishedComplete.type==='complete')unfinishedComplete.totalWin=5;
 assert.throws(()=>readEvents(unfinished),/^Error: STATE$/);
 const duplicate=createBook(seeded(4),'BONUS').events;
 duplicate.splice(1,0,{index:1,type:'complete',totalWin:0});duplicate.forEach((event,index)=>event.index=index);
 assert.throws(()=>readEvents(duplicate),/^Error: STATE$/);
});

void test('Hatch cap metadata and respin resets must match the authoritative prize grid',()=>{
 const invalidWin=createBook(seeded(7),'HATCH').events;
 const final=invalidWin.findLast(event=>event.type==='hatch');assert.ok(final&&final.type==='hatch');
 final.win+=1;final.totalWin+=1;const complete=invalidWin.at(-1)!;if(complete.type==='complete')complete.totalWin+=1;
 assert.throws(()=>readEvents(invalidWin),/^Error: STATE$/);
 const invalidReset=createBook(seeded(7),'HATCH').events;
 const later=invalidReset.find(event=>event.type==='hatch'&&!event.initial);assert.ok(later&&later.type==='hatch');
 later.respinsLeft=later.respinsLeft===3?2:3;assert.throws(()=>readEvents(invalidReset),/^Error: STATE$/);
 const invalidCap=createBook(seeded(7),'HATCH').events;
 const first=invalidCap[0];if(first.type==='reveal')first.capApplied=!first.capApplied;
 assert.throws(()=>readEvents(invalidCap),/^Error: STATE$/);
});

void test('invalid symbol cells and contradictory collector positions fail with a recoverable STATE error',()=>{
 const malformed=createBook(seeded(2),'BONUS').events;
 if(malformed[0].type==='reveal')Reflect.set(malformed[0].board[0],0,null);
 assert.throws(()=>readEvents(malformed),/^Error: STATE$/);
 const harvest=createBook(seeded(2),'COLLECT').events;
 const collector=harvest.find(event=>event.type==='collect'&&event.collector!==null);assert.ok(collector&&collector.type==='collect');
 collector.collector=0;
 assert.throws(()=>readEvents(harvest),/^Error: STATE$/);
 const malformedLine=createBook(seeded(2),'BONUS').events;
 const won=malformedLine.find(event=>event.type==='reveal'&&event.wins.length);assert.ok(won&&won.type==='reveal');
 Reflect.set(won.wins[0],'cells',undefined);assert.throws(()=>readEvents(malformedLine),/^Error: STATE$/);
});

void test('cascade rejects changed survivors, skipped steps, fabricated removals and premature completion',()=>{
 const original=createBook(seeded(2),'CASCADE').events;
 const stepIndex=original.findIndex(event=>event.type==='cascade'&&event.step>1);assert.ok(stepIndex>0);
 const previous=original[stepIndex-1];assert.equal(previous.type,'cascade');if(previous.type!=='cascade')throw Error('fixture');
 const changed=structuredClone(original),current=changed[stepIndex];assert.equal(current.type,'cascade');if(current.type!=='cascade')throw Error('fixture');
 const survivor=previous.board.flatMap((col,c)=>col.flatMap((cell,r)=>previous.removed.includes(c+':'+r)?[]:[{c,r,cell}])).at(-1);assert.ok(survivor);
 current.board[survivor.c][2]={id:survivor.cell.id==='A'?'J':'A'};
 assert.throws(()=>readEvents(changed),/^Error: STATE$/);
 const skipped=structuredClone(original);Reflect.set(skipped[stepIndex],'step',100);assert.throws(()=>readEvents(skipped),/^Error: STATE$/);
 const fake=structuredClone(original);Reflect.set(fake[stepIndex-1],'removed',[]);assert.throws(()=>readEvents(fake),/^Error: STATE$/);
 const early=structuredClone(original);early.splice(3,early.length-4);early.forEach((event,index)=>event.index=index);Reflect.set(early.at(-1)!,'totalWin',(early[2] as {totalWin:number}).totalWin);assert.throws(()=>readEvents(early),/^Error: STATE$/);
});

void test('collection rejects payment without a collector, wrong multipliers and repeated rounds',()=>{
 const original=createBook(seeded(3),'COLLECT').events;
 const index=original.findIndex(event=>event.type==='collect'&&event.collector!==null);assert.ok(index>0);
 const noCollector=structuredClone(original);Reflect.set(noCollector[index],'collector',null);assert.throws(()=>readEvents(noCollector),/^Error: STATE$/);
 const wrongMult=structuredClone(original);Reflect.set(wrongMult[index],'multiplier',7);assert.throws(()=>readEvents(wrongMult),/^Error: STATE$/);
 const repeated=structuredClone(original);const second=repeated.find(event=>event.type==='collect'&&event.round===2);assert.ok(second);Reflect.set(second,'round',1);assert.throws(()=>readEvents(repeated),/^Error: STATE$/);
 const extraPrize=structuredClone(original);const collect=extraPrize[index];assert.equal(collect.type,'collect');if(collect.type!=='collect')throw Error('fixture');collect.grid[collect.collector!]=100;assert.throws(()=>readEvents(extraPrize),/^Error: STATE$/);
});
