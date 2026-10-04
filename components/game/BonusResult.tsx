'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
import {formatMoney,moneyDigits} from '@/lib/game/rgs';
import type {FeatureMode} from '@/lib/game/math';
import {bonusMode} from '@/lib/game/bonus-modes';
import {winDuration} from '@/lib/game/symbol-motion';
import {frameLoop} from '@/lib/game/frame-loop';
import {useFittedAmount} from './FittedAmount';
import {FeatureButton} from './FeatureArt';
import BarnCabinet from './BarnCabinet';
import SpineArt from './SpineArt';
import Raster from './Raster';

type Props={open:boolean;value:number;bet:number;currency:string;onContinue:()=>void;paused?:boolean;feature?:FeatureMode};
type Phase='counting'|'celebrating'|'ready';
const motes=[[-92,-64,-32],[-62,-102,47],[-32,-82,-71],[28,-105,51],[61,-72,-32],[93,-99,83],[-112,18,93],[114,8,-56]];
function parts(value:number,currency:string,digits=moneyDigits(value)){
 const text=formatMoney(value,currency,'en',true,digits),split=text.lastIndexOf(' ');
 return {number:text.slice(0,split),unit:text.slice(split+1)};
}

export default function BonusResult({open,value,bet,currency,onContinue,paused=false,feature='GOLDEN_ROOST'}:Props){
 return <Dialog open={open} onOpenChange={next=>{if(!next)onContinue();}}>
  {open&&<ResultPresentation key={value+':'+bet+':'+currency+':'+feature} value={value} bet={bet} currency={currency} onContinue={onContinue} paused={paused} feature={feature}/>}
 </Dialog>;
}

function ResultPresentation({value,bet,currency,onContinue,paused,feature}:Omit<Props,'open'>){
 const mode=bonusMode(feature);
 const completion=feature==='GOLDEN_HATCH'?'Your respins are complete. The locked prizes are yours.':feature==='BARN_CASCADES'?'The cascades are complete. Every awarded win is included.':feature==='GOLDEN_COLLECT'?'The collection is complete. Every collected prize is included.':'A golden finish to your free spins';
 const heroLabel=feature==='GOLDEN_HATCH'?'Alpha Rooster celebrates the collected prize eggs':feature==='BARN_CASCADES'?'Alpha Rooster celebrates the completed cascades':feature==='GOLDEN_COLLECT'?'Alpha Rooster celebrates the collected prizes':'Alpha Rooster celebrates the completed free spins';
 const total=parts(value,currency),amount=useFittedAmount<HTMLSpanElement>(total.number);
 const [phase,setPhase]=useState<Phase>('counting'),[reduced,setReduced]=useState(false),[hidden,setHidden]=useState(false);
 const elapsed=useRef({count:0,celebration:0}),counted=useRef(false);
 const reaction=value>=Math.max(1,bet)*20?'rage-win':'rage-small-win',reactionSpeed=1.45;
 const duration=Math.min(4600,Math.max(1600,winDuration(value/Math.max(1,bet)))),reactionDuration=(reaction==='rage-win'?3200:1100)/reactionSpeed;
 const reveal=useCallback(()=>{
  if(counted.current)return;counted.current=true;
  setPhase(value>0&&!reduced?'celebrating':'ready');
 },[value,reduced]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>setReduced(media.matches),visibility=()=>setHidden(document.hidden);
  changed();visibility();media.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
  return()=>{media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{
  const node=amount.current;
  if(reduced){
   const id=requestAnimationFrame(()=>{counted.current=true;setPhase('ready');});
   return()=>cancelAnimationFrame(id);
  }
  if(phase==='ready'||paused)return;
  let previous=performance.now(),lastPaint=-Infinity;
  const digits=moneyDigits(value),quantum=10**(6-digits);
  const loop=frameLoop(now=>{
   const delta=Math.max(0,now-previous);previous=now;if(document.hidden)return false;
   if(phase==='celebrating'){
    elapsed.current.celebration+=delta;
    // Asset failure must never trap the Continue action. The rendered Spine
    // completion is authoritative; this foreground-time deadline is a fallback.
    if(elapsed.current.celebration>=reactionDuration+650){setPhase('ready');return false;}
    return true;
   }
   elapsed.current.count+=delta;
   const p=value===0?1:Math.min(1,Math.max(0,(elapsed.current.count-250)/duration));
   if(p===1){reveal();return false;}
   if(now-lastPaint>=1000/30){
    const shown=Math.min(value,Math.floor(value*(1-(1-p)**2.2)/quantum)*quantum);
    if(node)node.textContent=parts(shown,currency,digits).number;lastPaint=now;
   }
   return true;
  });
  const visibility=()=>{previous=performance.now();if(!document.hidden)loop.wake();};
  document.addEventListener('visibilitychange',visibility);if(!document.hidden)loop.wake();
  return()=>{loop.dispose();document.removeEventListener('visibilitychange',visibility);};
 },[amount,value,currency,duration,phase,paused,reduced,reactionDuration,reveal]);
 const heroDone=useCallback((name:string)=>{if(name===reaction)setPhase(current=>current==='celebrating'?'ready':current);},[reaction]);
 const active=()=>{if(phase==='counting')reveal();else if(phase==='ready')onContinue();};
 return <DialogContent className="game-dialog feature-dialog bonus-result-v26" showCloseButton={false} data-phase={phase} data-counted={phase!=='counting'} data-paused={paused||hidden} data-prize={value>0}>
  <BarnCabinet/>
  <header className="brv26-heading">
   <DialogTitle><span>BONUS</span> COMPLETE</DialogTitle>
   <DialogDescription>{mode.name} · Your golden harvest</DialogDescription>
  </header>
  <div className="brv26-body">
   <div className="brv26-character"><Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="brv26-character-light"/>
    <SpineArt name="rooster" animation={phase==='celebrating'?reaction:'rage-idle'} restAnimation="rage-idle" speed={reactionSpeed} onAnimationComplete={heroDone} paused={paused||hidden} label={heroLabel}/>
   </div>
   <section className="brv26-award" aria-label="Bonus result">
    <Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="brv26-halo"/>
    <div className="brv26-motes" aria-hidden="true">{motes.map(([x,y,rotation],index)=><span key={index} className="brv26-mote" style={{'--mx':x+'px','--my':y+'px','--mr':rotation+'deg','--md':index*45+'ms'} as CSSProperties}><Raster src={BONUS_ATLAS} rect={index%3===0?BONUS_ART.shard:BONUS_ART.sparkles}/></span>)}</div>
    <span className="brv26-eyebrow">TOTAL WIN</span>
    <strong className="brv26-number" aria-hidden="true"><span ref={amount} className="fitted-amount">{phase==='counting'?parts(0,currency).number:total.number}</span></strong>
    <span className="brv26-currency" aria-hidden="true">{total.unit}</span>
    <output className="sr-only" aria-live="polite">{phase==='counting'?'Counting bonus win':'Total bonus win '+formatMoney(value,currency,'en',true)}</output>
   </section>
  </div>
  <footer className="brv26-actions">
   <FeatureButton onClick={active} disabled={phase==='celebrating'}>{phase==='counting'?'SHOW TOTAL':'CONTINUE'}</FeatureButton>
   <span className="brv26-hint">{phase==='counting'?completion:phase==='celebrating'?'Your harvest is in':'Return to the barn'}</span>
  </footer>
 </DialogContent>;
}
