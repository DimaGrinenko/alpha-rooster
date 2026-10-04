'use client';
import type {useGame} from '@/lib/game/useGame';
import {validLevels,formatMoney} from '@/lib/game/rgs';
import FittedAmount from './FittedAmount';
import WinMeter from './WinMeter';
import {UiIcon} from './UiArt';
import {socialText} from '@/lib/game/locale';

type Props={game:ReturnType<typeof useGame>;disabled:boolean;betLabel:string;onOpen:(view:'settings'|'buy'|'bet'|'auto')=>void};
export default function ControlDeck({game:g,disabled,betLabel,onOpen}:Props){
 const replay=g.launch?.kind==='replay',j=g.config.jurisdiction,levels=validLevels(g.config);
 const label=(value:string)=>j.socialCasino||g.launch?.social?socialText(value,false):value;
 const money=(v:number)=>formatMoney(v,g.currency,'en');
 const changeBet=(delta:number)=>g.setBet(levels[Math.max(0,Math.min(levels.length-1,levels.indexOf(g.bet)+delta))]);
 return <footer className={'control-deck'+(g.stopped<5?' is-rolling':'')} aria-label="Game controls">
  <button className={'deck-menu deck-tool'+(g.autoLeft?' is-active':'')} aria-label={g.autoLeft?'Stop autoplay':'Settings'} disabled={g.isBusy&&!g.autoLeft} onClick={()=>g.autoLeft?g.stopAuto():onOpen('settings')}><UiIcon name={g.autoLeft?'auto':'menu'}/>{g.autoLeft>0&&<span className="deck-auto-count">STOP</span>}</button>
  {!replay?<button className="deck-buy" disabled={disabled||!!j.disabledBuyFeature} onClick={()=>onOpen('buy')} aria-label={label('Choose a bonus')}><UiIcon name="bonus"/><span>{label('BUY').toUpperCase()}<br/>BONUS</span></button>:<div className="deck-buy replay-cost"><span>REPLAY</span><b>×{g.replayCost}</b></div>}
  <div className="deck-money deck-balance"><span>{replay?'ROUND COST':'BALANCE'}</span><b className="deck-amount"><FittedAmount value={money(replay?g.bet*g.replayCost:g.balance)}/></b></div>
  <div className="deck-money deck-win"><span>{g.free?'BONUS WIN':'WIN'}</span><WinMeter value={g.free?g.totalWin:g.win} bet={g.presentationBet} currency={g.currency} speed={g.presentationSpeed} incremental/></div>
  <div className="deck-money deck-bet"><span>{betLabel}{replay?' ×'+g.replayCost:''}</span><div className="deck-bet-input">
   {!replay&&<button className="deck-step" aria-label={label('Decrease bet')} disabled={disabled||g.bet<=levels[0]} onClick={()=>changeBet(-1)}><UiIcon name="minus"/></button>}
   <button className="deck-bet-value" disabled={disabled||replay} aria-label={label('Choose bet, ')+money(g.bet)} onClick={()=>onOpen('bet')}><FittedAmount value={money(g.bet)}/><small>SELECT</small></button>
   {!replay&&<button className="deck-step" aria-label={label('Increase bet')} disabled={disabled||g.bet>=levels.at(-1)!} onClick={()=>changeBet(1)}><UiIcon name="plus"/></button>}
  </div></div>
  <button className="deck-spin" disabled={disabled} aria-label={replay?'Play replay':'Spin'} onClick={()=>void g.play()}><UiIcon name="spin"/><span>{g.stopped<5?'SPINNING':replay?'REPLAY':'SPIN'}</span></button>
  <div className="deck-utilities">
   {!replay&&!j.disabledAutoplay&&<button className={'deck-tool'+(g.autoLeft?' is-active':'')} aria-label={g.autoLeft?'Stop autoplay':'Autoplay'} disabled={g.isBusy&&!g.autoLeft} onClick={()=>g.autoLeft?g.stopAuto():onOpen('auto')}><UiIcon name="auto"/>{g.autoLeft>0&&<span className="deck-auto-count">{g.autoLeft}</span>}</button>}
   {!replay&&!j.disabledTurbo&&<button className={'deck-tool'+(g.turbo?' is-active':'')} aria-label="Turbo" aria-pressed={g.turbo} disabled={g.isBusy} onClick={()=>g.setTurbo(!g.turbo)}><UiIcon name="turbo"/></button>}
  </div>
  {g.status==='funds'&&<output className="deck-notice" role="alert">INSUFFICIENT BALANCE</output>}
 </footer>;
}
