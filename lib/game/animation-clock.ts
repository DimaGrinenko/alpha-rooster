// Keep the render cadence in phase with the display instead of rounding every
// 30 FPS interval up to the next RAF (which produced alternating long frames).
export function animationClock(fps:number,now=0){
 let previous=now,accumulated=0,rateNow=fps,next=now+1000/fps;
 return {
  reset(time:number){previous=time;next=time+1000/rateNow;accumulated=0;},
  tick(time:number,force=false,rate=fps){
   const interval=1000/rate;
   if(rate!==rateNow){rateNow=rate;next=previous+interval;}
   accumulated+=Math.max(0,(time-previous)/1000);previous=time;
   if(!force&&time+.01<next)return null;
   if(time+.01>=next)next+=(Math.floor((time+.01-next)/interval)+1)*interval;
   const delta=accumulated;accumulated=0;return delta;
  }
 };
}
