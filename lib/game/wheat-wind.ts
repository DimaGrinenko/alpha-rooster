// The track is baked into source rows 576–617, including a curved verge.
// Keep a generous stationary corridor and animate each planted area separately.
export function vegetationZones(field:{upperY:number;upperHeight:number;lawn:number},height:number){
 const sourceY=(row:number)=>field.upperY+row/680*field.upperHeight;
 return [
  {top:sourceY(400),bottom:sourceY(566),kind:'wheat'},
  {top:sourceY(636),bottom:field.lawn,kind:'wheat'},
  {top:field.lawn,bottom:height,kind:'grass'},
 ] as const;
}

// Fixed roots/edges, travelling phase, amplitude bounded by patch height.
// A short strip on a small phone must never fold over itself.
export function wheatWind(x:number,y:number,width:number,horizon:number,lawn:number,seconds:number){
 const depth=Math.max(0,Math.min(1,(y-horizon)/Math.max(1,lawn-horizon)));
 const edge=Math.max(0,Math.min(1,Math.min(x,width-x)/Math.max(24,width*.055)));
 const envelope=Math.sin(depth*Math.PI)**1.4*Math.min(1,width/1000,(lawn-horizon)/140)*edge*edge*(3-2*edge);
 const gust=.68+.32*Math.sin(seconds*.37-x/width*2.1);
 const phase=seconds*1.35-x/width*7.4+depth*3.2;
 return {x:envelope*gust*(6*Math.sin(phase)+2*Math.sin(seconds*.58-x/width*3.4)),y:envelope*gust*1.7*Math.cos(phase+.45)};
}

// Two triangles share all four sampled vertices. A three-corner affine quad
// invents its fourth corner and leaves cracks between adjacent rows/columns.
export function wheatTriangles(x:number,y:number,cw:number,ch:number,width:number,top:number,bottom:number,seconds:number){
 const a=wheatWind(x,y,width,top,bottom,seconds),b=wheatWind(x+cw,y,width,top,bottom,seconds),c=wheatWind(x,y+ch,width,top,bottom,seconds),d=wheatWind(x+cw,y+ch,width,top,bottom,seconds);
 return [
  [1+(b.x-a.x)/cw,(b.y-a.y)/cw,(c.x-a.x)/ch,1+(c.y-a.y)/ch,x+a.x,y+a.y],
  [1+(d.x-c.x)/cw,(d.y-c.y)/cw,(d.x-b.x)/ch,1+(d.y-b.y)/ch,x+b.x+c.x-d.x,y+b.y+c.y-d.y],
 ] as const;
}
