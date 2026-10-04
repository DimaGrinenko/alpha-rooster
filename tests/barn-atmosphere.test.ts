import {test} from 'node:test';
import assert from 'node:assert/strict';
import {barnFly,barnHenOffset,barnCover} from '../lib/game/barn-atmosphere.ts';
import {BARN_WIDE,BARN_TALL,BARN_COMPACT} from '../lib/game/barn-room.ts';

void test('flies stay within their air pockets and never jump between frames',()=>{
 for(let i=0;i<6;i++)for(let frame=0;frame<7200;frame++){
  const t=frame/60,a=barnFly(t,i),b=barnFly(t+1/60,i);
  assert.ok(Math.abs(a.x)<1&&Math.abs(a.y)<1);
  assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.045);
  assert.ok(a.wing>=.32&&a.wing<=1&&a.depth>=.48&&a.depth<=.84);
 }
});

void test('hen motion cannot move cubby edges and retains smooth local geometry',()=>{
 const hen={cx:1300,cy:480,rx:54,ry:60,phase:2};
 for(let t=0;t<24;t+=.1){
  for(const [x,y] of [[1354,480],[1246,480],[1300,420],[1300,540],[1400,600]])assert.deepEqual(barnHenOffset(x,y,t,hen),{x:0,y:0});
  for(let x=1250;x<=1350;x+=5)for(let y=425;y<=535;y+=5){
   const p=barnHenOffset(x,y,t,hen),dx=barnHenOffset(x+1,y,t,hen),dy=barnHenOffset(x,y+1,t,hen);
   const determinant=(1+dx.x-p.x)*(1+dy.y-p.y)-(dx.y-p.y)*(dy.x-p.x);
   assert.ok(determinant>.8&&determinant<1.2,'no folding or rubber inflation');
  }
 }
});

void test('room image covers every required viewport without a seam or stretch',()=>{
 for(const [w,h] of [[1200,675],[1024,576],[400,225],[800,450],[425,812],[375,667],[320,568]]){
  const [aw,ah]=h>=w?[941,1672]:[1672,941],p=barnCover(w,h,aw,ah);
  assert.ok(p.x<=0&&p.y<=0);
  assert.ok(p.x+aw*p.scale>=w-.0001&&p.y+ah*p.scale>=h-.0001);
 }
});

void test('phone floor meets the crate footprint without exposing empty canvas edges',()=>{
 for(const [w,h,ground,sourceY] of [[320,568,156.1,551],[375,667,217.4,551],[425,812,323.7,700]]){
  const p=barnCover(w,h,941,1672,{screenY:ground,sourceY});
  assert.ok(p.x<=0&&p.y<=0);
  assert.ok(p.x+941*p.scale>=w-.001&&p.y+1672*p.scale>=h-.001);
  assert.ok(Math.abs(p.y+sourceY*p.scale-ground)<4,'crates stand on the deck/floor');
 }
});

void test('all animal patches are disjoint and remain inside their source image',()=>{
 for(const [room,width,height] of [[BARN_WIDE,1672,941],[BARN_TALL,941,1672],[BARN_COMPACT,941,1672]] as const){
  assert.deepEqual(room.animals,{hens:3,ducks:2,cows:0,pigs:0});
  const rects=room.regions.map(r=>({left:r.cx-r.rx,right:r.cx+r.rx,top:r.cy-r.ry,bottom:r.cy+r.ry}));
  for(const [i,a] of rects.entries()){
   assert.ok(a.left>=0&&a.top>=0&&a.right<=width&&a.bottom<=height);
   for(const b of rects.slice(i+1))assert.ok(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,'opaque patches must never overwrite a neighbouring animation');
  }
 }
});
