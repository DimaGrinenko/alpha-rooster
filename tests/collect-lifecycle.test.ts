import test from 'node:test';
import assert from 'node:assert/strict';
import {CollectionPlayback,type CollectionPresentation} from '../lib/game/collect-playback.ts';
import type {CollectEvent} from '../lib/game/math.ts';

const event=(round:number,changes:Partial<CollectEvent>={}):CollectEvent=>({index:round+1,type:'collect',feature:'GOLDEN_COLLECT',round,rounds:8,grid:[1,0,0,0,2,0,0,0,0,0,5,0,0,0,0],collector:7,multiplier:2,collected:8,win:16,rawWin:16,capApplied:false,totalWin:5+round*16,...changes});
function harness(){
 const states:CollectionPresentation[]=[],pending:{ms:number;signal:AbortSignal;resolve:()=>void}[]=[];let blocked=false,completed=0;
 const player=new CollectionPlayback({publish:value=>states.push(value),complete:()=>completed++,blocked:()=>blocked,wait:(ms,signal)=>new Promise(resolve=>pending.push({ms,signal,resolve}))});
 const tick=async()=>{assert.ok(pending.length,'a presentation timer must be pending');pending.shift()!.resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();};
 const ready=async()=>{for(let count=0;states.at(-1)?.phase!=='ready';count++){assert.ok(count<30,'ready must be reachable');await tick();}};
 return{player,states,pending,tick,ready,setBlocked:(value:boolean)=>{blocked=value;},completed:()=>completed};
}
void test('last collection is a manual gate; rapid duplicate actions cannot finish it twice',async()=>{
 const h=harness(),e=event(8);h.player.start(e);assert.equal(h.player.finish(),false);await h.ready();
 assert.equal(h.completed(),0);assert.equal(h.pending.length,0);assert.equal(h.states.at(-1)?.event,e);assert.equal(h.states.at(-1)?.resolved,true);
 h.setBlocked(true);assert.equal(h.player.finish(),false);h.setBlocked(false);assert.equal(h.player.finish(),true);assert.equal(h.player.finish(),false);assert.equal(h.player.skip(),false);assert.equal(h.completed(),1);
});
void test('background/focus pause blocks auto-completion and resumes exactly once',async()=>{
 const h=harness();h.player.start(event(1));await h.ready();h.setBlocked(true);assert.equal(h.player.skip(),false);await h.tick();assert.equal(h.completed(),0);
 assert.equal(h.pending[0].ms,50);h.setBlocked(false);await h.tick();assert.equal(h.completed(),1);assert.equal(h.player.finish(),false);
});
void test('a late skip or landing callback from the preceding field cannot advance a new field',async()=>{
 const h=harness();h.player.start(event(1));assert.equal(h.player.skip(),true);h.player.start(event(2));
 assert.equal(h.states.at(-1)?.phase,'departing');assert.equal(h.states.at(-1)?.event.round,1);
 await h.tick();await h.tick();assert.equal(h.completed(),0);assert.equal(h.states.at(-1)?.event.round,1);
 await h.tick();assert.equal(h.states.at(-1)?.event.round,2);assert.equal(h.states.at(-1)?.columns,0);await h.ready();await h.tick();assert.equal(h.completed(),1);
});
void test('the settled old grid and credited total remain visible throughout its exit',async()=>{
 const h=harness(),first=event(1),next=event(2);h.player.start(first);await h.ready();h.player.finish();h.player.start(next);
 const departure=h.states.at(-1)!;assert.equal(departure.phase,'departing');assert.equal(departure.event,first);assert.equal(departure.resolved,true);assert.equal(departure.event.totalWin,first.totalWin);
 await h.tick();await h.tick();assert.equal(h.states.at(-1)?.event,next);assert.equal(h.states.at(-1)?.resolved,false);assert.equal(h.states.at(-1)?.columns,0);
});
void test('exact cap is terminal even without capApplied and presentation preserves the capped award',async()=>{
 const h=harness(),e=event(2,{totalWin:5000,win:16,rawWin:16,capApplied:false});h.player.start(e);await h.ready();assert.equal(h.pending.length,0);assert.equal(h.completed(),0);assert.equal(h.states.at(-1)?.event.win,16);h.player.finish();assert.equal(h.completed(),1);
});
void test('unmount/cancel prevents both late visual updates and event acknowledgements',async()=>{
 const h=harness();h.player.start(event(1));const count=h.states.length;h.player.cancel();await h.tick();assert.equal(h.states.length,count);assert.equal(h.completed(),0);
});
