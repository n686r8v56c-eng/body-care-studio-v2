import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeVideoIds} from './videoLimits.js';
const ids=Array.from({length:30},(_,i)=>`video${String(i).padStart(6,'0')}`);
test('all videos survive add, JSON save/reload and backup normalization',()=>{
  let videos=[];
  for(const id of ids)videos=normalizeVideoIds([...videos,id]);
  assert.deepEqual(videos,ids);
  const restored=JSON.parse(JSON.stringify({items:[{videos}]}));
  assert.deepEqual(normalizeVideoIds(restored.items[0].videos),ids);
});
test('invalid and duplicate IDs are removed without limiting count',()=>{
  assert.deepEqual(normalizeVideoIds([ids[0],ids[0],null,'bad',...ids.slice(1)]),ids);
});
