// Small, bounded diagnostics for comparing actual scene rendering costs.
export function renderStats(canvas:HTMLCanvasElement){
 let start=performance.now(),samples:number[]=[];
 return (began:number)=>{samples.push(performance.now()-began);const now=performance.now();if(now-start<2500)return;
  const ordered=samples.toSorted((a,b)=>a-b);
  canvas.dataset.renderMs=(samples.reduce((a,b)=>a+b,0)/samples.length).toFixed(2);
  canvas.dataset.renderP95=ordered[Math.floor(ordered.length*.95)].toFixed(2);
  canvas.dataset.renderFps=(samples.length*1000/(now-start)).toFixed(1);
  samples=[];start=now;
 };
}
