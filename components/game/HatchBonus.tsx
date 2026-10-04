'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {HatchEvent} from '@/lib/game/math';
import {BONUS_ART as A,BONUS_ATLAS} from '@/lib/game/bonus-art';
import {formatMoney} from '@/lib/game/rgs';
import {visibleDelay} from '@/lib/game/presentation';
import {FeatureButton} from './FeatureArt';
import {UiSurface} from './UiArt';
import Raster from './Raster';
import '@/app/hatch-bonus-v27.css';

type Props={event:HatchEvent|null;bet:number;currency:string;onComplete:()=>void;fast?:boolean;paused?:boolean};
type Phase='spinning'|'landing'|'settling'|'collecting'|'ready';
type Presentation={index:number;phase:Phase;landed:number[];banked:number[]};

// Every cell and payout comes from this single authoritative event. Skipping
// changes its presentation only; useGame advances the server book afterwards.
export default function HatchBonus({event,...props}:Props){
 return <Dialog open={!!event}>
  {event&&<HatchPresentation event={event} {...props}/>}
 </Dialog>;
}

function HatchPresentation({event,bet,currency,onComplete,fast=false,paused=false}:Omit<Props,'event'>&{event:HatchEvent}){
 const incoming=new Set(event.newEggs);
 const [presentation,setPresentation]=useState<Presentation>({index:event.index,phase:'spinning',landed:[],banked:[]}),[hidden,setHidden]=useState(false);
 // The dialog and every occupied cell survive a respin. Derive the next event's
 // initial presentation synchronously, so no render can expose the old CTA or
 // clear an already locked egg while an effect catches up with new props.
 const currentPresentation=presentation.index===event.index?presentation:{index:event.index,phase:'spinning' as Phase,landed:[],banked:[]};
 const {phase,landed,banked}=currentPresentation;
 const lifetime=useRef<AbortController|null>(null),activeIndex=useRef(event.index),completed=useRef<number|null>(null),pausedRef=useRef(paused),fastRef=useRef(fast),completeRef=useRef(onComplete),reduced=useRef(false);
 useEffect(()=>{pausedRef.current=paused;fastRef.current=fast;completeRef.current=onComplete;},[paused,fast,onComplete]);
 const finish=()=>{if(activeIndex.current!==event.index||completed.current===event.index)return;completed.current=event.index;completeRef.current();};
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>{reduced.current=media.matches;},visibility=()=>setHidden(document.hidden);
  motion();visibility();media.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
  return()=>{media.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;activeIndex.current=event.index;
  const active=()=>!controller.signal.aborted;
  const update=(change:(state:Presentation)=>Presentation)=>setPresentation(previous=>change(previous.index===event.index?previous:{index:event.index,phase:'spinning',landed:[],banked:[]}));
  // Small foreground-time slices make pause/turbo changes responsive without
  // advancing either the animation or the book while the page is hidden.
  const wait=async(ms:number)=>{
   let remaining=ms;
   while(active()&&(remaining>0||pausedRef.current||document.hidden)){
    if(pausedRef.current||document.hidden){await visibleDelay(60,controller.signal);continue;}
    if(reduced.current)return;
    const slice=Math.min(60,remaining);await visibleDelay(slice,controller.signal);
    if(!pausedRef.current)remaining-=slice*(fastRef.current?3:1);
   }
  };
  void (async()=>{
   await wait(event.initial?320:650);if(!active())return;
   update(state=>({...state,phase:'landing'}));
   for(const index of event.newEggs){
    update(state=>({...state,landed:[...state.landed,index]}));await wait(170);if(!active())return;
   }
   update(state=>({...state,phase:'settling'}));await wait(event.newEggs.length?540:400);if(!active())return;
   if(event.finished){
    update(state=>({...state,phase:'collecting'}));
    for(let index=0;index<event.grid.length;index++){
     if(!event.grid[index])continue;
     update(state=>({...state,banked:[...state.banked,index]}));await wait(105);if(!active())return;
    }
    await wait(450);if(!active())return;update(state=>({...state,phase:'ready'}));
   }else if(event.initial)update(state=>({...state,phase:'ready'}));
   else if(completed.current!==event.index){completed.current=event.index;completeRef.current();}
  })();
  return()=>controller.abort();
 },[event]);
 const skip=()=>{
  if(pausedRef.current||document.hidden||activeIndex.current!==event.index)return;
  lifetime.current?.abort();
  setPresentation({index:event.index,phase:event.initial||event.finished?'ready':'settling',landed:event.newEggs,banked:event.finished?event.grid.flatMap((value,index)=>value>0?[index]:[]):[]});
  if(!event.initial&&!event.finished)finish();
 };
 const shownGrid=event.grid.map((value,index)=>incoming.has(index)&&!landed.includes(index)?0:value),occupied=shownGrid.filter(value=>value>0).length;
 const shownTotal=shownGrid.reduce((total,value)=>total+value,0);
 const status=event.finished?(phase==='ready'?'YOUR NEST IS COLLECTED':'COLLECTING YOUR GOLDEN EGGS'):event.initial?'LOCK THE EGGS. FILL THE NEST.':phase==='spinning'?'ANOTHER CHANCE TO HATCH':event.newEggs.length?'NEW EGGS — RESPINS RESET':'THE LOCKED EGGS STAY';
 const credited=formatMoney(Math.round(bet*event.win),currency,'en',true);
 return <DialogContent className="game-dialog feature-dialog hatch-bonus-v27" showCloseButton={false} data-phase={phase} data-paused={paused||hidden} data-finished={event.finished}>
  <UiSurface kind="panel" className="hv27-cabinet"/>
  <header className="hv27-heading">
   <DialogTitle><span>GOLDEN</span> HATCH</DialogTitle>
   <DialogDescription>Every new egg locks in its prize and restores three respins.</DialogDescription>
  </header>
  <div className="hv27-topline">
   <div className="hv27-respins" aria-label={`${event.respinsLeft} respins left`}>
    <span>RESPINS</span><div className="hv27-lives">{[0,1,2].map(index=><Raster key={index} src={BONUS_ATLAS} rect={A.egg} className={index<event.respinsLeft?'is-lit':'is-spent'}/>)}</div>
    <strong aria-hidden="true">{event.respinsLeft}</strong>
   </div>
   <p className="hv27-status" aria-live="polite">{status}</p>
   <div className="hv27-locked"><strong>{occupied}<small>/15</small></strong><span>EGGS LOCKED</span></div>
  </div>
  <fieldset className="hv27-board" aria-label="Golden Hatch prize board: three rows and five columns">
   {event.grid.map((value,index)=>{
    const isNew=incoming.has(index),visible=value>0&&(!isNew||landed.includes(index)),sent=banked.includes(index);
    return <div key={index} className={`hv27-cell ${visible?'is-locked':'is-empty'} ${isNew&&visible?'is-new':''} ${sent?'is-banked':''}`} aria-label={`Row ${Math.floor(index/5)+1}, column ${index%5+1}: ${visible?`${value} times base amount locked`:'empty'}`} style={{'--cell-order':index,'--flight-x':`${(2-index%5)*20}px`,'--flight-y':`${(3-Math.floor(index/5))*30}px`} as CSSProperties}>
     <UiSurface kind="panel" className="hv27-pocket"/>
     {visible?<>
      <Raster src={BONUS_ATLAS} rect={A.burst} className="hv27-cell-light"/>
      <Raster src={BONUS_ATLAS} rect={A.egg} className="hv27-egg"/>
      {isNew&&<><Raster src={BONUS_ATLAS} rect={A.shard} className="hv27-shell"/><Raster src={BONUS_ATLAS} rect={A.sparkles} className="hv27-sparkles"/></>}
      <strong className="hv27-value" data-digits={String(value).length}><span>{value}<small>×</small></span></strong>
      {sent&&<span className="hv27-collect-fly" aria-hidden="true"><Raster src={BONUS_ATLAS} rect={A.sparkles}/><b>+{value}×</b></span>}
     </>:<Raster src={BONUS_ATLAS} rect={A.sparkles} className="hv27-empty-glint"/>}
    </div>;
   })}
  </fieldset>
  <footer className="hv27-footer">
   <div className="hv27-total">
    <span>{event.finished?'HATCH WIN':'LOCKED PRIZES'}</span>
    <strong>{event.finished?credited:`${shownTotal}×`}</strong>
    <small>{event.finished?(event.capApplied?'Maximum win cap applied':'All locked prizes collected'):'Prizes shown as multiples of the base amount'}</small>
   </div>
   <div className="hv27-actions">
    <FeatureButton disabled={paused} onClick={phase==='ready'?finish:skip}>{phase==='ready'?(event.finished?'COLLECT':'START RESPINS'):'SKIP ANIMATION'}</FeatureButton>
    <span>{event.finished?'Your golden hatch is complete':event.initial?'Three chances. Every new egg resets the count.':'Locked eggs remain until the final respin.'}</span>
   </div>
  </footer>
 </DialogContent>;
}
