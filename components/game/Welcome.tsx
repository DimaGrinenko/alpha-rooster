'use client';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import SpineArt from './SpineArt';
import {FeatureArt,FeatureButton} from './FeatureArt';
import AnimatedLogo from './AnimatedLogo';
import EntranceBackdrop from './EntranceBackdrop';
import {UiSurface} from './UiArt';
type Props={open:boolean;canResume:boolean;replay:boolean;demo:boolean;t:(ru:string,en:string)=>string;onEnter:()=>void};
export default function Welcome({open,canResume,replay,demo,t,onEnter}:Props){
 const facts=[
  {symbol:'wild',title:'WILD ×2 / ×3',copy:'Wild multipliers add on each winning line.'},
  {symbol:'scatter',title:'FOUR FEATURES',copy:'Three eggs award one of four bonus features.'},
  {symbol:'wild',title:'CHOOSE YOUR BONUS',copy:'Buy your chosen feature for 100× the base bet.'}
 ];
 return <Dialog open={open}><DialogContent className="game-dialog feature-dialog welcome-premium" showCloseButton={false}>
  <EntranceBackdrop dim={.65}/><UiSurface kind="frame" className="welcome-frame"/>
  <header className="welcome-brand"><DialogTitle className="sr-only">Alpha Rooster</DialogTitle><AnimatedLogo/><DialogDescription>{canResume?'YOUR ROUND IS WAITING':replay?'ROUND REPLAY':'WELCOME TO THE GOLDEN BARN'}</DialogDescription></header>
  <div className="welcome-hero"><SpineArt name="rooster" animation="double-biceps" restAnimation="idle" label="Alpha Rooster flexes his biceps"/></div>
  <div className="welcome-lessons">{facts.map((fact,i)=><article key={fact.title} style={{animationDelay:i*.16+'s'}}><FeatureArt kind="panel" className="welcome-card"/><div className={'welcome-symbol welcome-symbol-'+i}><SpineArt name={fact.symbol+'-symbol'} animation={i===1?'win':'idle'} loopEvents label={fact.symbol==='wild'?'Golden Wild':'Golden Egg'}/>{i===0&&<b>×2 + ×3</b>}{i===2&&<span className="welcome-lock">4 MODES</span>}</div><div><h2>{fact.title}</h2><p>{t(fact.copy,fact.copy)}</p></div></article>)}</div>
  <footer className="welcome-action"><FeatureButton onClick={onEnter}>{canResume?t('ПРОДОЛЖИТЬ РАУНД','RESUME ROUND'):replay?t('СМОТРЕТЬ ПОВТОР','PLAY REPLAY'):t('ИГРАТЬ','LET’S PLAY')}</FeatureButton><small>{demo?t('Демо · виртуальный баланс','Virtual credits · no real-money transactions'):replay?t('Повтор · без списания','Replay · no charge'):'20 paylines · Wild multipliers · Free spins'}</small></footer>
 </DialogContent></Dialog>;
}
