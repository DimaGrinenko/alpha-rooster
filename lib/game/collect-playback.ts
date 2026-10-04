import type {CollectEvent} from './math.ts';
import {COLLECT_TIMING as T,collectionFlightDuration} from './collect-presentation.ts';
export type CollectionPhase='departing'|'landing'|'collecting'|'ready';
export type CollectionPresentation={event:CollectEvent;phase:CollectionPhase;columns:number;resolved:boolean};
type Hooks={publish:(value:CollectionPresentation)=>void;complete:()=>void;blocked:()=>boolean;wait:(milliseconds:number,signal:AbortSignal)=>Promise<void>};

// This controller is shared by the component and its timer-controlled tests.
// A generation token also rejects callbacks from waits that resolve after abort.
export class CollectionPlayback{
 private token=0;
 private abort:AbortController|null=null;
 private state:CollectionPresentation|null=null;
 private completed=false;
 private hooks:Hooks;
 constructor(hooks:Hooks){this.hooks=hooks;}
 private publish(value:CollectionPresentation){this.state=value;this.hooks.publish(value);}
 private fresh(){this.abort?.abort();this.abort=new AbortController();return{token:++this.token,signal:this.abort.signal};}
 private current(token:number,signal:AbortSignal){return this.token===token&&!signal.aborted;}
 private async advanceWhenVisible(token:number,signal:AbortSignal){
  while(this.current(token,signal)&&!this.completed){
   if(!this.hooks.blocked()){this.finish();return;}
   await this.hooks.wait(50,signal);
  }
 }
 start(event:CollectEvent){
  const previous=this.state,{token,signal}=this.fresh();this.completed=false;
  const valid=()=>this.current(token,signal),wait=(ms:number)=>this.hooks.wait(ms,signal);
  void(async()=>{
   if(previous&&previous.event.index!==event.index){this.publish({...previous,phase:'departing'});await wait(T.departure);if(!valid())return;}
   this.publish({event,phase:'landing',columns:0,resolved:false});
   for(let columns=1;columns<=5;columns++){await wait(T.columnGap);if(!valid())return;this.publish({event,phase:'landing',columns,resolved:false});}
   await wait(T.landing);if(!valid())return;
   if(event.collector!==null&&event.collected>0){this.publish({event,phase:'collecting',columns:5,resolved:false});await wait(collectionFlightDuration(event.grid.filter(value=>value>0).length));if(!valid())return;}
   this.publish({event,phase:'ready',columns:5,resolved:true});
   if(event.round<event.rounds&&event.totalWin<5000){await wait(event.win?T.winHold:T.missHold);if(valid())await this.advanceWhenVisible(token,signal);}
  })();
 }
 finish(event?:CollectEvent){
  if(this.completed||this.state?.phase!=='ready'||event&&this.state.event!==event||this.hooks.blocked())return false;
  this.completed=true;this.abort?.abort();this.hooks.complete();return true;
 }
 skip(expectedEvent?:CollectEvent){
  if(!this.state||this.completed||this.state.phase==='departing'||this.state.phase==='ready'||expectedEvent&&this.state.event!==expectedEvent||this.hooks.blocked())return false;
  const event=this.state.event,{token,signal}=this.fresh();
  this.publish({event,phase:'ready',columns:5,resolved:true});
  if(event.round<event.rounds&&event.totalWin<5000)void this.hooks.wait(600,signal).then(async()=>{if(this.current(token,signal))await this.advanceWhenVisible(token,signal);});
  return true;
 }
 cancel(){this.abort?.abort();this.token++;this.completed=true;}
}
