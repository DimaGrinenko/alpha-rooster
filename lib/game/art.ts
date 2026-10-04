export type Rect=[number,number,number,number];
export const BOARD_RECTS:Record<string,Rect>={frame:[22,16,1496,534],tile:[798,737,248,243],sparkle:[1083,771,170,190]};
export const POLISH_RECTS:Record<string,Rect>={logo:[212,0,1113,578],star:[19,625,330,323],podium:[349,757,459,243],burst:[812,614,382,348],card:[1233,582,278,389]};
export const UI_RECTS:Record<string,Rect>={frame:[22,16,1496,534],bar:[29,558,1480,160],spin:[460,722,283,280],buy:[42,755,385,200]};
export const SYMBOL_RECTS:Record<string,Rect>={"rooster":[42,3,329,352],"hen":[417,3,306,354],"truck":[791,75,362,264],"boombox":[1191,67,309,259],"corn":[52,373,305,299],"A":[440,374,280,276],"K":[848,384,253,263],"Q":[1208,377,269,274],"J":[75,698,236,283],"wild":[393,653,374,338],"scatter":[788,658,360,339],"feather":[1216,676,274,312]};
export const imageCache=new Map<string,Promise<HTMLImageElement>>();
export function loadImage(src:string){let promise=imageCache.get(src);if(!promise){promise=new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{imageCache.delete(src);reject(new Error('ASSET'));};im.src=src;});imageCache.set(src,promise);}return promise;}

