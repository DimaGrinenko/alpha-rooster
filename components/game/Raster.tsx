'use client';
import {useEffect,useRef} from 'react';
import {loadImage,type Rect} from '@/lib/game/art';
export default function Raster({src,rect,className='',label,stretch=false,nineSlice,horizontalSlice,verticalSlice}:{src:string;rect:Rect;className?:string;label?:string;stretch?:boolean;horizontalSlice?:number;verticalSlice?:[number,number];nineSlice?:{source:Rect;border:Rect;reference:[number,number];center?:boolean;edge?:number}}){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{let alive=true;const el=ref.current;if(!el)return;let im:HTMLImageElement|null=null;const draw=()=>{if(!im||!alive)return;const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;const d=Math.min(devicePixelRatio||1,2);el.width=Math.round(w*d);el.height=Math.round(h*d);const ctx=el.getContext('2d');if(!ctx)return;ctx.scale(d,d);
 if(verticalSlice){const [top,bottom]=verticalSlice,s=Math.min(w/rect[2],h/(top+bottom)),a=top*s,b=bottom*s;ctx.drawImage(im,rect[0],rect[1],rect[2],top,0,0,w,a);ctx.drawImage(im,rect[0],rect[1]+top,rect[2],rect[3]-top-bottom,0,a,w,h-a-b);ctx.drawImage(im,rect[0],rect[1]+rect[3]-bottom,rect[2],bottom,0,h-b,w,b);return;}
 if(horizontalSlice){const cap=Math.min(w/2,h*horizontalSlice/rect[3]);ctx.drawImage(im,rect[0],rect[1],horizontalSlice,rect[3],0,0,cap,h);ctx.drawImage(im,rect[0]+horizontalSlice,rect[1],rect[2]-2*horizontalSlice,rect[3],cap,0,w-2*cap,h);ctx.drawImage(im,rect[0]+rect[2]-horizontalSlice,rect[1],horizontalSlice,rect[3],w-cap,0,cap,h);return;}
 if(nineSlice){const [l,t,r,b]=nineSlice.source,s=Math.min(w/nineSlice.reference[0],h/nineSlice.reference[1]);const [dl,dt,dr,db]=nineSlice.border.map(v=>v*s);const xs=[0,l,rect[2]-r,rect[2]],ys=[0,t,rect[3]-b,rect[3]],dx=[0,dl,w-dr,w],dy=[0,dt,h-db,h];for(let y=0;y<3;y++)for(let x=0;x<3;x++){
  if(nineSlice.center===false&&x===1&&y===1)continue;
  const part:Rect=[rect[0]+xs[x],rect[1]+ys[y],xs[x+1]-xs[x],ys[y+1]-ys[y]],dest:Rect=[dx[x],dy[y],dx[x+1]-dx[x],dy[y+1]-dy[y]],edge=nineSlice.edge;
  // The opaque background inside a source edge must never mask the live reel window.
  if(edge&&x===1&&y===0){part[3]=edge;dest[3]=dt*edge/t;}
  if(edge&&x===1&&y===2){part[1]=rect[1]+rect[3]-edge;part[3]=edge;dest[3]=db*edge/b;dest[1]=h-dest[3];}
  if(edge&&x===0&&y===1){part[2]=edge;dest[2]=dl*edge/l;}
  if(edge&&x===2&&y===1){part[0]=rect[0]+rect[2]-edge;part[2]=edge;dest[2]=dr*edge/r;dest[0]=w-dest[2];}
  ctx.drawImage(im,...part,...dest);
 }return;}
 const k=Math.min(w/rect[2],h/rect[3]);const dw=stretch?w:rect[2]*k,dh=stretch?h:rect[3]*k;ctx.drawImage(im,...rect,(w-dw)/2,(h-dh)/2,dw,dh);};const observer=new ResizeObserver(draw);observer.observe(el);void loadImage(src).then(img=>{im=img;draw();});return()=>{alive=false;observer.disconnect();};},[src,rect,stretch,nineSlice,horizontalSlice,verticalSlice]);
 return <canvas ref={ref} className={'raster '+className} role={label?'img':undefined} aria-label={label} aria-hidden={!label}/>;
}
