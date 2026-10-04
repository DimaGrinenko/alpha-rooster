import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBarnHenMesh,updateBarnHenMesh,drawBarnHenMesh} from '../lib/game/barn-hens.ts';
import {barnHenOffset,type BarnHenRegion} from '../lib/game/barn-atmosphere.ts';

const motions=['head','ear','breath','chew'] as const;
const region:BarnHenRegion={cx:1301.5,cy:435.5,rx:54.5,ry:49.5,phase:2.1};
function close(a:number,b:number,tolerance=1e-9){assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);}

void test('cached animal mesh matches the reference motion and leaves every boundary vertex fixed',()=>{
 for(const motion of motions){
  const hen={...region,motion},mesh=prepareBarnHenMesh(hen),buffers=[mesh.source,mesh.destination,mesh.weight,mesh.weightX,mesh.weightY,mesh.motion,mesh.triangles,mesh.inverse];
  assert.equal(mesh.weight.length,30);assert.ok(mesh.triangles.length/3<=40);
  for(let frame=0;frame<=1440;frame++){
   const time=frame/60;updateBarnHenMesh(mesh,time);
   for(let i=0;i<mesh.weight.length;i++){
    const x=mesh.left+mesh.source[i*2],y=mesh.top+mesh.source[i*2+1],delta=barnHenOffset(x,y,time,hen);
    close(mesh.destination[i*2],x+delta.x);close(mesh.destination[i*2+1],y+delta.y);
    const row=Math.floor(i/(mesh.columns+1)),column=i%(mesh.columns+1);
    if(row===0||row===mesh.rows||column===0||column===mesh.columns){assert.equal(mesh.destination[i*2],x);assert.equal(mesh.destination[i*2+1],y);}
   }
  }
  [mesh.source,mesh.destination,mesh.weight,mesh.weightX,mesh.weightY,mesh.motion,mesh.triangles,mesh.inverse].forEach((buffer,i)=>assert.equal(buffer,buffers[i],'topology and buffers stay owned by the mesh'));
 }
});

void test('animal motion keeps local scale near 1 and never folds triangles across 24 seconds',()=>{
 for(const motion of motions)for(const [rx,ry] of [[54.5,49.5],[16,40],[55,18]]){
  const hen={...region,rx,ry,motion},mesh=prepareBarnHenMesh(hen);
  for(let frame=0;frame<=720;frame++){
   updateBarnHenMesh(mesh,frame/30);
   for(let i=0,k=0;i<mesh.triangles.length;i+=3,k+=4){
    const p=mesh.triangles[i]*2,q=mesh.triangles[i+1]*2,r=mesh.triangles[i+2]*2;
    const ux=mesh.destination[q]-mesh.destination[p],uy=mesh.destination[q+1]-mesh.destination[p+1],vx=mesh.destination[r]-mesh.destination[p],vy=mesh.destination[r+1]-mesh.destination[p+1];
    const a=ux*mesh.inverse[k]+vx*mesh.inverse[k+1],b=uy*mesh.inverse[k]+vy*mesh.inverse[k+1],c=ux*mesh.inverse[k+2]+vx*mesh.inverse[k+3],d=uy*mesh.inverse[k+2]+vy*mesh.inverse[k+3],det=a*d-b*c;
    assert.ok(det>.8&&det<1.2,`${motion}: no folding or rubber inflation (${det})`);
   }
  }
 }
});

void test('compact motion has stationary exterior, smooth rim and bounded motion at 60Hz',()=>{
 for(const motion of motions){
  const hen={...region,motion};let maxStep=0;
  for(let frame=0;frame<720;frame++)for(let ix=-5;ix<=5;ix++)for(let iy=-5;iy<=5;iy++){
   const x=hen.cx+hen.rx*ix/5,y=hen.cy+hen.ry*iy/5,time=frame/30,p=barnHenOffset(x,y,time,hen),q=barnHenOffset(x,y,time+1/60,hen);
   if(ix*ix+iy*iy>=25){close(p.x,0,1e-20);close(p.y,0,1e-20);}
   maxStep=Math.max(maxStep,Math.hypot(q.x-p.x,q.y-p.y));
  }
  assert.ok(maxStep<.12,`${motion}: no per-frame jump (${maxStep})`);
  for(let n=0;n<30;n++){
   const angle=n/30*Math.PI*2,x=Math.cos(angle),y=Math.sin(angle),p=barnHenOffset(hen.cx+x*hen.rx*.999,hen.cy+y*hen.ry*.999,4.2,hen);
   assert.ok(Math.hypot(p.x,p.y)<.00001,'no moving straw lip at compact-support rim');
  }
 }
});

void test('each Canvas affine transform maps source UV vertices exactly to the deformed destination',()=>{
 const mesh=prepareBarnHenMesh(region);updateBarnHenMesh(mesh,2.4);
 for(const padding of [0,.35,.7]){
  const matrices:number[][]=[],paths:number[][][]=[],events:string[]=[],rectangles:number[][]=[];let path:number[][]=[];
  const ctx={save:()=>events.push('save'),restore:()=>events.push('restore'),beginPath:()=>{path=[];},rect:(...v:number[])=>rectangles.push(v),moveTo:(...v:number[])=>path.push(v),lineTo:(...v:number[])=>path.push(v),closePath:()=>{},clip:()=>{if(path.length)paths.push(path);},transform:(...v:number[])=>matrices.push(v),drawImage:()=>events.push('draw')};
  drawBarnHenMesh(ctx as unknown as CanvasRenderingContext2D,{} as CanvasImageSource,mesh,padding);
  assert.deepEqual(rectangles,[[mesh.left,mesh.top,mesh.width,mesh.height]],'expanded triangle clips remain inside the original patch');
  assert.equal(matrices.length,mesh.triangles.length/3);assert.equal(events.filter(e=>e==='save').length,events.filter(e=>e==='restore').length);
  for(let triangle=0;triangle<matrices.length;triangle++){
   const [a,b,c,d,e,f]=matrices[triangle],polygon=paths[triangle];
   for(let corner=0;corner<3;corner++){
    const vertex=mesh.triangles[triangle*3+corner]*2,x=mesh.destination[vertex],y=mesh.destination[vertex+1];
    close(a*mesh.source[vertex]+c*mesh.source[vertex+1]+e,x);close(b*mesh.source[vertex]+d*mesh.source[vertex+1]+f,y);
    if(padding>0)for(let edge=0;edge<3;edge++){const p=polygon[edge],q=polygon[(edge+1)%3];assert.ok((q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0])>0,'original vertices stay inside expanded clip');}
   }
  }
 }
});
