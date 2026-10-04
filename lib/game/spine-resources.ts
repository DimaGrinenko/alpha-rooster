import {loadImage} from './art';
import {SYMBOLS} from './math';
type SpineModule=typeof import('@esotericsoftware/spine-canvas');
type Resource={spine:SpineModule;data:import('@esotericsoftware/spine-core').SkeletonData};
const resources=new Map<string,Promise<Resource>>();
export function symbolResource(name:string){
 name=name.replace('-symbol','-v2-symbol');
 let promise=resources.get(name);
 if(!promise){
  promise=Promise.all([
   import('@esotericsoftware/spine-canvas'),
   fetch('./spine/'+name+'.json?revision=25').then(r=>{if(!r.ok)throw Error('ASSET');return r.json();}),
   fetch('./spine/'+name+'.atlas?revision=25').then(r=>{if(!r.ok)throw Error('ASSET');return r.text();})
  ]).then(async([spine,json,text])=>{
   const atlas=new spine.TextureAtlas(text);
   await Promise.all(atlas.pages.map(async page=>page.setTexture(new spine.CanvasTexture(await loadImage('./assets/'+page.name)))));
   return {spine,data:new spine.SkeletonJson(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(json)};
  }).catch(error=>{resources.delete(name);throw error;});
  resources.set(name,promise);
 }
 return promise;
}
export function preloadSymbolResources(){return Promise.all(SYMBOLS.map(id=>symbolResource(id+'-symbol')));}
