'use client';
import {useEffect,useRef,useState} from 'react';
import {formatMoney,moneyDigits} from '@/lib/game/rgs';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
import Raster from './Raster';
import {winDuration} from '@/lib/game/symbol-motion';
import {useFittedAmount} from './FittedAmount';
export default function WinMeter({value,bet,currency,speed=1,incremental=false,showTier=true}:{value:number;bet:number;currency:string;speed?:number;incremental?:boolean;showTier?:boolean}){
 const displayed=useRef(0);
 const amount=useFittedAmount<HTMLSpanElement>(formatMoney(value,currency,'en',true,moneyDigits(value))),[tier,setTier]=useState(0);
 useEffect(()=>{
  const node=amount.current;if(!node)return;let frame=0,last=0,currentTier=-1,elapsed=0,previous=performance.now();const start=incremental&&displayed.current<=value?displayed.current:0,duration=winDuration((value-start)/bet,speed),motion=matchMedia('(prefers-reduced-motion: reduce)'),digits=Math.max(moneyDigits(value),moneyDigits(start)),quantum=10**(6-digits);
  const visibility=()=>{previous=performance.now();};document.addEventListener('visibilitychange',visibility);
  const update=(now:number)=>{if(!document.hidden)elapsed+=now-previous;previous=now;const progress=motion.matches?1:Math.min(1,elapsed/duration),shown=progress===1?value:Math.floor((start+(value-start)*(1-Math.pow(1-progress,2.2)))/quantum)*quantum,rank=shown>=bet*500?3:shown>=bet*100?2:shown>=bet*20?1:0;displayed.current=shown;
   if(rank!==currentTier){currentTier=rank;setTier(rank);}if(now-last>=1000/30||progress===1){node.textContent=formatMoney(shown,currency,'en',true,progress===1?moneyDigits(value):digits);last=now;}if(progress<1)frame=requestAnimationFrame(update);
  };frame=requestAnimationFrame(update);return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
 },[value,bet,currency,speed,amount,incremental]);
 return <div className={'win-meter win-tier-'+tier}><Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="win-meter-burst"/>{showTier&&<span className="win-meter-title" aria-hidden="true" key={tier}>{['WIN','BIG WIN','MEGA WIN','INSANE!'][tier]}</span>}<strong aria-hidden="true"><span ref={amount} className="fitted-amount">{formatMoney(0,currency,'en',true)}</span></strong><output className="sr-only">Total {formatMoney(value,currency,'en',true)}</output></div>;
}
