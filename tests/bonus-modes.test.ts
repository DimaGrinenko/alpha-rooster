import test from 'node:test';
import assert from 'node:assert/strict';
import {createBook,evaluate,seeded,FEATURES,MODE_COSTS,MODE_FEATURES,MAX_WIN,HATCH_VALUES,type GameMode} from '../lib/game/math.ts';
const modes=Object.keys(MODE_COSTS) as GameMode[];

void test('all four paid features are distinct server books with exact accounting and a common cap',()=>{
 for(const mode of modes){
  const cap=createBook(()=>0,mode,1);assert.equal(cap.payoutMultiplier,MAX_WIN*100);
  assert.ok(cap.events.some(e=>'capApplied' in e&&e.capApplied));
  for(let seed=1;seed<=1000;seed++){
   const book=createBook(seeded(seed),mode,seed);let paid=0;const entry=book.events.find(e=>e.type==='bonus');
   if(mode!=='BASE'){assert.ok(entry);assert.equal(entry.feature,MODE_FEATURES[mode]);}
   for(const event of book.events){
    if(event.type==='bonus')paid+=event.award;
    else if('win' in event){
     paid+=event.win;assert.ok(Math.abs(paid-event.totalWin)<1e-7);
     if(event.type==='reveal')assert.deepEqual(event.wins,evaluate(event.board));
    }else assert.ok(Math.abs(paid-event.totalWin)<1e-7);
    assert.ok(paid<=MAX_WIN+1e-7);
   }
   assert.equal(book.payoutMultiplier,Math.round(paid*100));
  }
 }
});

void test('natural base triggers can award all four features in the same paid round',()=>{
 const seen=new Set<string>();
 for(let seed=1;seed<=100000&&seen.size<FEATURES.length;seed++){
  const bonus=createBook(seeded(seed),'BASE',seed).events.find(e=>e.type==='bonus');if(bonus)seen.add(bonus.feature!);
 }
 assert.deepEqual([...seen].sort(),[...FEATURES].sort());
});

void test('cascade removals, falling survivors, multiplier progression and resets follow real winning boards',()=>{
 let chains=0,resets=0,stepsAtFive=0;
 for(let seed=1;seed<=500;seed++){
  const book=createBook(seeded(seed),'CASCADE'),bonus=book.events.find(e=>e.type==='bonus')!;
  assert.equal(bonus.rounds,8);assert.equal(bonus.spins,0);assert.deepEqual(bonus.picks,[]);
  const steps=book.events.filter(e=>e.type==='cascade');
  for(let n=0;n<steps.length;n++){
   const e=steps[n],expected=evaluate(e.board);assert.deepEqual(e.wins,expected);
   assert.deepEqual(e.removed,[...new Set(expected.flatMap(win=>win.cells))]);
   assert.equal(e.multiplier,[1,2,3,5][Math.min(e.step-1,3)]);
   assert.equal(Math.round(e.rawWin*100),Math.round(expected.reduce((sum,win)=>sum+win.payout,0)*e.multiplier*100));
   assert.equal(e.finished,e.rawWin===0||e.totalWin===MAX_WIN);if(e.multiplier===5)stepsAtFive++;
   if(!n){assert.equal(e.round,1);assert.equal(e.step,1);continue;}
   const previous=steps[n-1];
   if(previous.finished){assert.equal(e.round,previous.round+1);assert.equal(e.step,1);resets++;}
   else{
    assert.equal(e.round,previous.round);assert.equal(e.step,previous.step+1);chains++;
    for(let c=0;c<5;c++){
     const survivors=previous.board[c].filter((_,r)=>!previous.removed.includes(c+':'+r));
     if(survivors.length)assert.deepEqual(e.board[c].slice(-survivors.length),survivors);
    }
   }
  }
  const last=steps.at(-1)!;assert.ok(last.finished&&(last.round===8||last.totalWin===MAX_WIN));
 }
 assert.ok(chains>0&&resets>0&&stepsAtFive>0);
});

void test('collection pays visible prizes only with a middle-column collector and refreshes every round',()=>{
 let absent=0,collected=0,changed=0;
 for(let seed=1;seed<=500;seed++){
  const book=createBook(seeded(seed),'COLLECT'),entry=book.events.find(e=>e.type==='bonus')!;
  assert.deepEqual(entry.picks,[]);assert.equal(entry.spins,0);assert.equal(entry.rounds,8);
  const rounds=book.events.filter(e=>e.type==='collect');
  for(let n=0;n<rounds.length;n++){
   const e=rounds[n];assert.equal(e.round,n+1);assert.equal(e.rounds,8);assert.equal(e.grid.length,15);
   assert.ok(e.grid.every(value=>value===0||HATCH_VALUES.includes(value as typeof HATCH_VALUES[number])));
   if(e.collector===null){assert.equal(e.multiplier,0);assert.equal(e.collected,0);assert.equal(e.rawWin,0);absent++;}
   else{assert.ok([2,7,12].includes(e.collector));assert.equal(e.grid[e.collector],0);assert.ok([1,2,3].includes(e.multiplier));assert.equal(e.collected,e.grid.reduce((a,b)=>a+b,0));assert.equal(e.rawWin,e.collected*e.multiplier);collected++;}
   if(n&&rounds[n-1].grid.some((value,index)=>value>0&&e.grid[index]!==value))changed++;
  }
  assert.ok(rounds.length===8||rounds.at(-1)!.totalWin===MAX_WIN);
 }
 assert.ok(absent>0&&collected>0&&changed>0);
});

void test('hatch locks eggs, resets only on new eggs and credits the collection exactly once',()=>{
 let resets=0,full=0,expired=0;
 for(let seed=1;seed<=2000;seed++){
  const book=createBook(seeded(seed),'HATCH'),entry=book.events.find(e=>e.type==='bonus')!;
  assert.deepEqual(entry.picks,[]);assert.equal(entry.spins,0);
  const hatch=book.events.filter(e=>e.type==='hatch');assert.ok(hatch.length>=2&&hatch.length<=28);
  for(let n=0;n<hatch.length;n++){
   const event=hatch[n];assert.equal(event.initial,n===0);assert.equal(event.collected,event.grid.reduce((a,b)=>a+b,0));
   assert.ok(event.grid.every(value=>value===0||HATCH_VALUES.includes(value as typeof HATCH_VALUES[number])));
   if(!n){assert.equal(event.newEggs.length,6);assert.equal(event.grid.filter(Boolean).length,6);assert.equal(event.respinsLeft,3);}
   else{
    const previous=hatch[n-1],actualNew:number[]=[];
    for(let cell=0;cell<15;cell++)if(previous.grid[cell])assert.equal(event.grid[cell],previous.grid[cell]);else if(event.grid[cell])actualNew.push(cell);
    assert.deepEqual(event.newEggs,actualNew);assert.equal(event.respinsLeft,event.newEggs.length?3:previous.respinsLeft-1);
    if(event.newEggs.length&&previous.respinsLeft<3)resets++;
   }
   const terminal=event.respinsLeft===0||event.grid.every(Boolean);assert.equal(event.finished,terminal);assert.equal(terminal,n===hatch.length-1);
   if(terminal){assert.equal(event.rawWin,event.collected);if(event.respinsLeft===0)expired++;else full++;}
   else{assert.equal(event.rawWin,0);assert.equal(event.win,0);}
  }
  assert.equal(hatch.filter(e=>e.win>0).length,1);
 }
 assert.ok(resets>0&&full>0&&expired>0);
});

void test('all event books reproduce byte-for-byte from their source seed',()=>{
 for(const mode of modes)for(const seed of [1,17,913,64029])assert.equal(JSON.stringify(createBook(seeded(seed),mode,seed)),JSON.stringify(createBook(seeded(seed),mode,seed)));
});
