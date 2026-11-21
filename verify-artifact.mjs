import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { constants, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Verify an explicitly selected local regular file, without executing or uploading it.
export async function verifyArtifact(file, expected) {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected)) {
    throw new Error('Expected a 64-character hexadecimal SHA-256 digest');
  }
  const handle = await open(file, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile()) throw new Error('Only regular files are supported');
    const hash = createHash('sha256');
    let bytes = 0n;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
      bytes += BigInt(chunk.length);
    }
    const after = await handle.stat({ bigint: true });
    if (bytes !== before.size || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) {
      throw new Error('File changed during verification; retry with a stable file');
    }
    const actual = hash.digest('hex');
    return { algorithm: 'sha256', bytes: bytes.toString(), expected: expected.toLowerCase(), actual, matched: actual === expected.toLowerCase() };
  } finally {
    await handle.close();
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    // An importing process may have no corresponding on-disk entry point.
    return false;
  }
}

if (isMainModule()) {
  try {
    if (process.argv.length !== 4) throw new Error('Usage: node verify-artifact.mjs FILE EXPECTED_SHA256');
    const result = await verifyArtifact(process.argv[2], process.argv[3]);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.matched ? 0 : 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
