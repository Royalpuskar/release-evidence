import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyArtifact } from './verify-artifact.mjs';

const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const cli = fileURLToPath(new URL('./verify-artifact.mjs', import.meta.url));
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'release-evidence-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'artifact.txt');
  await writeFile(file, 'abc');
  return { dir, file };
}
test('matches independently known SHA-256 vector', async t => {
  const { file } = await fixture(t);
  const result = await verifyArtifact(file, expected.toUpperCase());
  assert.deepEqual(result, { algorithm: 'sha256', bytes: '3', expected, actual: expected, matched: true });
});
test('detects changed content', async t => {
  const { file } = await fixture(t);
  await writeFile(file, 'abd');
  assert.equal((await verifyArtifact(file, expected)).matched, false);
});
test('rejects invalid hash, missing file and directory', async t => {
  const { dir, file } = await fixture(t);
  await assert.rejects(verifyArtifact(file, 'bad'), /64-character/);
  await assert.rejects(verifyArtifact(join(dir, 'missing'), expected));
  await assert.rejects(verifyArtifact(dir, expected), /regular files/);
});
test('CLI exits 0 for match, 1 for mismatch, 2 for error', async t => {
  const { file } = await fixture(t);
  const run = digest => spawnSync(process.execPath, [cli, file, digest], { encoding: 'utf8' });
  const good = run(expected);
  assert.equal(good.status, 0);
  assert.equal(JSON.parse(good.stdout).matched, true);
  assert.equal(run('0'.repeat(64)).status, 1);
  assert.equal(run('bad').status, 2);
});
