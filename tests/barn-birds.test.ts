// Tests the actual authored bird meshes, including quiet motion and raster ROI.
// This file does not depend on a browser or native canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBarnHenMesh,updateBarnHenMesh,drawBarnHenMesh} from '../lib/game/barn-hens.ts';
import {barnHenOffset} from '../lib/game/barn-atmosphere.ts';
import {BARN_WIDE,BARN_TALL,BARN_COMPACT} from '../lib/game/barn-room.ts';
const layouts=[['wide',BARN_WIDE,1672,941],['tall',BARN_TALL,941,1672],['compact',BARN_COMPACT,941,1672]] as const;
type Mesh=ReturnType<typeof prepareBarnHenMesh>;
function near(a:number,b:number){assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);}
function atPoint(mesh:Mesh,x:number,y:number){
 x-=mesh.left;y-=mesh.top;
 for(let i=0;i<mesh.triangles.length;i+=3){
  const ids=[mesh.triangles[i]*2,mesh.triangles[i+1]*2,mesh.triangles[i+2]*2],s=mesh.source,[p,q,r]=ids;
  const ux=s[q]-s[p],uy=s[q+1]-s[p+1],vx=s[r]-s[p],vy=s[r+1]-s[p+1],dx=x-s[p],dy=y-s[p+1],det=ux*vy-uy*vx;
  const b=(dx*vy-dy*vx)/det,c=(ux*dy-uy*dx)/det,a=1-b-c;
  if(Math.min(a,b,c)>-1e-9)return()=>({x:ids.reduce((v,id,j)=>v+mesh.destination[id]*[a,b,c][j],0),y:ids.reduce((v,id,j)=>v+mesh.destination[id+1]*[a,b,c][j],0)});
 }
 throw Error('An authored bird landmark has no visible triangle');
}

void test('all 15 actual bird patches contain both influences and have disjoint rounded source rectangles',()=>{
 let checked=0;
 for(const[name,room,width,height]of layouts){
  assert.equal(room.regions.length,5);
  // Avoid Array.map's index being interpreted as the optional grid columns.
  const actual=room.regions.map(region=>prepareBarnHenMesh(region));
  for(const m of actual){checked++;assert.equal(m.influences.length,2);assert.equal(m.influences[0].hen.motion,'head');assert.equal(m.influences[1].hen.motion,'breath');
   assert.ok(m.left>=0&&m.top>=0&&m.left+m.width<=width&&m.top+m.height<=height,`${name}: patch must stay inside its actual raster`);
   for(const {hen:h}of m.influences)assert.ok(h.cx-h.rx>=m.left&&h.cy-h.ry>=m.top&&h.cx+h.rx<=m.left+m.width&&h.cy+h.ry<=m.top+m.height,`${name}: influence is clipped by its own ROI`);
  }
  for(let i=0;i<actual.length;i++)for(let j=i+1;j<actual.length;j++){
   const a=actual[i],b=actual[j];
   assert.ok(a.left+a.width<=b.left||b.left+b.width<=a.left||a.top+a.height<=b.top||b.top+b.height<=a.top,`${name} birds ${i+1}/${j+1}: opaque patch can overwrite its neighbour`);
  }
 }
 assert.equal(checked,15);
});

void test('real head plus breath meshes pin their rims, never fold, and stay below 0.8 source px per 15 Hz frame',()=>{
 for(const[name,room]of layouts)for(let bird=0;bird<room.regions.length;bird++){
  const mesh=prepareBarnHenMesh(room.regions[bird]),prev=new Float64Array(mesh.destination.length),prev15=new Float64Array(prev.length);
  let minDet=Infinity,maxDet=-Infinity,maxStep=0,maxStep15=0;
  for(let frame=0;frame<=36000;frame++){
   updateBarnHenMesh(mesh,frame/60);
   for(let j=0;j<mesh.source.length;j+=2){
    const col=(j/2)%(mesh.columns+1),row=Math.floor(j/2/(mesh.columns+1));
    if(col===0||col===mesh.columns||row===0||row===mesh.rows){near(mesh.destination[j],mesh.left+mesh.source[j]);near(mesh.destination[j+1],mesh.top+mesh.source[j+1]);}
    if(frame)maxStep=Math.max(maxStep,Math.hypot(mesh.destination[j]-prev[j],mesh.destination[j+1]-prev[j+1]));
    if(frame&&frame%4===0)maxStep15=Math.max(maxStep15,Math.hypot(mesh.destination[j]-prev15[j],mesh.destination[j+1]-prev15[j+1]));
   }
   prev.set(mesh.destination);if(frame%4===0)prev15.set(mesh.destination);
   for(let j=0,k=0;j<mesh.triangles.length;j+=3,k+=4){
    const p=mesh.triangles[j]*2,q=mesh.triangles[j+1]*2,r=mesh.triangles[j+2]*2,dst=mesh.destination;
    const ux=dst[q]-dst[p],uy=dst[q+1]-dst[p+1],vx=dst[r]-dst[p],vy=dst[r+1]-dst[p+1];
    const a=ux*mesh.inverse[k]+vx*mesh.inverse[k+1],b=uy*mesh.inverse[k]+vy*mesh.inverse[k+1],c=ux*mesh.inverse[k+2]+vx*mesh.inverse[k+3],d=uy*mesh.inverse[k+2]+vy*mesh.inverse[k+3];
    minDet=Math.min(minDet,a*d-b*c);maxDet=Math.max(maxDet,a*d-b*c);
   }
  }
  const id=`${name} bird ${bird+1}`;
  assert.ok(minDet>.6&&maxDet<1.4,`${id}: local area envelope ${minDet}..${maxDet}`);
  assert.ok(maxStep<.2,`${id}: 60 Hz discontinuity ${maxStep}`);
  assert.ok(maxStep15<.8,`${id}: visible 15 Hz jump ${maxStep15}`);
 }
});

void test('birds spend most of their time resting, with occasional small sideways glances and no downward pecking',()=>{
 for(const[name,room]of layouts)for(let bird=0;bird<room.regions.length;bird++){
  const region=room.regions[bird],mesh=prepareBarnHenMesh(region),head=region.parts![0],body=region.parts![1],headAt=atPoint(mesh,head.cx,head.cy),bodyAt=atPoint(mesh,body.cx,body.cy);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,maxActual=0,maxExpected=0,maxBreath=0,maxBodyMotion=0,quiet=0,quietRun=0,longestQuietRun=0,glances=0,wasQuiet=true;
  const frames=600*15;
  for(let frame=0;frame<frames;frame++){
   const time=frame/15;updateBarnHenMesh(mesh,time);const h=headAt(),b=bodyAt(),expected=barnHenOffset(head.cx,head.cy,time,region);
   minX=Math.min(minX,h.x);maxX=Math.max(maxX,h.x);minY=Math.min(minY,h.y);maxY=Math.max(maxY,h.y);
   maxActual=Math.max(maxActual,Math.hypot(h.x-head.cx,h.y-head.cy));maxExpected=Math.max(maxExpected,Math.hypot(expected.x,expected.y));const bodyMotion=Math.hypot(b.x-body.cx,b.y-body.cy);maxBodyMotion=Math.max(maxBodyMotion,bodyMotion);
   const resting=Math.hypot(h.x-head.cx,h.y-head.cy)<1e-7;
   if(resting){quiet++;quietRun++;longestQuietRun=Math.max(longestQuietRun,quietRun);maxBreath=Math.max(maxBreath,bodyMotion);}else{if(wasQuiet)glances++;quietRun=0;}
   wasQuiet=resting;
   assert.ok(h.y-head.cy<head.ry*.002,`${name} bird ${bird+1}: downward peck returned`);
  }
  const id=`${name} bird ${bird+1}`;
  assert.ok(quiet/frames>=.6,`${id}: head is continuously restless (${quiet/frames} quiet fraction)`);
  assert.ok(longestQuietRun/15>=8,`${id}: no long resting pose`);
  assert.ok(glances>=12&&glances<=60,`${id}: missing or too frequent glances (${glances} per 10 minutes)`);
  assert.ok(maxX-minX>head.rx*.04&&maxX-minX<head.rx*.1,`${id}: head must turn visibly but only within a small local range`);
  assert.ok(maxY-minY<head.ry*.025,`${id}: vertical bob or peck exceeds the quiet head turn`);
  assert.ok(maxActual/maxExpected>.8,`${id}: grid discarded too much head motion`);
  assert.ok(maxBreath>body.ry*.0002&&maxBreath<body.ry*.002,`${id}: missing tiny breath or entire chest drifts (${maxBreath})`);
  assert.ok(maxBodyMotion<.5,`${id}: neck turn drags the whole chest (${maxBodyMotion} source px)`);
 }
});

void test('every real patch draw clips at its own ROI and maps actual source triangles to the moving destinations',()=>{
 for(const[name,room]of layouts)for(const region of room.regions){
  const mesh=prepareBarnHenMesh(region);updateBarnHenMesh(mesh,4.2-region.phase);
  const matrices:number[][]=[],rects:number[][]=[];let save=0,restore=0;
  const ctx={save:()=>save++,restore:()=>restore++,beginPath(){},rect:(...r:number[])=>rects.push(r),moveTo(){},lineTo(){},closePath(){},clip(){},transform:(...m:number[])=>matrices.push(m),drawImage(){}};
  drawBarnHenMesh(ctx as unknown as CanvasRenderingContext2D,{} as CanvasImageSource,mesh,.35);
  assert.deepEqual(rects,[[mesh.left,mesh.top,mesh.width,mesh.height]],`${name}: expanded seams cannot overwrite outside ROI`);assert.equal(save,restore);
  assert.equal(matrices.length,mesh.triangles.length/3);
  matrices.forEach(([a,b,c,d,e,f],i)=>{for(let j=0;j<3;j++){const v=mesh.triangles[i*3+j]*2;near(a*mesh.source[v]+c*mesh.source[v+1]+e,mesh.destination[v]);near(b*mesh.source[v]+d*mesh.source[v+1]+f,mesh.destination[v+1]);}});
 }
});


