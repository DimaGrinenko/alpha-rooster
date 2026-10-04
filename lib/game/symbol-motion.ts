import type {AnimationStateData,TrackEntry} from '@esotericsoftware/spine-core';

export const SYMBOL_DROP_SECONDS=.6;
export const SYMBOL_WIN_SECONDS=1.25;
export const SYMBOL_SETTLE_SECONDS=.32;
export function symbolTiming(fast:boolean){
 const speed=fast?1.8:1,stopGap=fast?35:115,frameAllowance=34;
 return {speed,stopGap,spinLead:fast?160:550,landingWait:Math.ceil(SYMBOL_SETTLE_SECONDS*1000/speed)+frameAllowance,winWait:Math.max(850,Math.ceil(SYMBOL_WIN_SECONDS*1000/speed)+frameAllowance)};
}
export function configureSymbolMix(data:AnimationStateData){
 data.defaultMix=.08;
 data.setMix('idle','drop',0);data.setMix('win','drop',0);
 data.setMix('drop','idle',.08);data.setMix('win','idle',.08);
 data.setMix('idle','settle',0);data.setMix('win','settle',0);data.setMix('settle','idle',.08);
}
export function hasSymbolEvent(entry:TrackEntry|null):boolean{
 for(let current=entry;current;current=current.mixingFrom)if(['drop','settle','win'].includes(current.animation?.name||''))return true;
 return false;
}

export function winDuration(multiplier:number,speed=1){return Math.max(1200,multiplier>=500?5000:multiplier>=100?3800:multiplier>=20?2700:1200)/speed;}
