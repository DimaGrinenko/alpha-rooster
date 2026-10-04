import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECT_TIMING as T,collectionFlightDuration} from '../lib/game/collect-presentation.ts';

void test('collection waits for every prize arc before resolving the authoritative award, at both playback speeds',()=>{
 for(const speed of [1,2.5])for(let eggs=1;eggs<=14;eggs++){
  const lastArrival=((eggs-1)*T.flightStagger+T.flight)/speed;
  const resolution=collectionFlightDuration(eggs)/speed;
  assert.ok(resolution>lastArrival);assert.ok(resolution-lastArrival>=T.arrivalHold/speed-1e-9);
 }
});
void test('fresh grid transition and collection never need to truncate a landing',()=>{
 assert.ok(T.departure>0);assert.ok(T.landing>=T.columnGap);assert.ok(T.flightStagger>0);
 assert.equal(collectionFlightDuration(14),1275);assert.equal(collectionFlightDuration(1),820);
});
