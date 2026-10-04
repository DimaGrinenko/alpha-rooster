import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BARN_FRACTURES,BARN_DUST_START,BARN_DUST_OPAQUE,BARN_SCENE_SWAP_SECONDS,BARN_DUST_HOLD_SECONDS,BARN_DUST_SECONDS,advanceBarnCollapse,collapseOutside,collapseStage,collapseFragment,collapseDebris,collapseDust,collapseCloud} from '../lib/game/barn-collapse.ts';

void test('architectural pieces cover the whole room exactly and keep its floor intact',()=>{
 for(const parts of Object.values(BARN_FRACTURES)){
  let area=0;
  for(const part of parts){
   let twice=0;for(let i=0;i<part.points.length;i++){const a=part.points[i],b=part.points[(i+1)%part.points.length];twice+=a[0]*b[1]-b[0]*a[1];}
   assert.ok(twice>0,'all fragment UV polygons have consistent winding');area+=twice/2;
   assert.deepEqual(collapseFragment(0,part,parts.indexOf(part)),{x:0,y:0,angle:0,alpha:1,scale:1});
  }
  assert.ok(Math.abs(area-1)<1e-12,'roof, columns, walls and floor form a full source partition');
  const floor=parts.find(p=>p.kind==='floor')!;
  for(let t=0;t<BARN_DUST_SECONDS;t+=.01)assert.deepEqual(collapseFragment(t,floor,0),{x:0,y:0,angle:0,alpha:1,scale:1},'crate floor never flies out from under the character');
 }
});
void test('breakup is visible before dust and supports fall continuously under gravity',()=>{
 assert.equal(collapseDust(.30),0);assert.equal(collapseDust(BARN_DUST_START),0);assert.ok(collapseDust(.80)<.25);
 for(const parts of Object.values(BARN_FRACTURES))for(let i=0;i<parts.length;i++){
  const part=parts[i];if(part.kind==='floor')continue;
  assert.equal(collapseFragment(BARN_SCENE_SWAP_SECONDS,part,i).alpha,0);
  for(let t=0;t<BARN_SCENE_SWAP_SECONDS;t+=1/120){
   const p=collapseFragment(t,part,i),q=collapseFragment(t+1/120,part,i);
   assert.ok(Object.values(p).every(Number.isFinite));assert.ok(Math.hypot(p.x-q.x,p.y-q.y)<.012,'no piece teleport');assert.ok(Math.abs(p.angle-q.angle)<.015,'no angle snap');assert.ok(p.alpha>=0&&p.alpha<=1);
  }
 }
 const roof=BARN_FRACTURES.wide.find(p=>p.kind==='roof')!,index=BARN_FRACTURES.wide.indexOf(roof),a=collapseFragment(.65,roof,index),b=collapseFragment(.66,roof,index),c=collapseFragment(.67,roof,index);
 assert.ok(c.y-2*b.y+a.y>0,'roof accelerates downward');assert.ok(Math.abs(a.angle)>.05,'roof visibly turns before smoke obscures the breakup');
});
void test('ruins switch only inside an opaque hold with margins on both sides',()=>{
 assert.ok(BARN_SCENE_SWAP_SECONDS-BARN_DUST_OPAQUE>=.30);
 assert.ok(BARN_DUST_HOLD_SECONDS-BARN_SCENE_SWAP_SECONDS>=.30);
 for(let t=0;t<BARN_SCENE_SWAP_SECONDS;t+=.001)assert.equal(collapseOutside(t),false,'no early outdoor exposure');
 assert.equal(collapseOutside(BARN_SCENE_SWAP_SECONDS),true);
 for(let t=BARN_DUST_OPAQUE;t<=BARN_DUST_HOLD_SECONDS;t+=.001)assert.equal(collapseDust(t),1);
 assert.equal(collapseStage(BARN_SCENE_SWAP_SECONDS-.01),'covered');assert.equal(collapseStage(BARN_SCENE_SWAP_SECONDS+.01),'covered');
});
void test('dust reveal is smooth, ordered, and finishes before bonus input unlocks',()=>{
 let previous=1;
 for(let t=BARN_DUST_HOLD_SECONDS;t<=BARN_DUST_SECONDS+.01;t+=1/120){const value=collapseDust(t);assert.ok(value<=previous+1e-10);assert.ok(previous-value<.007);previous=value;}
 assert.equal(collapseDust(BARN_DUST_SECONDS),0);assert.equal(collapseStage(BARN_DUST_SECONDS),'ruins');
 for(const [w,h]of [[1200,675],[425,812],[320,568]])for(let i=0;i<12;i++)for(let t=0;t<=BARN_DUST_SECONDS;t+=.05){const cloud=collapseCloud(t,i,w,h);assert.ok(Object.values(cloud).every(Number.isFinite));assert.ok(cloud.alpha>=0&&cloud.alpha<=1);}
});
void test('a delayed render tick cannot skip the visible breakup or scene cover',()=>{
 let t=0;for(let i=0;i<8;i++){const next=advanceBarnCollapse(t,2);assert.ok(next-t<=.08000001);t=next;}
 assert.ok(t<BARN_DUST_OPAQUE,'even repeated long stalls preserve the first eight visible poses');
 assert.equal(advanceBarnCollapse(0,-1),0);assert.equal(advanceBarnCollapse(BARN_DUST_SECONDS,.08),BARN_DUST_SECONDS);
});
void test('splinters follow finite arcs and expire before dust clears',()=>{
 for(let i=0;i<24;i++){
  assert.equal(collapseDebris(BARN_DUST_SECONDS,i).alpha,0);
  for(let t=0;t<BARN_DUST_SECONDS;t+=1/120){const p=collapseDebris(t,i);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.alpha>=0&&p.alpha<=1);}
 }
});
