// The generated field has its horizon at row400, track at590, lawn at680.
// Map the lawn to the character's grounded platform, including short phones.
export function wheatLayout(width:number,height:number,groundY:number){
 const portrait=height>width;
 const lawn=portrait?Math.max(height*.20,Math.min(height*.43,groundY-height*.045)):height*.66;
 const horizon=portrait?Math.max(height*.09,lawn-height*.17):height*.36;
 const cropScale=(lawn-horizon)/280;
 return {horizon,lawn,track:horizon+190*cropScale,upperY:horizon-400*cropScale,upperHeight:680*cropScale,width:Math.max(width,portrait?height*.9:width)};
}
export const TRACTOR_PARTS={body:[228,0,1074,541],rearWheel:[175,541,454,454],frontWheel:[779,661,322,322],exhaust:[1218,668,246,155]} as const;
export const TRACTOR_AXLES={rear:{x:223,y:447,radius:178},front:{x:842,y:484,radius:141},ground:625,width:1065};
// Follow the ridge in the generated wheat panorama, in its source coordinates.
// The small tractor stays on the distant crop instead of the foreground track.
export function distantTractorY(x:number,viewportWidth:number,field:ReturnType<typeof wheatLayout>){
 const ridge=[410,408,428,449,463,478,459,467,433,419,435];
 const u=Math.max(0,Math.min(1,(x-(viewportWidth-field.width)/2)/field.width))*10;
 const i=Math.min(9,Math.floor(u)),t=u-i,ease=t*t*(3-2*t);
 return field.upperY+(ridge[i]+(ridge[i+1]-ridge[i])*ease+26)*field.upperHeight/680;
}
export function tractorMotion(seconds:number,viewportWidth:number,tractorWidth:number){
 const travel=32,pause=3,half=travel+pause,phase=((seconds%(half*2))+half*2)%(half*2);
 const heading=phase<half?1:-1,leg=phase%half,distance=(viewportWidth+tractorWidth*2)*Math.min(1,leg/travel);
 return {x:heading===1?-tractorWidth+distance:viewportWidth+tractorWidth-distance,heading,distance,moving:leg<travel};
}
