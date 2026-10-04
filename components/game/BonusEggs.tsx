'use client';
import {FeatureButton} from './FeatureArt';
import BonusMechanicPreview from './BonusMechanicPreview';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {BONUS_ART as A,BONUS_ATLAS} from '@/lib/game/bonus-art';
import type {BonusEvent} from '@/lib/game/math';
import Raster from './Raster';
import {visibleDelay} from '@/lib/game/presentation';
import '@/app/bonus-entry-v27.css';

// The server fixes all nine awards. Interaction only chooses their reveal order.
export default function BonusEggs({bonus,onContinue,onCrack}:{bonus:BonusEvent;onContinue:()=>void;onCrack?:()=>void}){
 const [opened,setOpened]=useState<number[]>([]),[cracking,setCracking]=useState<number[]>([]),[revealing,setRevealing]=useState(false),[settled,setSettled]=useState(false),[entered,setEntered]=useState(false);
 const openedRef=useRef(new Set<number>()),crackingRef=useRef(new Set<number>()),busy=useRef(false),continued=useRef(false),lifetime=useRef<AbortController|null>(null);
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;
  void visibleDelay(matchMedia('(prefers-reduced-motion: reduce)').matches?0:950,controller.signal).then(()=>{if(!controller.signal.aborted)setEntered(true);});
  return()=>controller.abort();
 },[]);
 const current=(controller:AbortController)=>lifetime.current===controller&&!controller.signal.aborted;
 const finished=opened.length===bonus.picks.length;
 useEffect(()=>{if(!finished)return;const controller=new AbortController();void visibleDelay(matchMedia('(prefers-reduced-motion: reduce)').matches?100:950,controller.signal).then(()=>{if(!controller.signal.aborted)setSettled(true);});return()=>controller.abort();},[finished]);
 const hatch=async(i:number,controller:AbortController)=>{
  if(!current(controller)||openedRef.current.has(i)||crackingRef.current.has(i))return;
  // Claim the egg before the first await. Fast repeat taps cannot schedule a
  // second crack, award count, or sound while the shell is anticipating.
  crackingRef.current.add(i);setCracking([...crackingRef.current]);
  await visibleDelay(matchMedia('(prefers-reduced-motion: reduce)').matches?0:240,controller.signal);
  if(!current(controller))return;
  crackingRef.current.delete(i);openedRef.current.add(i);setCracking([...crackingRef.current]);setOpened([...openedRef.current]);onCrack?.();
 };
 const revealOne=(i:number)=>{const controller=lifetime.current;if(!entered||busy.current||!controller||!current(controller))return;void hatch(i,controller);};
 const revealAll=async()=>{
  const controller=lifetime.current;if(!entered||busy.current||!controller||!current(controller))return;
  busy.current=true;setRevealing(true);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{
   for(let i=0;i<bonus.picks.length;i++){
    if(!current(controller))return;
    if(openedRef.current.has(i)||crackingRef.current.has(i))continue;
    await hatch(i,controller);if(!current(controller))return;
    if(i<bonus.picks.length-1)await visibleDelay(reduced?0:120,controller.signal);
   }
  }finally{if(current(controller)){busy.current=false;setRevealing(false);}}
 };
 const start=()=>{if(!finished||!settled||continued.current)return;continued.current=true;onContinue();};
 const sum=opened.reduce((n,i)=>n+bonus.picks[i],0);
 return <div className={'golden-hatch hatch-v12 hatch-v26 '+(finished?'hatch-complete':'')} aria-busy={!entered||revealing||cracking.length>0}>
  <Raster src={BONUS_ATLAS} rect={A.burst} className="hatch-halo"/>
  <p className="hatch-instruction">{!entered?'Your golden eggs are arriving…':finished?'Your golden harvest is ready':'Tap an egg or reveal the whole nest.'}</p>
  <div className="hatch-eggs">{bonus.picks.map((value,i)=>{
   const open=opened.includes(i),anticipating=cracking.includes(i);
   return <button type="button" key={i} disabled={!entered||open||anticipating||revealing} onClick={()=>revealOne(i)} aria-label={open?`Egg ${i+1}: ${value} free spins`:`Hatch egg ${i+1}`} className={'hatch-egg '+(open?'cracked':anticipating?'hatching':'unopened')} style={{'--tilt':'0deg','--egg-delay':i*.055+'s'} as CSSProperties}>
    <span className="egg-art"><Raster src={BONUS_ATLAS} rect={A.egg} className="egg-whole"/>
     <Raster src={BONUS_ATLAS} rect={A.lower} className="egg-bottom"/><Raster src={BONUS_ATLAS} rect={A.upper} className="egg-top"/>
     <Raster src={BONUS_ATLAS} rect={A.shard} className="egg-shard"/><Raster src={BONUS_ATLAS} rect={A.sparkles} className="egg-sparkles"/>
     <strong className="egg-award" aria-hidden={!open}>+{value}</strong>
    </span>
   </button>;
  })}</div>
  <div className="hatch-award"><div className="hatch-counter" aria-live="polite"><small>{finished?'YOU WON':'COLLECTED'}</small><strong key={sum}>{sum}</strong><span>FREE SPINS</span></div>
   <div className="hatch-progress" aria-label={opened.length+' of '+bonus.picks.length+' eggs revealed'}>{bonus.picks.map((_,i)=><span key={i} className={opened.includes(i)?'revealed':''}/>)}</div>
   <div className="hatch-wild hatch-lock-preview"><BonusMechanicPreview mode="BONUS"/><p><strong>LOCKED TO THE END</strong><br/>Wilds stay until the final spin.<br/>Multipliers add on each line.</p></div>
  </div>
  <FeatureButton disabled={!entered||(finished?!settled:revealing)} onClick={finished?start:()=>void revealAll()}>{finished?'START FREE SPINS':revealing?'HATCHING…':'REVEAL ALL'}</FeatureButton>
 </div>;
}
