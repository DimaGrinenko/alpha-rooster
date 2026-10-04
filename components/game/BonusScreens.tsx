'use client';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import type {BonusEvent,FeatureMode} from '@/lib/game/math';
import {bonusMode} from '@/lib/game/bonus-modes';
import BonusResult from './BonusResult';
import BonusEggs from './BonusEggs';
import BonusIntro from './BonusIntro';
import BarnCabinet from './BarnCabinet';
type Props={onEggCrack?:()=>void;open:boolean;bonus:BonusEvent|null;onContinue:()=>void;resultOpen:boolean;onResultClose:()=>void;resultValue:number;bet:number;currency:string;resultFeature?:FeatureMode};
export default function BonusScreens({onEggCrack,open,bonus,onContinue,resultOpen,onResultClose,resultValue,bet,currency,resultFeature}:Props){
 const feature=bonus?.feature||'GOLDEN_ROOST',mode=bonusMode(feature),eggEntry=feature==='GOLDEN_ROOST';
 return <>
  <Dialog open={open&&feature!=='GOLDEN_HATCH'}><DialogContent className={'game-dialog feature-dialog bonus-v12 barn-dialog feature-'+feature.toLowerCase()+(eggEntry?'':' bonus-entry-v27')} showCloseButton={false}>
   <BarnCabinet/>
   <header className="feature-heading"><DialogTitle>{mode.name.toUpperCase()}</DialogTitle><DialogDescription>{eggEntry?'Hatch nine eggs. Land Wilds and lock them until the final spin.':mode.tagline}</DialogDescription></header>
   {bonus&&(eggEntry?<BonusEggs key={bonus.index} bonus={bonus} onContinue={onContinue} onCrack={onEggCrack}/>:<BonusIntro key={feature+bonus.index} bonus={bonus} onContinue={onContinue}/>)}
  </DialogContent></Dialog>
  <BonusResult open={resultOpen} value={resultValue} bet={bet} currency={currency} onContinue={onResultClose} feature={resultFeature||feature}/>
 </>;
}
