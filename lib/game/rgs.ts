import {SYMBOLS,HATCH_VALUES,COLLECT_VALUES,CASCADE_ROUNDS,COLLECT_ROUNDS,CASCADE_MULTIPLIERS,FEATURES,LINES,evaluate,round2,type GameEvent,type Book,type GameMode,type FeatureMode,type Board,type LineWin,type CascadeEvent} from './math.ts';
export const UNIT=1_000_000;
export type Jurisdiction={socialCasino?:boolean;disabledFullscreen?:boolean;disabledTurbo?:boolean;disabledAutoplay?:boolean;disabledSpacebar?:boolean;disabledBuyFeature?:boolean;displayNetPosition?:boolean;displayRTP?:boolean;displaySessionTimer?:boolean;minimumRoundDuration?:number;[key:string]:unknown};
export type Config={minBet:number;maxBet:number;stepBet:number;defaultBetLevel:number;betLevels:number[];jurisdiction:Jurisdiction};
export type Balance={amount:number;currency:string};
export type Round={betID:string;amount?:number;payout?:number;payoutMultiplier?:number;active:boolean;mode:string;event?:string;state:unknown};
export type Auth={balance:Balance;config:Config;round:Round|null};
export type Launch={kind:'demo'|'live'|'replay';sessionID:string;origin:string;lang:'ru'|'en';social:boolean;query:URLSearchParams};
export function getLaunch(search:string):Launch{
 const q=new URLSearchParams(search);const sessionID=q.get('sessionID')||'';const raw=q.get('rgs_url')||'';const replay=q.get('replay')==='true';
 if((raw||sessionID||replay)&&(!raw||(!sessionID&&!replay)))throw new Error('LAUNCH');
 let origin='';if(raw){const url=new URL(raw.includes('://')?raw:'https://'+raw);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('LAUNCH');origin=url.origin;}
 return{kind:replay?'replay':sessionID?'live':'demo',sessionID,origin,lang:q.get('lang')&&q.get('lang')!=='ru'?'en':'ru',social:q.get('social')==='true',query:q};
}
export class Rgs {
 readonly launch:Launch;
 constructor(launch:Launch){this.launch=launch;}
 async request<T>(path:string,body?:unknown):Promise<T>{
  const res=await fetch(this.launch.origin+path,{method:body===undefined?'GET':'POST',headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000),credentials:'omit',cache:'no-store'});
  const json=await res.json().catch(()=>({code:'ERR_GEN'})) as {code?:unknown;error?:unknown;status?:{statusCode?:unknown}};
  const statusCode=json.status?.statusCode,errorCode=typeof json.error==='string'?json.error:json.error&&typeof json.error==='object'&&'code' in json.error?json.error.code:undefined;
  // The official RGS schema also reports failures in status.statusCode. SUCCESS
  // is its only success code, including when the HTTP response itself is 200.
  if(!res.ok||json.error||json.code&&json.code!=='SUCCESS'||statusCode!==undefined&&statusCode!=='SUCCESS'){
   // Never copy server messages or arbitrary response text into the UI: those
   // may contain request details. Retain supported machine-readable error codes.
   const code=[json.code,errorCode,statusCode].find((value):value is string=>typeof value==='string'&&/^ERR_[A-Z0-9_]{1,64}$/.test(value));
   throw new Error(code||'NETWORK');
  }
  return json as T;
 }
 authenticate(){return this.request<Auth>('/wallet/authenticate',{sessionID:this.launch.sessionID});}
 play(amount:number,mode:GameMode){return this.request<{balance:Balance;round:Round}>('/wallet/play',{sessionID:this.launch.sessionID,amount,mode});}
 end(){return this.request<{balance:Balance}>('/wallet/end-round',{sessionID:this.launch.sessionID});}
 balance(){return this.request<{balance:Balance}>('/wallet/balance',{sessionID:this.launch.sessionID});}
 event(index:number){return this.request('/bet/event',{sessionID:this.launch.sessionID,event:String(index)});}
 replay(){const q=this.launch.query;const parts=['game','version','mode','event'].map(k=>{const v=q.get(k);if(!v)throw new Error('REPLAY');return encodeURIComponent(v);});return this.request<{payoutMultiplier:number;costMultiplier:number;state:unknown}>('/bet/replay/'+parts.join('/'));}
}
export function readEvents(state:unknown):GameEvent[]{
 const value=Array.isArray(state)?state:state&&typeof state==='object'?(state as Book).events:null;
 // Cascades may contain many reveals. The bound exceeds the maximum number
 // of minimum-paying steps possible before the shared 5,000x cap.
 if(!Array.isArray(value)||value.length<2||value.length>50032)throw new Error('STATE');
 let total=0,previousIndex=-1,feature:FeatureMode|undefined,awardedSpins=0,playedSpins=0,hatchRespins=3,hatchFinished=false,collectRound=0;let hatchGrid:number[]|undefined,previousFreeBoard:Board|undefined,previousCascade:CascadeEvent|undefined;
 const near=(a:number,b:number)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<.001;
 const validLine=(raw:unknown)=>{
  if(!raw||typeof raw!=='object')return false;const win=raw as LineWin;
  return Number.isInteger(win.line)&&win.line>=0&&win.line<LINES.length&&SYMBOLS.slice(0,9).includes(win.symbol)&&Number.isInteger(win.count)&&win.count>=3&&win.count<=5&&Number.isInteger(win.multiplier)&&win.multiplier>=1&&win.multiplier<=9&&Number.isFinite(win.payout)&&win.payout>0&&Array.isArray(win.cells)&&win.cells.length===win.count&&win.cells.every((cell,column)=>cell===column+':'+LINES[win.line][column]);
 };
 const checkWin=(e:{win:number;rawWin:number;capApplied:boolean;totalWin:number})=>{
  if(!Number.isFinite(e.rawWin)||e.rawWin<0||!near(e.win,Math.min(e.rawWin,5000-total))||!near(e.totalWin,total+e.win)||e.totalWin<total||e.totalWin>5000||e.capApplied!==(e.win<e.rawWin))throw new Error('STATE');
 };
 const checkBoard=(board:Board)=>{
  if(!Array.isArray(board)||board.length!==5||board.some(col=>!Array.isArray(col)||col.length!==3))throw new Error('STATE');
  for(let c=0;c<5;c++)for(const cell of board[c])if(!cell||!SYMBOLS.includes(cell.id)||(cell.id==='wild'?(![2,3].includes(cell.mult!)||c===0||c===4):cell.mult!==undefined))throw new Error('STATE');
 };
 const checkLines=(board:Board,wins:LineWin[])=>{
  if(!Array.isArray(wins)||wins.some(win=>!validLine(win))||new Set(wins.map(win=>win.line)).size!==wins.length)throw new Error('STATE');
  const expected=evaluate(board);
  if(wins.length!==expected.length||expected.some((correct,i)=>{const win=wins[i];return win.line!==correct.line||win.symbol!==correct.symbol||win.count!==correct.count||win.multiplier!==correct.multiplier||!near(win.payout,correct.payout);}))throw new Error('STATE');
 };
 for(const e of value){
  // The resume cursor and /bet/event acknowledgement are array offsets.
  if(!e||!Number.isInteger(e.index)||e.index!==previousIndex+1)throw new Error('STATE');previousIndex=e.index;
  if(e.feature!==undefined&&!FEATURES.includes(e.feature))throw new Error('STATE');
  if(total>=5000&&e.type!=='complete')throw new Error('STATE');
  if(e.type==='reveal'){
   if(e.freeSpin!==undefined){if(feature!=='GOLDEN_ROOST'||(e.feature||'GOLDEN_ROOST')!==feature||e.freeSpin!==playedSpins+1||e.freeSpins!==awardedSpins||e.freeSpin>awardedSpins)throw new Error('STATE');playedSpins++;}
   else if(e.index!==0||e.feature!==undefined||e.freeSpins!==undefined)throw new Error('STATE');
   checkBoard(e.board);checkLines(e.board,e.wins);
   checkWin(e);
   if(!near(e.wins.reduce((sum:number,win:{payout:number})=>sum+win.payout,0),e.rawWin))throw new Error('STATE');
   if(e.freeSpin&&previousFreeBoard)for(let c=1;c<=3;c++)for(let r=0;r<3;r++)if(previousFreeBoard[c][r].id==='wild'&&(e.board[c][r].id!=='wild'||e.board[c][r].mult!==previousFreeBoard[c][r].mult))throw new Error('STATE');
   if(e.freeSpin)previousFreeBoard=e.board;
   total=e.totalWin;
  }else if(e.type==='bonus'){
   if(feature||e.index!==1||!near(e.award,Math.min(5,5000-total)))throw new Error('STATE');
   feature=e.feature||'GOLDEN_ROOST';
   if(!Array.isArray(e.picks)||!Number.isFinite(e.award)||e.award<0||e.award>5)throw new Error('STATE');
   if(feature==='BARN_CASCADES'||feature==='GOLDEN_COLLECT'){if(e.picks.length!==0||e.spins!==0||e.rounds!==(feature==='BARN_CASCADES'?CASCADE_ROUNDS:COLLECT_ROUNDS))throw new Error('STATE');}
   else if(feature==='GOLDEN_HATCH'){if(e.picks.length!==0||e.spins!==0||e.rounds!==undefined)throw new Error('STATE');}
   else if(e.picks.length!==9||e.picks.some((x:number)=>![1,2,3].includes(x))||e.picks.reduce((a:number,b:number)=>a+b,0)!==e.spins)throw new Error('STATE');
   awardedSpins=e.spins;total+=e.award;
  }else if(e.type==='cascade'){
   if(feature!=='BARN_CASCADES'||e.feature!==feature||e.rounds!==CASCADE_ROUNDS||!Number.isInteger(e.round)||e.round<1||e.round>CASCADE_ROUNDS||!Number.isInteger(e.step)||e.step<1||e.multiplier!==CASCADE_MULTIPLIERS[Math.min(e.step-1,3)]||typeof e.finished!=='boolean')throw new Error('STATE');
   checkBoard(e.board);checkLines(e.board,e.wins);
   if(e.board.some((col:Board[number])=>col.some(cell=>cell.id==='scatter')))throw new Error('STATE');
   const prev=previousCascade;
   if(!prev||prev.finished){if(e.round!==(prev?prev.round+1:1)||e.step!==1)throw new Error('STATE');}
   else{
    if(e.round!==prev.round||e.step!==prev.step+1)throw new Error('STATE');
    const gone=new Set(prev.removed);
    for(let c=0;c<5;c++){
     const survivors=prev.board[c].filter((_,r)=>!gone.has(c+':'+r));
     if(survivors.some((cell,i)=>{const next=e.board[c][3-survivors.length+i];return next.id!==cell.id||next.mult!==cell.mult;}))throw new Error('STATE');
    }
   }
   const paidCells=new Set(e.wins.flatMap((win:LineWin)=>win.cells));
   if(!Array.isArray(e.removed)||e.removed.length!==paidCells.size||new Set(e.removed).size!==e.removed.length||e.removed.some((cell:string)=>!paidCells.has(cell)))throw new Error('STATE');
   if(!near(e.rawWin,round2(e.wins.reduce((sum:number,win:LineWin)=>sum+win.payout,0)*e.multiplier))||e.finished!==(e.rawWin===0||e.totalWin===5000))throw new Error('STATE');
   checkWin(e);previousCascade=e;total=e.totalWin;
  }else if(e.type==='collect'){
   if(feature!=='GOLDEN_COLLECT'||e.feature!==feature||e.rounds!==COLLECT_ROUNDS||e.round!==collectRound+1||e.round>COLLECT_ROUNDS||!Array.isArray(e.grid)||e.grid.length!==15||e.grid.some((x:number)=>x!==0&&!(COLLECT_VALUES as readonly number[]).includes(x)))throw new Error('STATE');
   if(e.collector===null?e.multiplier!==0:(![2,7,12].includes(e.collector)||![1,2,3].includes(e.multiplier)||e.grid[e.collector]!==0))throw new Error('STATE');
   const collected=e.collector===null?0:e.grid.reduce((sum:number,prize:number)=>sum+prize,0);
   if(!near(e.collected,collected)||!near(e.rawWin,collected*e.multiplier))throw new Error('STATE');
   checkWin(e);collectRound=e.round;total=e.totalWin;
  }else if(e.type==='hatch'){
   if(feature!=='GOLDEN_HATCH'||hatchFinished||!Array.isArray(e.grid)||e.grid.length!==15||e.grid.some((x:number)=>x!==0&&!(HATCH_VALUES as readonly number[]).includes(x))||!Array.isArray(e.newEggs)||new Set(e.newEggs).size!==e.newEggs.length||e.newEggs.some((x:number)=>!Number.isInteger(x)||x<0||x>=15||e.grid[x]<=0)||!Number.isInteger(e.respinsLeft)||e.respinsLeft<0||e.respinsLeft>3||typeof e.initial!=='boolean'||typeof e.finished!=='boolean'||!near(e.grid.reduce((a:number,b:number)=>a+b,0),e.collected))throw new Error('STATE');
   if(hatchGrid){if(e.initial||hatchGrid.some((x,i)=>x>0&&e.grid[i]!==x)||e.newEggs.some((i:number)=>hatchGrid![i]>0)||e.grid.some((x:number,i:number)=>x>0&&hatchGrid![i]===0&&!e.newEggs.includes(i))||e.respinsLeft!==(e.newEggs.length?3:hatchRespins-1))throw new Error('STATE');}
   else if(!e.initial||e.newEggs.length!==6||e.grid.filter((x:number)=>x>0).length!==6||e.respinsLeft!==3)throw new Error('STATE');
   if(e.finished!==(e.respinsLeft===0||e.grid.every((x:number)=>x>0))||!near(e.rawWin,e.finished?e.collected:0))throw new Error('STATE');
   checkWin(e);hatchGrid=e.grid;hatchRespins=e.respinsLeft;hatchFinished=e.finished;total=e.totalWin;
  }else if(e.type==='complete'){
   if(e.index!==value.length-1||!near(e.totalWin,total)||e.totalWin<0||e.totalWin>5000)throw new Error('STATE');
   if(total<5000&&(feature==='GOLDEN_HATCH'&&!hatchFinished||feature==='GOLDEN_ROOST'&&playedSpins!==awardedSpins||feature==='BARN_CASCADES'&&(!previousCascade?.finished||previousCascade.round!==CASCADE_ROUNDS)||feature==='GOLDEN_COLLECT'&&collectRound!==COLLECT_ROUNDS))throw new Error('STATE');
  }
  else throw new Error('STATE');
 }
 if(value.at(-1).type!=='complete')throw new Error('STATE');return value;
}
export const DEMO_CONFIG:Config={minBet:10000,maxBet:100000000,stepBet:10000,defaultBetLevel:1000000,betLevels:[10000,20000,50000,100000,200000,500000,1000000,2000000,5000000,10000000,20000000,50000000,100000000],jurisdiction:{}};
export function validLevels(c:Config):number[]{if(![c.minBet,c.maxBet,c.stepBet].every(Number.isSafeInteger)||c.minBet<=0||c.maxBet<c.minBet||c.stepBet<=0)throw new Error('CONFIG');const list=(c.betLevels?.length?c.betLevels:[c.minBet,c.defaultBetLevel,c.maxBet]);return [...new Set([...list,c.minBet,c.maxBet])].filter(n=>Number.isSafeInteger(n)&&n>=c.minBet&&n<=c.maxBet&&n%c.stepBet===0).sort((a,b)=>a-b);}
// The last zero-win round may already be settled when a player refreshes.
export function authenticatedBet(auth:Auth){
 const levels=validLevels(auth.config);
 if(!levels.length)throw new Error('CONFIG');
 const amount=auth.round?.amount;
 // A resumed round must retain its exact original stake even if bet levels changed.
 if(auth.round?.active){
  if(amount===undefined||!Number.isSafeInteger(amount)||amount<=0)throw new Error('STATE');
  return amount;
 }
 if(amount!==undefined&&Number.isSafeInteger(amount)&&levels.includes(amount))return amount;
 return levels.includes(auth.config.defaultBetLevel)?auth.config.defaultBetLevel:levels[0];
}
const numberFormats=new Map<string,Intl.NumberFormat>();
export function moneyDigits(raw:number){return Math.min(6,Math.max(2,((raw/UNIT).toFixed(6).replace(/0+$/,'').split('.')[1]||'').length));}
export function formatMoney(raw:number,currency:string,lang:string,exact=false,fixedDigits?:number):string{
 const amount=raw/UNIT;const special:Record<string,string>={DEMO:'CR',XGC:'GC',XSC:'SC',XEC:'SC'};
 const digits=fixedDigits===undefined?(exact?moneyDigits(raw):2):Math.min(6,Math.max(2,Math.round(fixedDigits))),locale=lang==='ru'?'ru-RU':'en-US',key=locale+digits;
 let formatter=numberFormats.get(key);if(!formatter){formatter=new Intl.NumberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits});numberFormats.set(key,formatter);}
 const n=formatter.format(amount);
 return n+' '+(special[currency]||currency);
}
