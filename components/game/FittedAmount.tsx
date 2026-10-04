'use client';
import {memo,useLayoutEffect,useRef} from 'react';

// Keep the complete server amount readable inside its allotted control column.
export function useFittedAmount<T extends HTMLElement>(value:string){
 const ref=useRef<T>(null);
 useLayoutEffect(()=>{
  const text=ref.current,container=text?.parentElement;if(!text||!container)return;let alive=true;
  const fit=()=>{
   if(!alive)return;const style=getComputedStyle(container),base=parseFloat(style.fontSize);
   const available=container.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
   if(available<=0)return;text.style.fontSize='';const measure=document.createElement('canvas').getContext('2d');if(!measure)return;
   measure.font=style.fontWeight+' '+base+'px '+style.fontFamily;
   const natural=measure.measureText(value).width+(parseFloat(style.letterSpacing)||0)*Math.max(0,value.length-1);
   if(natural>available)text.style.fontSize=(base*(available-1)/natural)+'px';
  };
  const observer=new ResizeObserver(fit);observer.observe(container);fit();void document.fonts.ready.then(fit);
  return()=>{alive=false;observer.disconnect();};
 },[value]);
 return ref;
}
export default memo(function FittedAmount({value}:{value:string}){
 const ref=useFittedAmount<HTMLSpanElement>(value);
 return <span ref={ref} className="fitted-amount">{value}</span>;
});
