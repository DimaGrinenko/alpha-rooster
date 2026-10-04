// Same viewport and ground pivot as the multipart rooster's Spine rig.
// Midpoint of the two crate footprint polygons, rather than the front flowers.
export const HERO_STAGE={width:680,height:760,cameraX:8,cameraY:360,groundX:15.5,groundY:35.0561797752809};
export function heroGround(rect:{x:number;y:number;width:number;height:number}){
 const fit=Math.min(rect.width/HERO_STAGE.width,rect.height/HERO_STAGE.height);
 return {x:rect.x+rect.width/2+(HERO_STAGE.groundX-HERO_STAGE.cameraX)*fit,y:rect.y+rect.height/2+(HERO_STAGE.cameraY-HERO_STAGE.groundY)*fit,width:357*fit};
}
