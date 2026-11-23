import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from './engine.mjs';
const hash = 'a'.repeat(64);
test('duplicate artifact paths are reported',()=>{const report=run({checks:[],artifacts:[{path:'x',expected:hash,actual:hash},{path:'x',expected:hash,actual:hash}]});assert.equal(report.rows[1].result,'duplicate');assert.equal(report.metrics.issues,1);});
test('mismatched digests are reported',()=>{const report=run({checks:[],artifacts:[{path:'x',expected:hash,actual:'b'.repeat(64)}]});assert.equal(report.rows[0].result,'mismatch');});
test('empty report is not a pass',()=>assert.equal(run({checks:[],artifacts:[]}).metrics.passed,false));
test('invalid digest rejected',()=>assert.throws(()=>run({checks:[],artifacts:[{path:'x',expected:'bad',actual:hash}]}),/SHA-256/));
test('failed check is counted',()=>assert.equal(run({checks:[{name:'build',passed:false}],artifacts:[]}).metrics.issues,1));
