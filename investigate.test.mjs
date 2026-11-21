import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {assess,sha256,MAX_BYTES} from './investigate-engine.mjs';
const known='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const attestations={tests:true,review:true,source:true};
test('investigation computes real bytes and detects changes',async()=>{
  assert.equal(await sha256(new Blob(['abc']),webcrypto.subtle),known);
  assert.notEqual(await sha256(new Blob(['abd']),webcrypto.subtle),known);
});
test('investigation blocks on missing or malformed evidence',()=>{
  assert.equal(assess().blockers.length,4);
  assert.equal(assess({expected:'bad',actual:known,attestations}).decision,'BLOCKED');
  assert.equal(assess({expected:known,actual:known,attestations:{}}).blockers.length,3);
});
test('investigation mismatch cannot be overridden by manual attestations',()=>{
  const result=assess({expected:known,actual:'0'.repeat(64),attestations});
  assert.equal(result.decision,'BLOCKED');
  assert.deepEqual(result.blockers.map(r=>r.id),['integrity']);
});
test('investigation requires strict boolean attestations and never grants approval',()=>{
  assert.equal(assess({expected:known.toUpperCase(),actual:known,attestations}).decision,'READY FOR HUMAN REVIEW');
  assert.equal(assess({expected:known,actual:known,attestations:{...attestations,tests:'true'}}).decision,'BLOCKED');
  assert.equal(assess({expected:known,actual:known,attestations:Object.create(attestations)}).decision,'BLOCKED');
});
test('investigation rejects oversized inputs before reading',async()=>{
  await assert.rejects(sha256({size:MAX_BYTES+1,arrayBuffer(){throw Error('must not read');}},webcrypto.subtle),/32 MiB/);
  await assert.rejects(sha256({size:3,arrayBuffer:async()=>new ArrayBuffer(2)},webcrypto.subtle),/length changed/);
});
