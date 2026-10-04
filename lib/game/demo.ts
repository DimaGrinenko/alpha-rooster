import type {Book,GameMode} from './math';
type Mode={cost:number;totalWeight:number;entries:{weight:number;book:Book}[]};
export type DemoLibrary={modes:Record<GameMode,Mode>};
let loading:Promise<DemoLibrary>|null=null;
export function loadDemo(){return loading??=fetch('./demo-library.json',{cache:'no-store'}).then(async r=>{if(!r.ok)throw Error('ASSET');return await r.json() as DemoLibrary;});}
const prepared=new WeakMap<Mode,number[]>();
export function pickDemo(library:DemoLibrary,name:GameMode):Book{
 const mode=library.modes[name];if(!mode||!Array.isArray(mode.entries)||!mode.entries.length)throw Error('STATE');let cumulative=prepared.get(mode);
 if(!cumulative){let total=0;cumulative=mode.entries.map(({weight})=>{if(!Number.isSafeInteger(weight)||weight<=0)throw Error('STATE');total+=weight;if(!Number.isSafeInteger(total))throw Error('STATE');return total;});if(total!==mode.totalWeight)throw Error('STATE');prepared.set(mode,cumulative);}
 const total=mode.totalWeight,range=2**53,limit=Math.floor(range/total)*total;const words=new Uint32Array(2);let value:number;
 do{crypto.getRandomValues(words);value=(words[0]&0x1fffff)*2**32+words[1];}while(value>=limit);
 const target=value%total;let lo=0,hi=cumulative.length-1;while(lo<hi){const mid=(lo+hi)>>>1;if(target<cumulative[mid])hi=mid;else lo=mid+1;}
 return structuredClone(mode.entries[lo].book);
}
