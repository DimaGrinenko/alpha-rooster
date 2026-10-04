// A renderer requests another frame only while it has visible work to do.
// Resizes, new animations and page visibility explicitly wake dormant renderers.
export function frameLoop(draw:(time:number)=>boolean,request:(callback:FrameRequestCallback)=>number=requestAnimationFrame,cancel:(id:number)=>void=cancelAnimationFrame){
 let frame:number|null=null,disposed=false;
 const wake=()=>{if(!disposed&&frame===null)frame=request(tick);};
 const tick=(time:number)=>{frame=null;if(!disposed&&draw(time))wake();};
 const dispose=()=>{disposed=true;if(frame!==null)cancel(frame);frame=null;};
 return {wake,dispose};
}
