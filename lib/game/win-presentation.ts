import type {LineWin} from './math';
export function winReaction(multiplier:number,free:boolean){
 return multiplier>=20?(free?'rage-win':'celebrate'):(free?'rage-small-win':'win');
}
export function presentedLines(lines:LineWin[],capped=false){
 // Uncapped line contributions would be misleading when the round hits its cap.
 return capped?[]:[...lines].sort((a,b)=>b.payout-a.payout||a.line-b.line).slice(0,3);
}
