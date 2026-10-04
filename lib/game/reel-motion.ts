// The rolling cache and live skeleton share one fixed animation envelope.
export const SYMBOL_VIEW={width:302,height:330,baseline:155};
export function symbolViewport(width:number,height:number){
 const scale=Math.min(width/SYMBOL_VIEW.width,height/SYMBOL_VIEW.height);
 return {scale,x:width/2,y:height/2+SYMBOL_VIEW.baseline*scale};
}
export const REEL_BRAKE_SECONDS=.7;
export function drawMultiplier(ctx:CanvasRenderingContext2D,value:number,width:number,cellHeight:number,top=0){
 ctx.save();ctx.font=`900 ${Math.min(35,Math.max(12,width*.23))}px AlphaUI,Arial`;
 ctx.textAlign='right';ctx.textBaseline='bottom';ctx.lineJoin='round';ctx.lineWidth=2;
 ctx.strokeStyle='#805417';ctx.fillStyle='#fff1a2';
 const x=width*.94,y=top+cellHeight*.96;
 ctx.strokeText('×'+value,x,y);ctx.fillText('×'+value,x,y);ctx.restore();
}
export function completedReelPrefix(completed:ReadonlySet<number>){let count=0;while(count<5&&completed.has(count))count++;return count;}
// Decorative strips may omit a feature symbol already drawn by the flight layer.
// The authoritative result cells never pass through this selector.
export function reelFillerIndex(slot:number,column:number,pictureCount:number,omitted=-1){
 const exclude=omitted>=0&&omitted<pictureCount,count=pictureCount-(exclude?1:0);
 const index=((slot+column*3)%count+count)%count;
 return exclude&&index>=omitted?index+1:index;
}
export function reelBrake(position:number,velocity:number,speed:number){
 return {from:position,to:Math.floor(position)+4,velocity,duration:REEL_BRAKE_SECONDS/speed};
}
export function brakePosition(brake:ReturnType<typeof reelBrake>,elapsed:number){
 const t=Math.min(1,Math.max(0,elapsed/brake.duration));
 // Cubic Hermite: preserve incoming velocity and arrive at an integer with zero velocity.
 const distance=brake.to-brake.from,tangent=Math.min(brake.velocity*brake.duration,3*distance);
 return brake.from+(-2*t*t*t+3*t*t)*distance+(t*t*t-2*t*t+t)*tangent;
}

