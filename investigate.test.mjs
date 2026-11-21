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


// Minimal DOM harness exercises the actual UI module and its event handlers.
// This is a Node integration test, not a complete browser smoke test.
test('investigation UI retains in-flight attestations and invalidates changed inputs',async()=>{
  class Element {
    constructor(){this.children=[];this.listeners={};this.value='';this.checked=false;this.textContent='';this.files=[];this.classList={toggle(){}};}
    append(...items){this.children.push(...items);}
    replaceChildren(...items){this.children=items;}
    addEventListener(type,listener){this.listeners[type]=listener;}
    fire(type){return this.listeners[type]();}
  }
  const nodes=new Map();
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{
    getElementById(id){if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);},
    createElement(){return new Element();},
    createTextNode(text){return text;}
  }});
  const node=id=>nodes.get(id);
  function deferredFile(){
    let resolve,reject;
    const pending=new Promise((yes,no)=>{resolve=yes;reject=no;});
    return {file:{size:3,arrayBuffer:()=>pending},resolve,reject};
  }
  try{
    await import('./investigate.mjs');
    const claims=node('checks').children.map(label=>label.children[0]);
    const checkAll=()=>{for(const input of claims){input.checked=true;input.fire('change');}};
    const assertCleared=()=>assert.ok(claims.every(input=>!input.checked));
    const assertRetained=()=>assert.ok(claims.every(input=>input.checked));
    node('expected').value=known;node('expected').fire('input');
    const first=deferredFile();
    node('artifact').files=[first.file];
    const run=node('artifact').fire('change');
    assertCleared();checkAll();
    assert.equal(node('decision').textContent,'BLOCKED');
    first.resolve(new TextEncoder().encode('abc').buffer);
    await run;
    assertRetained();
    assert.equal(node('decision').textContent,'READY FOR HUMAN REVIEW');
    node('expected').value='0'.repeat(64);node('expected').fire('input');
    assertCleared();assert.equal(node('decision').textContent,'BLOCKED');
    const second=deferredFile();
    node('artifact').files=[second.file];
    const failed=node('artifact').fire('change');
    checkAll();second.reject(new Error('synthetic read failure'));await failed;
    assertRetained();assert.equal(node('decision').textContent,'BLOCKED');
    assert.equal(node('status').textContent,'synthetic read failure');
    const stale=deferredFile(), fresh=deferredFile();
    node('artifact').files=[stale.file];const oldRun=node('artifact').fire('change');
    node('artifact').files=[fresh.file];const newRun=node('artifact').fire('change');
    assertCleared();checkAll();
    fresh.resolve(new TextEncoder().encode('abd').buffer);await newRun;
    const current=node('actual').textContent;
    stale.resolve(new TextEncoder().encode('abc').buffer);await oldRun;
    assert.equal(node('actual').textContent,current);
    assertRetained();assert.equal(node('decision').textContent,'BLOCKED');
  }finally{
    if(previous)Object.defineProperty(globalThis,'document',previous);
    else delete globalThis.document;
  }
});
