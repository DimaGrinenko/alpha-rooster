import type {Rect} from './art';

const regions:Record<string,{rect:Rect;pivot:[number,number]}>= {
 roost:{rect:[8,48,1070,246],pivot:[0,0]},front:{rect:[8,1210,1070,147],pivot:[0,0]},
 creamBody:{rect:[4,345,372,310],pivot:[195,282]},buffBody:{rect:[378,345,355,310],pivot:[177,282]},redBody:{rect:[735,345,351,310],pivot:[176,282]},
 creamHead:{rect:[80,664,245,275],pivot:[125,238]},buffHead:{rect:[441,661,242,279],pivot:[125,238]},redHead:{rect:[797,659,241,282],pivot:[125,240]},
 creamWing:{rect:[22,940,340,251],pivot:[268,50]},buffWing:{rect:[388,940,325,251],pivot:[260,50]},redWing:{rect:[751,938,329,253],pivot:[260,50]}
};
const hens=[{prefix:'cream',x:112,head:48},{prefix:'buff',x:303,head:55},{prefix:'red',x:486,head:57}];
const pulse=(t:number,start:number,duration:number)=>t>start&&t<start+duration?Math.sin((t-start)/duration*Math.PI)**2:0;

/** Heads pivot at the neck; the straw lip occludes the seated lower body. */
export function createBarnRoost(atlas:HTMLImageElement){
 const cuts=Object.fromEntries(Object.entries(regions).map(([key,p])=>{const cut=document.createElement('canvas');cut.width=p.rect[2];cut.height=p.rect[3];cut.getContext('2d')!.drawImage(atlas,...p.rect,0,0,cut.width,cut.height);return [key,cut];}));
 return (ctx:CanvasRenderingContext2D,x:number,bottom:number,width:number,time:number)=>{
  const part=(key:string,px:number,py:number,w:number,a=0)=>{const cut=cuts[key],p=regions[key],s=w/cut.width;ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.drawImage(cut,-p.pivot[0]*s,-p.pivot[1]*s,w,cut.height*s);ctx.restore();};
  ctx.save();ctx.translate(x,bottom-width/600*295);ctx.scale(width/600,width/600);
  part('roost',0,150,600);
  for(const [i,hen] of hens.entries()){
   const t=(time+i*4.7)%17,bob=Math.sin(time*1.1+i*1.8)*1.6,peck=pulse(t,4.4,1.3),look=pulse(t,9,3),wing=pulse(t,13,1.2);
   part(hen.prefix+'Body',hen.x,252+bob,170);
   part(hen.prefix+'Head',hen.x+hen.head,173+bob+peck*4,95,peck*.26-look*.10);
   part(hen.prefix+'Wing',hen.x+20,181+bob,118,wing*-.075);
  }
  part('front',0,213,600);ctx.restore();
 };
}
