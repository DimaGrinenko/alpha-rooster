import type {Rect} from './art';

// Raster parts, cropped to transparent margins. Coordinates stay in the atlas
// reference space so wings and the rotor articulate around real attachment points.
export const BUTTERFLY_PARTS:Record<string,Rect>={
 butterflyBody:[313,55,180,394],butterflyLeft:[923,47,422,451],
 butterflyRight:[195,535,420,449],pollen:[1103,724,105,108],
};
export const MILL_PARTS:Record<string,Rect>={
 millBody:[249,0,282,581],millRotor:[871,9,572,560],
 swallowBody:[315,624,155,362],swallowWing:[896,683,526,224],
};

// A slow continuous rotation with a tiny wind-driven acceleration. The tower
// never participates in this transform, and angular velocity stays positive.
export const millRotation=(seconds:number)=>seconds*.19+.045*Math.sin(seconds*.4);

export function butterflyFlight(seconds:number,index:number){
 const t=seconds+index*9.7;
 const flying=(1-Math.cos(t*Math.PI*2/22))*.5;
 return {
  x:Math.sin(t*.37)*flying,
  y:Math.sin(t*.61)*.22*flying-flying,
  bank:Math.sin(t*.42)*.18*flying,
  // Integrate the 6–11 rad/s flutter frequency instead of multiplying time by
  // a varying frequency, which would accelerate the wings during long sessions.
  wing:.22+.78*(1+Math.sin(8.5*t-27.5/Math.PI*Math.sin(t*Math.PI*2/22)))*.5,
 };
}
