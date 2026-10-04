import {barnHenMotion,type BarnHenRegion} from './barn-atmosphere.ts';

/** Static topology and compact-support weights. Only destination coordinates change. */
export function prepareBarnHenMesh(hen:BarnHenRegion,columns?:number,rows?:number){
 const left=Math.floor(hen.cx-hen.rx),top=Math.floor(hen.cy-hen.ry);
 const width=Math.ceil(hen.cx+hen.rx)-left,height=Math.ceil(hen.cy+hen.ry)-top;
 const head=hen.parts?.find(part=>part.motion==='head'),chest=hen.parts?.find(part=>part.motion==='breath');
 const adaptive=!!head&&!!chest&&columns===undefined&&rows===undefined;
 const sorted=(values:number[])=>[...new Set(values)].sort((a,b)=>a-b);
 const xs=adaptive?sorted([0,head!.cx-head!.rx*.5-left,head!.cx-left,head!.cx+head!.rx*.5-left,width]):Array.from({length:(columns??4)+1},(_,i)=>i*width/(columns??4));
 const ys=adaptive?sorted([0,head!.cy-head!.ry*.5-top,head!.cy-top,head!.cy+head!.ry*.5-top,chest!.cy-top,height]):Array.from({length:(rows??5)+1},(_,i)=>i*height/(rows??5));
 columns=xs.length-1;rows=ys.length-1;
 const count=xs.length*ys.length,source=new Float64Array(count*2),destination=new Float64Array(count*2);
 const influences=(hen.parts??[hen]).map(part=>({hen:part,weight:new Float64Array(count),weightX:new Float64Array(count),weightY:new Float64Array(count),motion:new Float64Array(6)}));
 const {weight,weightX,weightY,motion}=influences[0];
 for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
  const i=row*(columns+1)+column,x=xs[column],y=ys[row];source[i*2]=x;source[i*2+1]=y;
  for(const part of influences){const nx=(left+x-part.hen.cx)/part.hen.rx,ny=(top+y-part.hen.cy)/part.hen.ry,r2=nx*nx+ny*ny;part.weight[i]=r2<1?(1-r2)**3:0;part.weightX[i]=part.weight[i]*nx;part.weightY[i]=part.weight[i]*ny;}
 }
 const topology:number[]=[],add=(a:number,b:number,c:number)=>{if(influences.some(p=>p.weight[a]||p.weight[b]||p.weight[c]))topology.push(a,b,c);};
 for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1;add(a,b,c);add(b,d,c);}
 const triangles=new Uint16Array(topology),inverse=new Float64Array(topology.length/3*4);
 for(let i=0;i<triangles.length;i+=3){const p=triangles[i]*2,q=triangles[i+1]*2,r=triangles[i+2]*2,ux=source[q]-source[p],uy=source[q+1]-source[p+1],vx=source[r]-source[p],vy=source[r+1]-source[p+1],det=ux*vy-uy*vx,k=i/3*4;inverse[k]=vy/det;inverse[k+1]=-uy/det;inverse[k+2]=-vx/det;inverse[k+3]=ux/det;}
 return {hen,left,top,width,height,source,destination,weight,weightX,weightY,motion,influences,triangles,inverse,columns,rows};
}

export type BarnHenMesh=ReturnType<typeof prepareBarnHenMesh>;

/** Exactly the same displacement kernel as barnHenOffset, evaluated once per ROI. */
export function updateBarnHenMesh(mesh:BarnHenMesh,time:number){
 const {left,top,source,destination,influences}=mesh;
 for(let j=0;j<source.length;j+=2){destination[j]=left+source[j];destination[j+1]=top+source[j+1];}
 for(const part of influences){const {weight,weightX,weightY,motion}=part;barnHenMotion(time,part.hen,motion);
  for(let i=0,j=0;i<weight.length;i++,j+=2){destination[j]+=weight[i]*motion[0]+weightX[i]*motion[1]+weightY[i]*motion[2];destination[j+1]+=weight[i]*motion[3]+weightX[i]*motion[4]+weightY[i]*motion[5];}}
}

/** Render an opaque original-room patch, not an extra bird sprite. */
export function drawBarnHenMesh(ctx:CanvasRenderingContext2D,image:CanvasImageSource,mesh:BarnHenMesh,padding=0){
 const {source,destination,triangles,inverse,left,top,width,height}=mesh;
 // Clip expansion fills internal anti-alias seams but can never touch outside ROI.
 ctx.save();ctx.beginPath();ctx.rect(left,top,width,height);ctx.clip();
 for(let i=0,k=0;i<triangles.length;i+=3,k+=4){
  const p=triangles[i]*2,q=triangles[i+1]*2,r=triangles[i+2]*2;
  const px=destination[p],py=destination[p+1],qx=destination[q],qy=destination[q+1],rx=destination[r],ry=destination[r+1];
  const ux=qx-px,uy=qy-py,vx=rx-px,vy=ry-py;
  const a=ux*inverse[k]+vx*inverse[k+1],b=uy*inverse[k]+vy*inverse[k+1],c=ux*inverse[k+2]+vx*inverse[k+3],d=uy*inverse[k+2]+vy*inverse[k+3];
  let x0=px,y0=py,x1=qx,y1=qy,x2=rx,y2=ry;
  if(padding>0){
   // Scalar version of canvas-seam-guard: no per-triangle arrays or DOMMatrix.
   const ab=Math.hypot(ux,uy),bc=Math.hypot(rx-qx,ry-qy),ca=Math.hypot(px-rx,py-ry);
   const n0x=uy/ab,n0y=-ux/ab,n1x=(ry-qy)/bc,n1y=(qx-rx)/bc,n2x=(py-ry)/ca,n2y=(rx-px)/ca;
   const m0=padding/Math.max(.2,1+n2x*n0x+n2y*n0y),m1=padding/Math.max(.2,1+n0x*n1x+n0y*n1y),m2=padding/Math.max(.2,1+n1x*n2x+n1y*n2y);
   x0+=m0*(n2x+n0x);y0+=m0*(n2y+n0y);x1+=m1*(n0x+n1x);y1+=m1*(n0y+n1y);x2+=m2*(n1x+n2x);y2+=m2*(n1y+n2y);
  }
  ctx.save();ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.lineTo(x2,y2);ctx.closePath();ctx.clip();
  ctx.transform(a,b,c,d,px-a*source[p]-c*source[p+1],py-b*source[p]-d*source[p+1]);ctx.drawImage(image,0,0);ctx.restore();
 }
 ctx.restore();
}

/** One continuous patch per bird combines head and chest movement without seams. */
export async function createBarnHens(art:HTMLImageElement,hens:BarnHenRegion[]){
 const patches=await Promise.all(hens.map(async hen=>{
  const mesh=prepareBarnHenMesh(hen),image=document.createElement('canvas');image.width=mesh.width;image.height=mesh.height;
  image.getContext('2d')!.drawImage(art,mesh.left,mesh.top,mesh.width,mesh.height,0,0,mesh.width,mesh.height);
  // Immutable textures avoid a mutable-canvas snapshot for every mesh triangle.
  const texture=typeof createImageBitmap==='function'?await createImageBitmap(image).catch(()=>image):image;
  return {mesh,image:texture};
 }));
 // Pass DPR*cover.scale for a consistent 0.35 physical-pixel seam overlap.
 // Omitting pixelScale keeps the old clip behavior and avoids getTransform().
 const draw=(ctx:CanvasRenderingContext2D,time:number,pixelScale=0)=>{
  const padding=pixelScale>0?.35/pixelScale:0;
  for(let i=0;i<patches.length;i++){const p=patches[i];updateBarnHenMesh(p.mesh,time);drawBarnHenMesh(ctx,p.image,p.mesh,padding);}
 };
 return Object.assign(draw,{dispose:()=>{for(const p of patches)if('close' in p.image)p.image.close();}});
}

