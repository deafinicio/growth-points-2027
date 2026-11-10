import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSession,sessionReducer} from '../src/presentation.js';
const send=(s,type,other={})=>sessionReducer(s,{type,...other});
test('nine answers form three chapters and one tree in the exact 3 / 5 / 1 order',()=>{
  let s=send(initialSession(),'START');const chapters=[];
  for(let i=0;i<9;i++){
    assert.equal(s.phase,'question');assert.equal(s.index,i);
    s=send(s,'ADVANCE');assert.equal(s.phase,'growing');assert.equal(s.built.length,i+1);
    s=send(s,'GROWTH_DONE');
    if([2,7,8].includes(i)){assert.equal(s.phase,'chapter');chapters.push(s.built.length);s=send(s,'CONTINUE');}
  }
  assert.deepEqual(chapters,[3,8,9]);assert.equal(s.phase,'finale');assert.deepEqual(s.built,[0,1,2,3,4,5,6,7,8]);
});
test('back navigation preserves growth; presenting the same answer never duplicates a part',()=>{
  let s=send(initialSession(),'START');s=send(send(s,'ADVANCE'),'GROWTH_DONE');s=send(s,'BACK');assert.equal(s.index,0);assert.deepEqual(s.built,[0]);
  s=send(s,'ADVANCE');assert.equal(s.phase,'question');assert.equal(s.index,1);assert.deepEqual(s.built,[0]);
});
test('early skipping, double advances, and jumping during an animation cannot corrupt the sequence',()=>{
  let s=send(initialSession(),'START');assert.deepEqual(send(s,'JUMP',{index:8}),s);
  s=send(s,'ADVANCE');for(const action of ['ADVANCE','BACK','CONTINUE'])assert.deepEqual(send(s,action),s);
  assert.deepEqual(send(s,'JUMP',{index:0}),s);assert.equal(send(s,'HOME').built.length,0);
});
