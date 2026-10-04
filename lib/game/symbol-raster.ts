import {symbolResource} from './spine-resources';
import {createSymbolCanvasRenderer} from './symbol-canvas-renderer';
import {SYMBOL_VIEW,symbolViewport} from './reel-motion';

// One assembled raster per symbol; mini mechanic previews share the pixels
// instead of maintaining a separate live Spine skeleton for every tiny cell.
const cache=new Map<string,Promise<HTMLCanvasElement>>();
export function symbolRaster(name:string){
 let result=cache.get(name);if(result)return result;
 result=symbolResource(name).then(({spine,data})=>{
  const canvas=document.createElement('canvas');canvas.width=SYMBOL_VIEW.width;canvas.height=SYMBOL_VIEW.height;
  const context=canvas.getContext('2d');if(!context)throw Error('CANVAS');
  const skeleton=new spine.Skeleton(data),view=symbolViewport(canvas.width,canvas.height),renderer=createSymbolCanvasRenderer(context);
  skeleton.setToSetupPose();skeleton.updateWorldTransform(spine.Physics.update);context.translate(view.x,view.y);context.scale(view.scale,-view.scale);renderer.draw(skeleton);return canvas;
 }).catch(error=>{cache.delete(name);throw error;});cache.set(name,result);return result;
}
