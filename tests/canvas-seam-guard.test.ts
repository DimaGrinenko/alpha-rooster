import test from 'node:test';
import assert from 'node:assert/strict';
import {installTriangleSeamGuard} from '../lib/game/canvas-seam-guard.ts';

type Vertex=[number,number,number,number];
type Point=[number,number];
function recorder(scale=1){
 const clips:Point[][]=[],matrices:number[][]=[],draws:unknown[][]=[],calls:string[]=[],renderer={};let path:Point[]=[];
 const ctx={
  getTransform:()=>({a:scale,b:0,c:0,d:-scale}),
  save:()=>calls.push('save'),restore:()=>calls.push('restore'),
  beginPath:()=>{path=[];},moveTo:(x:number,y:number)=>path.push([x,y]),lineTo:(x:number,y:number)=>path.push([x,y]),closePath:()=>{},
  clip:()=>clips.push(path.slice()),transform:(...m:number[])=>matrices.push(m),drawImage:(...args:unknown[])=>draws.push(args)
 };
 installTriangleSeamGuard(renderer,ctx as unknown as CanvasRenderingContext2D);
 const draw=(vertices:Vertex[],width=257,height=129)=>Reflect.get(renderer,'drawTriangle')({width,height},...vertices.flat());
 return {draw,clips,matrices,draws,calls};
}
function close(actual:number,expected:number,tolerance=1e-8){assert.ok(Math.abs(actual-expected)<tolerance,actual+' should equal '+expected);}
function area(p:Point[]){return (p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);}
function inside(p:Point,polygon:Point[]){const sign=Math.sign(area(polygon));return polygon.every((a,i)=>{const b=polygon[(i+1)%3];return sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))>0;});}

void test('mesh seam guard preserves the exact source-pixel mapping in both windings',()=>{
 const vertices:Vertex[]=[[17,29,.2,.3],[92,43,.7,.25],[38,116,.35,.9]];
 for(const triangle of [vertices,[vertices[0],vertices[2],vertices[1]]]){
  const r=recorder(1.5);r.draw(triangle);assert.equal(r.matrices.length,1);assert.equal(r.draws.length,1);
  const [a,b,c,d,e,f]=r.matrices[0];
  for(const [x,y,u,v]of triangle){close(a*u*256+c*v*128+e,x);close(b*u*256+d*v*128+f,y);}
  assert.equal(Math.sign(area(r.clips[0])),Math.sign(area(triangle.map(v=>[v[0],v[1]]))));
  for(const [x,y]of triangle)assert.ok(inside([x,y],r.clips[0]),'clip overlaps but does not move source vertices');
  assert.deepEqual(r.calls,['save','restore']);
 }
});

void test('mesh seam guard seals shared edges with a fixed physical-pixel overlap',()=>{
 for(const scale of [.5,1,2,4]){
  const r=recorder(scale);
  r.draw([[0,0,0,0],[100,0,1,0],[100,100,1,1]]);
  r.draw([[0,0,0,0],[100,100,1,1],[0,100,0,1]]);
  for(const clip of r.clips)assert.ok(inside([50,50],clip),'both sides cover the shared diagonal');
  close(Math.abs(r.clips[0][0][1])*scale,.45);
  assert.deepEqual(r.calls,['save','restore','save','restore']);
 }
});

void test('degenerate geometry and UVs never issue invalid canvas transforms',()=>{
 const r=recorder();
 r.draw([[0,0,0,0],[50,50,1,0],[100,100,0,1]]);
 r.draw([[0,0,0,0],[100,0,.5,.5],[100,100,1,1]]);
 r.draw([[0,0,0,0],[100,0,1,0],[100,100,1,1]],1,129);
 r.draw([[0,0,0,0],[100,0,1,0],[Number.NaN,100,1,1]]);
 assert.equal(r.matrices.length,0);assert.equal(r.clips.length,0);assert.equal(r.draws.length,0);assert.deepEqual(r.calls,[]);
 const zero=recorder(0);zero.draw([[0,0,0,0],[100,0,1,0],[100,100,1,1]]);assert.equal(zero.draws.length,0);
});
