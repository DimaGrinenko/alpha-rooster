type Point=[number,number];
type Texture=HTMLImageElement|ImageBitmap|HTMLCanvasElement|OffscreenCanvas;

// Canvas clips are antialiased independently, leaving hairline gaps between
// adjacent mesh triangles. Preserve the authored UV mapping and overlap only
// the clip by 0.45 physical pixels. The WebGL renderer does not need this.
export function installTriangleSeamGuard(renderer:object,ctx:CanvasRenderingContext2D){
 const drawTriangle=(img:Texture,x0:number,y0:number,u0:number,v0:number,x1:number,y1:number,u1:number,v1:number,x2:number,y2:number,u2:number,v2:number)=>{
  if(img.width<=1||img.height<=1||![x0,y0,u0,v0,x1,y1,u1,v1,x2,y2,u2,v2,img.width,img.height].every(Number.isFinite))return;
  const signed=(x1-x0)*(y2-y0)-(y1-y0)*(x2-x0);
  if(Math.abs(signed)<1e-9)return;
  u0*=img.width-1;v0*=img.height-1;u1*=img.width-1;v1*=img.height-1;u2*=img.width-1;v2*=img.height-1;
  const X1=x1-x0,Y1=y1-y0,X2=x2-x0,Y2=y2-y0,U1=u1-u0,V1=v1-v0,U2=u2-u0,V2=v2-v0,det=U1*V2-U2*V1;
  if(Math.abs(det)<1e-12)return;
  const transform=ctx.getTransform(),pixelScale=Math.max(Math.hypot(transform.a,transform.b),Math.hypot(transform.c,transform.d));
  if(!Number.isFinite(pixelScale)||pixelScale<1e-9)return;
  const padding=.45/pixelScale,points:Point[]=[[x0,y0],[x1,y1],[x2,y2]],sign=signed<0?-1:1;
  const normals:Point[]=points.map((p,i)=>{const q=points[(i+1)%3],dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy);return [sign*dy/length,-sign*dx/length];});
  const expanded:Point[]=points.map((p,i)=>{const a=normals[(i+2)%3],b=normals[i],den=Math.max(.2,1+a[0]*b[0]+a[1]*b[1]);return [p[0]+padding*(a[0]+b[0])/den,p[1]+padding*(a[1]+b[1])/den];});
  const a=(V2*X1-V1*X2)/det,b=(V2*Y1-V1*Y2)/det,c=(U1*X2-U2*X1)/det,d=(U1*Y2-U2*Y1)/det,e=x0-a*u0-c*v0,f=y0-b*u0-d*v0;
  ctx.save();ctx.beginPath();ctx.moveTo(...expanded[0]);ctx.lineTo(...expanded[1]);ctx.lineTo(...expanded[2]);ctx.closePath();ctx.clip();ctx.transform(a,b,c,d,e,f);ctx.drawImage(img,0,0);ctx.restore();
 };
 // Spine's TypeScript surface marks this method private, but the runtime calls
 // it by name. Install only on this fallback instance; never patch prototypes.
 Object.defineProperty(renderer,'drawTriangle',{value:drawTriangle});
}
