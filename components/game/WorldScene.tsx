'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {loadImage,type Rect} from '@/lib/game/art';
import {DAY_SECONDS,barnCycle,doorProjection,smoothStep as smooth} from '@/lib/game/world';
import {FARM_PARTS} from '@/lib/game/farm-art';
import {WORLD_ASSETS} from '@/lib/game/world-assets';
export {WORLD_ASSETS} from '@/lib/game/world-assets';
import {renderStats} from '@/lib/game/render-stats';
import {animationClock} from '@/lib/game/animation-clock';
import {heroGround} from '@/lib/game/hero-layout';
import {wheatLayout} from '@/lib/game/wheat-world';
import {wheatTriangles,vegetationZones} from '@/lib/game/wheat-wind';
import {BUTTERFLY_PARTS,MILL_PARTS,butterflyFlight,millRotation} from '@/lib/game/harvest-life';
export type WorldTime='auto'|'day'|'sunset'|'night';
const PARTS:Record<string,Rect>={barn:[25,32,416,368],door:[526,65,212,328],tree:[459,434,337,403],grass:[829,650,420,183],star:[29,849,382,378],moon:[444,847,377,388],sun:[837,850,417,389]};
const YARD_PARTS:Record<string,Rect>={path:[78,80,900,893],interior:[972,85,492,518]};
const CLOUDS:Record<string,Rect>={cloudA:[13,101,360,236],cloudB:[397,66,308,296],firefly:[1184,801,184,171]};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const mix=(a:number[],b:number[],t:number)=>'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(',')+')';
export default function WorldScene({time='auto',className='',paused=false,bonus=false,anchorRef,layoutKey=''}:{time?:WorldTime;className?:string;paused?:boolean;bonus?:boolean;anchorRef?:RefObject<HTMLElement|null>;layoutKey?:string}){
 const ref=useRef<HTMLCanvasElement>(null),timeRef=useRef(time),pausedRef=useRef(paused),bonusRef=useRef(bonus);
 useEffect(()=>{bonusRef.current=bonus;},[bonus]);
 useEffect(()=>{pausedRef.current=paused;},[paused]);
 useEffect(()=>{timeRef.current=time;},[time]);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;let alive=true,frame=0,elapsed=0,angle=.75,paintedTime='';const clock=animationClock(30,performance.now());
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),record=renderStats(canvas);let reduced=motion.matches;
  const motionChanged=()=>{reduced=motion.matches;paintedTime='';};motion.addEventListener('change',motionChanged);
  let clearingAnchor={x:0,y:0,width:0},boardTop=0,boardRight=0;
  const measure=()=>{const hero=anchorRef?.current?.querySelector('canvas');if(!hero)return;const rect=hero.getBoundingClientRect(),world=canvas.getBoundingClientRect();clearingAnchor=heroGround({x:rect.x-world.x,y:rect.y-world.y,width:rect.width,height:rect.height});const board=anchorRef?.current?.parentElement?.querySelector('.reel-frame')?.getBoundingClientRect();boardTop=(board?.top??0)-world.top;boardRight=(board?.right??0)-world.left;paintedTime='';};
  const observer=new ResizeObserver(measure);observer.observe(canvas);if(anchorRef?.current)observer.observe(anchorRef.current);measure();window.addEventListener('resize',measure);
  try{const old=Number(sessionStorage.getItem('alpha-world-v4'));const epoch=old>0?old:Date.now();sessionStorage.setItem('alpha-world-v4',String(epoch));elapsed=(Date.now()-epoch)/1000;angle=.75+elapsed*Math.PI*2/DAY_SECONDS;}catch{/* Optional local phase continuity. */}
  void Promise.all(WORLD_ASSETS.map(src=>loadImage(src).catch(()=>{const blank=document.createElement('canvas');blank.width=1536;blank.height=1254;canvas.dataset.worldDegraded='true';return blank;}))).then(([ground,clouds,atlas,farm,yard,forest,butterflies,mill])=>{
   if(!alive)return;const screen=canvas.getContext('2d',{alpha:false});if(!screen)return;
   const scenery=document.createElement('canvas'),terrain=document.createElement('canvas'),planting=document.createElement('canvas');
   const sceneryContext=scenery.getContext('2d')!,terrainContext=terrain.getContext('2d')!,plantingContext=planting.getContext('2d')!;
   let ctx=screen,terrainReady=false,terrainLawn=-1;
   const cuts:Record<string,HTMLCanvasElement>={};
   for(const[regions,image]of [[PARTS,atlas],[CLOUDS,clouds],[FARM_PARTS,farm],[YARD_PARTS,yard],[BUTTERFLY_PARTS,butterflies],[MILL_PARTS,mill]] as const)for(const[key,r]of Object.entries(regions)){if(/^(hen|leg|swallow)/.test(key))continue;const cut=document.createElement('canvas');cut.width=r[2];cut.height=r[3];const cutCtx=cut.getContext('2d')!;cutCtx.filter='saturate(1.20) contrast(1.035)';cutCtx.drawImage(image,r[0],r[1],r[2],r[3],0,0,r[2],r[3]);cutCtx.filter='none';if(key==='path')cutCtx.clearRect(872,0,28,540);cuts[key]=cut;}
   // Preserve the forest's native proportions. Overlapping left feathering
   // joins successive raster sections without stretching the round canopies.
   const forestTile=document.createElement('canvas');forestTile.width=1536;forestTile.height=380;
   const forestCtx=forestTile.getContext('2d')!;forestCtx.drawImage(forest,0,360,1536,380,0,0,1536,380);
   forestCtx.globalCompositeOperation='destination-in';const feather=forestCtx.createLinearGradient(0,0,1536,0);feather.addColorStop(0,'#0000');feather.addColorStop(.10,'#000');feather.addColorStop(1,'#000');forestCtx.fillStyle=feather;forestCtx.fillRect(0,0,1536,380);
   const sprite=(key:string,x:number,y:number,width:number,alpha=1,rotation=0,flip=1)=>{if(alpha<.003)return;const im=cuts[key];ctx.save();ctx.globalAlpha=clamp(alpha);ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(flip,1);ctx.drawImage(im,-width/2,-width*im.height/im.width/2,width,width*im.height/im.width);ctx.restore();};
   const meteorTrail=document.createElement('canvas');meteorTrail.width=192;meteorTrail.height=8;const trailCtx=meteorTrail.getContext('2d')!,trailGradient=trailCtx.createLinearGradient(0,0,192,0);trailGradient.addColorStop(0,'#ffe99c00');trailGradient.addColorStop(1,'#fff7c8');trailCtx.fillStyle=trailGradient;trailCtx.fillRect(0,2,192,4);
   const bee=(x:number,y:number,width:number,phase:number)=>{
    const flap=Math.sin(elapsed*40+phase),im=cuts.beeBody,s=width/im.width;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(elapsed*1.3+phase)*.13);ctx.scale(Math.cos(elapsed*.5+phase)>=0?1:-1,1);
    for(let wing=0;wing<2;wing++){const wi=cuts[wing?'wingLower':'wingUpper'];ctx.save();ctx.translate(0,-width*.18);ctx.rotate(-.45+(wing?1:-1)*flap*.6);ctx.scale(1,.4+Math.abs(flap)*.65);ctx.globalAlpha=.78;ctx.drawImage(wi,-278*s,-(wing?78:105)*s,wi.width*s,wi.height*s);ctx.restore();}
    ctx.drawImage(im,-width/2,-im.height*s/2,width,im.height*s);ctx.restore();
   };
   const butterfly=(x:number,y:number,width:number,index:number)=>{
    const flight=butterflyFlight(elapsed,index),s=width/835,body=cuts.butterflyBody;
    ctx.save();ctx.translate(x,y);ctx.rotate(flight.bank);
    for(const side of [-1,1]){
     const wing=cuts[side<0?'butterflyLeft':'butterflyRight'];
     ctx.save();ctx.translate(side*11*s,0);ctx.scale(flight.wing,1);ctx.rotate(side*.08);
     ctx.drawImage(wing,-(side<0?400:20)*s,-(side<0?253:257)*s,wing.width*s,wing.height*s);ctx.restore();
    }
    ctx.drawImage(body,-87*s*.68,-195*s*.68,body.width*s*.68,body.height*s*.68);ctx.restore();
   };
   const windmill=(x:number,footY:number,height:number)=>{
    const body=cuts.millBody,rotor=cuts.millRotor,s=height/581;
    ctx.save();ctx.translate(x,footY);ctx.drawImage(body,-141*s,-570*s,body.width*s,body.height*s);
    ctx.translate(0,-376*s);ctx.rotate(millRotation(reduced?0:elapsed));ctx.drawImage(rotor,-285*s,-279*s,rotor.width*s,rotor.height*s);ctx.restore();
   };
   const draw=(now:number)=>{
    if(!alive)return;frame=requestAnimationFrame(draw);if(document.hidden||pausedRef.current&&paintedTime===timeRef.current&&canvas.width===Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,1.25))&&canvas.height===Math.round(canvas.clientHeight*Math.min(devicePixelRatio||1,1.25))){clock.reset(now);return;}
    const elapsedFrame=clock.tick(now);if(elapsedFrame===null)return;
    const began=performance.now(),dt=Math.min(elapsedFrame,.25);
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const portrait=h>w,dpr=Math.min(devicePixelRatio||1,1.25);
    const field=wheatLayout(w,h,clearingAnchor.y||h*.43);
    const resize=!terrainReady||terrainLawn!==field.lawn||canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr);
    if(reduced&&!resize&&paintedTime===timeRef.current)return;if(!reduced)elapsed+=dt;
    if(resize){canvas.width=scenery.width=terrain.width=planting.width=Math.round(w*dpr);canvas.height=scenery.height=terrain.height=planting.height=Math.round(h*dpr);
     terrainContext.setTransform(dpr,0,0,dpr,0,0);const gx=(w-field.width)/2,solidY=field.upperY+520/680*field.upperHeight;
     terrainContext.fillStyle='#cfb145';terrainContext.fillRect(0,solidY,w,h-solidY);
     const depth=field.lawn-field.horizon;
     const forestHeight=depth*.86,forestWidth=forestHeight*1536/380;
     terrainContext.filter='saturate(1.12) brightness(1.025)';
     for(let x=gx-forestWidth*.25;x<w;x+=forestWidth*.90)terrainContext.drawImage(forestTile,x,field.horizon-depth*.33,forestWidth,forestHeight);
     plantingContext.setTransform(dpr,0,0,dpr,0,0);plantingContext.filter='saturate(1.20) brightness(1.055)';plantingContext.drawImage(ground,0,0,1536,680,gx,field.upperY,field.width,field.upperHeight);plantingContext.drawImage(ground,0,680,1536,344,gx,field.lawn,field.width,h-field.lawn);plantingContext.filter='none';terrainReady=true;terrainLawn=field.lawn;measure();
    }
    ctx=screen;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;
    const target=timeRef.current==='day'?1.55:timeRef.current==='sunset'?3.02:timeRef.current==='night'?4.7:.75+elapsed*Math.PI*2/DAY_SECONDS;
    const delta=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));angle=reduced?target:angle+delta*(1-Math.exp(-dt*.72));
    const elevation=Math.sin(angle),day=smooth((elevation+.12)/.60),night=1-day,dusk=(1-Math.abs(elevation))*Math.pow(1-day,.25),skyline=field.horizon/h,arc=portrait?Math.min(.14,Math.max(.025,skyline-.075)):.27;
    const sky=ctx.createLinearGradient(0,0,0,h*(portrait?.39:.82));sky.addColorStop(0,mix([19,17,63],[30,172,237],day));sky.addColorStop(.65,mix([80,62,113],[117,227,234],day));sky.addColorStop(1,mix([80,62,113],[255,173,124],Math.max(day,dusk*.75)));ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    if(night>.005)for(let i=0;i<54;i++){const x=((i*173+31)%997)/997*w,y=((i*67+17)%421)/421*h*(skyline-.025);const beat=.5+.5*Math.sin(elapsed*(.9+i%4*.25)+i*2.17);const size=(portrait?3.4:4.5)+(i%4)*1.65;const drift=reduced?0:Math.sin(elapsed*.18+i)*1.7;sprite('star',x+drift,y+Math.sin(elapsed*.14+i)*1.2,size*(.72+beat*.5),night*(.22+beat*.78),Math.sin(elapsed*.24+i)*.13);}
    const shower=bonusRef.current;
    if(!reduced&&(night>.005||shower))for(let i=0;i<(shower?17:9);i++){const period=(shower?2.15:3.4)+(i%4)*.41,phase=(elapsed+i*.47)%period;if(phase<(shower?.75:.54)){const t=phase/(shower?.75:.54),x=w*(.02+(i*.119)%.8+t*.22),y=h*(.015+(i%5)*.026+t*(portrait?.065:.14)),alpha=Math.max(night,shower?.9:0)*Math.sin(t*Math.PI);ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(portrait?.37:.43);const length=w*(shower?.12:.065);ctx.drawImage(meteorTrail,-length,-2,length,4);ctx.restore();sprite('star',x,y,(portrait?4:6)*(shower?1.5:1),alpha);}}
    sprite('sun',w*(.5-Math.cos(angle)*.53),h*(skyline-Math.sin(angle)*arc),h*(portrait?.11:.145),smooth((elevation+.13)*4));
    sprite('moon',w*(.5+Math.cos(angle)*.53),h*(skyline+Math.sin(angle)*arc),h*(portrait?.10:.13),smooth((-elevation+.13)*4));
    // Composite the whole farm once. Per-sprite Canvas filters caused GPU stalls.
    ctx=sceneryContext;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.globalAlpha=1;
    for(let i=0;i<5;i++){const width=h*(portrait?.14:.19)+(i%2)*h*.065,x=((i*.27*w+elapsed*(1.5+i*.35))%(w+width*2))-width,y=h*((portrait?.06:.11)+(i%3)*(portrait?.045:.07));sprite(i%2?'cloudA':'cloudB',x,y+Math.sin(elapsed*.19+i)*2,width,.9);}
    // Start with an unmoving landscape. Only the planted strips may deform;
    // the baked track and its full verge are excluded from every animated pass.
    ctx.drawImage(terrain,0,0,w,h);
    const zones=vegetationZones(field,h);
    ctx.save();
    if(!reduced){ctx.beginPath();ctx.rect(0,0,w,h);for(const zone of zones)ctx.rect(0,zone.top,w,zone.bottom-zone.top);ctx.clip('evenodd');}
    ctx.drawImage(planting,0,0,w,h);ctx.restore();
    if(!reduced){
     const cols=portrait?8:12,cw=w/cols;
     const lightPhase=(elapsed+4)%17,lightCenter=-.18+lightPhase/3.8*1.36;
     for(const zone of zones){
      const rows=zone.kind==='grass'?8:5,ch=(zone.bottom-zone.top)/rows;
      ctx.save();ctx.beginPath();ctx.rect(0,zone.top,w,zone.bottom-zone.top);ctx.clip();
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
       const x=col*cw,y=zone.top+row*ch;
       const triangles=wheatTriangles(x,y,cw,ch,w,zone.top,zone.bottom,elapsed);
       for(let half=0;half<2;half++){
        ctx.save();ctx.transform(...triangles[half]);ctx.beginPath();
        const vertices=half?[[cw,0],[cw,ch],[0,ch]]:[[0,0],[cw,0],[0,ch]],centerX=cw*(half?2:1)/3,centerY=ch*(half?2:1)/3;
        // A subpixel raster gutter hides antialiasing along a shared edge.
        vertices.forEach(([vx,vy],index)=>{const length=Math.hypot(vx-centerX,vy-centerY),px=vx+(vx-centerX)/length*.7,py=vy+(vy-centerY)/length*.7;if(index)ctx.lineTo(px,py);else ctx.moveTo(px,py);});ctx.closePath();ctx.clip();
        const sx=Math.max(0,x-.8),sy=Math.max(zone.top,y-.8),sw=Math.min(w-sx,cw+1.6),sh=Math.min(zone.bottom-sy,ch+1.6);
        ctx.drawImage(planting,sx*dpr,sy*dpr,sw*dpr,sh*dpr,sx-x,sy-y,sw,sh);
        if(zone.kind==='wheat'&&lightPhase<3.8){
         ctx.globalCompositeOperation='screen';ctx.globalAlpha=.065*Math.exp(-Math.pow(((x+cw/2)/w-lightCenter)/.16,2))*Math.sin((row+.5)/rows*Math.PI);
         ctx.drawImage(planting,sx*dpr,sy*dpr,sw*dpr,sh*dpr,sx-x,sy-y,sw,sh);
        }
        ctx.restore();
       }
      }
      ctx.restore();
     }
    }
    const millX=w*(portrait?.075:.10),millY=field.horizon+(field.lawn-field.horizon)*.14,millHeight=h*(portrait?.058:.115);
    windmill(millX,millY,millHeight);
    // Bury the tower's foot in the existing wheat rather than adding a soil patch.
    ctx.drawImage(planting,(millX-millHeight*.28)*dpr,millY*dpr,millHeight*.56*dpr,4*dpr,millX-millHeight*.28,millY,millHeight*.56,4);
    const stageW=Math.min(1280,w,h*16/9),bw=portrait?w*.145:Math.min(stageW*.108,Math.max(24,(w-boardRight-32)/1.25));
    const bx=portrait?w*.855:Math.min(w-16-bw*.6,Math.max(w*.934,boardRight+16+bw*.7)),by=portrait?(boardTop||h*.44)-32-bw*364/410/2:h*.49;
    const left=bx-bw/2,top=by-bw*364/410/2,dx=left+bw*127/410,dy=top+bw*198/410,dw=bw*164/410,dh=bw*148/410;
    const path=cuts.path,pathScale=dw/138,pathHeight=Math.max(path.height*pathScale,h-(dy+dh)+60),pathYScale=pathHeight/path.height;
    ctx.drawImage(path,dx+dw/2-(410-78)*pathScale,dy+dh-(86-80)*pathYScale,path.width*pathScale,pathHeight);
    const sceneTime=reduced?26:elapsed,cycle=barnCycle(sceneTime);
    sprite('barn',bx,by,bw);ctx.drawImage(cuts.interior,dx,dy,dw,dh);
    const doorAngle=cycle.opening*1.32;
    for(const side of [1,-1]){ctx.save();ctx.translate(side===1?dx:dx+dw,dy+dh/2);ctx.scale(side,1);const panels=cycle.opening===0?1:10,im=cuts.door;for(let i=0;i<panels;i++){const a=doorProjection(i/panels,doorAngle,dw/2,dw*2.7),b=doorProjection((i+1)/panels,doorAngle,dw/2,dw*2.7),scale=(a.scale+b.scale)/2;ctx.drawImage(im,i*im.width/panels,0,im.width/panels+.5,im.height,a.x,-dh*scale/2,Math.max(.05,b.x-a.x)+.12,dh*scale);}ctx.restore();}
    sprite('grass',left+bw*.08,dy+dh+bw*.075,bw*.26);sprite('grass',left+bw*.93,dy+dh+bw*.075,bw*.26);
    if(day>.01&&!reduced){ctx.globalAlpha=day;for(let i=0;i<5;i++){const side=i%2,px=side?w*.955:w*(.025+(i%3)*.07),base=portrait?h*.93:h*(.64+(i%3)*.13);bee(px+Math.sin(elapsed*.65+i*2)*w*.025,base+Math.sin(elapsed*1.4+i)*h*.025,h*(portrait?.018:.024),i*1.7);}ctx.globalAlpha=1;}
    if(day>.08&&!reduced)for(let i=0;i<2;i++){
     const flight=butterflyFlight(elapsed,i),px=w*(i?.959:.048)+flight.x*w*(portrait?.022:.028),baseY=portrait?Math.min(boardTop-22,clearingAnchor.y+6):h*.86,py=baseY+flight.y*h*(portrait?.02:.07);
     butterfly(px,py,h*(portrait?.035:.047),i);
    }
    if(night>.001){ctx.globalCompositeOperation='source-atop';ctx.fillStyle=`rgba(7,12,33,${night*.60})`;ctx.fillRect(0,0,w,h);ctx.globalCompositeOperation='source-over';}
    ctx=screen;ctx.drawImage(scenery,0,0,w,h);
    if(night>.005)for(let i=0;i<12;i++)sprite('firefly',((i*137)%1000)/1000*w+Math.sin(elapsed*.5+i)*10,h*(.57+(i%5)*.067)+Math.cos(elapsed*.4+i)*5,6+(i%2)*2,night*(.24+.22*Math.sin(elapsed*1.4+i)));
    canvas.dataset.timeofday=day>.75?'day':day<.1?'night':'sunset';canvas.dataset.worldReady='true';canvas.dataset.barnPhase=cycle.phase.toFixed(2);canvas.dataset.hens='0';canvas.dataset.birds='0';canvas.dataset.bonusShower=String(shower);canvas.dataset.bees=day>.01&&!reduced?'5':'0';paintedTime=timeRef.current;
    canvas.dataset.barnX=bx.toFixed(1);canvas.dataset.barnY=by.toFixed(1);canvas.dataset.barnWidth=bw.toFixed(1);canvas.dataset.clearingX=clearingAnchor.x.toFixed(1);canvas.dataset.clearingY=clearingAnchor.y.toFixed(1);canvas.dataset.wheatWind=reduced?'reduced':'active';
    canvas.dataset.landscape='cartoon-harvest-v19';canvas.dataset.windZones='wheat-grass-only';canvas.dataset.trackWind='stationary';canvas.dataset.butterflies=day>.08&&!reduced?'2':'0';canvas.dataset.windmill='true';
    record(began);
   };frame=requestAnimationFrame(draw);
  }).catch(()=>{if(alive)canvas.dataset.worldError='true';});
  return()=>{alive=false;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);motion.removeEventListener('change',motionChanged);};
 },[anchorRef,layoutKey]);
 return <canvas ref={ref} className={'world-background '+className} aria-hidden="true"/>;
}
