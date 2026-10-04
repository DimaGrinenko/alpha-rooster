import {BARN_DEBRIS} from './barn-debris.ts';

/** Presentation only. No result, payout, or bonus rule depends on this clock. */
export const BARN_DUST_START=.55;
export const BARN_DUST_OPAQUE=1.35;
export const BARN_SCENE_SWAP_SECONDS=1.70;
export const BARN_COLLAPSE_SECONDS=BARN_SCENE_SWAP_SECONDS;
export const BARN_DUST_HOLD_SECONDS=2.10;
export const BARN_DUST_SECONDS=4.10;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(v:number)=>{const p=clamp(v);return p*p*(3-2*p);};
type Point=readonly [number,number];
export type BarnFragment={points:readonly Point[];pivot:Point;kind:'roof'|'wall'|'pillar'|'floor';side:number};
export type BarnFractureCamera={x:number;y:number;width:number;height:number;portrait:boolean};

// These seams follow the room's perspective: two supporting posts, the sloped
// side walls, roof bays, and the two door leaves. The floor remains grounded.
// They are clipping geometry for the existing raster, never replacement art.
function architecture(portrait:boolean):BarnFragment[]{
 const xs=portrait?[0,.205,.256,.300,.500,.690,.728,.785,1]:[0,.235,.280,.335,.482,.626,.705,.750,1];
 const lintel=portrait?[.055,.110,.130,.130,.130,.130,.110,.100,.060]:[.050,.180,.210,.220,.220,.220,.190,.160,.035];
 const footing=portrait?[.460,.390,.365,.345,.345,.365,.395,.430,.470]:[.745,.660,.625,.610,.610,.625,.660,.705,.775];
 const pieces:BarnFragment[]=[];
 for(let i=0;i<xs.length-1;i++){
  const x=xs[i],r=xs[i+1],cx=(x+r)/2,side=(cx-.5)*2;
  pieces.push({kind:'roof',side,pivot:[cx,(lintel[i]+lintel[i+1])*.24],points:[[x,0],[r,0],[r,lintel[i+1]],[x,lintel[i]]]});
  pieces.push({kind:i===1||i===6?'pillar':'wall',side,pivot:[cx,(footing[i]+footing[i+1])*.5],points:[[x,lintel[i]],[r,lintel[i+1]],[r,footing[i+1]],[x,footing[i]]]});
 }
 pieces.unshift({kind:'floor',side:0,pivot:[.5,1],points:[...xs.map((x,i)=>[x,footing[i]] as Point),[1,1],[0,1]]});
 return pieces;
}
export const BARN_FRACTURES={wide:architecture(false),portrait:architecture(true)};

/** Never consume a long stalled frame in one go and skip the readable breakup. */
export function advanceBarnCollapse(time:number,delta:number){return Math.min(BARN_DUST_SECONDS,time+Math.min(Math.max(delta,0),.08));}
export function collapseOutside(time:number){return time>=BARN_SCENE_SWAP_SECONDS;}
export function collapseStage(time:number){
 if(time<0)return 'barn';
 if(time<BARN_DUST_START)return 'break';
 if(time<BARN_DUST_OPAQUE)return 'dust-rise';
 if(time<BARN_DUST_HOLD_SECONDS)return 'covered';
 return time<BARN_DUST_SECONDS?'reveal':'ruins';
}
export function collapseFragment(time:number,part:BarnFragment,index:number){
 if(part.kind==='floor')return {x:0,y:0,angle:0,alpha:1,scale:1};
 const roof=part.kind==='roof',pillar=part.kind==='pillar';
 const delay=(roof?.025:pillar?.20:.12)+Math.abs(part.side)*.075+(index%3)*.012;
 const t=Math.max(0,time-delay),alpha=1-ease((time-1.26)/.40);
 if(!t)return {x:0,y:0,angle:0,alpha,scale:1};
 return {
  x:part.side*(pillar?.028*t*t:roof?.065*t+.145*t*t:.045*t+.095*t*t),
  y:roof?-.12*t+.255*t*t:pillar?.031*t*t:-.025*t+.105*t*t,
  angle:part.side*(pillar?.34:roof?.56:.39)*t*t,
  alpha,scale:1+(pillar?0:.027*t)
 };
}
/** Clear fracture first, a pressure cloud second, and a long gentle reveal last. */
export function collapseDust(time:number){
 return ease((time-BARN_DUST_START)/(BARN_DUST_OPAQUE-BARN_DUST_START))*(1-ease((time-BARN_DUST_HOLD_SECONDS)/(BARN_DUST_SECONDS-BARN_DUST_HOLD_SECONDS)));
}
export function collapseDebris(time:number,index:number){
 const t=Math.max(0,time-.07-(index%5)*.025),a=index*2.3999632297;
 const vx=Math.cos(a)*(.17+(index%7)*.013),vy=-.18-(index%4)*.07;
 return {x:.5+vx*t,y:.39+vy*t+.41*t*t,angle:a+t*(index%2?-1:1)*(1.1+(index%3)*.7),
  alpha:(1-ease((t-1.15)/.62))*ease(t/.10),scale:.35+(index%6)*.14};
}
export function collapseCloud(time:number,index:number,width:number,height:number){
 const row=Math.floor(index/4),col=index%4,spread=ease((time-BARN_DUST_START)/(BARN_DUST_OPAQUE-BARN_DUST_START));
 const rise=Math.max(0,time-BARN_DUST_HOLD_SECONDS)*height*.025;
 return {
  x:width*(.5+(col/3-.5)*spread)+Math.sin(index*2.17)*width*.02*spread,
  y:height*(.46+(row/2-.46)*spread)-rise,
  size:Math.max(width*1.04,height*1.12)*(.58+.42*spread)*(1+Math.max(0,time-BARN_DUST_HOLD_SECONDS)*.055),
  angle:Math.sin(index*1.3)*.28+(index%2?1:-1)*time*.023,
  alpha:collapseDust(time)
 };
}

/** Build once per impact/resize. Cracks reveal a dark raster recess, not ruins. */
export function drawCollapseBackplate(ctx:CanvasRenderingContext2D,room:HTMLCanvasElement,width:number,height:number){
 ctx.save();ctx.filter='blur(12px) brightness(24%)';ctx.drawImage(room,-24,-24,width+48,height+48);ctx.restore();
}
/** Rigid roof, post and wall pieces cut from the frozen room photograph. */
export function drawCollapsingRoom(ctx:CanvasRenderingContext2D,room:HTMLCanvasElement,backplate:HTMLCanvasElement,width:number,height:number,time:number,camera:BarnFractureCamera){
 if(time<=0){ctx.drawImage(room,0,0,width,height);return;}
 ctx.drawImage(backplate,0,0,width,height);
 const parts=camera.portrait?BARN_FRACTURES.portrait:BARN_FRACTURES.wide;
 // Roof and wall pieces retain source UVs. Moving a piece cannot stretch the
 // wood grain, hens, bolts, or lanterns painted on that rigid surface.
 for(let i=0;i<parts.length;i++){
  const part=parts[i],p=collapseFragment(time,part,i);if(p.alpha<=0)continue;
  const cx=camera.x+part.pivot[0]*camera.width,cy=camera.y+part.pivot[1]*camera.height;
  ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(cx+p.x*width,cy+p.y*height);ctx.rotate(p.angle);ctx.scale(p.scale,p.scale);ctx.translate(-cx,-cy);
  ctx.beginPath();for(let n=0;n<part.points.length;n++){const [x,y]=part.points[n],px=camera.x+x*camera.width,py=camera.y+y*camera.height;if(n)ctx.lineTo(px,py);else ctx.moveTo(px,py);}ctx.closePath();ctx.clip();
  ctx.drawImage(room,0,0,width,height);ctx.restore();
 }
}

/** Shared by the real scene and the pixel-coverage/storyboard verification. */
export function drawCollapseBurst(ctx:CanvasRenderingContext2D,atlas:CanvasImageSource,width:number,height:number,time:number,portrait:boolean){
 if(time<=0||time>=BARN_DUST_SECONDS)return;
 const chunks=[BARN_DEBRIS.timberLong,BARN_DEBRIS.timberNail,BARN_DEBRIS.timberGreen,BARN_DEBRIS.timberFork,BARN_DEBRIS.strawBundle,BARN_DEBRIS.strawSpray];
 for(let i=0;i<(portrait?14:22);i++){
  const p=collapseDebris(time,i),rect=chunks[i%chunks.length],size=Math.min(width*.075,65)*p.scale;
  if(p.alpha<=0)continue;ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(p.x*width,p.y*height);ctx.rotate(p.angle);ctx.drawImage(atlas,...rect,-size/2,-size*rect[3]/rect[2]/2,size,size*rect[3]/rect[2]);ctx.restore();
 }
 for(let i=0;i<12;i++){
  const p=collapseCloud(time,i,width,height),rect=i%3?BARN_DEBRIS.dustLarge:BARN_DEBRIS.dustSmall;
  if(p.alpha<=0)continue;ctx.save();ctx.globalAlpha=p.alpha;ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.drawImage(atlas,...rect,-p.size/2,-p.size*rect[3]/rect[2]/2,p.size,p.size*rect[3]/rect[2]);ctx.restore();
 }
}
