'use client';
import Raster from './Raster';
import type {Rect} from '@/lib/game/art';
export const UI_ICON_ATLAS='./assets/hud-icons-v18.webp';
export const UI_SURFACE_ATLAS='./assets/ui-surfaces-v15.webp';
export const UI_FRAME_ATLAS='./assets/barn-oak-frame-v21.webp';
const icons:Record<string,Rect>={"spin": [58, 77, 295, 291], "menu": [461, 144, 204, 166], "auto": [782, 99, 257, 254], "turbo": [1193, 101, 145, 249], "plus": [66, 430, 272, 270], "minus": [425, 430, 271, 270], "sound": [792, 471, 250, 200], "muted": [1160, 474, 200, 196], "close": [101, 799, 199, 197], "info": [425, 762, 266, 263], "fullscreen": [808, 784, 214, 209], "bonus": [1177, 774, 182, 232]};
const surfaces:Record<string,Rect>={frame:[42,46,1541,852],bed:[210,205,1190,535],panel:[899,662,341,500],hud:[35,902,840,149],deck:[899,662,341,500],button:[35,902,840,149]};
const frameSlice={source:[132,132,132,132] as Rect,border:[24,24,24,24] as Rect,reference:[790,488] as [number,number],center:false};
const hudSlice={source:[132,132,132,132] as Rect,border:[18,18,18,18] as Rect,reference:[280,56] as [number,number]};
const panelSlice={source:[132,132,132,132] as Rect,border:[30,30,30,30] as Rect,reference:[480,500] as [number,number]};
export function UiIcon({name,className=''}:{name:string;className?:string}){
 return <Raster src={UI_ICON_ATLAS} rect={icons[name]} className={'ui-icon '+className}/>;
}
export function UiSurface({kind,className=''}:{kind:keyof typeof surfaces;className?:string}){
 return <Raster src={UI_FRAME_ATLAS} rect={kind==='bed'?surfaces.bed:surfaces.frame} stretch nineSlice={kind==='frame'?frameSlice:kind==='hud'||kind==='button'?hudSlice:kind==='panel'||kind==='deck'?panelSlice:undefined} className={'ui-surface '+className}/>;
}
