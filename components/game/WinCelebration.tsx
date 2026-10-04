'use client';
import Raster from './Raster';
import WinMeter from './WinMeter';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
export default function WinCelebration({value,bet,currency,speed}:{value:number;bet:number;currency:string;speed:number}){
 return <div className="win-celebration" aria-label="Big win celebration">
  <Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="celebration-rays"/>
  <Raster src={BONUS_ATLAS} rect={BONUS_ART.sparkles} className="celebration-stars stars-left"/>
  <Raster src={BONUS_ATLAS} rect={BONUS_ART.sparkles} className="celebration-stars stars-right"/>
  <WinMeter value={value} bet={bet} currency={currency} speed={speed}/>
 </div>;
}
