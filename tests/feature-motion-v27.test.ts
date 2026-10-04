import test from 'node:test';
import assert from 'node:assert/strict';
import {SYMBOLS} from '../lib/game/math.ts';
import {reelFillerIndex} from '../lib/game/reel-motion.ts';

void test('feature flight strips contain no duplicate decorative Wild and retain every other symbol',()=>{
 const wild=SYMBOLS.indexOf('wild');
 for(let column=1;column<=3;column++){
  const visible=new Set<string>();
  for(let slot=-50;slot<=50;slot++){
   const picture=reelFillerIndex(slot,column,SYMBOLS.length,wild);
   assert.ok(picture>=0&&picture<SYMBOLS.length);
   assert.notEqual(SYMBOLS[picture],'wild');visible.add(SYMBOLS[picture]);
  }
  assert.deepEqual([...visible].sort(),SYMBOLS.filter(symbol=>symbol!=='wild').sort());
 }
});
void test('ordinary strip order is unchanged when no flight symbol is omitted',()=>{
 for(let column=0;column<5;column++)for(let slot=-50;slot<=50;slot++){
  const expected=((slot+column*3)%SYMBOLS.length+SYMBOLS.length)%SYMBOLS.length;
  assert.equal(reelFillerIndex(slot,column,SYMBOLS.length),expected);
 }
});
