'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- The raster skeleton canvas has an accessible image label. */
import {memo,useEffect,useRef,useState} from 'react';
import {symbolResource} from '@/lib/game/spine-resources';
import {configureSymbolMix,hasSymbolEvent} from '@/lib/game/symbol-motion';
import {symbolViewport,drawMultiplier} from '@/lib/game/reel-motion';
import {renderStats} from '@/lib/game/render-stats';
import {animationClock} from '@/lib/game/animation-clock';
import {frameLoop} from '@/lib/game/frame-loop';
import {createSymbolCanvasRenderer} from '@/lib/game/symbol-canvas-renderer';
import SpineHero from './SpineHero';
type Props={name:string;animation?:string;className?:string;label:string;paused?:boolean;speed?:number;loopEvents?:boolean;restAnimation?:string;watchKey?:number;multiplier?:number;onAnimationComplete?:(name:string)=>void;onAnimationEvent?:(name:string)=>void};
type Control={select:()=>void;wake:()=>void};
export default memo(SpineArt);
function SpineArt(props:Props){return props.name==='rooster'?<SpineHero animation={props.animation} className={props.className} label={props.label} paused={props.paused} speed={props.speed} restAnimation={props.restAnimation} loopEvents={props.loopEvents} watchKey={props.watchKey} onAnimationComplete={props.onAnimationComplete} onAnimationEvent={props.onAnimationEvent}/>:<SpineSymbol {...props}/>;}
function SpineSymbol({name,animation='idle',className='',label,paused=false,speed=1,loopEvents=false,multiplier}:Props){
 const ref=useRef<HTMLCanvasElement>(null),control=useRef<Control|null>(null),dirty=useRef(true);
 const latest=useRef({animation,paused,speed,loopEvents,multiplier});
 const[error,setError]=useState(false);
 useEffect(()=>{latest.current={animation,paused,speed,loopEvents,multiplier};dirty.current=true;control.current?.wake();},[animation,paused,speed,loopEvents,multiplier]);
 useEffect(()=>{let alive=true,stop=()=>{};const clock=animationClock(60,performance.now());const canvas=ref.current;if(!canvas)return;
  setError(false);let width=canvas.clientWidth,height=canvas.clientHeight;
  const observer=new ResizeObserver(()=>{width=canvas.clientWidth;height=canvas.clientHeight;dirty.current=true;control.current?.wake();});observer.observe(canvas);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{control.current?.select();dirty.current=true;control.current?.wake();};motion.addEventListener('change',changed);
  const visibility=()=>{clock.reset(performance.now());if(!document.hidden)control.current?.wake();};document.addEventListener('visibilitychange',visibility);
  void symbolResource(name).then(({spine,data})=>{
   if(!alive)return;const ctx=canvas.getContext('2d');if(!ctx)throw Error('CANVAS');
   const skeleton=new spine.Skeleton(data),sd=new spine.AnimationStateData(data);configureSymbolMix(sd);
   const state=new spine.AnimationState(sd),renderer=createSymbolCanvasRenderer(ctx),record=renderStats(canvas);
   const select=()=>{
    const requested=latest.current.animation,chosen=data.findAnimation(requested)?requested:'idle',event=chosen==='win'||chosen==='drop'||chosen==='settle';
    clock.reset(performance.now());dirty.current=true;
    if(requested==='static'){state.clearTracks();skeleton.setToSetupPose();return;}
    if(motion.matches){state.clearTracks();skeleton.setToSetupPose();return;}
    state.timeScale=event?latest.current.speed:1;
    state.setAnimation(0,chosen,!event||latest.current.loopEvents);
    // Let the entire event finish before its short idle blend.
    if(event&&!latest.current.loopEvents)state.addAnimation(0,'idle',true,data.findAnimation(chosen)!.duration);
    state.apply(skeleton);
   };
   const draw=(now:number)=>{
    if(!alive)return false;
    if(document.hidden||latest.current.paused&&!dirty.current){clock.reset(now);return false;}
    const still=latest.current.animation==='static'||motion.matches||latest.current.paused;
    const event=hasSymbolEvent(state.getCurrent(0));
    if(still&&!dirty.current){clock.reset(now);return false;}
    const elapsed=clock.tick(now,dirty.current,event?60:30);if(elapsed===null)return true;
    const began=performance.now(),w=width,h=height,dpr=Math.min(devicePixelRatio||1,1.25);if(!w||!h){clock.reset(now);return false;}
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.scale(dpr,dpr);
    const view=symbolViewport(w,h);ctx.save();ctx.translate(view.x,view.y);ctx.scale(view.scale,-view.scale);
    // Event timing follows foreground time; capping it would truncate landings on slow frames.
    if(!still){state.timeScale=event?latest.current.speed:1;state.update(elapsed);state.apply(skeleton);}
    skeleton.updateWorldTransform(spine.Physics.update);renderer.draw(skeleton);ctx.restore();
    if(latest.current.multiplier)drawMultiplier(ctx,latest.current.multiplier,w,h);
    canvas.dataset.animation=state.getCurrent(0)?.animation?.name||'static';canvas.dataset.paused=String(latest.current.paused);canvas.dataset.renderMode='spine-canvas';
    dirty.current=false;record(began);return !still;
   };const loop=frameLoop(draw);stop=loop.dispose;control.current={select:()=>{select();loop.wake();},wake:()=>{clock.reset(performance.now());loop.wake();}};control.current.select();
  }).catch(()=>{if(alive)setError(true);});
  return()=>{alive=false;stop();observer.disconnect();motion.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);control.current=null;};
 },[name]);
 useEffect(()=>{control.current?.select();},[animation,loopEvents]);
 return <canvas ref={ref} role="img" aria-label={label} className={'spine-art '+className} data-render-error={error||undefined}/>;
}
