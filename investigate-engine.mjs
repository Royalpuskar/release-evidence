// A local evidence gate. Manual attestations are claims, not authenticated proof.
export const MAX_BYTES = 32 * 1024 * 1024;
export const CHECKS = [
  { id: 'tests', label: 'Test evidence reviewed', action: 'Review the actual test report for this release.' },
  { id: 'review', label: 'Code review evidence reviewed', action: 'Review findings and record the remaining risk.' },
  { id: 'source', label: 'Expected digest source trusted', action: 'Obtain the expected hash from an independently trusted source.' }
];
export async function sha256(file, subtle = globalThis.crypto?.subtle) {
  if (!file || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_BYTES) throw new Error('Select a file of at most 32 MiB.');
  if (!subtle) throw new Error('Web Crypto unavailable. Open on HTTPS or localhost.');
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength !== file.size) throw new Error('File length changed; select again.');
  return Array.from(new Uint8Array(await subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export function assess({expected = '', actual = '', attestations = {}} = {}) {
  const valid = v => typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
  const format = typeof expected === 'string' ? expected.trim() : '';
  const digest = valid(actual) ? actual.toLowerCase() : null;
  const target = valid(format) ? format.toLowerCase() : null;
  const integrity = !digest || !target ? 'missing' : digest === target ? 'match' : 'mismatch';
  const rows = [
    {id:'integrity',label:'Artifact byte verification',state:integrity === 'match' ? 'pass' : integrity, action:integrity === 'mismatch' ? 'Investigate the difference; obtain the intended artifact. Do not replace a trusted digest just to pass.' : 'Select the intended file and enter its independently obtained SHA-256.'},
    ...CHECKS.map(c => ({id:c.id,label:c.label,state:Object.hasOwn(attestations,c.id) && attestations[c.id] === true ? 'attested' : 'missing',action:c.action}))
  ];
  const blockers = rows.filter(r => r.state !== 'pass' && r.state !== 'attested');
  return {decision:blockers.length ? 'BLOCKED' : 'READY FOR HUMAN REVIEW',integrity,expected:target,actual:digest,rows,blockers};
}
