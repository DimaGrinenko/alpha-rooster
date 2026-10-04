import test from 'node:test';
import assert from 'node:assert/strict';
import {createBook,seeded,MODE_COSTS,type Book,type GameMode} from '../lib/game/math.ts';
import {Rgs,getLaunch,readEvents,authenticatedBet,DEMO_CONFIG,type Round} from '../lib/game/rgs.ts';

// This exercises the real transport/decoder against a simulated service. It
// does not assert that a live Stake deployment or the React hook was tested.
for(const mode of ['BASE','BONUS','CASCADE','COLLECT','HATCH'] as const){
 void test(`${mode}: ten winning books survive a lost event acknowledgement and replay without another wallet debit`,async()=>{
  const original=globalThis.fetch;
  try{
   let seed=1;
   for(let sample=0;sample<10;sample++){
    let book:Book;do{book=createBook(seeded(seed),mode,seed++);}while(book.payoutMultiplier===0);
    const amount=1_000_000,opening=1000*amount,award=book.events.at(-1)!;assert.equal(award.type,'complete');if(award.type!=='complete')throw Error('complete');
    let ledger=opening,debits=0,credits=0,active:Round|null=null,lost=false;const paths:string[]=[];
    const disconnectAt=Math.max(1,Math.floor(book.events.length/2));
    globalThis.fetch=async(input,init)=>{
     assert.equal(typeof input,'string');const url=new URL(input as string),path=url.pathname;paths.push(path);
     const body=typeof init?.body==='string'?JSON.parse(init.body) as Record<string,unknown>:{};
     const reply=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
     if(path==='/wallet/play'){
      assert.equal(body.amount,amount);assert.equal(body.mode,mode);assert.equal(body.sessionID,'test-session');assert.equal(active,null);
      ledger-=amount*MODE_COSTS[mode];debits++;
      active={betID:String(book.id),amount,active:true,mode,state:book.events,event:'0'};
      return reply({balance:{amount:ledger,currency:'CR'},round:active});
     }
     if(path==='/wallet/authenticate')return reply({balance:{amount:ledger,currency:'CR'},config:DEMO_CONFIG,round:active});
     if(path==='/bet/event'){
      assert.ok(active);active.event=String(body.event);
      // The service saved the cursor, but the acknowledgement never reached
      // the client. Resume must use authenticate, not submit the bet again.
      if(Number(body.event)===disconnectAt&&!lost){lost=true;throw Error('simulated disconnect');}
      return reply({});
     }
     if(path==='/wallet/end-round'){
      assert.ok(active);if(active.active){ledger+=Math.round(amount*award.totalWin);credits++;active.active=false;}
      return reply({balance:{amount:ledger,currency:'CR'}});
     }
     if(path.startsWith('/bet/replay/')){
      assert.equal(init?.method,'GET');assert.equal(init?.body,undefined);
      return reply({payoutMultiplier:award.totalWin,costMultiplier:MODE_COSTS[mode],state:book.events});
     }
     throw Error('Unexpected route '+path);
    };
    const api=new Rgs(getLaunch('?sessionID=test-session&rgs_url=mock-rgs.example'));
    const placed=await api.play(amount,mode),events=readEvents(placed.round.state);
    assert.equal(placed.balance.amount,opening-amount*MODE_COSTS[mode]);
    for(let cursor=1;cursor<disconnectAt;cursor++)await api.event(cursor);
    await assert.rejects(api.event(disconnectAt),/simulated disconnect/);
    const resumedApi=new Rgs(getLaunch('?sessionID=test-session&rgs_url=mock-rgs.example'));
    const auth=await resumedApi.authenticate();assert.equal(authenticatedBet(auth),amount);assert.equal(auth.round?.mode,mode);
    const resumed=readEvents(auth.round!.state),cursor=Number(auth.round!.event);assert.equal(cursor,disconnectAt);assert.deepEqual(resumed,events);
    for(let next=cursor+1;next<resumed.length;next++)await resumedApi.event(next);
    const settled=await resumedApi.end();
    assert.equal(debits,1);assert.equal(credits,1);assert.equal(settled.balance.amount,opening-amount*MODE_COSTS[mode]+Math.round(amount*award.totalWin));
    const beforeReplay=paths.length,replayApi=new Rgs(getLaunch(`?replay=true&rgs_url=mock-rgs.example&game=alpha-rooster&version=v27&mode=${mode satisfies GameMode}&event=${book.id}`));
    const replay=await replayApi.replay();assert.equal(readEvents(replay.state).at(-1)?.type,'complete');assert.equal(replay.payoutMultiplier,award.totalWin);assert.equal(replay.costMultiplier,MODE_COSTS[mode]);
    assert.deepEqual(paths.slice(beforeReplay),[`/bet/replay/alpha-rooster/v27/${mode}/${book.id}`]);assert.equal(debits,1);assert.equal(credits,1);
   }
  }finally{globalThis.fetch=original;}
 });
}
