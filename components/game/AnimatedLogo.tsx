'use client';
import {useEffect,useRef} from 'react';
import {loadImage,POLISH_RECTS} from '@/lib/game/art';
import {animationClock} from '@/lib/game/animation-clock';
import {frameLoop} from '@/lib/game/frame-loop';
/** The existing raster crest, with restrained weight and travelling gold glints. */
export default function AnimatedLogo({paused=false,bonus=false}:{paused?:boolean;bonus?:boolean}){
 const ref=useRef<HTMLCanvasElement>(null),settings=useRef({paused,bonus}),wake=useRef(()=>{}),dirty=useRef(true);
 useEffect(()=>{settings.current={paused,bonus};dirty.current=true;wake.current();},[paused,bonus]);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;let alive=true,stop=()=>{},time=0;
  const clock=animationClock(30,performance.now()),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const changed=()=>{clock.reset(performance.now());dirty.current=true;wake.current();};
  const observer=new ResizeObserver(changed);observer.observe(canvas);document.addEventListener('visibilitychange',changed);motion.addEventListener('change',changed);
  void loadImage('./assets/polish-v3.webp').then(art=>{
   if(!alive)return;const ctx=canvas.getContext('2d');if(!ctx)return;
   const loop=frameLoop(now=>{
    if(document.hidden){clock.reset(now);return false;}const still=motion.matches||settings.current.paused;
    if(still&&!dirty.current){clock.reset(now);return false;}const dt=clock.tick(now,dirty.current);if(dt===null)return true;
    if(!still)time+=Math.min(dt,.1);const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return false;
    const dpr=Math.min(devicePixelRatio||1,2),pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const rect=POLISH_RECTS.logo,k=Math.min(w/rect[2],h/rect[3])*.982,dw=rect[2]*k,dh=rect[3]*k;
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(still?0:Math.sin(time*.72)*.006);ctx.drawImage(art,...rect,-dw/2,-dh/2,dw,dh);
    if(!still){ctx.globalCompositeOperation='screen';for(let i=0;i<3;i++){
     const phase=(time+i*2.1)%8,alpha=phase<.85?Math.sin(phase/.85*Math.PI)**3:0;if(!alpha)continue;
     const x=[-.35,.01,.36][i]*dw,y=[.07,-.4,.1][i]*dh,size=dw*(settings.current.bonus?.10:.065);
     ctx.globalAlpha=alpha*.82;ctx.drawImage(art,...POLISH_RECTS.star,x-size/2,y-size/2,size,size);
    }}ctx.restore();canvas.dataset.logoAnimation=still?'still':'gilded-sway';dirty.current=false;return !still;
   });stop=loop.dispose;wake.current=loop.wake;loop.wake();
  }).catch(()=>{if(alive)canvas.dataset.artError='true';});
  return()=>{alive=false;stop();wake.current=()=>{};observer.disconnect();document.removeEventListener('visibilitychange',changed);motion.removeEventListener('change',changed);};
 },[]);
 return <canvas ref={ref} className="raster logo-life" aria-hidden="true"/>;
}
