import test from 'node:test';
import assert from 'node:assert/strict';
import {mouseMotion} from '../lib/game/barn-life.ts';
void test('barn mice enter and leave off screen with continuous travel and a stationary sniff',()=>{
 for(const index of [0,1]){
  const offset=index*9,cycle=24+index*7;
  assert.ok(mouseMotion(-offset,index).x<0||mouseMotion(-offset,index).x>1);
  for(let t=0;t<10;t+=1/120){const a=mouseMotion(t-offset,index),b=mouseMotion(t+1/120-offset,index);assert.ok(Number.isFinite(a.x+a.bob+a.stride+a.sniff));assert.ok(Math.abs(a.x-b.x)<.006);}
  const a=mouseMotion(4.1-offset,index),b=mouseMotion(5.9-offset,index);assert.equal(a.x,b.x);assert.equal(a.stride,b.stride);assert.equal(Math.abs(a.bob),0);
  assert.equal(mouseMotion(11-offset,index).visible,false);assert.equal(mouseMotion(cycle-.01-offset,index).visible,false);
 }
});
