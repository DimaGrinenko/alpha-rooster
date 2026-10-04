'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {SYMBOLS,type Board} from '@/lib/game/math';
import {symbolResource} from '@/lib/game/spine-resources';
import {SYMBOL_VIEW,symbolViewport,reelBrake,brakePosition,drawMultiplier,reelFillerIndex} from '@/lib/game/reel-motion';
import {animationClock} from '@/lib/game/animation-clock';
import {frameLoop} from '@/lib/game/frame-loop';
import {createSymbolCanvasRenderer} from '@/lib/game/symbol-canvas-renderer';
let pictures:Promise<HTMLCanvasElement[]>|null=null;
function getPictures(){return pictures??(pictures=Promise.all(SYMBOLS.map(async id=>{
 const {spine,data}=await symbolResource(id+'-symbol'),canvas=document.createElement('canvas');
 canvas.width=SYMBOL_VIEW.width;canvas.height=SYMBOL_VIEW.height;
 const ctx=canvas.getContext('2d')!,skeleton=new spine.Skeleton(data),renderer=createSymbolCanvasRenderer(ctx),view=symbolViewport(canvas.width,canvas.height);
 skeleton.setToSetupPose();skeleton.updateWorldTransform(spine.Physics.update);ctx.translate(view.x,view.y);ctx.scale(view.scale,-view.scale);renderer.draw(skeleton);return canvas;
})).catch(error=>{pictures=null;throw error;}));}
type Props={spinning:boolean;stopRequested:boolean;paused:boolean;result:Board[number];index:number;speed:number;lockedRows?:number;hideResultWild?:boolean;onStop:(index:number)=>void};
export default function SpinningReel({spinning,stopRequested,paused,result,index,speed,lockedRows=0,hideResultWild=false,onStop}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null),settings=useRef({spinning,stopRequested,paused,result,speed,lockedRows,hideResultWild,onStop}),dirty=useRef(true),refresh=useRef<(()=>void)|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{if(failed&&spinning&&stopRequested&&!paused)onStop(index);},[failed,spinning,stopRequested,paused,index,onStop]);
 useLayoutEffect(()=>{settings.current={spinning,stopRequested,paused,result,speed,lockedRows,hideResultWild,onStop};dirty.current=true;refresh.current?.();},[spinning,stopRequested,paused,result,speed,lockedRows,hideResultWild,onStop]);
 useEffect(()=>{
  let alive=true,stop=()=>{},travel=0,velocity=0,brake:ReturnType<typeof reelBrake>|null=null,elapsed=0,completed=false,active=false,wasPaused=settings.current.paused,initial=settings.current.result;
  const clock=animationClock(60,performance.now());
  const canvas=canvasRef.current;if(!canvas)return;let width=canvas.clientWidth,height=canvas.clientHeight;
  const observer=new ResizeObserver(()=>{width=canvas.clientWidth;height=canvas.clientHeight;dirty.current=true;refresh.current?.();});observer.observe(canvas);
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>{dirty.current=true;refresh.current?.();},visibility=()=>{clock.reset(performance.now());if(!document.hidden)refresh.current?.();};
  motion.addEventListener('change',changed);document.addEventListener('visibilitychange',visibility);
  void getPictures().then(images=>{if(!alive)return;const ctx=canvas.getContext('2d');if(!ctx)throw Error('CANVAS');
   const draw=(now:number)=>{
    if(!alive)return false;const s=settings.current;if(wasPaused!==s.paused){wasPaused=s.paused;clock.reset(now);}
    if(!s.spinning){active=false;initial=s.result;clock.reset(now);return false;}
    if(!active){travel=0;velocity=0;brake=null;elapsed=0;completed=false;active=true;clock.reset(now);}
    if(document.hidden||s.paused){clock.reset(now);return false;}
    const dt=clock.tick(now,dirty.current);if(dt===null)return true;
    if(s.stopRequested&&!brake){brake=reelBrake(travel,velocity,s.speed);elapsed=0;canvas.dataset.motion='braking';}
    if(brake){elapsed+=dt;travel=brakePosition(brake,motion.matches?brake.duration:elapsed);}
    else if(!motion.matches){const target=9*s.speed;velocity+=(target-velocity)*(1-Math.exp(-dt*18));travel+=Math.min(dt,.1)*velocity;canvas.dataset.motion='rolling';}
    const dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    if(!width||!height)return true;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const cell=height/3,base=Math.floor(travel),offset=(travel-base)*cell,k=symbolViewport(width,cell).scale,dw=SYMBOL_VIEW.width*k,dh=SYMBOL_VIEW.height*k;
    ctx.save();ctx.beginPath();for(let row=0;row<3;row++)if(!(s.lockedRows&(1<<row)))ctx.rect(0,row*cell,width,cell);ctx.clip();
    for(let row=-1;row<4;row++){
     const slot=base-row,finalRow=brake?brake.to-slot:-1,cellResult=finalRow>=0&&finalRow<3?s.result[finalRow]:slot<=0&&slot>=-2?initial[-slot]:null;
     if(s.hideResultWild&&cellResult?.id==='wild')continue;
      const picture=images[cellResult?SYMBOLS.indexOf(cellResult.id):reelFillerIndex(slot,index,images.length,s.hideResultWild?SYMBOLS.indexOf('wild'):-1)];
     ctx.drawImage(picture,(width-dw)/2,row*cell+offset+(cell-dh)/2,dw,dh);
     if(cellResult?.mult)drawMultiplier(ctx,cellResult.mult,width,cell,row*cell+offset);
    }
    ctx.restore();dirty.current=false;
    if(brake&&(elapsed>=brake.duration||motion.matches)&&!completed){completed=true;canvas.dataset.motion='aligned';s.onStop(index);}
    return !completed;
   };const loop=frameLoop(draw);stop=loop.dispose;refresh.current=()=>{draw(performance.now());if(settings.current.spinning)loop.wake();};refresh.current();
  }).catch(()=>{if(alive)setFailed(true);});
  return()=>{alive=false;refresh.current=null;stop();observer.disconnect();motion.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);};
 },[index]);
 return <canvas ref={canvasRef} className={'spinning-reel '+(spinning?'is-spinning':'')} aria-hidden="true"/>;
}
