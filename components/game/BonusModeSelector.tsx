'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {BONUS_MODES,type BuyMode} from '@/lib/game/bonus-modes';
import {MODE_COSTS} from '@/lib/game/math';
import {formatMoney} from '@/lib/game/rgs';
import {visibleDelay} from '@/lib/game/presentation';
import SpineArt from './SpineArt';
import BonusMechanicPreview from './BonusMechanicPreview';
import FittedAmount from './FittedAmount';
import {FeatureButton} from './FeatureArt';
import '@/app/bonus-modes-v27.css';

type Props={bet:number;balance:number;currency:string;betControl:ReactNode;disabled?:boolean;onBuy:(mode:BuyMode)=>void;text?:(value:string)=>string};
const brief:Record<BuyMode,string>={BONUS:'9–27 free spins. Wilds lock until the feature ends.',CASCADE:'8 rounds. Winning symbols drop out; new wins raise the multiplier.',COLLECT:'8 fresh fields. A Rooster collects egg prizes at ×1 / ×2 / ×3.',HATCH:'Six prize eggs. New eggs reset three respins.'};
const mechanic:Record<BuyMode,string>={BONUS:'Wilds stay in place',CASCADE:'Wins fall · symbols refill',COLLECT:'Rooster collects prizes',HATCH:'Eggs lock · respins reset'};
const duration:Record<BuyMode,string>={BONUS:'9–27 FREE SPINS',CASCADE:'8 CASCADE ROUNDS',COLLECT:'8 COLLECTION ROUNDS',HATCH:'6 EGGS + 3 RESPINS'};
export default function BonusModeSelector({bet,balance,currency,betControl,disabled=false,onBuy,text=(value)=>value}:Props){
 const [selected,setSelected]=useState<BuyMode>('BONUS'),[confirm,setConfirm]=useState(false),[submitted,setSubmitted]=useState(false);
 const[confirmationReady,setConfirmationReady]=useState(false),confirmationHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  if(!confirm)return;
  const controller=new AbortController();confirmationHeading.current?.focus();
  // A double-click on Review must not become a purchase on its second click.
  void visibleDelay(350,controller.signal).then(()=>{if(!controller.signal.aborted)setConfirmationReady(true);});
  return()=>controller.abort();
 },[confirm]);
 const mode=BONUS_MODES.find(item=>item.mode===selected)!,cost=bet*MODE_COSTS[selected],affordable=cost<=balance;
 const submit=()=>{if(disabled||submitted||!affordable)return;if(!confirm){setConfirmationReady(false);setConfirm(true);return;}if(!confirmationReady)return;setSubmitted(true);onBuy(selected);};
 return <section className={'bonus-choice-v27 '+(confirm?'is-confirming':'is-choosing')} aria-label={text('Choose your bonus')}>
  {!confirm?<>
   <p className="bcv27-intro">{text('Mechanic previews · Choose your bonus')}</p>
   <fieldset className="bcv27-cards" disabled={disabled||submitted}><legend className="sr-only">{text('Bonus feature')}</legend>
    {BONUS_MODES.map(item=><label key={item.mode} className={'bcv27-card '+(selected===item.mode?'selected':'')} data-feature={item.feature}>
     <input type="radio" name="bonus-mode" value={item.mode} checked={selected===item.mode} onChange={()=>setSelected(item.mode)}/>
     <span className="bcv27-art"><BonusMechanicPreview mode={item.mode}/></span>
     <span className="bcv27-card-copy"><strong>{item.name}</strong><span>{text(mechanic[item.mode])}</span><small>{text(duration[item.mode])} · {MODE_COSTS[item.mode]}×</small></span>
    </label>)}
   </fieldset>
   <p className="bcv27-rules" aria-live="polite">{text(brief[selected])}</p>
  </>:<div className="bcv27-confirm">
   <SpineArt name={mode.symbol+'-symbol'} animation="idle" label={mode.name}/>
   <h2 ref={confirmationHeading} tabIndex={-1}>{text('Confirm')} {mode.name}</h2><p>{text(brief[selected])}</p>
   <p className="bcv27-disclaimer">{text('Buying a bonus does not guarantee a profit.')}</p>
   <button type="button" className="bcv27-back" disabled={submitted} onClick={()=>{setConfirmationReady(false);setConfirm(false);}}>{text('Back to features')}</button>
  </div>}
  <footer className="bcv27-footer"><div className="bcv27-bet">{confirm?<div className="bcv27-readonly-bet"><span>{text('BET')}</span><strong><FittedAmount value={formatMoney(bet,currency,'en',true)}/></strong></div>:betControl}</div>
   <div className="bcv27-cost"><span>{text('TOTAL COST')} · {MODE_COSTS[selected]}×</span><strong><FittedAmount value={formatMoney(cost,currency,'en',true)}/></strong></div>
   <FeatureButton disabled={disabled||submitted||!affordable||confirm&&!confirmationReady} onClick={submit}>{!affordable?text('INSUFFICIENT BALANCE'):submitted?text('STARTING…'):confirm?text('CONFIRM PURCHASE'):text('REVIEW PURCHASE')}</FeatureButton>
  </footer>
 </section>;
}
