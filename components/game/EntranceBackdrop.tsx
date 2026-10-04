'use client';
import {useEffect,useRef} from 'react';
import {loadImage} from '@/lib/game/art';
import {frameLoop} from '@/lib/game/frame-loop';
import {animationClock} from '@/lib/game/animation-clock';
export const ENTRANCE_ART='./assets/barn-entrance-v24.webp';
export default function EntranceBackdrop({dim=.28}:{dim?:number}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;let alive=true,stop=()=>{},wake=()=>{},dirty=true,time=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),clock=animationClock(30,performance.now());
  const changed=()=>{dirty=true;clock.reset(performance.now());wake();};const observer=new ResizeObserver(changed);observer.observe(canvas);motion.addEventListener('change',changed);document.addEventListener('visibilitychange',changed);
  void Promise.all([loadImage(ENTRANCE_ART),loadImage('./assets/barn-props-v20.webp')]).then(([art,fx])=>{
   if(!alive)return;const ctx=canvas.getContext('2d');if(!ctx)return;
   const loop=frameLoop(now=>{
    if(document.hidden||motion.matches&&!dirty){clock.reset(now);return false;}const dt=clock.tick(now,dirty);if(dt===null)return true;
    if(!motion.matches)time+=Math.min(dt,.1);const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return false;const dpr=Math.min(devicePixelRatio||1,1.5),pw=Math.round(w*dpr),ph=Math.round(h*dpr);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';const k=Math.max(w/art.width,h/art.height),x=(w-art.width*k)/2,y=(h-art.height*k)/2;ctx.drawImage(art,x,y,art.width*k,art.height*k);ctx.fillStyle='rgba(15,9,4,'+dim+')';ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='screen';ctx.globalAlpha=.12+.025*Math.sin(time*.8);ctx.save();ctx.translate(w*.5,h*.14);ctx.rotate(Math.sin(time*.22)*.028);ctx.drawImage(fx,0,635,500,619,-w*.14,0,w*.54,h*.75);ctx.restore();
    for(let i=0;i<30;i++){const p=(time*(.008+(i%4)*.002)+i*.137)%1,px=w*(.1+(i*.173)%.8)+Math.sin(time*.3+i)*w*.01,py=h*(.05+p*.9),s=4+(i%4)*2;ctx.globalAlpha=(.15+.20*Math.sin(p*Math.PI));ctx.drawImage(fx,540,830,180,190,px,py,s,s);}
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';dirty=false;return !motion.matches;
   });stop=loop.dispose;wake=loop.wake;loop.wake();
  }).catch(()=>{if(alive)canvas.dataset.artError='true';});
  return()=>{alive=false;stop();observer.disconnect();motion.removeEventListener('change',changed);document.removeEventListener('visibilitychange',changed);};
 },[dim]);
 return <canvas ref={ref} className="entrance-backdrop" aria-hidden="true"/>;
}
