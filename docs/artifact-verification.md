# Artifact verification — proposed hackathon improvement

Status: draft; not an official challenge submission. The browser manifest auditor existed before this change. This branch adds byte-level local verification in a separate CLI.

## Try it

Requires Node.js 22+. Create a synthetic example, with exactly three bytes (no newline):

    node -e "require('node:fs').writeFileSync('example.txt','abc')"
    node verify-artifact.mjs example.txt ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    node --test verify-artifact.test.mjs

Exit codes: 0 match, 1 mismatch, 2 usage or read failure. JSON provides expected and computed digest, byte count and match status. The input is streamed in local memory; no uploads or execution of the artifact.

## Evidence and limitations

On November 21, 2026, [GitHub Actions run 44859032744, job 136707879332](https://github.com/Royalpuskar/release-evidence/actions/runs/44859032744/job/136707879332) executed `node --test test.mjs verify-artifact.test.mjs` on Ubuntu with Node.js v22.23.4. The checkout log identifies PR #2 head `4823e5c4fa8e8d29d4891a5723179e5d08a440ba` merged into base `a249a71ec6644d23f45038ff7050509cf03c90e6` for CI. All nine tests passed (zero failures and zero skips): three manifest-engine tests and six CLI tests.

The six CLI test names, taken from the CI output, are:

- `matches independently known SHA-256 vector` — passed
- `detects changed content` — passed
- `rejects invalid hash, missing file and directory` — passed
- `CLI exits 0 for match, 1 for mismatch, 2 for error` — passed
- `symlinked CLI still verifies content and returns mismatch status` — passed
- `importing the verifier has no CLI side effects` — passed

These results apply to that recorded CI run, not automatically to later commits. Windows and macOS execution remain unverified; on Windows the symlink regression test may skip if the account lacks permission to create symbolic links. The latest Qodo report for the tested head no longer lists the original high-priority symlink bug, but its documentation and CI action pinning findings require separate follow-up.

Use only files you own or are explicitly authorized to read. A matching digest is not a signature or proof of publisher identity; obtain expected digests through a trusted channel. File metadata checks detect some concurrent changes, not every adversarial race. This tool supports explicitly selected regular files (including resolved symlinks); do not use it as a sandbox or point it at untrusted paths. No production security claim.

## Learning notes

Explain why streaming avoids whole-file allocation, why digest provenance matters, and why exit codes matter for CI. Run the test suite personally and alter the fixture to observe a mismatch.

AI assistance: ChatGPT drafted the implementation, tests and documentation and inspected the linked CI and Qodo records. No additional local execution is claimed for this evidence update. Event registration was reported complete by the entrant; entrant review, official challenge mapping and submission remain pending. No challenge completion or prize claim is made.
