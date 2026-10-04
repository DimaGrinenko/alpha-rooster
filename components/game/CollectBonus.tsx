'use client';
import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {CollectEvent} from '@/lib/game/math';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
import {formatMoney} from '@/lib/game/rgs';
import {visibleDelay} from '@/lib/game/presentation';
import {COLLECT_TIMING as TIMING} from '@/lib/game/collect-presentation';
import {CollectionPlayback,type CollectionPresentation as Presented} from '@/lib/game/collect-playback';
import {FeatureButton} from './FeatureArt';
import {UiSurface} from './UiArt';
import SpineArt from './SpineArt';
import Raster from './Raster';
import FittedAmount from './FittedAmount';
import '@/app/collect-bonus-v27.css';

type Props={event:CollectEvent|null;bet:number;currency:string;onComplete:()=>void;fast?:boolean;paused?:boolean};
export default function CollectBonus({event,...props}:Props){
 return <Dialog open={!!event}>{event&&<CollectionPresentation event={event} {...props}/>}</Dialog>;
}
function CollectionPresentation({event,bet,currency,onComplete,fast=false,paused=false}:Omit<Props,'event'>&{event:CollectEvent}){
 const[state,setState]=useState<Presented>({event,phase:'landing',columns:0,resolved:false}),[hidden,setHidden]=useState(false);
 const latest=useRef({paused,fast,onComplete}),playback=useRef<CollectionPlayback|null>(null),reduced=useRef(false);
 const changing=state.event.index!==event.index,shown=state.event,phase=changing?'departing':state.phase,last=event.round===event.rounds||event.totalWin>=5000;
 useLayoutEffect(()=>{latest.current={paused,fast,onComplete};},[paused,fast,onComplete]);
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>{reduced.current=query.matches;},visibility=()=>setHidden(document.hidden);
  motion();visibility();query.addEventListener('change',motion);document.addEventListener('visibilitychange',visibility);
  return()=>{query.removeEventListener('change',motion);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  const wait=async(milliseconds:number,signal:AbortSignal)=>{
   let remaining=milliseconds;
   while(!signal.aborted&&(remaining>0||latest.current.paused||document.hidden)){
    if(latest.current.paused||document.hidden){await visibleDelay(50,signal);continue;}
    if(reduced.current)return;
    const slice=Math.min(50,remaining);await visibleDelay(slice,signal);if(!latest.current.paused)remaining-=slice*(latest.current.fast?2.5:1);
   }
  };
  playback.current??=new CollectionPlayback({publish:setState,complete:()=>latest.current.onComplete(),blocked:()=>latest.current.paused||document.hidden,wait});
  const controller=playback.current;controller.start(event);return()=>controller.cancel();
 },[event]);
 const collected=state.resolved,money=(value:number)=>formatMoney(Math.round(bet*value),currency,'en',true),collector=shown.collector;
 const prizeIndices=shown.grid.flatMap((value,index)=>value>0?[index]:[]);
 const status=phase==='departing'?'A NEW FIELD IS COMING':phase==='landing'?'WATCH FOR THE ROOSTER':phase==='collecting'?`COLLECTING ${shown.collected}× WITH ×${shown.multiplier}`:collector===null?'NO ROOSTER · NO COLLECTION':shown.collected===0?'NO EGG PRIZES TO COLLECT':shown.capApplied?'MAXIMUM ROUND WIN REACHED':'PRIZES COLLECTED';
 return <DialogContent className="game-dialog feature-dialog collect-bonus-v27" showCloseButton={false} data-phase={phase} data-paused={paused||hidden} style={{'--collect-speed':fast?2.5:1,'--collect-flight-duration':TIMING.flight+'ms','--collect-drop-duration':TIMING.landing+'ms','--collect-exit-duration':TIMING.departure+'ms'} as CSSProperties}>
  <UiSurface kind="panel" className="clv27-cabinet"/>
  <header className="clv27-heading"><DialogTitle>GOLDEN <span>COLLECT</span></DialogTitle><DialogDescription>Egg prizes pay when the Rooster lands. Every round brings a fresh field.</DialogDescription></header>
  <div className="clv27-topline"><div><span>COLLECTION ROUND</span><strong>{shown.round}<small> / {shown.rounds}</small></strong></div><p aria-live="polite">{status}</p><div><span>COLLECTOR</span><strong>{collector!==null&&state.columns>2?`×${shown.multiplier}`:'—'}</strong></div></div>
  <div className="clv27-board" aria-label="Golden Collect: three rows and five columns">
   <UiSurface kind="frame" className="clv27-board-frame"/><UiSurface kind="bed" className="clv27-bed"/>
   {shown.grid.map((value,index)=>{
    const visible=index%5<state.columns,isCollector=index===collector;
    return <div key={shown.index+':'+index} className={`clv27-cell ${visible?'is-landed':''} ${isCollector?'is-collector':''} ${(phase==='collecting'||collected)&&collector!==null&&shown.collected>0&&value?'is-collected':''}`} aria-label={`Row ${Math.floor(index/5)+1}, column ${index%5+1}: ${!visible?'landing':isCollector?`Rooster collector times ${shown.multiplier}`:value?`${value} times base amount`:'empty'}`}>
     {visible&&isCollector?<><Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="clv27-collector-light"/><SpineArt name="rooster-symbol" animation={phase==='collecting'||collected&&shown.win>0?'win':'idle'} paused={paused||hidden} label="Rooster collector"/><b className="clv27-multiplier">×{shown.multiplier}</b></>:visible&&value?<><Raster src={BONUS_ATLAS} rect={BONUS_ART.egg} className="clv27-egg"/><strong className="clv27-prize" data-digits={String(value).length}><span>{value}<small>×</small></span></strong></>:<Raster src={BONUS_ATLAS} rect={BONUS_ART.sparkles} className="clv27-empty"/>}
    </div>;
   })}
   {phase==='collecting'&&collector!==null&&<div className="clv27-flights" aria-hidden="true">{prizeIndices.map((index,order)=>{
    const x=(index%5+.5)*20,y=(Math.floor(index/5)+.5)*100/3,tx=(collector%5+.5)*20,ty=(Math.floor(collector/5)+.5)*100/3;
    return <span key={index} className="clv27-flight" style={{'--start-x':x+'%','--start-y':y+'%','--end-x':tx+'%','--end-y':ty+'%','--mid-x':(x+tx)/2+'%','--mid-y':Math.min(y,ty)-15+'%','--delay':order*TIMING.flightStagger+'ms'} as CSSProperties}><Raster src={BONUS_ATLAS} rect={BONUS_ART.sparkles}/><b>+{shown.grid[index]}×</b></span>;
   })}</div>}
  </div>
  <footer className="clv27-footer"><div className="clv27-award"><span>COLLECTION WIN</span><strong><FittedAmount value={money(collected?shown.win:0)}/></strong><small>{collected&&shown.capApplied?'5,000× total round cap applied':collected&&collector!==null?`${shown.collected}× · COLLECTOR ×${shown.multiplier}`:'Egg prizes are multiples of the base amount'}</small></div><div className="clv27-actions"><div className="clv27-total"><span>TOTAL BONUS WIN</span><strong><FittedAmount value={money(collected?shown.totalWin:shown.totalWin-shown.win)}/></strong></div><FeatureButton disabled={paused||hidden||changing} onClick={()=>phase==='ready'?playback.current?.finish(event):playback.current?.skip(event)}>{phase==='ready'?(last?'CONTINUE':'NEXT COLLECTION'):'SKIP ANIMATION'}</FeatureButton></div></footer>
 </DialogContent>;
}
