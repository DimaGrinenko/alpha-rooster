'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {loadImage,type Rect} from '@/lib/game/art';
import {WORLD_ASSETS} from '@/lib/game/world-assets';
import {renderStats} from '@/lib/game/render-stats';
import {animationClock} from '@/lib/game/animation-clock';
import {frameLoop} from '@/lib/game/frame-loop';
import {heroGround} from '@/lib/game/hero-layout';
import {BARN_LIFE_PARTS} from '@/lib/game/barn-life';
import {barnCover} from '@/lib/game/barn-atmosphere';
import {createBarnHens} from '@/lib/game/barn-hens';
import {createBarnFlies} from '@/lib/game/barn-flies';
import {BARN_WIDE,BARN_TALL,BARN_COMPACT} from '@/lib/game/barn-room';
import {drawCollapseBackplate,drawCollapsingRoom,drawCollapseBurst,advanceBarnCollapse,collapseOutside,collapseStage,collapseDust,BARN_DUST_SECONDS} from '@/lib/game/barn-collapse';
import {BARN_DEBRIS} from '@/lib/game/barn-debris';
export type WorldTime='auto'|'day'|'sunset'|'night';
const PARTS:Record<string,{rect:Rect;pivot:[number,number]}>= {
 lantern:{rect:[40,20,385,610],pivot:[195,41]},glow:{rect:[790,120,464,515],pivot:[221,251]},
 shaft:{rect:[0,635,500,619],pivot:[80,58]},mote:{rect:[540,830,180,190],pivot:[87,88]},straw:{rect:[830,640,424,600],pivot:[200,570]}
};
export default function BarnWorld({time='auto',className='',paused=false,bonus=false,prelude=false,impactKey=0,onTransitionComplete,anchorRef,layoutKey=''}:{time?:WorldTime;className?:string;paused?:boolean;bonus?:boolean;prelude?:boolean;impactKey?:number;onTransitionComplete?:()=>void;anchorRef?:RefObject<HTMLElement|null>;layoutKey?:string}){
 const ref=useRef<HTMLCanvasElement>(null),burstRef=useRef<HTMLCanvasElement>(null),settings=useRef({time,paused,bonus,prelude,impactKey,onTransitionComplete}),wake=useRef<()=>void>(()=>{}),dirty=useRef(true),worldFailed=useRef(false);
 useEffect(()=>{settings.current={time,paused,bonus,prelude,impactKey,onTransitionComplete};dirty.current=true;if(worldFailed.current&&prelude)onTransitionComplete?.();wake.current();},[time,paused,bonus,prelude,impactKey,onTransitionComplete]);
 useEffect(()=>{
  const canvas=ref.current,anchorHost=anchorRef?.current;if(!canvas)return;let alive=true,stop=()=>{},disposeBirds=()=>{},elapsed=0,light=1;
  const clock=animationClock(30,performance.now()),stats=renderStats(canvas),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let anchor={x:0,y:0,width:0},groundShift=0,lastSize='',roomPose=-1,collapse=-1,lastImpact=settings.current.impactKey,transitionReported=false,backplateReady=false;
  const changed=()=>{dirty.current=true;wake.current();};
  const measure=()=>{
   const c=canvas.getBoundingClientRect(),host=anchorHost,hero=host?.querySelector('canvas');
   if(hero&&host&&c.width&&c.height){
    const r=hero.getBoundingClientRect();anchor=heroGround({x:r.x-c.x,y:r.y-c.y,width:r.width,height:r.height});
    // Measure the unshifted stage before applying the new floor correction, so
    // repeated resizes cannot accumulate offsets. Portrait instead moves its camera.
    anchor.y-=groundShift;
    const cover=barnCover(c.width,c.height,1672,941);
    groundShift=c.width>c.height?cover.y+BARN_WIDE.floorY*cover.scale-anchor.y:0;
    anchor.y+=groundShift;host.style.setProperty('--barn-ground-shift',groundShift+'px');
   }
   lastSize='';changed();
  };
  const observer=new ResizeObserver(measure);observer.observe(canvas);if(anchorHost)observer.observe(anchorHost);
  const visible=()=>{clock.reset(performance.now());if(!document.hidden)changed();};
  document.addEventListener('visibilitychange',visible);motion.addEventListener('change',changed);window.addEventListener('resize',measure);
  void Promise.all(WORLD_ASSETS.map(src=>loadImage(src))).then(async([wide,tall,atlas,lifeAtlas,flyAtlas,compact,bonusWide,bonusTall,debrisAtlas,contactShadow])=>{
   if(!alive)return;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('CANVAS');
   const room=document.createElement('canvas'),roomCtx=room.getContext('2d')!,backplate=document.createElement('canvas'),backplateCtx=backplate.getContext('2d')!,burst=burstRef.current,burstCtx=burst?.getContext('2d');
   const [wideHens,tallHens,compactHens]=await Promise.all([createBarnHens(wide,BARN_WIDE.regions),createBarnHens(tall,BARN_TALL.regions),createBarnHens(compact,BARN_COMPACT.regions)]),flies=createBarnFlies(flyAtlas);
   disposeBirds=()=>{wideHens.dispose();tallHens.dispose();compactHens.dispose();};if(!alive){disposeBirds();return;}
   const cuts=Object.fromEntries(Object.entries(PARTS).map(([key,p])=>{const cut=document.createElement('canvas');cut.width=p.rect[2];cut.height=p.rect[3];cut.getContext('2d')!.drawImage(atlas,...p.rect,0,0,cut.width,cut.height);return [key,cut];}));
   const sprite=(key:string,x:number,y:number,width:number,alpha=1,angle=0)=>{const cut=cuts[key],p=PARTS[key],s=width/cut.width;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(cut,-p.pivot[0]*s,-p.pivot[1]*s,width,cut.height*s);ctx.restore();};
   const lifeCuts=Object.fromEntries(['strawLeft','strawRight'].map(key=>{const p=BARN_LIFE_PARTS[key as keyof typeof BARN_LIFE_PARTS],cut=document.createElement('canvas');cut.width=p.rect[2];cut.height=p.rect[3];cut.getContext('2d')!.drawImage(lifeAtlas,p.rect[0],p.rect[1],p.rect[2],p.rect[3],0,0,cut.width,cut.height);return [key,cut];}));
   const part=(key:keyof typeof BARN_LIFE_PARTS,x:number,y:number,width:number,angle=0)=>{const cut=lifeCuts[key],p=BARN_LIFE_PARTS[key],s=width/cut.width;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(cut,-p.pivot[0]*s,-p.pivot[1]*s,width,cut.height*s);ctx.restore();};
   delete canvas.dataset.worldError;worldFailed.current=false;
   measure();
   const draw=(now:number)=>{
    if(!alive||document.hidden){clock.reset(now);return false;}const current=settings.current,still=motion.matches||current.paused;
    if(still&&!dirty.current){clock.reset(now);return false;}const dt=clock.tick(now,dirty.current);if(dt===null)return true;
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return false;const start=performance.now(),portrait=h>=w,dpr=Math.min(devicePixelRatio||1,1.5),key=w+':'+h+':'+dpr;
    if(!still)elapsed+=Math.min(dt,.1);
    if(!current.bonus){collapse=-1;transitionReported=false;}else if(current.impactKey!==lastImpact)collapse=0;else if(collapse<0&&(!current.prelude||motion.matches))collapse=BARN_DUST_SECONDS;
    lastImpact=current.impactKey;if(collapse>=0){if(motion.matches)collapse=BARN_DUST_SECONDS;else if(!still)collapse=advanceBarnCollapse(collapse,dt);}
    if(current.prelude&&collapse>=BARN_DUST_SECONDS&&!transitionReported){transitionReported=true;current.onTransitionComplete?.();}
    const outside=collapseOutside(collapse);if(collapse<0)backplateReady=false;
    const shortPortrait=portrait&&h<740,art=portrait?(shortPortrait?compact:tall):wide,layout=portrait?(shortPortrait?BARN_COMPACT:BARN_TALL):BARN_WIDE;
    const cover=barnCover(w,h,art.width,art.height,anchor.width>0?{sourceY:layout.floorY,screenY:anchor.y}:undefined),poseFrame=Math.floor(elapsed*15);
    if(key!==lastSize){canvas.width=room.width=backplate.width=Math.round(w*dpr);canvas.height=room.height=backplate.height=Math.round(h*dpr);backplateReady=false;if(burst){burst.width=canvas.width;burst.height=canvas.height;}lastSize=key;roomPose=-1;}
    // Staggered head gestures and breathing are cached at 15 Hz; airborne/light layers
    // remain 30 Hz and the hero uses its own independent animation clock.
    if((collapse<0||roomPose<0)&&!outside&&poseFrame!==roomPose){roomCtx.setTransform(dpr,0,0,dpr,0,0);roomCtx.drawImage(art,cover.x,cover.y,art.width*cover.scale,art.height*cover.scale);roomCtx.save();roomCtx.translate(cover.x,cover.y);roomCtx.scale(cover.scale,cover.scale);(portrait?(shortPortrait?compactHens:tallHens):wideHens)(roomCtx,elapsed,dpr*cover.scale);roomCtx.restore();roomPose=poseFrame;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    if(outside){
     // This is the only place the exterior is drawn. The switch at 1.70 s is
     // inside the measured fully opaque dust hold (1.35–2.10 s).
     const outdoor=portrait?bonusTall:bonusWide,fit=barnCover(w,h,outdoor.width,outdoor.height,portrait&&anchor.width>0?{sourceY:551,screenY:anchor.y}:undefined);ctx.drawImage(outdoor,fit.x,fit.y,outdoor.width*fit.scale,outdoor.height*fit.scale);
    }else if(collapse>=0){
     if(!backplateReady){backplateCtx.setTransform(dpr,0,0,dpr,0,0);drawCollapseBackplate(backplateCtx,room,w,h);backplateReady=true;}
     drawCollapsingRoom(ctx,room,backplate,w,h,collapse,{x:cover.x,y:cover.y,width:art.width*cover.scale,height:art.height*cover.scale,portrait});
    }else ctx.drawImage(room,0,0,w,h);
    if(burstCtx&&burst){burstCtx.setTransform(dpr,0,0,dpr,0,0);burstCtx.clearRect(0,0,w,h);if(!motion.matches)drawCollapseBurst(burstCtx,debrisAtlas,w,h,collapse,portrait);}
    const target=current.time==='night'?.64:current.time==='sunset'?.82:current.time==='day'?1:.9+.07*Math.sin(elapsed/36);
    light=still?target:light+(target-light)*(1-Math.exp(-Math.min(dt,.1)*1.5));ctx.fillStyle=`rgba(18,12,25,${1-light})`;ctx.fillRect(0,0,w,h);
    // Light originates at the actual window and wall lamps in the raster room.
    ctx.globalCompositeOperation='screen';sprite('shaft',outside?w*.72:cover.x+layout.window[0]*cover.scale,outside?h*.06:cover.y+layout.window[1]*cover.scale,w*(portrait?.39:.26),.06+.025*Math.sin(elapsed*.37),Math.sin(elapsed*.18)*.012);
    if(outside){sprite('shaft',w*.41,h*.01,w*(portrait?.60:.38),.09+.035*Math.sin(elapsed*.31+1),-.18+Math.sin(elapsed*.17)*.045);sprite('shaft',w*.87,h*.10,w*.30,.055+.020*Math.sin(elapsed*.47),.20+Math.sin(elapsed*.13)*.035);}
    for(let i=0;i<(portrait?24:38);i++){const phase=(elapsed*(.009+(i%4)*.002)+i*.137)%1,x=w*(.10+((i*.173)%.80))+Math.sin(elapsed*.3+i)*w*.007,y=h*(.08+phase*.68);sprite('mote',x,y,(portrait?5:7)+(i%3)*2,(.14+.16*Math.sin(phase*Math.PI))*(current.bonus?1.35:1));}
    if(!outside)for(const [i,lamp] of layout.lamps.entries())sprite('glow',cover.x+lamp[0]*cover.scale,cover.y+lamp[1]*cover.scale,lamp[2]*cover.scale,.095+.022*Math.sin(elapsed*3.1+i)+.012*Math.sin(elapsed*7.7+i*2));
    sprite('glow',w*.50,h*.88,w*.67,.018+.009*Math.sin(elapsed*.43));
    ctx.globalCompositeOperation='source-over';
    for(let i=0;i<(outside?(portrait?10:16):(portrait?3:5));i++){const phase=(elapsed*(outside?.045:.023)+i*.147)%1;ctx.globalAlpha=(outside?.42:.18)*Math.sin(phase*Math.PI);part(i%2?'strawLeft':'strawRight',w*(.1+phase*.85),h*(.16+(i*.193)% .57)+Math.sin(phase*Math.PI*2+i)*h*(outside?.05:.018),portrait?5:8,phase*(outside?7:2.6)+i);ctx.globalAlpha=1;}
    if(outside)for(let i=0;i<4;i++){const phase=(elapsed*.024+i*.251)%1,rect=i%2?BARN_DEBRIS.dustSmall:BARN_DEBRIS.dustLarge,size=w*(portrait?.56:.31);ctx.globalAlpha=.045*Math.sin(phase*Math.PI);ctx.drawImage(debrisAtlas,...rect,w*(-.2+phase*1.25),h*(.65+(i%2)*.12)-Math.sin(phase*Math.PI)*h*.035,size,size*rect[3]/rect[2]);}ctx.globalAlpha=1;
    flies(ctx,w,h,elapsed,portrait);
    if(anchor.width>0){
     const sw=anchor.width*.54,sh=sw*368/2076;
     ctx.save();ctx.globalAlpha=.86;
     for(const side of [-1,1])ctx.drawImage(contactShadow,32,220,2076,368,anchor.x+side*anchor.width*.258-sw*1054/2076,anchor.y-sh*240/368,sw,sh);
     ctx.restore();
    }
    sprite('straw',w*.966,h*(portrait?.91:.94),Math.min(w*(portrait?.09:.045),h*.11),.92,motion.matches?-.16:-.16+Math.sin(elapsed*.9)*.008);
    if(current.bonus){ctx.globalCompositeOperation='screen';sprite('glow',w*.5,h*.37,w*.8,.09+.015*Math.sin(elapsed*1.7));ctx.globalCompositeOperation='source-over';}
    Object.assign(canvas.dataset,{worldReady:'true',landscape:'barn-breakout-v26',environment:outside?'ruins':'barn',collapse:collapse.toFixed(2),collapseStage:collapseStage(collapse),dustOpacity:collapseDust(collapse).toFixed(3),camera:portrait?(shortPortrait?'compact':'portrait'):'wide',architecture:collapse>=0&&!outside?'fracturing':'stationary',birds:'0',hens:String(layout.animals.hens),ducks:String(layout.animals.ducks),pigs:String(layout.animals.pigs),cows:String(layout.animals.cows),nesting:'built-in-sidewall',flies:portrait?'2':'4',lanterns:String(layout.lamps.length),mice:'0',millWheel:'0',hangingSacks:'0',dust:still?'still':'active',timeofday:current.time,clearingX:anchor.x.toFixed(1),clearingY:anchor.y.toFixed(1),floorY:(cover.y+layout.floorY*cover.scale).toFixed(1)});dirty.current=false;stats(start);return !still;
   };
   const loop=frameLoop(draw);stop=loop.dispose;wake.current=()=>{clock.reset(performance.now());loop.wake();};loop.wake();
  }).catch(()=>{if(alive){canvas.dataset.worldError='true';worldFailed.current=true;if(settings.current.prelude)settings.current.onTransitionComplete?.();}});
  return()=>{alive=false;stop();disposeBirds();wake.current=()=>{};observer.disconnect();anchorHost?.style.removeProperty('--barn-ground-shift');document.removeEventListener('visibilitychange',visible);motion.removeEventListener('change',changed);window.removeEventListener('resize',measure);};
 },[anchorRef,layoutKey]);
 return <><canvas ref={ref} className={'world-background '+className} aria-hidden="true"/><canvas ref={burstRef} className="barn-burst" aria-hidden="true"/></>;
}
