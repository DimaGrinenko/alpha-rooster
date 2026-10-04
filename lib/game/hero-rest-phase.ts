// Proposal only: copy into lib/game/hero-rest-phase.ts if integrating.
// Store the phase where a resting animation was interrupted. Event duration
// does not count toward that phase, so a win cannot starve late idle gestures.
export type HeroRestTrack={animation:{name:string;duration:number}|null;trackTime:number};
export type HeroRestPhases=Map<string,number>;
const isRest=(name:string)=>name==='idle'||name==='rage-idle';
function normalize(time:number,duration:number){return duration>0&&Number.isFinite(time)?((time%duration)+duration)%duration:0;}
export function rememberHeroRestPhase(current:HeroRestTrack|null,phases:HeroRestPhases){
 const animation=current?.animation;
 if(current&&animation&&isRest(animation.name))phases.set(animation.name,normalize(current.trackTime,animation.duration));
}
export function resumeHeroRestPhase(entry:HeroRestTrack,phases:HeroRestPhases){
 const animation=entry.animation;
 if(animation&&isRest(animation.name))entry.trackTime=normalize(phases.get(animation.name)??0,animation.duration);
 return entry;
}
