export const SYMBOLS=['rooster','hen','truck','boombox','corn','A','K','Q','J','wild','scatter'] as const;
export type SymbolId=typeof SYMBOLS[number];
export type Cell={id:SymbolId;mult?:number};
export type Board=Cell[][];
export const NAMES:Record<SymbolId,string>={rooster:'Петух-Альфа',hen:'Дива',truck:'Пикап',boombox:'Бумбокс',corn:'Кукуруза',A:'A',K:'K',Q:'Q',J:'J',wild:'Золотой курятник',scatter:'Микрофон'};
// Payouts expressed as multiples of the total stake.
export const PAYS:Partial<Record<SymbolId,number[]>>={rooster:[1,5,25],hen:[.75,3,15],truck:[.5,2,10],boombox:[.4,1.5,7.5],corn:[.25,1,5],A:[.15,.6,3],K:[.15,.6,3],Q:[.1,.4,2],J:[.1,.4,2]};
export const LINES=[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],[2,1,1,1,2],[1,0,1,2,1],[1,2,1,0,1],[0,1,0,1,0],[2,1,2,1,2],[1,1,0,1,1],[1,1,2,1,1],[0,2,0,2,0],[2,0,2,0,2],[0,2,2,2,0]];
export const MAX_WIN=5000;
export const BUY_COST=100;
export type GameMode='BASE'|'BONUS'|'CASCADE'|'COLLECT'|'HATCH';
export type FeatureMode='GOLDEN_ROOST'|'BARN_CASCADES'|'GOLDEN_COLLECT'|'GOLDEN_HATCH';
export const FEATURES:FeatureMode[]=['GOLDEN_ROOST','BARN_CASCADES','GOLDEN_COLLECT','GOLDEN_HATCH'];
export const MODE_COSTS:Record<GameMode,number>={BASE:1,BONUS:BUY_COST,CASCADE:BUY_COST,COLLECT:BUY_COST,HATCH:BUY_COST};
export const MODE_FEATURES:Partial<Record<GameMode,FeatureMode>>={BONUS:'GOLDEN_ROOST',CASCADE:'BARN_CASCADES',COLLECT:'GOLDEN_COLLECT',HATCH:'GOLDEN_HATCH'};
export type LineWin={line:number;symbol:SymbolId;count:number;multiplier:number;payout:number;cells:string[]};
export type SpinEvent={index:number;type:'reveal';board:Board;wins:LineWin[];win:number;rawWin:number;capApplied:boolean;totalWin:number;freeSpin?:number;freeSpins?:number;feature?:FeatureMode};
export type BonusEvent={index:number;type:'bonus';picks:number[];spins:number;rounds?:number;award:number;feature?:FeatureMode};
export type HatchEvent={index:number;type:'hatch';grid:number[];newEggs:number[];respinsLeft:number;initial:boolean;finished:boolean;collected:number;win:number;rawWin:number;capApplied:boolean;totalWin:number};
export type CascadeEvent={index:number;type:'cascade';feature:'BARN_CASCADES';round:number;rounds:number;step:number;multiplier:number;board:Board;wins:LineWin[];removed:string[];win:number;rawWin:number;capApplied:boolean;totalWin:number;finished:boolean};
export type CollectEvent={index:number;type:'collect';feature:'GOLDEN_COLLECT';round:number;rounds:number;grid:number[];collector:number|null;multiplier:number;collected:number;win:number;rawWin:number;capApplied:boolean;totalWin:number};
export type GameEvent=SpinEvent|BonusEvent|HatchEvent|CascadeEvent|CollectEvent|{index:number;type:'complete';totalWin:number};
export type Book={id:number;payoutMultiplier:number;events:GameEvent[]};
export type Random=()=>number;
export const round2=(v:number)=>Math.round(v*100)/100;
export function evaluate(board:Board):LineWin[]{
 const wins:LineWin[]=[];
 LINES.forEach((rows,line)=>{
  const first=board[0][rows[0]];if(!PAYS[first.id])return;
  let count=1,multiplier=0;const cells=['0:'+rows[0]];
  for(let reel=1;reel<5;reel++){const c=board[reel][rows[reel]];if(c.id!==first.id&&c.id!=='wild')break;count++;cells.push(reel+':'+rows[reel]);if(c.id==='wild')multiplier+=c.mult??2;}
  if(count>=3)wins.push({line,symbol:first.id,count,multiplier:multiplier||1,payout:round2(PAYS[first.id]![count-3]*(multiplier||1)),cells});
 });return wins;
}
export function seeded(seed:number):Random{return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const weights=[3,4,5,6,8,13,13,15,15];
export const CASCADE_ROUNDS=8;
export const CASCADE_MULTIPLIERS=[1,2,3,5] as const;
export const CASCADE_WEIGHTS=[15,13,12,10,10,10,10,10,10];
export const CASCADE_WILD_CHANCE=.18;
function regular(rng:Random,symbolWeights=weights):SymbolId{let p=rng()*symbolWeights.reduce((a,b)=>a+b,0);for(let i=0;i<symbolWeights.length;i++){p-=symbolWeights[i];if(p<0)return SYMBOLS[i];}return 'J';}
export function createBoard(rng:Random,free=false,sticky:Record<string,Cell>={},wildChance=free?.027:.034):Board{
 return Array.from({length:5},(_,reel)=>{
  const m=rng()<.65?2:3;const scatterRow=!free&&reel%2===0&&rng()<.14?Math.floor(rng()*3):-1;
  return Array.from({length:3},(_,row)=>sticky[reel+':'+row]?{...sticky[reel+':'+row]}:row===scatterRow?{id:'scatter'}:reel>0&&reel<4&&rng()<wildChance?{id:'wild',mult:m}:{id:regular(rng)});
 });
}
function cascadeCell(rng:Random,column:number):Cell{return column>0&&column<4&&rng()<CASCADE_WILD_CHANCE?{id:'wild',mult:rng()<.65?2:3}:{id:regular(rng,CASCADE_WEIGHTS)};}
export function createCascadeBoard(rng:Random):Board{return Array.from({length:5},(_,column)=>Array.from({length:3},()=>cascadeCell(rng,column)));}
export function refillCascade(board:Board,removed:string[],rng:Random):Board{
 const paid=new Set(removed);
 return board.map((cells,column)=>{
  const survivors=cells.filter((_,row)=>!paid.has(column+':'+row)).map(cell=>({...cell}));
  return [...Array.from({length:3-survivors.length},()=>cascadeCell(rng,column)),...survivors];
 });
}
export const HATCH_VALUES=[500,250,100,50,20,10,5,2,1] as const;
export const HATCH_WEIGHTS=[2,4,12,30,150,240,320,320,522];
export const COLLECT_ROUNDS=8;
export const COLLECT_VALUES=HATCH_VALUES;
export const COLLECT_EGG_CHANCE=.22;
export const COLLECTOR_CHANCE=.37;
function hatchValue(rng:Random):number{
 let choice=rng()*1600;
 for(let i=0;i<HATCH_VALUES.length;i++){choice-=HATCH_WEIGHTS[i];if(choice<0)return HATCH_VALUES[i];}
 return 1;
}
export function createBook(rng:Random,mode:GameMode='BASE',id=0):Book{
 const events:GameEvent[]=[];let totalWin=0;let board=createBoard(rng);
 if(mode!=='BASE'){for(const c of [0,2,4]){board[c]=board[c].map(cell=>cell.id==='scatter'?{id:regular(rng)}:cell);board[c][Math.floor(rng()*3)]={id:'scatter'};}}
 const pushSpin=(b:Board,freeSpin?:number,freeSpins?:number,feature?:FeatureMode)=>{const wins=evaluate(b);const rawWin=round2(wins.reduce((a,w)=>a+w.payout,0));const win=Math.min(rawWin,round2(MAX_WIN-totalWin));totalWin=round2(totalWin+win);events.push({index:events.length,type:'reveal',board:b,wins,win,rawWin,capApplied:win<rawWin,totalWin,freeSpin,freeSpins,feature});};
 pushSpin(board);
 if(board.flat().filter(c=>c.id==='scatter').length===3&&totalWin<MAX_WIN){
  const feature:FeatureMode=MODE_FEATURES[mode]??FEATURES[Math.floor(rng()*FEATURES.length)];
  const picks=feature==='GOLDEN_ROOST'?Array.from({length:9},()=>1+Math.floor(rng()*3)):[];const spins=picks.reduce((a,b)=>a+b,0);const award=round2(Math.min(5,MAX_WIN-totalWin));totalWin=round2(totalWin+award);
  const rounds=feature==='BARN_CASCADES'?CASCADE_ROUNDS:feature==='GOLDEN_COLLECT'?COLLECT_ROUNDS:undefined;
  events.push({index:events.length,type:'bonus',picks,spins,rounds,award,feature});
  if(feature==='GOLDEN_HATCH'){
   const grid=Array<number>(15).fill(0),pool=Array.from({length:15},(_,i)=>i);let respinsLeft=3;
   const initialEggs:number[]=[];
   for(let n=0;n<6;n++){const cell=pool.splice(Math.floor(rng()*pool.length),1)[0];grid[cell]=hatchValue(rng);initialEggs.push(cell);}
   const hatch=(newEggs:number[],initial=false)=>{
    const collected=grid.reduce((sum,value)=>sum+value,0),finished=respinsLeft===0||grid.every(value=>value>0);
    const rawWin=finished?collected:0,win=Math.min(rawWin,round2(MAX_WIN-totalWin));totalWin=round2(totalWin+win);
    events.push({index:events.length,type:'hatch',grid:[...grid],newEggs,respinsLeft,initial,finished,collected,rawWin,win,capApplied:win<rawWin,totalWin});
    return finished;
   };
   hatch(initialEggs,true);
   while(respinsLeft>0){
    const newEggs:number[]=[];
    for(let cell=0;cell<15;cell++)if(!grid[cell]&&rng()<.11){grid[cell]=hatchValue(rng);newEggs.push(cell);}
    respinsLeft=newEggs.length?3:respinsLeft-1;
    if(hatch(newEggs))break;
   }
  }else if(feature==='BARN_CASCADES'){
   for(let round=1;round<=CASCADE_ROUNDS&&totalWin<MAX_WIN;round++){
    board=createCascadeBoard(rng);
    for(let step=1;totalWin<MAX_WIN;step++){
     const multiplier=CASCADE_MULTIPLIERS[Math.min(step-1,3)],wins=evaluate(board);
     const removed=[...new Set(wins.flatMap(win=>win.cells))];
     const rawWin=round2(wins.reduce((sum,win)=>sum+win.payout,0)*multiplier),win=Math.min(rawWin,round2(MAX_WIN-totalWin));
     totalWin=round2(totalWin+win);const finished=rawWin===0||totalWin===MAX_WIN;
     events.push({index:events.length,type:'cascade',feature,round,rounds:CASCADE_ROUNDS,step,multiplier,board,wins,removed,rawWin,win,capApplied:win<rawWin,totalWin,finished});
     if(finished)break;
     board=refillCascade(board,removed,rng);
    }
   }
  }else if(feature==='GOLDEN_COLLECT'){
   for(let round=1;round<=COLLECT_ROUNDS&&totalWin<MAX_WIN;round++){
    const collector=rng()<COLLECTOR_CHANCE?2+Math.floor(rng()*3)*5:null;
    const choice=rng(),multiplier=collector===null?0:choice<.05?3:choice<.2?2:1;
    const grid=Array.from({length:15},(_,cell)=>cell!==collector&&rng()<COLLECT_EGG_CHANCE?hatchValue(rng):0);
    const collected=collector===null?0:grid.reduce((sum,value)=>sum+value,0),rawWin=collected*multiplier;
    const win=Math.min(rawWin,round2(MAX_WIN-totalWin));totalWin=round2(totalWin+win);
    events.push({index:events.length,type:'collect',feature,round,rounds:COLLECT_ROUNDS,grid,collector,multiplier,collected,rawWin,win,capApplied:win<rawWin,totalWin});
   }
  }else{
  const sticky:Record<string,Cell>={};
  for(let fs=1;fs<=spins&&totalWin<MAX_WIN;fs++){
   board=createBoard(rng,true,sticky);
   if(feature==='GOLDEN_ROOST')for(let c=1;c<=3;c++)for(let r=0;r<3;r++)if(board[c][r].id==='wild')sticky[c+':'+r]={...board[c][r]};
   pushSpin(board,fs,spins,feature);
  }
  }
 }
 events.push({index:events.length,type:'complete',totalWin});return{id,payoutMultiplier:Math.round(totalWin*100),events};
}
export const INITIAL_BOARD:Board=[[{id:'corn'},{id:'rooster'},{id:'A'}],[{id:'hen'},{id:'wild',mult:2},{id:'Q'}],[{id:'rooster'},{id:'rooster'},{id:'boombox'}],[{id:'K'},{id:'wild',mult:3},{id:'truck'}],[{id:'truck'},{id:'rooster'},{id:'J'}]];
