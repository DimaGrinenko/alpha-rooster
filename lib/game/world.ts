export const DAY_SECONDS=240;
export const BARN_SECONDS=30;
export const smoothStep=(v:number)=>{const t=Math.max(0,Math.min(1,v));return Math.max(0,Math.min(1,t*t*t*(t*(t*6-15)+10)));};
export function barnCycle(seconds:number){
 const phase=((seconds%BARN_SECONDS)+BARN_SECONDS)%BARN_SECONDS;
 const opening=phase<3?smoothStep(phase/3):phase<20?1:phase<23?1-smoothStep((phase-20)/3):0;
 return {phase,opening};
}
// Three staggered trips. At progress 0 the entire bird is behind the left jamb.
// Birds are occluded by the barn artwork, never removed or faded on the path.
export function henCycle(seconds:number,index:number){
 const phase=barnCycle(seconds).phase,start=[3.2,5.5,7.8][index],home=[17.4,15.1,12.8][index];
 const walk=phase<start?0:phase<start+2?smoothStep((phase-start)/2):phase<home?1:phase<home+2?1-smoothStep((phase-home)/2):0;
 const moving=phase>start&&phase<start+2||phase>home&&phase<home+2;
 const turning=smoothStep((phase-(home-.8))/.65);
 return {walk,moving,returning:phase>=home,facing:Math.cos(turning*Math.PI),peck:walk===1&&!moving?Math.pow(Math.max(0,Math.sin((phase-start)*2.2+index)),8):0};
}
export function henPath(walk:number,index:number){
 // Each bird has a visible roost. It reaches the doorway before growing with
 // perspective; the center bird returns first so parked birds never cross.
 const homeX=[.055,.20,.345][index],homeY=-.16-index*.018;
 const through=smoothStep(walk/.25),center=smoothStep((walk-.25)/.15),across=smoothStep((walk-.40)/.60),parking=[-.10,.50,.20];
 return {x:homeX+(.20-homeX)*center+(parking[index]-.20)*across,y:homeY*(1-through)+.08*center+.36*across,size:.09+(.13+index*.009)*smoothStep((walk-.28)/.30)};
}
export function henStep(seconds:number,offset=0){
 const phase=((seconds*2.4+offset)%1+1)%1;
 // The planted half of each stride stays at ground level. Swing lifts the toes.
 return {x:Math.cos(phase*Math.PI*2)*.095,lift:Math.max(0,Math.sin(phase*Math.PI*2))*.075,angle:Math.sin(phase*Math.PI*2)*.22};
}
// The hinge is u=0. Every point stays on the same rigid rectangular door plane.
export function doorProjection(u:number,angle:number,width:number,focal:number){
 const distance=u*width,scale=focal/(focal+distance*Math.sin(angle));
 return {x:distance*Math.cos(angle)*scale,scale};
}
