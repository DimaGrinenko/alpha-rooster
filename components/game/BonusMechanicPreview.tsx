'use client';
import {useEffect,useRef} from 'react';
import type {BuyMode} from '@/lib/game/bonus-modes';
import {loadImage} from '@/lib/game/art';
import {BONUS_ART,BONUS_ATLAS} from '@/lib/game/bonus-art';
import {frameLoop} from '@/lib/game/frame-loop';
import {symbolRaster} from '@/lib/game/symbol-raster';
import {UI_FRAME_ATLAS} from './UiArt';

// These are labelled mechanic illustrations, never generated game outcomes.
// All four share one cached assembled Wild raster and the existing art atlases.
let previewResources:Promise<{wild:HTMLCanvasElement;rooster:HTMLCanvasElement;corn:HTMLCanvasElement;boombox:HTMLCanvasElement;letter:HTMLCanvasElement;particles:HTMLImageElement;frame:HTMLImageElement}>|null=null;
const resources=()=>previewResources??=Promise.all([symbolRaster('wild-symbol'),symbolRaster('rooster-symbol'),symbolRaster('corn-symbol'),symbolRaster('boombox-symbol'),symbolRaster('J-symbol'),loadImage(BONUS_ATLAS),loadImage(UI_FRAME_ATLAS)]).then(([wild,rooster,corn,boombox,letter,particles,frame])=>({wild,rooster,corn,boombox,letter,particles,frame})).catch(error=>{previewResources=null;throw error;});
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
const smooth=(value:number)=>{const p=clamp(value);return p*p*(3-2*p);};
export default function BonusMechanicPreview({mode}:{mode:BuyMode}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
  let disposed=false,last=performance.now(),elapsed=0,width=canvas.clientWidth,height=canvas.clientHeight,art:Awaited<ReturnType<typeof resources>>|null=null,dirty=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const loop=frameLoop(now=>{
   const delta=Math.max(0,(now-last)/1000);last=now;if(disposed||document.hidden)return false;
   if(!art||!width||!height)return false;
   if(!reduced.matches)elapsed+=Math.min(delta,.1);else if(!dirty)return false;
   const dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
   const columns=mode==='BONUS'?3:5,padding=3,cellWidth=(width-padding*2)/columns,cellHeight=(height-padding*2)/3;
   const {frame,wild,rooster,corn,boombox,letter,particles}=art;
   // Raster wood outside and felt inside every cell match the actual cabinet.
   ctx.drawImage(frame,42,46,1541,852,0,0,width,height);
   for(let c=0;c<columns;c++)for(let r=0;r<3;r++)ctx.drawImage(frame,210,205,1190,535,padding+c*cellWidth+1,padding+r*cellHeight+1,cellWidth-2,cellHeight-2);
   const stamp=(image:CanvasImageSource,column:number,row:number,scale=1,opacity=1,angle=0)=>{
    const ratio=302/330,h=Math.min(cellHeight*1.02,cellWidth/ratio),w=h*ratio;
    ctx.save();ctx.globalAlpha=opacity;ctx.translate(padding+(column+.5)*cellWidth,padding+(row+.5)*cellHeight);ctx.rotate(angle);ctx.scale(scale,scale);ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();
   };
   const glint=(column:number,row:number,alpha:number)=>{
    const rect=BONUS_ART.sparkles;ctx.globalAlpha=alpha;ctx.drawImage(particles,...rect,padding+column*cellWidth,padding+row*cellHeight,cellWidth,cellHeight);ctx.globalAlpha=1;
   };
   const cycle=reduced.matches?2:elapsed%6;
   if(mode==='BONUS'){
    // Locked Wild never leaves this cell through the repeating presentation.
    stamp(wild,1,1);glint(1,1,reduced.matches?.3:Math.max(0,Math.sin(elapsed*1.3))*.65);
    const corner=5;for(const [x,y] of [[1,1],[2,1],[1,2],[2,2]])ctx.drawImage(frame,42,46,95,95,padding+x*cellWidth-corner/2,padding+y*cellHeight-corner/2,corner,corner);
   }else if(mode==='CASCADE'){
    const dissolve=reduced.matches?0:smooth((cycle-1.6)/.5),drop=reduced.matches?0:smooth((cycle-2.2)/.8),fade=reduced.matches?1:Math.min(smooth(cycle/.4),1-smooth((cycle-5.4)/.6));
    const symbols=[corn,letter,boombox],top=[boombox,letter,corn,letter,boombox],bottom=[letter,boombox,letter,corn,letter];
    for(let c=0;c<5;c++){
     stamp(bottom[c],c,2,1,fade);stamp(top[c],c,c<3?drop:0,1,fade);
     if(c<3){if(dissolve<1)stamp(corn,c,1,1-dissolve*.15,(1-dissolve)*fade);if(drop>0)stamp(symbols[c],c,-1+drop,1,drop*fade);if(cycle>.6&&cycle<2)glint(c,1,Math.sin((cycle-.6)/1.4*Math.PI)*.55);}
     else stamp(symbols[c%3],c,1,1,fade);
    }
   }else if(mode==='COLLECT'){
    const positions=[0,4,6,8,10,14],rect=BONUS_ART.egg,reset=reduced.matches?1:Math.min(smooth(cycle/.35),1-smooth((cycle-5.4)/.6));
    stamp(rooster,2,1,1.08,reset);
    for(let order=0;order<positions.length;order++){
     const index=positions[order],fromX=index%5,fromY=Math.floor(index/5),p=reduced.matches?0:smooth((cycle-1.4-order*.1)/1.1),arc=Math.sin(Math.PI*p)*.65,x=fromX+(2-fromX)*p,y=fromY+(1-fromY)*p-arc;
     const h=Math.min(cellHeight*.88,cellWidth*315/268)*(.8-p*.55),w=h*268/315;
     ctx.globalAlpha=(1-p)*reset;ctx.drawImage(particles,...rect,padding+(x+.5)*cellWidth-w/2,padding+(y+.5)*cellHeight-h/2,w,h);ctx.globalAlpha=1;
     if(p>0&&p<1)glint(x,y,Math.sin(Math.PI*p)*.5*reset);
    }
    if(cycle>2&&cycle<4.8)glint(2,1,Math.sin((cycle-2)/2.8*Math.PI)*.65*reset);
   }else{
    const initial=[0,3,6,9,12,14],added=[2,7,10],rect=BONUS_ART.egg;
    for(const index of [...initial,...added]){
     const order=added.indexOf(index),progress=order<0?1:reduced.matches?1:clamp((cycle-1.2-order*.85)/.4),fade=order<0||reduced.matches?1:1-smooth((cycle-5.4)/.6);if(!progress||!fade)continue;
     const c=index%5,r=Math.floor(index/5),scale=.8+Math.sin(progress*Math.PI)*.2,h=Math.min(cellHeight*.9,cellWidth*.9*315/268)*scale,w=h*268/315;
     ctx.globalAlpha=progress*fade;ctx.drawImage(particles,...rect,padding+(c+.5)*cellWidth-w/2,padding+(r+.5)*cellHeight-h/2,w,h);ctx.globalAlpha=1;
     if(progress<1)glint(c,r,Math.sin(progress*Math.PI));
    }
   }
   dirty=false;return !reduced.matches;
  });
  const wake=()=>{last=performance.now();dirty=true;loop.wake();};
  const resize=new ResizeObserver(()=>{width=canvas.clientWidth;height=canvas.clientHeight;wake();});resize.observe(canvas);
  document.addEventListener('visibilitychange',wake);reduced.addEventListener('change',wake);
  void resources().then(value=>{if(!disposed){art=value;wake();}}).catch(()=>{});
  return()=>{disposed=true;loop.dispose();resize.disconnect();document.removeEventListener('visibilitychange',wake);reduced.removeEventListener('change',wake);};
 },[mode]);
 return <canvas ref={ref} className="bcv27-mechanic-preview" aria-hidden="true"/>;
}
