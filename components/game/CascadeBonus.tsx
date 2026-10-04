'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {MAX_WIN,CASCADE_MULTIPLIERS,type CascadeEvent} from '@/lib/game/math';
import {cascadePlan} from '@/lib/game/cascade-presentation';
import {formatMoney} from '@/lib/game/rgs';
import {visibleDelay} from '@/lib/game/presentation';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
import {FeatureButton} from './FeatureArt';
import {UiSurface} from './UiArt';
import SpineArt from './SpineArt';
import Raster from './Raster';
import '@/app/cascade-bonus-v27.css';

type Props={event:CascadeEvent|null;bet:number;currency:string;onComplete:()=>void;fast?:boolean;paused?:boolean};
type Phase='clearing'|'falling'|'paying'|'ready';
type Presentation={index:number;phase:Phase};

export default function CascadeBonus({event,...props}:Props){
 return <Dialog open={!!event}>{event&&<CascadePresentation event={event} {...props}/>}</Dialog>;
}

function CascadePresentation({event,bet,currency,onComplete,fast=false,paused=false}:Omit<Props,'event'>&{event:CascadeEvent}){
 const [savedPlan,setPlan]=useState(()=>cascadePlan(null,event));
 const plan=savedPlan.frame.event.index===event.index?savedPlan:cascadePlan(savedPlan.frame,event);
 // Adjust only when the authoritative event changes, before a frame can show
 // new symbols at old coordinates. Surviving token keys belong to state.
 if(savedPlan!==plan)setPlan(plan);
 const [presentation,setPresentation]=useState<Presentation>({index:event.index,phase:'clearing'}),[hidden,setHidden]=useState(false);
 const phase=presentation.index===event.index?presentation.phase:'clearing';
 const lifetime=useRef<AbortController|null>(null),activeIndex=useRef(event.index),completed=useRef<number|null>(null),pausedRef=useRef(paused),fastRef=useRef(fast),completeRef=useRef(onComplete),reduced=useRef(false);
 const terminal=event.totalWin>=MAX_WIN||(event.finished&&event.round===event.rounds);
 useEffect(()=>{pausedRef.current=paused;fastRef.current=fast;completeRef.current=onComplete;},[paused,fast,onComplete]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>{reduced.current=media.matches;},visibility=()=>setHidden(document.hidden);
  motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
  return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const finish=()=>{if(activeIndex.current!==event.index||completed.current===event.index||document.hidden||pausedRef.current)return;completed.current=event.index;completeRef.current();};
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;activeIndex.current=event.index;
  const active=()=>!controller.signal.aborted;
  const update=(next:Phase)=>setPresentation({index:event.index,phase:next});
  const wait=async(ms:number)=>{
   let remaining=ms;
   while(active()&&(remaining>0||pausedRef.current||document.hidden)){
    if(pausedRef.current||document.hidden){await visibleDelay(50,controller.signal);continue;}
    if(reduced.current)return;
    const slice=Math.min(50,remaining);await visibleDelay(slice,controller.signal);
    if(!pausedRef.current)remaining-=slice*(fastRef.current?3:1);
   }
  };
  void (async()=>{
   await wait(plan.exiting.length?360:70);if(!active())return;
   update('falling');await wait(650);if(!active())return;
   update('paying');await wait(event.win>0?950:620);if(!active())return;
   update('ready');
   if(!terminal&&completed.current!==event.index){completed.current=event.index;completeRef.current();}
  })();
  return()=>controller.abort();
 },[event,plan,terminal]);
 const skip=()=>{
  if(activeIndex.current!==event.index||pausedRef.current||document.hidden)return;
  lifetime.current?.abort();setPresentation({index:event.index,phase:'ready'});
  if(!terminal)finish();
 };
 const paidCells=new Set(event.removed);
 const awarded=phase==='paying'||phase==='ready';
 const money=(value:number)=>formatMoney(Math.round(bet*value),currency,'en',true);
 const status=phase==='clearing'?(plan.exiting.length?(plan.freshRound?'A FRESH ROUND':'WINNING SYMBOLS CLEAR'):'THE FIRST SYMBOLS ARRIVE'):phase==='falling'?'FALL. REFILL. WIN AGAIN.':event.win>0?'CASCADE WIN':terminal?'YOUR CASCADES ARE COMPLETE':'ROUND COMPLETE';
 return <DialogContent className="game-dialog feature-dialog cascade-bonus-v27" showCloseButton={false} data-phase={phase} data-paused={paused||hidden} style={{'--cascade-speed':fast?3:1} as CSSProperties}>
  <UiSurface kind="panel" className="cv27-cabinet"/>
  <header className="cv27-heading"><DialogTitle>BARN <span>CASCADES</span></DialogTitle><DialogDescription>Wins clear. Symbols fall. Each cascade boosts the multiplier.</DialogDescription></header>
  <div className="cv27-topline">
   <div className="cv27-round"><span>ROUND</span><strong>{event.round}<small>/{event.rounds}</small></strong></div>
   <div className="cv27-ladder" aria-label={`Cascade multiplier ${event.multiplier} times`}>{CASCADE_MULTIPLIERS.map(mult=><span key={mult} className={mult===event.multiplier?'is-active':''}><UiSurface kind="button"/><strong>×{mult}</strong></span>)}</div>
   <div className="cv27-step"><span>CASCADE</span><strong>{event.step}</strong></div>
  </div>
  <fieldset className="cv27-board" aria-label={`Round ${event.round}, cascade ${event.step}. Five columns and three rows.`}>
   <UiSurface kind="bed" className="cv27-bed"/>
   <div className="cv27-window">
    {plan.frame.tokens.map(token=>{
     const winning=paidCells.has(`${token.column}:${token.row}`),settled=phase==='paying'||phase==='ready';
     return <div key={token.key} className={'cv27-token '+(token.fresh?'is-new ':'')+(winning&&settled?'is-winner':'')} data-symbol-key={token.key} data-cell={`${token.column}:${token.row}`} style={{'--column':token.column,'--row':token.row,'--fall':token.fromRow-token.row,'--fall-delay':token.fresh?`${token.column*24}ms`:'0ms'} as CSSProperties}>
      {winning&&settled&&<Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="cv27-symbol-glow"/>}
      <SpineArt name={token.cell.id+'-symbol'} animation={winning&&settled?'win':phase==='falling'&&token.fresh?'drop':'static'} multiplier={token.cell.mult} speed={fast?3:1} paused={paused||hidden} label={`Column ${token.column+1}, row ${token.row+1}: ${token.cell.id}${token.cell.mult?` times ${token.cell.mult}`:''}`}/>
     </div>;
    })}
    {phase==='clearing'&&plan.exiting.map(token=><div key={token.key} className={'cv27-token is-exiting '+(plan.freshRound?'is-round-exit':'is-paid-exit')} data-symbol-key={token.key} style={{'--column':token.column,'--row':token.row} as CSSProperties} aria-hidden="true"><SpineArt name={token.cell.id+'-symbol'} animation="static" multiplier={token.cell.mult} paused={paused||hidden} label=""/>{!plan.freshRound&&<Raster src={BONUS_ATLAS} rect={BONUS_ART.sparkles} className="cv27-break-sparkles"/>}</div>)}
   </div>
   <UiSurface kind="frame" className="cv27-frame"/>
  </fieldset>
  <p className="cv27-status" aria-live="polite">{status}{awarded&&event.capApplied?' · MAXIMUM WIN REACHED':''}</p>
  <footer className="cv27-footer">
   <div className="cv27-money"><span>CASCADE WIN</span><strong>{money(awarded?event.win:0)}</strong><small>Multiplier ×{event.multiplier} included</small></div>
   <div className="cv27-money cv27-total"><span>BONUS TOTAL</span><strong>{money(awarded?event.totalWin:event.totalWin-event.win)}</strong><small>{awarded&&event.totalWin>=MAX_WIN?'Maximum win reached':'All awarded wins included'}</small></div>
   <FeatureButton disabled={paused} onClick={phase==='ready'?finish:skip}>{terminal&&phase==='ready'?'CONTINUE':'SKIP ANIMATION'}</FeatureButton>
  </footer>
 </DialogContent>;
}
