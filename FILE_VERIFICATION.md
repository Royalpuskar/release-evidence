# Verify real release artifacts

The browser prototype compares user-provided digests. The separate Node.js command `verify-files.mjs` hashes **actual local file bytes** with SHA-256 and compares them to a manifest.

## Quick start

Requires Node.js 22+.

Create `release-manifest.json`:

```json
{
  "artifacts": [
    {
      "path": "dist/app.js",
      "expected": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    }
  ]
}
```

Replace the placeholder digest with the actual expected SHA-256 from a trusted build process, and ensure the file exists. Then run:

```sh
node verify-files.mjs release-manifest.json .
node --test
```

Exit code 0 means every artifact passed. Exit code 1 means at least one mismatch, duplicate or file error. Exit code 2 means the manifest or command itself was invalid.

Paths are relative to the supplied root directory. Absolute paths, traversal, and symbolic links are refused. No data is uploaded.

## Trust boundary

This checks local bytes against the **provided** manifest, not the authenticity of the manifest. An attacker who controls both can replace both. It does not verify digital signatures, provenance attestations, GitHub Actions identity, or remote deployment contents. For a high-assurance release, sign the manifest and verify the signature with an independently trusted key.

## Demonstration

1. Generate a correct digest from a local build artifact using your platform's SHA-256 utility.
2. Put it in the manifest and run the verifier: expect a pass.
3. Change one byte of the artifact and rerun: expect a mismatch and nonzero exit code.
4. Repeat with duplicate paths and a symbolic link: expect a failure.

The test suite covers pass, mismatch, traversal, missing files, duplicate paths and symlink handling. Test results must be verified in CI before claiming a green build.
