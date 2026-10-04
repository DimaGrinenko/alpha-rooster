import test from 'node:test';
import assert from 'node:assert/strict';
import {animationClock} from '../lib/game/animation-clock.ts';
import {frameLoop} from '../lib/game/frame-loop.ts';
import {wheatWind,wheatTriangles,vegetationZones} from '../lib/game/wheat-wind.ts';
import {wheatLayout} from '../lib/game/wheat-world.ts';
import {butterflyFlight,millRotation} from '../lib/game/harvest-life.ts';

void test('vegetation animation excludes the complete curved road in every supported aspect ratio',()=>{
 for(const [width,height] of [[1200,675],[1024,576],[400,225],[800,450],[425,812],[375,667],[320,568]]){
  const field=wheatLayout(width,height,height*.43),zones=vegetationZones(field,height);
  for(let row=568;row<=634;row++){
   const y=field.upperY+row/680*field.upperHeight;
   assert.ok(zones.every(zone=>y<zone.top||y>zone.bottom),'the road and verges must stay outside moving raster clips');
  }
  for(const zone of zones)for(let time=0;time<6;time+=.17){
   for(const y of [zone.top,zone.bottom]){const p=wheatWind(width*.15,y,width,zone.top,zone.bottom,time);assert.ok(Math.hypot(p.x,p.y)<1e-10);}
   for(let y=zone.top;y<zone.bottom;y+=(zone.bottom-zone.top)/6){
    const p=wheatWind(width*.15,y,width,zone.top,zone.bottom,time),q=wheatWind(width*.15,y+.1,width,zone.top,zone.bottom,time);
    assert.ok(1+(q.y-p.y)/.1>.9,'short vegetation strips must not collapse');
   }
  }
 }
});

void test('windmill rotation and butterfly flight remain smooth at cycle boundaries',()=>{
 for(let t=0;t<135;t+=1/30){
  const rotation=millRotation(t+1/30)-millRotation(t);assert.ok(rotation>0&&rotation<.008);
  for(let i=0;i<2;i++){
   const a=butterflyFlight(t,i),b=butterflyFlight(t+1/30,i);
   assert.ok(a.wing>=.22&&a.wing<=1);assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.025);
  }
 }
 for(const start of [0,120,3600,86400])for(let t=start;t<start+22;t+=1/30){
  assert.ok(Math.abs(butterflyFlight(t+1/30,0).wing-butterflyFlight(t,0).wing)<.144,'flutter frequency must remain bounded over a long session');
 }
});

void test('wheat triangles share edges exactly, including the previously cracked fourth corner',()=>{
 const project=(m:readonly number[],x:number,y:number)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
 const near=(a:number[],b:number[])=>assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-9);
 const field=wheatLayout(1200,675,290);
 for(const zone of vegetationZones(field,675))for(const time of [0,1,26.5,120,3600])for(let row=0;row<5;row++)for(let col=0;col<11;col++){
  const cw=100,ch=(zone.bottom-zone.top)/6,x=col*cw,y=zone.top+row*ch;
  const a=wheatTriangles(x,y,cw,ch,1200,zone.top,zone.bottom,time),right=wheatTriangles(x+cw,y,cw,ch,1200,zone.top,zone.bottom,time),below=wheatTriangles(x,y+ch,cw,ch,1200,zone.top,zone.bottom,time);
  for(const t of [0,.2,.8,1]){
   near(project(a[0],cw*(1-t),ch*t),project(a[1],cw*(1-t),ch*t));
   near(project(a[1],cw,ch*t),project(right[0],0,ch*t));
   near(project(a[1],cw*t,ch),project(below[0],cw*t,0));
  }
 }
});

void test('wheat gusts keep terrain edges fixed and patches upright without temporal jumps',()=>{
 for(const width of [320,400,1200,1920])for(let t=0;t<12;t+=.2){
  const horizon=80,lawn=180;
  for(const y of [horizon,lawn]){const p=wheatWind(width*.4,y,width,horizon,lawn,t);assert.ok(Math.abs(p.x)+Math.abs(p.y)<1e-10);}
  for(const x of [0,width]){const p=wheatWind(x,130,width,horizon,lawn,t);assert.equal(Math.hypot(p.x,p.y),0);}
  for(let x=0;x<width;x+=width/12)for(let y=horizon;y<lawn;y+=(lawn-horizon)/6){
   const a=wheatWind(x,y,width,horizon,lawn,t),b=wheatWind(x+1,y,width,horizon,lawn,t),c=wheatWind(x,y+1,width,horizon,lawn,t),next=wheatWind(x,y,width,horizon,lawn,t+1/30);
   assert.ok((1+b.x-a.x)*(1+c.y-a.y)-(b.y-a.y)*(c.x-a.x)>.8,'field patch must not fold');
   assert.ok(Math.hypot(next.x-a.x,next.y-a.y)<.65,'wind must move continuously');
  }
 }
});

void test('render cadence keeps its phase on 60, 90, 120 and 144 Hz displays',()=>{
 for(const hz of [60,90,120,144])for(const fps of [30,60]){
  const clock=animationClock(fps);let count=0,time=0;
  for(let n=1;n<=hz*10;n++){
   const dt=clock.tick(n*1000/hz);if(dt!==null){count++;time+=dt;}
  }
  assert.ok(Math.abs(count-fps*10)<=1,`${hz} Hz, ${fps} FPS: ${count}`);
  assert.ok(Math.abs(time-10)<1/fps);
 }
});
void test('paused time is not replayed when animation resumes',()=>{
 const clock=animationClock(60);clock.tick(17);clock.reset(60000);
 const dt=clock.tick(60017);assert.ok(dt!==null&&dt<.018);
});
void test('dirty repaint consumes time only once and retains the frame cadence',()=>{
 const clock=animationClock(30);let elapsed=0;
 for(let ms=1;ms<=1000;ms++){const dt=clock.tick(ms,ms%7===0);if(dt!==null)elapsed+=dt;}
 assert.ok(elapsed<=1+1e-9&&elapsed>.98);
});
void test('stationary renderers sleep, wake once after a change and cannot restart after disposal',()=>{
 let id=0,draws=0,active=false;const queue=new Map<number,(time:number)=>void>();
 const request=(callback:(time:number)=>void)=>{queue.set(++id,callback);return id;};
 const flush=(time:number)=>{const pending=[...queue.values()];queue.clear();pending.forEach(callback=>callback(time));};
 const loop=frameLoop(()=>{draws++;return active;},request,key=>{queue.delete(key);});
 loop.wake();loop.wake();assert.equal(queue.size,1);flush(16);assert.equal(draws,1);assert.equal(queue.size,0);
 active=true;loop.wake();flush(32);assert.equal(queue.size,1);flush(48);assert.equal(draws,3);
 active=false;flush(64);assert.equal(queue.size,0);
 loop.wake();loop.dispose();assert.equal(queue.size,0);loop.wake();flush(80);assert.equal(draws,4);
});
