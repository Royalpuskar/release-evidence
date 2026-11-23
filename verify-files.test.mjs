import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyFiles} from './verify-files.mjs';

test('verifies real file bytes and reports mismatches',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'release-evidence-'));
  try {
    await writeFile(join(dir,'artifact.txt'),'release content');
    const digest=createHash('sha256').update('release content').digest('hex');
    const good=await verifyFiles({artifacts:[{path:'artifact.txt',expected:digest}]},dir);
    assert.equal(good.passed,true);
    const bad=await verifyFiles({artifacts:[{path:'artifact.txt',expected:'0'.repeat(64)}]},dir);
    assert.equal(bad.passed,false);
    assert.equal(bad.results[0].result,'mismatch');
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('rejects traversal and absolute paths',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'release-evidence-'));
  try {
    for(const path of ['../secret','/etc/passwd']) {
      await assert.rejects(verifyFiles({artifacts:[{path,expected:'0'.repeat(64)}]},dir),/Unsafe artifact path/);
    }
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('duplicate and missing files fail closed',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'release-evidence-'));
  try {
    await writeFile(join(dir,'file'),'x');
    const hash=createHash('sha256').update('x').digest('hex');
    const report=await verifyFiles({artifacts:[{path:'file',expected:hash},{path:'file',expected:hash},{path:'missing',expected:hash}]},dir);
    assert.equal(report.passed,false);
    assert.deepEqual(report.results.map(x=>x.result),['pass','duplicate','error']);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('rejects symbolic links',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'release-evidence-'));
  try {
    await writeFile(join(dir,'real'),'x');
    await symlink('real',join(dir,'link'));
    const hash=createHash('sha256').update('x').digest('hex');
    const report=await verifyFiles({artifacts:[{path:'link',expected:hash}]},dir);
    assert.equal(report.results[0].result,'error');
    assert.match(report.results[0].reason,/Symlink/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
