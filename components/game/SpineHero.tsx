'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- The rendered raster skeleton has an accessible image label. */
import {useEffect,useRef,useState} from 'react';
import {installTriangleSeamGuard} from '@/lib/game/canvas-seam-guard';
import {HERO_STAGE} from '@/lib/game/hero-layout';
import {loadImage} from '@/lib/game/art';
import {renderStats} from '@/lib/game/render-stats';
import {animationClock} from '@/lib/game/animation-clock';
import {frameLoop} from '@/lib/game/frame-loop';
import {rememberHeroRestPhase,resumeHeroRestPhase} from '@/lib/game/hero-rest-phase';
type Props={animation?:string;className?:string;label:string;paused?:boolean;speed?:number;restAnimation?:string;loopEvents?:boolean;watchKey?:number;onAnimationComplete?:(name:string)=>void;onAnimationEvent?:(name:string)=>void};
const createResources=()=>Promise.all([import('@esotericsoftware/spine-webgl'),fetch('./spine/rooster-v2.json?revision=36').then(r=>{if(!r.ok)throw Error('ASSET');return r.json();}),fetch('./spine/rooster-v2.atlas?revision=36').then(r=>{if(!r.ok)throw Error('ASSET');return r.text();})]);
let resourcePromise:ReturnType<typeof createResources>|null=null;
const getResources=()=>resourcePromise??(resourcePromise=createResources());
export function preloadHero(){return getResources().then(async([spine,,text])=>{const atlas=new spine.TextureAtlas(text);await Promise.all(atlas.pages.map(page=>loadImage('./assets/'+page.name)));});}
export default function SpineHero({animation='idle',className='',label,paused=false,speed=1,restAnimation='idle',loopEvents=false,watchKey=0,onAnimationComplete,onAnimationEvent}:Props){
 const ref=useRef<HTMLCanvasElement>(null),latest=useRef({animation,paused,speed,restAnimation,loopEvents,watchKey,onAnimationComplete,onAnimationEvent}),dirty=useRef(true),control=useRef<{select:()=>void;wake:()=>void;watch:()=>void}|null>(null);
 const[fallback,setFallback]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{latest.current={animation,paused,speed,restAnimation,loopEvents,watchKey,onAnimationComplete,onAnimationEvent};dirty.current=true;control.current?.wake();},[animation,paused,speed,restAnimation,loopEvents,watchKey,onAnimationComplete,onAnimationEvent]);
 useEffect(()=>{control.current?.select();},[animation,loopEvents,restAnimation]);
 useEffect(()=>{if(watchKey>0)control.current?.watch();},[watchKey]);
 useEffect(()=>{if(failed)onAnimationComplete?.(animation);},[failed,animation,onAnimationComplete]);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;let alive=true,stop=()=>{},dispose=()=>{},width=canvas.clientWidth,height=canvas.clientHeight;
  const observer=new ResizeObserver(()=>{width=canvas.clientWidth;height=canvas.clientHeight;dirty.current=true;control.current?.wake();});observer.observe(canvas);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>{control.current?.select();dirty.current=true;};motion.addEventListener('change',changed);
  void getResources().then(async([spine,json,text])=>{
   const atlas=new spine.TextureAtlas(text),images=await Promise.all(atlas.pages.map(page=>loadImage('./assets/'+page.name)));if(!alive)return;
   let gpu:import('@esotericsoftware/spine-webgl').SceneRenderer|null=null,cpu:import('@esotericsoftware/spine-canvas').SkeletonRenderer|null=null,gl:WebGLRenderingContext|WebGL2RenderingContext|null=null,ctx:CanvasRenderingContext2D|null=null;
   if(fallback){const {CanvasTexture,SkeletonRenderer}=await import('@esotericsoftware/spine-canvas');if(!alive)return;ctx=canvas.getContext('2d');if(!ctx)throw Error('CANVAS');atlas.pages.forEach((page,i)=>page.setTexture(new CanvasTexture(images[i])));cpu=new SkeletonRenderer(ctx);installTriangleSeamGuard(cpu,ctx);cpu.triangleRendering=true;Object.defineProperty(cpu,'vertices',{value:new Float32Array(50000)});}
   else{
    const context=new spine.ManagedWebGLRenderingContext(canvas,{alpha:true,premultipliedAlpha:true,antialias:true});gl=context.gl;gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
    const textures:import('@esotericsoftware/spine-webgl').GLTexture[]=[];dispose=()=>{textures.forEach(t=>t.dispose());context.dispose();};
    atlas.pages.forEach((page,i)=>{const texture=new spine.GLTexture(context,images[i]);textures.push(texture);page.setTexture(texture);});
    gpu=new spine.SceneRenderer(canvas,context,false);const renderer=gpu;dispose=()=>{renderer.dispose();textures.forEach(t=>t.dispose());context.dispose();};
   }
   const data=new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(json),skeleton=new spine.Skeleton(data),sd=new spine.AnimationStateData(data);sd.defaultMix=.38;for(const from of ['idle','rage-idle'])for(const to of ['win','rage-small-win'])sd.setMix(from,to,.28);sd.setMix('win','idle',.28);sd.setMix('rage-small-win','rage-idle',.28);sd.setMix('idle','bonus-rage',.32);sd.setMix('bonus-rage','rage-idle',.08);sd.setMix('rage-win','rage-idle',.28);sd.setMix('rage-idle','idle',0);
   const state=new spine.AnimationState(sd),restPhases=new Map<string,number>(),record=renderStats(canvas),clock=animationClock(fallback?24:60,performance.now());let lastWatchKey=0;
   const visibility=()=>{clock.reset(performance.now());if(!document.hidden)control.current?.wake();};document.addEventListener('visibilitychange',visibility);const release=dispose;dispose=()=>{document.removeEventListener('visibilitychange',visibility);release();};
   const select=()=>{
    clock.reset(performance.now());dirty.current=true;const request=latest.current.animation,chosen=data.findAnimation(request)?request:'idle',event=['win','celebrate','crow','drop','surprise','bonus-rage','rage-win','rage-small-win'].includes(chosen);
    rememberHeroRestPhase(state.getCurrent(0),restPhases);
    if(request==='static'){state.clearTracks();skeleton.setToSetupPose();return;}
    // A completed one-shot has already queued idle. Do not restart its breathing
    // whenever React moves the round back to the ready state.
    if(!event&&state.getCurrent(0)?.animation?.name===chosen&&!motion.matches)return;
    if(event&&state.getCurrent(1))state.setEmptyAnimation(1,.12);
    const entry=state.setAnimation(0,chosen,!event||latest.current.loopEvents);if(!event)resumeHeroRestPhase(entry,restPhases);if(['win','celebrate','crow','rage-win','rage-small-win'].includes(chosen))entry.timeScale=latest.current.speed;
    if(event&&!latest.current.loopEvents)entry.listener={complete:()=>latest.current.onAnimationComplete?.(chosen),event:(_,event)=>latest.current.onAnimationEvent?.(event.data.name)};
    const rest=chosen==='bonus-rage'||chosen==='rage-win'||chosen==='rage-small-win'?'rage-idle':latest.current.restAnimation;
    if(event&&!latest.current.loopEvents)resumeHeroRestPhase(state.addAnimation(0,rest,true,data.findAnimation(chosen)!.duration),restPhases);
    if(motion.matches){state.clearTracks();skeleton.setToSetupPose();state.setAnimation(0,rest,true);state.apply(skeleton);if(event)latest.current.onAnimationComplete?.(chosen);}
    state.apply(skeleton);
   };
   const watch=()=>{
    const key=latest.current.watchKey,action=data.findAnimation('watch');if(!key||key===lastWatchKey||!action)return;lastWatchKey=key;
    if(motion.matches||latest.current.paused)return;
    const entry=state.setAnimation(1,'watch',false);entry.mixBlend=spine.MixBlend.add;entry.mixDuration=.12;
    state.addEmptyAnimation(1,.16,action.duration);dirty.current=true;
   };
   const draw=(now:number)=>{
    if(!alive)return false;if(document.hidden||latest.current.paused&&!dirty.current){clock.reset(now);return false;}
    const still=latest.current.animation==='static'||motion.matches||latest.current.paused;
    if(still&&!dirty.current){clock.reset(now);return false;}
    const dt=clock.tick(now,dirty.current);if(dt===null)return true;
    // Hidden-by-layout hosts still finish their event. Otherwise a short
    // portrait viewport can deadlock a round that awaits hero completion.
    if(!still){state.update(dt);state.apply(skeleton);}skeleton.updateWorldTransform(spine.Physics.update);
    const w=width,h=height;if(!w||!h){clock.reset(now);return !still;}const began=performance.now();
    const dpr=Math.min(devicePixelRatio||1,fallback?1:1.5),pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    const fit=Math.min(w/HERO_STAGE.width,h/HERO_STAGE.height);
    if(gpu&&gl){gpu.camera.position.set(HERO_STAGE.cameraX,HERO_STAGE.cameraY,0);gpu.camera.setViewport(w/fit,h/fit);gl.viewport(0,0,pw,ph);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gpu.begin();gpu.drawSkeleton(skeleton,true);gpu.end();}
    else if(cpu&&ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,pw,ph);ctx.translate(pw/2-HERO_STAGE.cameraX*fit*dpr,(h/2+HERO_STAGE.cameraY*fit)*dpr);ctx.scale(fit*dpr,-fit*dpr);cpu.draw(skeleton);}
    canvas.dataset.renderMode=fallback?'spine-canvas-fallback':'spine-webgl';canvas.dataset.animation=state.getCurrent(0)?.animation?.name||'static';canvas.dataset.gesture=state.getCurrent(1)?.animation?.name||'';canvas.dataset.paused=String(latest.current.paused);dirty.current=false;record(began);return !still;
   };const loop=frameLoop(draw);stop=loop.dispose;control.current={select:()=>{select();loop.wake();},wake:()=>{clock.reset(performance.now());loop.wake();},watch:()=>{watch();loop.wake();}};control.current.select();control.current.watch();
  }).catch(()=>{dispose();dispose=()=>{};if(alive){if(fallback)setFailed(true);else setFallback(true);}});
  return()=>{alive=false;stop();observer.disconnect();motion.removeEventListener('change',changed);control.current=null;dispose();};
 },[fallback]);
 return <canvas key={fallback?'cpu':'gpu'} ref={ref} className={'spine-art '+className} role="img" aria-label={label} data-render-error={failed||undefined}/>;
}


