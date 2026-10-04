import type {FeatureMode,GameMode} from './math';

export type BuyMode=Exclude<GameMode,'BASE'>;
export const BONUS_MODES:{mode:BuyMode;feature:FeatureMode;name:string;tagline:string;rules:string;symbol:'wild'|'scatter'}[]=[
 {mode:'BONUS',feature:'GOLDEN_ROOST',name:'Golden Roost',tagline:'Land. Lock. Multiply.',rules:'9–27 free spins. Wilds stay in place until the feature ends. Their ×2 / ×3 multipliers add on winning lines.',symbol:'wild'},
 {mode:'CASCADE',feature:'BARN_CASCADES',name:'Barn Cascades',tagline:'Win. Drop. Win again.',rules:'Eight cascade rounds. Winning symbols disappear, the remaining symbols drop, and new symbols fill the gaps. Consecutive wins use ×1, ×2, ×3, then ×5. A round ends when no line wins; the multiplier resets for the next round.',symbol:'wild'},
 {mode:'COLLECT',feature:'GOLDEN_COLLECT',name:'Golden Collect',tagline:'The Rooster collects.',rules:'Eight fresh prize fields. Egg prizes pay only if a Rooster collector lands in the middle column. He collects their sum with a ×1, ×2 or ×3 multiplier. Without a collector that field pays nothing. Eggs and multipliers do not carry between rounds.',symbol:'scatter'},
 {mode:'HATCH',feature:'GOLDEN_HATCH',name:'Golden Hatch',tagline:'Hold. Hatch. Collect.',rules:'Start with six prize eggs and three respins. New eggs lock their values and reset the respins to three. Collect when the grid fills or respins run out.',symbol:'scatter'},
];
export function bonusMode(feature:FeatureMode='GOLDEN_ROOST'){return BONUS_MODES.find(mode=>mode.feature===feature)!;}
