'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {INITIAL_BOARD,MODE_COSTS,type Board,type GameEvent,type BonusEvent,type LineWin,type GameMode,type FeatureMode,type HatchEvent,type CascadeEvent,type CollectEvent} from './math';
import {loadDemo,pickDemo} from './demo';
import {getLaunch,Rgs,readEvents,validLevels,authenticatedBet,DEMO_CONFIG,UNIT,type Config,type Launch,type Round} from './rgs';
import {GameAudio} from './audio';
import {loadImage} from './art';
import {preloadSymbolResources} from './spine-resources';
import {symbolTiming,winDuration} from './symbol-motion';
import {preloadHero} from '@/components/game/SpineHero';
import {WORLD_ASSETS} from './world-assets';
import {winReaction,presentedLines} from './win-presentation';
import {visibleDelay} from './presentation';
import {completedReelPrefix} from './reel-motion';
function persistDemo(value:unknown){try{localStorage.setItem('alpha-demo-v28',JSON.stringify(value));}catch{ /* Storage is optional; the in-memory round remains playable. */ }}
export function useGame(){
 const [board,setBoard]=useState<Board>(INITIAL_BOARD),[phase,setPhase]=useState<'loading'|'welcome'|'ready'|'playing'|'error'>('loading');
 const[launch,setLaunch]=useState<Launch|null>(null),[config,setConfig]=useState<Config>(DEMO_CONFIG),[bet,setBet]=useState(UNIT),[balance,setBalance]=useState(1000*UNIT),[currency,setCurrency]=useState('DEMO');
 const[win,setWin]=useState(0),[totalWin,setTotalWin]=useState(0),[highlight,setHighlight]=useState<string[]>([]),[stopped,setStopped]=useState(5),[spinKey,setSpinKey]=useState(0);
 const[activeLine,setActiveLine]=useState<LineWin|null>(null);
 // Stable result membership drives one-shot animation; highlight may inspect individual lines.
 const[winningCells,setWinningCells]=useState<string[]>([]);
 const[bonus,setBonus]=useState<BonusEvent|null>(null),[bonusOpen,setBonusOpen]=useState(false),[free,setFree]=useState<{current:number;total:number}|null>(null),[bonusResult,setBonusResult]=useState<number|null>(null);
 const[feature,setFeature]=useState<FeatureMode>('GOLDEN_ROOST'),[hatch,setHatch]=useState<HatchEvent|null>(null);
 const[cascade,setCascade]=useState<CascadeEvent|null>(null),[collect,setCollect]=useState<CollectEvent|null>(null);
 const cascadeDone=useRef<(()=>void)|null>(null),collectDone=useRef<(()=>void)|null>(null);
 const continueCascade=useCallback(()=>{cascadeDone.current?.();cascadeDone.current=null;},[]);
 const continueCollect=useCallback(()=>{collectDone.current?.();collectDone.current=null;},[]);
 const hatchDone=useRef<(()=>void)|null>(null);
 const continueHatch=useCallback(()=>{hatchDone.current?.();hatchDone.current=null;},[]);
 const[barnImpact,setBarnImpact]=useState(0);
 const[bonusResultValue,setBonusResultValue]=useState(0);
 const[hero,setHero]=useState('idle'),[status,setStatus]=useState('ready'),[error,setError]=useState(''),[progress,setProgress]=useState(0),[turbo,setTurbo]=useState(false),[muted,setMuted]=useState(false),[music,setMusic]=useState(true),[autoLeft,setAutoLeft]=useState(0),[sessionNet,setSessionNet]=useState(0);
 const[replayCost,setReplayCost]=useState(1),[elapsed,setElapsed]=useState(0),[replayPlayed,setReplayPlayed]=useState(false),[canResume,setCanResume]=useState(false);
 const[presentationSpeed,setPresentationSpeed]=useState(1),[presentationBet,setPresentationBet]=useState(UNIT),[bonusPrelude,setBonusPrelude]=useState(false),[lockedCells,setLockedCells]=useState<string[]>([]);
 const refs=useRef<{busy:boolean;alive:boolean;api:Rgs|null;launch:Launch|null;config:Config;audio:GameAudio|null;pending:Round|null;replay:GameEvent[]|null;bonusResolve:null|(()=>void);roundBet:number;auto:number;autoGeneration:number;replayMultiplier:number;generation:number}>({busy:false,alive:true,api:null,launch:null,config:DEMO_CONFIG,audio:null,pending:null,replay:null,bonusResolve:null,roundBet:UNIT,auto:0,autoGeneration:0,replayMultiplier:0,generation:0});
 const playRef=useRef<(mode?:GameMode)=>Promise<void>>(async()=>{});
 const lifetime=useRef<AbortController|null>(null);
 const bonusAnimationDone=useRef<(()=>void)|null>(null);
 const barnTransitionDone=useRef<(()=>void)|null>(null);
 const bonusImpactFired=useRef(false);
 const winAnimationDone=useRef<(()=>void)|null>(null);
 const [anticipating,setAnticipating]=useState(false),[bonusClosing,setBonusClosing]=useState(false);
 const [stopping,setStopping]=useState(0);
 const reelStops=useRef(new Map<number,()=>void>());
 const finishedReels=useRef(new Set<number>());
 const onReelStop=useCallback((column:number)=>{if(!reelStops.current.has(column))return;finishedReels.current.add(column);setStopped(completedReelPrefix(finishedReels.current));reelStops.current.get(column)?.();reelStops.current.delete(column);refs.current.audio?.sfx('stop');},[]);
 const onHeroAnimationComplete=useCallback((name:string)=>{if(name==='bonus-rage'){
  // A failed hero renderer completes without timeline events. The background
  // still has to reveal the bonus instead of leaving its promise unresolved.
  if(!bonusImpactFired.current){bonusImpactFired.current=true;setBarnImpact(v=>v+1);}
  bonusAnimationDone.current?.();bonusAnimationDone.current=null;
 }if(['win','celebrate','rage-win','rage-small-win'].includes(name)){winAnimationDone.current?.();winAnimationDone.current=null;}},[]);
 const onHeroAnimationEvent=useCallback((name:string)=>{if(name==='crate-impact'&&!bonusImpactFired.current){bonusImpactFired.current=true;refs.current.audio?.sfx('impact');setBarnImpact(v=>v+1);}},[]);
 const onBarnTransitionComplete=useCallback(()=>{barnTransitionDone.current?.();barnTransitionDone.current=null;},[]);
 const onEggCrack=useCallback(()=>refs.current.audio?.sfx('egg'),[]);
 const pause=useCallback((ms:number)=>visibleDelay(ms,lifetime.current?.signal),[]);
 useEffect(()=>{
  const r=refs.current,stops=reelStops.current;r.alive=true;r.busy=false;r.audio=new GameAudio();const gen=++r.generation;lifetime.current=new AbortController();const controller=lifetime.current;
  async function init(){try{
   const l=getLaunch(window.location.search);r.launch=l;setLaunch(l);const api=l.kind==='demo'?null:new Rgs(l);r.api=api;
   const assets=['./assets/barn-entrance-v24.webp','./assets/barn-bonus-cabinet-v20.webp','./assets/barn-oak-frame-v21.webp','./assets/hud-icons-v18.webp','./assets/polish-v3.webp','./assets/egg-controls-v8.webp'];
   let done=0;const tasks=[...assets.map(loadImage),Promise.all(WORLD_ASSETS.map(loadImage)),preloadSymbolResources(),preloadHero()];await Promise.all(tasks.map(async task=>{await task;if(r.alive&&gen===r.generation)setProgress(Math.round(++done/tasks.length*65));}));
   if(!r.alive||gen!==r.generation)return;
   if(l.kind==='live'){
    const auth=await api!.authenticate();const levels=validLevels(auth.config);if(!levels.length)throw new Error('CONFIG');r.config=auth.config;setConfig(auth.config);setBet(authenticatedBet(auth));setBalance(auth.balance.amount);setCurrency(auth.balance.currency);
    if(auth.round?.active){readEvents(auth.round.state);r.pending=auth.round;setCanResume(true);}
   }else if(l.kind==='replay'){
    const replay=await api!.replay();r.replay=readEvents(replay.state);const final=r.replay.at(-1)!;if(!Number.isFinite(replay.payoutMultiplier)||replay.payoutMultiplier<0||replay.payoutMultiplier>5000||!Number.isFinite(replay.costMultiplier)||replay.costMultiplier<=0||final.type!=='complete'||Math.abs(final.totalWin-replay.payoutMultiplier)>.001)throw new Error('STATE');r.replayMultiplier=replay.payoutMultiplier;setReplayCost(replay.costMultiplier);const amount=Number(l.query.get('amount')||'1');if(!Number.isFinite(amount)||amount<=0)throw new Error('REPLAY');setBet(Math.round(amount*UNIT));setCurrency(l.query.get('currency')||'USD');
   }else{
    await loadDemo();
    try{const saved=JSON.parse(localStorage.getItem('alpha-demo-v28')||'null');if(saved?.balance>=0&&Number.isSafeInteger(saved.balance)){setBalance(saved.balance);setBet(DEMO_CONFIG.betLevels.includes(saved.bet)?saved.bet:UNIT);if(saved.pending){readEvents(saved.pending.state);r.pending=saved.pending;setCanResume(true);setBet(saved.pending.amount||UNIT);}}}catch{}
   }
   if(!r.alive||gen!==r.generation)return;setProgress(100);setPhase('welcome');
  }catch(e){if(r.alive&&gen===r.generation){setError(e instanceof Error?e.message:'NETWORK');setPhase('error');}}}
  void init();
  const visible=()=>{if(document.hidden){r.audio?.pause();r.auto=0;setAutoLeft(0);}else r.audio?.sync();};
  document.addEventListener('visibilitychange',visible);
  return()=>{r.alive=false;r.generation++;r.auto=0;controller.abort();stops.forEach(resolve=>resolve());stops.clear();bonusAnimationDone.current?.();bonusAnimationDone.current=null;barnTransitionDone.current?.();barnTransitionDone.current=null;winAnimationDone.current?.();winAnimationDone.current=null;hatchDone.current?.();hatchDone.current=null;cascadeDone.current?.();cascadeDone.current=null;collectDone.current?.();collectDone.current=null;r.bonusResolve?.();r.audio?.dispose();document.removeEventListener('visibilitychange',visible);};
 },[]);
 const sessionStarted=useRef(0);
 useEffect(()=>{sessionStarted.current ||= Date.now();if(!config.jurisdiction.displaySessionTimer)return;const update=()=>setElapsed(Math.floor((Date.now()-sessionStarted.current)/1000));update();const timer=setInterval(update,1000);return()=>clearInterval(timer);},[config.jurisdiction.displaySessionTimer]);
 useEffect(()=>{const a=refs.current.audio;if(a){a.muted=muted;a.musicEnabled=music;a.sync();}},[muted,music]);
 useEffect(()=>{if(launch?.kind==='demo'&&phase==='ready'){try{localStorage.setItem('alpha-demo-v28',JSON.stringify({balance,bet,pending:null}));}catch{}}},[balance,bet,phase,launch]);
 const stopAuto=useCallback(()=>{refs.current.auto=0;refs.current.autoGeneration++;setAutoLeft(0);},[]);
 const continueBonus=useCallback(()=>{setBonusOpen(false);refs.current.bonusResolve?.();refs.current.bonusResolve=null;},[]);
 const closeBonusResult=useCallback(async()=>{
  if(bonusClosing)return;setBonusClosing(true);
  // Restore the stage while the result panel still covers the reset, then reveal it.
  await pause(200);if(!refs.current.alive)return;setHero('idle');setFree(null);
  await pause(120);if(!refs.current.alive)return;setBonusResult(null);setBonusClosing(false);
 },[bonusClosing,pause]);
 const play=useCallback(async(mode:GameMode='BASE')=>{
  const r=refs.current;if(r.busy||!r.launch||phase==='loading'||phase==='error')return;
  if(mode!=='BASE'&&r.config.jurisdiction.disabledBuyFeature)return;
  const isReplay=r.launch.kind==='replay';const pending=r.pending;const amount=pending?.amount||bet;const cost=MODE_COSTS[mode];
  if(!pending&&!isReplay&&(amount*cost>balance)){stopAuto();setWin(0);setHighlight([]);setWinningCells([]);setStatus('funds');return;}
  const generation=r.generation,current=()=>r.alive&&r.generation===generation;
  const timing=symbolTiming(turbo&&!r.config.jurisdiction.disabledTurbo);setPresentationSpeed(timing.speed);setPresentationBet(amount);
  r.busy=true;r.roundBet=amount;const autoGeneration=r.autoGeneration;const start=Date.now();setPhase('playing');setBonusResult(null);setBonus(null);setHatch(null);setCascade(null);setCollect(null);setFeature('GOLDEN_ROOST');setFree(null);setHighlight([]);setWinningCells([]);setWin(0);setTotalWin(0);setHero('idle');setStatus(pending?'resume':'spinning');r.audio?.unlock();
  // Acknowledge the input immediately. Results still come only from the server;
  // the rolling strip is allowed to run while the request is in flight.
  const primed=!pending&&!isReplay&&mode==='BASE';
  if(primed){finishedReels.current.clear();setLockedCells([]);setStopping(0);setStopped(0);setSpinKey(k=>k+1);r.audio?.sfx('spin');}
  let round:Round|null=pending;let events:GameEvent[];let finalBalance=balance;let paid=false;let sawBonus=false;
  try{
   if(isReplay){events=r.replay!;}
   else if(pending){events=readEvents(pending.state);r.pending=null;setCanResume(false);}
   else if(r.launch.kind==='live'){
    const reply=await r.api!.play(amount,mode);if(!current())return;round=reply.round;events=readEvents(round.state);setBalance(reply.balance.amount);finalBalance=reply.balance.amount;paid=true;
   }else{
    const book=pickDemo(await loadDemo(),mode);if(!current())return;const seed=book.id;
    events=readEvents(book.events);round={betID:String(seed),amount,active:true,mode,state:events,event:'0'};paid=true;finalBalance=balance-amount*cost;setBalance(finalBalance);
    persistDemo({balance:finalBalance,bet:amount,pending:round});
   }
   const cursor=pending?Number(pending.event||0):0;if(!Number.isInteger(cursor)||cursor<0||cursor>events.length)throw new Error('STATE');const startIndex=Math.min(events.length-1,cursor);
   // Reconstruct sticky grid and cumulative award before the saved event, without replaying credits.
   for(const e of events.slice(0,startIndex)){if(e.type==='reveal'){setBoard(e.board);setTotalWin(Math.round(amount*e.totalWin));if(e.freeSpin)setFree({current:e.freeSpin,total:e.freeSpins!});}if(e.type==='bonus'){sawBonus=true;setBonus(e);setFeature(e.feature||'GOLDEN_ROOST');setTotalWin(v=>v+Math.round(amount*e.award));setFree({current:0,total:e.spins||e.rounds||0});}if(e.type==='hatch'||e.type==='cascade'||e.type==='collect')setTotalWin(Math.round(amount*e.totalWin));}
   for(let i=startIndex;i<events.length;i++){
    if(!current())return;const e=events[i];
    if(e.type==='reveal'){
     finishedReels.current.clear();const previous=events[i-1];const spinFeature=e.feature||'GOLDEN_ROOST';if(e.freeSpin)setFeature(spinFeature);setLockedCells(e.freeSpin&&spinFeature==='GOLDEN_ROOST'&&previous?.type==='reveal'&&previous.freeSpin?previous.board.flatMap((col,c)=>col.flatMap((cell,row)=>cell.id==='wild'?[c+':'+row]:[])):[]);
     setHighlight([]);setWinningCells([]);setActiveLine(null);setWin(0);setStatus(e.freeSpin?'free':'spinning');
     if(!(primed&&i===startIndex)){setStopping(0);setStopped(0);setSpinKey(k=>k+1);r.audio?.sfx('spin');}
     setHero(e.freeSpin?'rage-idle':'idle');if(e.freeSpin){setFree({current:e.freeSpin,total:e.freeSpins!});}
     await pause(primed&&i===startIndex?Math.max(80,timing.spinLead-(Date.now()-start)):timing.spinLead);
     const landings:Promise<void>[]=[];
     for(let c=0;c<5;c++){
      if(!current())return;
      if(c===4&&!e.freeSpin&&e.board[0].some(cell=>cell.id==='scatter')&&e.board[2].some(cell=>cell.id==='scatter')){
       await Promise.all(landings);if(!current())return;setAnticipating(true);await pause(850/timing.speed);
      }
      landings.push(new Promise<void>(resolve=>reelStops.current.set(c,resolve)));setBoard(old=>old.map((col,x)=>x===c?e.board[c]:col));setStopping(c+1);await pause(timing.stopGap);
     }
     await Promise.all(landings);
     setAnticipating(false);
     if(!current())return;
     // The authoritative award is visible as soon as the final reel aligns.
     // The settle hold below only controls when the celebration begins.
     setWin(Math.round(amount*e.win));setTotalWin(Math.round(amount*e.totalWin));
     await pause(timing.landingWait);if(!current())return;
     if(e.win>0){
      const heroDone=new Promise<void>(resolve=>{winAnimationDone.current=resolve;});
      const allCells=[...new Set(e.wins.flatMap(w=>w.cells))];
      setHighlight(allCells);setWinningCells(allCells);setHero(winReaction(e.win,!!e.freeSpin));setStatus(e.capApplied?'cap':'win');r.audio?.sfx('win');if(e.win>=20)r.audio?.sfx('crow');
      const showLines=async()=>{
       // First see the complete award, then the strongest contributing lines.
       await pause(550/timing.speed);
       for(const line of presentedLines(e.wins,e.capApplied).slice(0,e.win>=20?3:2)){
        if(!current())return;setActiveLine(line);setHighlight(line.cells);await pause(470/timing.speed);
       }
       if(current()){setActiveLine(null);setHighlight(allCells);}
      };
      await Promise.all([heroDone,showLines(),pause(Math.max(timing.winWait,winDuration(e.win,timing.speed)+(e.win>=20?650:180)/timing.speed+34))]);
     }else await pause(turbo?100:260);
    }else if(e.type==='bonus'){
     // Wait for rendered Spine time, which can advance more slowly on a busy device.
     const animationDone=new Promise<void>(resolve=>{bonusAnimationDone.current=resolve;});
     const sceneDone=new Promise<void>(resolve=>{barnTransitionDone.current=resolve;});
     bonusImpactFired.current=false;
     sawBonus=true;stopAuto();setBonus(e);setFeature(e.feature||'GOLDEN_ROOST');setActiveLine(null);setBonusPrelude(true);setWin(Math.round(amount*e.award));setTotalWin(v=>v+Math.round(amount*e.award));setHero('bonus-rage');setStatus('bonus');
     const scatters=events[i-1]?.type==='reveal'?(events[i-1] as Extract<GameEvent,{type:'reveal'}>).board.flatMap((col,c)=>col.flatMap((cell,row)=>cell.id==='scatter'?[c+':'+row]:[])):[];setHighlight(scatters);setWinningCells(scatters);r.audio?.sfx('crow');
     await Promise.all([pause(matchMedia('(prefers-reduced-motion: reduce)').matches?250:3000),animationDone,sceneDone]);if(!current())return;setBonusPrelude(false);setHero('rage-idle');
     if(e.feature!=='GOLDEN_HATCH'){setBonusOpen(true);await new Promise<void>(resolve=>{r.bonusResolve=resolve;});}
     if(!current())return;setFree({current:0,total:e.spins||e.rounds||0});await pause(650);
    }else if(e.type==='hatch'){
     setFeature('GOLDEN_HATCH');setHighlight([]);setWinningCells([]);setStatus('bonus');
     const shown=new Promise<void>(resolve=>{hatchDone.current=resolve;});setHatch(e);await shown;if(!current())return;
     setWin(Math.round(amount*e.win));setTotalWin(Math.round(amount*e.totalWin));if(e.finished)setHatch(null);
    }else if(e.type==='cascade'){
     setFeature('BARN_CASCADES');setFree({current:e.round,total:e.rounds});setHighlight([]);setWinningCells([]);setStatus('bonus');
     const shown=new Promise<void>(resolve=>{cascadeDone.current=resolve;});setCascade(e);await shown;if(!current())return;
     setWin(Math.round(amount*e.win));setTotalWin(Math.round(amount*e.totalWin));
     if(e.totalWin>=5000||e.round===e.rounds&&e.finished)setCascade(null);
    }else if(e.type==='collect'){
     setFeature('GOLDEN_COLLECT');setFree({current:e.round,total:e.rounds});setHighlight([]);setWinningCells([]);setStatus('bonus');
     const shown=new Promise<void>(resolve=>{collectDone.current=resolve;});setCollect(e);await shown;if(!current())return;
     setWin(Math.round(amount*e.win));setTotalWin(Math.round(amount*e.totalWin));
     if(e.totalWin>=5000||e.round===e.rounds)setCollect(null);
    }else{
     setTotalWin(Math.round(amount*e.totalWin));setWin(Math.round(amount*e.totalWin));
     if(sawBonus){setBonusResult(Math.round(amount*e.totalWin));setBonusResultValue(Math.round(amount*e.totalWin));}setStatus(e.totalWin>0?'total':'ready');
    }
    if(!current())return;
    if(r.launch.kind==='live'&&round?.active&&i<events.length-1)await r.api!.event(i+1);
    if(!current())return;
    if(r.launch.kind==='demo'&&round){round={...round,event:String(i+1)};persistDemo({balance:finalBalance,bet:amount,pending:round});}
   }
   const last=events.at(-1)!;const paidWin=last.type==='complete'?Math.round(amount*last.totalWin):0;
   const minMs=Number(r.config.jurisdiction.minimumRoundDuration||0);await new Promise<void>(resolve=>setTimeout(resolve,Math.max(0,minMs-(Date.now()-start))));if(!current())return;
   if(r.launch.kind==='live'&&round?.active){const end=await r.api!.end();if(!current())return;finalBalance=end.balance.amount;setBalance(finalBalance);}
   if(r.launch.kind==='demo'){finalBalance+=paidWin;setBalance(finalBalance);persistDemo({balance:finalBalance,bet:amount,pending:null});}
   if(!isReplay&&paid)setSessionNet(v=>v+paidWin-amount*cost);
   if(isReplay){setReplayPlayed(true);setTotalWin(Math.round(amount*r.replayMultiplier));setWin(Math.round(amount*r.replayMultiplier));}if(!sawBonus)setFree(null);setPhase('ready');r.busy=false;
   if(r.auto>0&&!sawBonus&&!document.hidden){r.auto--;setAutoLeft(r.auto);if(r.auto>0){await pause(600);if(r.auto>0&&current()&&autoGeneration===r.autoGeneration)void playRef.current();}}
  }catch(e){if(!current())return;stopAuto();setAnticipating(false);setStopped(5);setHatch(null);setCascade(null);setCollect(null);setBonusOpen(false);setError(e instanceof Error?e.message:'NETWORK');setPhase('error');r.busy=false;setHero('surprise');}
 },[balance,bet,phase,turbo,pause,stopAuto]);
 useEffect(()=>{playRef.current=play;},[play]);
 const enter=()=>{refs.current.audio?.unlock();setPhase('ready');if(refs.current.pending||refs.current.launch?.kind==='replay')void play();};
 const startAuto=(count:number)=>{if(refs.current.config.jurisdiction.disabledAutoplay||refs.current.launch?.kind==='replay')return;refs.current.autoGeneration++;refs.current.auto=count;setAutoLeft(count);void play();};
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{const target=e.target as HTMLElement;if(e.code==='Space'&&!e.repeat&&!refs.current.config.jurisdiction.disabledSpacebar&&phase==='ready'&&!document.querySelector('[data-slot="dialog-content"]')&&!['INPUT','BUTTON','SELECT','TEXTAREA'].includes(target.tagName)){e.preventDefault();void playRef.current();}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[phase]);
 const replenish=()=>{if(launch?.kind==='demo'&&!refs.current.busy){setBalance(1000*UNIT);setStatus('ready');}};
 return{board,activeLine,winningCells,phase,launch,config,bet,setBet,balance,currency,win,totalWin,highlight,stopped,stopping,onReelStop,spinKey,bonus,bonusOpen,free,feature,hatch,continueHatch,cascade,continueCascade,collect,continueCollect,bonusResult,bonusResultValue,closeBonusResult,bonusClosing,anticipating,hero,status,error,progress,turbo,setTurbo,muted,setMuted,music,setMusic,autoLeft,sessionNet,elapsed,replayCost,play,enter,startAuto,stopAuto,continueBonus,onHeroAnimationComplete,onHeroAnimationEvent,onBarnTransitionComplete,onEggCrack,replenish,isBusy:phase==='playing',canResume,replayPlayed,presentationSpeed,presentationBet,bonusPrelude,lockedCells,barnImpact};
}
