import {BlendMode,MeshAttachment,RegionAttachment,type Skeleton} from '@esotericsoftware/spine-core';

/** Canvas renderer shared by the live symbols and the rolling picture cache.
 * Source UVs and actual Spine world vertices determine every projection. In
 * particular, a region's authored height need not match the bitmap aspect ratio.
 */
export function createSymbolCanvasRenderer(ctx:CanvasRenderingContext2D){
 let vertices=new Float32Array(64);
 const quad=new Float32Array(8);
 const blend:GlobalCompositeOperation[]=['source-over','lighter','multiply','screen'];
 const affine=(image:CanvasImageSource & {width:number;height:number},xy:Float32Array,uv:ArrayLike<number>,i0:number,i1:number,i2:number,padding:number,quadMode=false)=>{
  const p=i0*2,q=i1*2,r=i2*2,x0=xy[p],y0=xy[p+1],x1=xy[q],y1=xy[q+1],x2=xy[r],y2=xy[r+1];
  // Spine atlas UVs refer to pixel edges divided by the FULL page dimensions.
  // width-1 shifts the sample by up to one source pixel and breaks tiled meshes.
  const u0=uv[p]*image.width,v0=uv[p+1]*image.height,u1=uv[q]*image.width,v1=uv[q+1]*image.height,u2=uv[r]*image.width,v2=uv[r+1]*image.height;
  const X1=x1-x0,Y1=y1-y0,X2=x2-x0,Y2=y2-y0,U1=u1-u0,V1=v1-v0,U2=u2-u0,V2=v2-v0,det=U1*V2-U2*V1,signed=X1*Y2-Y1*X2;
  if(!Number.isFinite(det)||!Number.isFinite(signed)||Math.abs(det)<1e-10||Math.abs(signed)<1e-9)return;
  const a=(V2*X1-V1*X2)/det,b=(V2*Y1-V1*Y2)/det,c=(U1*X2-U2*X1)/det,d=(U1*Y2-U2*Y1)/det,e=x0-a*u0-c*v0,f=y0-b*u0-d*v0;
  ctx.save();
  if(quadMode){
   // A raster crop is already a quad clip. Avoid the extra canvas clipping
   // operation for rigid parts, including 90-degree packed atlas regions.
   const minU=Math.min(uv[0],uv[2],uv[4],uv[6])*image.width,maxU=Math.max(uv[0],uv[2],uv[4],uv[6])*image.width;
   const minV=Math.min(uv[1],uv[3],uv[5],uv[7])*image.height,maxV=Math.max(uv[1],uv[3],uv[5],uv[7])*image.height;
   ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,minU,minV,maxU-minU,maxV-minV,minU,minV,maxU-minU,maxV-minV);ctx.restore();return;
  }else{
   ctx.beginPath();
   // Expand only the clip, preserving UV mapping. Adjacent triangles cover
   // the same sub-pixel seam rather than revealing the reel background.
   const sign=signed<0?-1:1,l0=Math.hypot(X1,Y1),l1=Math.hypot(x2-x1,y2-y1),l2=Math.hypot(x0-x2,y0-y2);
   const n0x=sign*Y1/l0,n0y=-sign*X1/l0,n1x=sign*(y2-y1)/l1,n1y=-sign*(x2-x1)/l1,n2x=sign*(y0-y2)/l2,n2y=-sign*(x0-x2)/l2;
   const m0=padding/Math.max(.2,1+n2x*n0x+n2y*n0y),m1=padding/Math.max(.2,1+n0x*n1x+n0y*n1y),m2=padding/Math.max(.2,1+n1x*n2x+n1y*n2y);
   ctx.moveTo(x0+m0*(n2x+n0x),y0+m0*(n2y+n0y));ctx.lineTo(x1+m1*(n0x+n1x),y1+m1*(n0y+n1y));ctx.lineTo(x2+m2*(n1x+n2x),y2+m2*(n1y+n2y));
  }
  ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(image,0,0);ctx.restore();
 };
 return {draw(skeleton:Skeleton){
  const m=ctx.getTransform(),pixelScale=Math.max(Math.hypot(m.a,m.b),Math.hypot(m.c,m.d));
  if(!Number.isFinite(pixelScale)||pixelScale<1e-9)return;
  const padding=.35/pixelScale;
  ctx.save();
  for(const slot of skeleton.drawOrder){
   if(!slot.bone.active)continue;
   const attachment=slot.getAttachment();
   if(!(attachment instanceof RegionAttachment)&&!(attachment instanceof MeshAttachment))continue;
   const alpha=skeleton.color.a*slot.color.a*attachment.color.a;if(alpha<=0)continue;
   const image=attachment.region?.texture.getImage();if(!image||!image.width||!image.height)continue;
   ctx.globalAlpha=alpha;ctx.globalCompositeOperation=blend[slot.data.blendMode??BlendMode.Normal]||'source-over';
   if(attachment instanceof RegionAttachment){
    attachment.computeWorldVertices(slot,quad,0,2);affine(image,quad,attachment.uvs,0,1,2,0,true);
   }else{
    const length=attachment.worldVerticesLength;
    if(vertices.length<length)vertices=new Float32Array(2**Math.ceil(Math.log2(length)));
    attachment.computeWorldVertices(slot,0,length,vertices,0,2);
    for(let i=0;i<attachment.triangles.length;i+=3)affine(image,vertices,attachment.uvs,attachment.triangles[i],attachment.triangles[i+1],attachment.triangles[i+2],padding);
   }
  }
  ctx.restore();
 }};
}
