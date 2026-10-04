import test from 'node:test';
import assert from 'node:assert/strict';
import {winReaction,presentedLines} from '../lib/game/win-presentation.ts';
import type {LineWin} from '../lib/game/math.ts';
void test('ordinary free-spin wins acknowledge without replaying the long celebration',()=>{
 assert.equal(winReaction(.1,true),'rage-small-win');
 assert.equal(winReaction(19.99,true),'rage-small-win');
 assert.equal(winReaction(20,true),'rage-win');
 assert.equal(winReaction(.1,false),'win');
 assert.equal(winReaction(20,false),'celebrate');
});
void test('line presentation keeps server contributions intact and suppresses uncapped amounts at max win',()=>{
 const lines:LineWin[]=Array.from({length:5},(_,i)=>({line:i,symbol:'A',count:3,multiplier:1,payout:[.5,4,1,3,2][i],cells:['0:0','1:0','2:0']}));
 const original=structuredClone(lines),shown=presentedLines(lines);
 assert.deepEqual(shown.map(l=>l.line),[1,3,4]);
 assert.deepEqual(lines,original);
 assert.ok(shown.every(l=>lines.includes(l)));
 assert.deepEqual(presentedLines(lines,true),[]);
});
