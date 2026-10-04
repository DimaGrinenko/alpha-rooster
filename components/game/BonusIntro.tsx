'use client';
import {useEffect,useRef,useState} from 'react';
import type {BonusEvent} from '@/lib/game/math';
import {bonusMode} from '@/lib/game/bonus-modes';
import {visibleDelay} from '@/lib/game/presentation';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
import BonusMechanicPreview from './BonusMechanicPreview';
import Raster from './Raster';
import {FeatureButton} from './FeatureArt';
import '@/app/bonus-entry-v27.css';

// The feature and free-spin award already belong to the server's book. This
// ceremony only introduces its mechanic; skipping never redraws the award.
export default function BonusIntro({bonus,onContinue}:{bonus:BonusEvent;onContinue:()=>void}){
 const mode=bonusMode(bonus.feature),cascade=mode.mode==='CASCADE';
 const [ready,setReady]=useState(false),[suspended,setSuspended]=useState(false);
 const continued=useRef(false),lifetime=useRef<AbortController|null>(null);
 useEffect(()=>{
  const controller=new AbortController();lifetime.current=controller;
  const visibility=()=>setSuspended(document.hidden);visibility();
  document.addEventListener('visibilitychange',visibility);
  void visibleDelay(matchMedia('(prefers-reduced-motion: reduce)').matches?0:2400,controller.signal).then(()=>{if(!controller.signal.aborted)setReady(true);});
  return()=>{controller.abort();document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const act=()=>{
  if(lifetime.current?.signal.aborted||document.hidden||continued.current)return;
  if(!ready){setReady(true);return;}
  continued.current=true;onContinue();
 };
 return <div className={'be27-entry '+(cascade?'be27-cascade':'be27-collect')+(ready?' is-revealed':'')} data-suspended={suspended}>
  <section className="be27-stage" aria-label={cascade?'Mechanic illustration: winning symbols clear, survivors fall, new symbols refill above.':'Mechanic illustration: prize eggs fly to the Rooster collector. Without a Rooster the eggs do not pay.'}>
   <div className="be27-reel-labels" aria-hidden="true">{cascade?<><span>CLEAR</span><span>FALL</span><span>REFILL</span></>:<><span>PRIZE EGGS</span><span>COLLECTOR</span><span>COLLECT</span></>}</div>
   <BonusMechanicPreview mode={mode.mode}/>
   <div className="be27-stage-caption"><strong>{cascade?'KEEP THE CASCADES COMING':'THE ROOSTER COLLECTS'}</strong><span>{cascade?'×1 · ×2 · ×3 · ×5 per winning cascade':'Prize eggs × collector multiplier'}</span></div>
  </section>
  <div className="be27-award" aria-live="polite" aria-atomic="true">
   <Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="be27-award-glow"/>
   <small>{ready?'YOU WON':cascade?'THE CASCADES ARE COMING':'YOUR COLLECTOR IS READY'}</small>
   <div className="be27-award-number">{ready?<strong>{bonus.rounds}</strong>:<span>GET READY</span>}</div>
   <span className="be27-award-unit">{cascade?'CASCADE ROUNDS':'COLLECTION ROUNDS'}</span>
  </div>
  <p className="be27-rule">{cascade?<><strong>Win. Clear. Cascade.</strong> Winning symbols clear and new ones fall in. The multiplier rises with each cascade, then resets for a new round.</>:<><strong>Land the Rooster. Collect.</strong> Eggs pay only when the Rooster lands. His ×1 / ×2 / ×3 multiplier applies to the collected sum. Each round starts fresh.</>}</p>
  <FeatureButton onClick={act}>{ready?(cascade?'START CASCADES':'START COLLECTING'):'REVEAL ROUNDS'}</FeatureButton>
 </div>;
}
