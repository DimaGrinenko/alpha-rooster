const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*t*(10+t*(-15+6*t));};
// A quiet sniff between two runs, then an off-screen rest. Direction changes
// only while hidden, avoiding the usual turning-in-place sprite snap.
export function mouseMotion(seconds:number,index=0){
 const cycle=24+index*7,t=((seconds+index*9)%cycle+cycle)%cycle;
 let progress=0,speed=0;
 if(t<4){const u=t/4;progress=.44*smooth(u);speed=.44*30*u*u*(1-u)*(1-u)/4;}
 else if(t<6){progress=.44;}
 else if(t<10){const u=(t-6)/4;progress=.44+.56*smooth(u);speed=.56*30*u*u*(1-u)*(1-u)/4;}
 else progress=1;
 const direction=index%2?-1:1,x=index%2?1.10-1.20*progress:-.10+1.20*progress;
 return {x,progress,direction,speed,visible:t<10,stride:progress*38*Math.PI,bob:Math.min(speed*5,1)*Math.sin(progress*76*Math.PI)*1.1,sniff:t>=4&&t<6?Math.sin((t-4)*Math.PI*4)*.035:0};
}
// Match the room's cover transform. These are foreground silhouettes, not
// screen-edge fades: an animal disappears behind an actual wooden post.
export const BARN_FOREGROUND={
 wide:[[[0,0],[130,0],[136,900],[0,922]],[[1672,0],[1598,0],[1588,874],[1672,912]]],
 tall:[[[0,0],[62,0],[64,1450],[0,1518]],[[941,0],[886,0],[891,938],[870,950],[868,1292],[941,1350]]]
} as const;
export const BARN_LIFE_PARTS={
 body:{rect:[15,40,350,290],pivot:[165,155]},head:{rect:[408,22,330,310],pivot:[47,202]},tail:{rect:[742,85,330,250],pivot:[304,47]},
 foreNear:{rect:[90,365,220,280],pivot:[80,51]},foreFar:{rect:[450,365,220,280],pivot:[71,51]},hindNear:{rect:[807,350,210,300],pivot:[105,53]},hindFar:{rect:[80,715,220,330],pivot:[107,57]},
 sack:{rect:[400,645,290,420],pivot:[140,26]},wheel:{rect:[722,685,355,365],pivot:[183,185]},strawLeft:{rect:[55,1066,250,365],pivot:[150,347]},strawRight:{rect:[425,1066,250,365],pivot:[90,347]}
} as const;
