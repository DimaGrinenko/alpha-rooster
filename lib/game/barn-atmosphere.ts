/** Closed, continuous paths: background life never teleports at a loop boundary. */
export function barnFly(time:number,index:number){
 const phase=time*(.64+index*.071)+index*2.17;
 const x=Math.sin(phase)*.74+Math.sin(phase*2+index)*.13;
 const y=Math.sin(phase*2+.4)*.52+Math.sin(phase*3-index)*.09;
 const dx=Math.cos(phase)*.74+Math.cos(phase*2+index)*.26;
 const dy=Math.cos(phase*2+.4)*1.04+Math.cos(phase*3-index)*.27;
 return {x,y,angle:Math.atan2(dy,dx)+Math.PI/2,wing:.32+.68*Math.abs(Math.sin(time*51+index)),depth:.66+.18*Math.sin(phase+.8)};
}

export type BarnHenInfluence={cx:number;cy:number;rx:number;ry:number;phase:number;motion?:'head'|'ear'|'breath'|'chew';strength?:number};
export type BarnHenRegion=BarnHenInfluence & {parts?:BarnHenInfluence[]};

/** Six compact-support affine coefficients. The caller owns and reuses out. */
export function barnHenMotion(time:number,hen:BarnHenRegion,out:Float64Array){
 const t=time+hen.phase;
 out.fill(0);
 if(hen.motion==='ear'){
  const twitch=Math.max(0,Math.sin(t*.68))**8;
  const turn=Math.sin(t*.77)*.008+Math.sin(t*9)*twitch*.028;
  out[2]=-hen.ry*turn;out[4]=hen.rx*turn;
 }else if(hen.motion==='breath'){
  const breath=Math.sin(t*1.55);
  out[1]=hen.rx*.008*breath;out[3]=-hen.ry*.004*breath;out[5]=hen.ry*.011*breath;
 }else if(hen.motion==='chew'){
  out[0]=Math.sin(t*2.5)*hen.rx*.009;out[3]=(1-Math.cos(t*5))*hen.ry*.009;
 }else{
  // One deliberate glance followed by a long rest. No pecking or rubbery
  // vertical bob: the head gently turns, pauses, then returns to its nest pose.
  const period=18+hen.phase*.37,phase=((t%period)+period)%period;
  const ease=(v:number)=>{const q=Math.max(0,Math.min(1,v));return q*q*(3-2*q);};
  const glance=ease((phase-2)/1.15)*(1-ease((phase-5.1)/1.45));
  const direction=Math.cos(hen.phase*1.7)>=0?1:-1;
  out[0]=direction*hen.rx*.075*glance;
  out[1]=-hen.rx*.018*glance;
  out[2]=-direction*hen.rx*.018*glance;
  out[3]=-hen.ry*.010*glance;
 }
 if(hen.strength!==undefined)for(let i=0;i<6;i++)out[i]*=hen.strength;
 return out;
}

/** Compact support holds nest edges, beams and straw lips completely still. */
export function barnHenOffset(x:number,y:number,time:number,hen:BarnHenRegion){
 if(hen.parts){let dx=0,dy=0;for(const part of hen.parts){const p=barnHenOffset(x,y,time,part);dx+=p.x;dy+=p.y;}return {x:dx,y:dy};}
 const nx=(x-hen.cx)/hen.rx,ny=(y-hen.cy)/hen.ry,r2=nx*nx+ny*ny;
 if(r2>=1)return {x:0,y:0};
 const envelope=(1-r2)**3,m=barnHenMotion(time,hen,new Float64Array(6));
 return {x:envelope*(m[0]+nx*m[1]+ny*m[2]),y:envelope*(m[3]+nx*m[4]+ny*m[5])};
}

export function barnCover(viewWidth:number,viewHeight:number,artWidth:number,artHeight:number,floor?:{sourceY:number;screenY:number}){
 // A uniform camera fit keeps the source floor below the actual crate feet.
 // Compact phones use the raised deck, larger phones use the walking floor.
 const portrait=viewHeight>=viewWidth;
 let scale=Math.max(viewWidth/artWidth,viewHeight/artHeight)*(portrait?1:1.06);
 if(portrait&&floor){
  scale=Math.max(scale,(viewHeight-floor.screenY)/(artHeight-floor.sourceY));
  return {scale,x:(viewWidth-artWidth*scale)/2,y:Math.min(0,floor.screenY-floor.sourceY*scale)};
 }
 if(portrait)return {scale,x:(viewWidth-artWidth*scale)/2,y:0};
 return {scale,x:(viewWidth-artWidth*scale)/2,y:(viewHeight-artHeight*scale)/2};
}
