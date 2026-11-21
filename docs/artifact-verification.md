# Artifact verification — proposed hackathon improvement

Status: draft; not an official challenge submission. The browser manifest auditor existed before this change. This branch adds byte-level local verification in a separate CLI.

## Try it

Requires Node.js 22+. Create a synthetic example, with exactly three bytes (no newline):

    node -e "require('node:fs').writeFileSync('example.txt','abc')"
    node verify-artifact.mjs example.txt ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    node --test verify-artifact.test.mjs

Exit codes: 0 match, 1 mismatch, 2 usage or read failure. JSON provides expected and computed digest, byte count and match status. The input is streamed in local memory; no uploads or execution of the artifact.

## Evidence and limitations

Four new tests passed in a local Linux Node.js 22.16.0 environment on November 21, 2026: known vector, tampered content, rejection behavior, and CLI exit codes. CI and Qodo review still need confirmation. Use only files you own or are explicitly authorized to read. A matching digest is not a signature or proof of publisher identity; obtain expected digests through a trusted channel. File metadata checks detect some concurrent changes, not every adversarial race. This tool supports explicitly selected regular files (including resolved symlinks); do not use it as a sandbox or point it at untrusted paths. No production security claim.

## Learning notes

Explain why streaming avoids whole-file allocation, why digest provenance matters, and why exit codes matter for CI. Run the test suite personally and alter the fixture to observe a mismatch.

AI assistance: ChatGPT drafted implementation, tests and documentation and ran the local test suite. Entrant review, official challenge mapping, Qodo review and registration remain pending. No challenge completion or prize claim is made.
