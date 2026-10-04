'use client';
import EntranceBackdrop from './EntranceBackdrop';
import AnimatedLogo from './AnimatedLogo';
import Raster from './Raster';
import {BONUS_ATLAS,BONUS_ART} from '@/lib/game/bonus-art';
export default function LoadingStage({progress,preview=false}:{progress:number;preview?:boolean}){
 return <section className={'loading-screen loading-v24'+(preview?' loading-preview':'')} aria-label="Loading Alpha Rooster">
  <EntranceBackdrop dim={.30}/>
  <div className="loading-brand"><AnimatedLogo/></div>
  <div className="loading-nest"><Raster src={BONUS_ATLAS} rect={BONUS_ART.burst} className="loading-halo"/><Raster src={BONUS_ATLAS} rect={BONUS_ART.egg} className="loading-egg"/></div>
  <p>WAKING UP THE GOLDEN BARN</p>
  <div className="loading-progress"><progress className="sr-only" max={100} value={progress} aria-label="Game loading"/>
   <div className="loading-track"><span style={{width:progress+'%'}}/></div><b>{Math.round(progress)}<small>%</small></b>
  </div>
  <span className="loading-hint">20 PAYLINES · FOUR BONUS FEATURES · GOLDEN WILDS</span>
 </section>;
}
