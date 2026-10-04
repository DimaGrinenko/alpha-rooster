import {barnFly} from './barn-atmosphere';

const PARTS={
 body:{rect:[141,147,397,382],pivot:[200,156],width:100,x:0,angle:0},
 wingLeft:{rect:[716,145,414,351],pivot:[390,329],width:92,x:-13,angle:-Math.PI/2},
 wingRight:{rect:[123,749,413,349],pivot:[24,326],width:92,x:13,angle:Math.PI/2}
};

export function createBarnFlies(atlas:HTMLImageElement){
 const cuts=Object.fromEntries(Object.entries(PARTS).map(([key,p])=>{
  const c=document.createElement('canvas');c.width=p.rect[2];c.height=p.rect[3];
  c.getContext('2d')!.drawImage(atlas,p.rect[0],p.rect[1],p.rect[2],p.rect[3],0,0,c.width,c.height);return [key,c];
 }));
 return (ctx:CanvasRenderingContext2D,w:number,h:number,time:number,portrait:boolean)=>{
  const pockets=portrait?[[.93,.37,.035,.038],[.12,.47,.045,.028]]:[[.91,.48,.052,.038],[.955,.39,.023,.035],[.12,.51,.065,.045],[.86,.55,.022,.023]];
  for(const [i,[cx,cy,rx,ry]] of pockets.entries()){
   const pose=barnFly(time,i),size=(portrait?4.4:5.9)*pose.depth/.75,unit=size/223;
   ctx.save();ctx.translate(w*(cx+pose.x*rx),h*(cy+pose.y*ry));ctx.rotate(pose.angle);
   for(const name of ['wingLeft','wingRight','body'] as const){
    const p=PARTS[name],cut=cuts[name],scale=p.width/cut.width*unit,wing=name!=='body';
    ctx.save();ctx.globalAlpha=wing?.30:.72;ctx.translate(p.x*unit,0);ctx.rotate(p.angle+(wing?(name==='wingLeft'?-1:1)*(pose.wing-.5):0));
    ctx.drawImage(cut,-p.pivot[0]*scale,-p.pivot[1]*scale,cut.width*scale,cut.height*scale);ctx.restore();
   }
   ctx.restore();
  }
 };
}
