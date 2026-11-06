import test from 'node:test';
import assert from 'node:assert/strict';
import {MAX_VIDEOS_PER_ITEM,normalizeVideoIds} from './videoLimits.js';
const ids=Array.from({length:6},(_,i)=>`video00000${i}`);
test('fourth and fifth videos survive add, JSON save/reload and backup normalization',()=>{
  assert.equal(MAX_VIDEOS_PER_ITEM,5);
  let videos=ids.slice(0,3);
  for(const id of ids.slice(3,5))videos=normalizeVideoIds([...videos,id]);
  assert.deepEqual(videos,ids.slice(0,5));
  const restored=JSON.parse(JSON.stringify({items:[{videos}]}));
  assert.deepEqual(normalizeVideoIds(restored.items[0].videos),ids.slice(0,5));
  assert.deepEqual(normalizeVideoIds([...videos,ids[5]]),ids.slice(0,5));
});
test('invalid and duplicate IDs do not consume video slots',()=>{
  assert.deepEqual(normalizeVideoIds([ids[0],ids[0],null,'bad',...ids.slice(1,5)]),ids.slice(0,5));
});
