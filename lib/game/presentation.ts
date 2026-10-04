// Presentation time stops with the hidden scene; wallet timing uses wall time.
export function visibleDelay(milliseconds:number,signal?:AbortSignal):Promise<void>{
 return new Promise(resolve=>{
  let remaining=Math.max(0,milliseconds),started=0,timer:ReturnType<typeof setTimeout>|undefined,done=false;
  const page=typeof document==='undefined'?null:document;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);page?.removeEventListener('visibilitychange',change);signal?.removeEventListener('abort',finish);resolve();};
  const resume=()=>{if(done||page?.hidden)return;started=Date.now();timer=setTimeout(finish,remaining);};
  const change=()=>{if(page?.hidden){if(timer!==undefined){remaining=Math.max(0,remaining-(Date.now()-started));clearTimeout(timer);timer=undefined;}}else resume();};
  if(signal?.aborted){finish();return;}
  signal?.addEventListener('abort',finish,{once:true});page?.addEventListener('visibilitychange',change);resume();
 });
}
