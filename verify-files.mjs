#!/usr/bin/env node
/**
 * Verify actual local file bytes against a JSON manifest.
 * Usage: node verify-files.mjs manifest.json [root-directory]
 * Manifest: {"artifacts":[{"path":"dist/app.js","expected":"<64 hex chars>"}]}
 * No network access. Symlinks are rejected, and paths must stay within root.
 */
import {readFile, lstat, realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, relative, isAbsolute, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function verifyFiles(manifest, root = process.cwd()) {
  if (!manifest || !Array.isArray(manifest.artifacts) || manifest.artifacts.length > 500)
    throw new Error('Manifest requires artifacts array (maximum 500)');
  const base = await realpath(root);
  const seen = new Set();
  const results = [];
  for (const item of manifest.artifacts) {
    if (!item || typeof item.path !== 'string' || !item.path.trim() ||
        typeof item.expected !== 'string' || !/^[a-f0-9]{64}$/i.test(item.expected))
      throw new Error('Each artifact needs a path and 64-character SHA-256 digest');
    const path = item.path;
    if (isAbsolute(path) || path.includes('\\') || path.split('/').includes('..') ||
        path.includes('\0')) throw new Error('Unsafe artifact path: ' + path);
    const full = resolve(base, path);
    const rel = relative(base, full);
    if (!rel || rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel))
      throw new Error('Artifact path escapes root: ' + path);
    if (seen.has(rel)) {
      results.push({path, result:'duplicate'});
      continue;
    }
    seen.add(rel);
    try {
      // Refuse symlinks in any component, not only the final file.
      let current = base;
      for (const part of rel.split(sep)) {
        current = resolve(current, part);
        const stat = await lstat(current);
        if (stat.isSymbolicLink()) throw new Error('Symlink not allowed');
      }
      const stat = await lstat(full);
      if (!stat.isFile()) throw new Error('Not a regular file');
      const bytes = await readFile(full);
      const actual = createHash('sha256').update(bytes).digest('hex');
      results.push({path, expected:item.expected.toLowerCase(), actual,
        result: actual === item.expected.toLowerCase() ? 'pass' : 'mismatch'});
    } catch (err) {
      results.push({path, result:'error', reason:err.message});
    }
  }
  return {passed:results.length > 0 && results.every(r=>r.result==='pass'),
    issues:results.filter(r=>r.result!=='pass').length, results};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('Usage: node verify-files.mjs manifest.json [root]');
    const manifest = JSON.parse(await readFile(file, 'utf8'));
    const report = await verifyFiles(manifest, process.argv[3] || process.cwd());
    process.stdout.write(JSON.stringify(report,null,2) + '\n');
    if (!report.passed) process.exitCode = 1;
  } catch (err) {
    process.stderr.write(err.message + '\n');
    process.exitCode = 2;
  }
}
