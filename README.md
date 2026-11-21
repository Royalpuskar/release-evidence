# Release Evidence

Audit a release manifest for failed checks, duplicate artifacts, and mismatched SHA-256 digests.

**Status:** implemented browser-local research prototype. Automated tests can be reproduced with the command below. GitHub Pages deployed and browser smoke checks completed on 20 November 2026.

## Website

Live website: https://royalpuskar.github.io/release-evidence/

## Evidence Desk (proposed extension)

On this development branch, serve the repository with `python3 -m http.server 8000` and open `http://localhost:8000/investigate.html`. The new interface computes SHA-256 from a selected local file (maximum 32 MiB), compares it with a supplied independently trusted digest, identifies outstanding gates, and exports a local evidence receipt. Manual review attestations are explicitly unverified claims; the strongest result is ready for human review, not approval. File/reference changes invalidate claims. No file uploads or external API calls. Run `node --test test.mjs` for the original and new tests. The deployed website has not yet received this extension. [CI run 44862596808](https://github.com/Royalpuskar/release-evidence/actions/runs/44862596808/job/136719096477) on Ubuntu / Node.js v22.23.5 tested PR head `161a63eef4733e4434925f6ebb33cd5c980bc3c7`: eight tests passed, zero failed or skipped (five investigation tests and three existing engine tests). Browser validation remains pending; subsequent commits require fresh validation. AI-assisted development; review and challenge mapping remain pending.

## Reproducible investigation demo

1. Open the Evidence Desk at `/investigate.html` on localhost, or HTTPS after deployment. Select **Try synthetic artifact**; it computes the SHA-256 of the three bytes `abc`. The expected digest is the published known vector in the fixture. The release decision remains blocked while human attestations are absent.
2. Inspect the actual digest and evidence trail. Select the three manual review claims only for the fictional demonstration. The strongest result is **READY FOR HUMAN REVIEW**, never automatic approval.
3. Change the expected digest to 64 zeroes; claims must clear and the digest comparison must report a mismatch. Even if every manual claim is selected, the release remains blocked.
4. Restore the trusted reference and select a different file containing `abd` (no newline) to demonstrate actual byte changes. Export a receipt and inspect the recorded digest, blockers and trust limitation. No upload, real release authorization or verified reviewer identity is implied.

This is a proposed browser demonstration walkthrough, not a record of executed UI tests. The automated Node tests check the underlying engine; independent browser smoke tests remain required.

## Problem and approach

This tool makes the supplied developer tools scenario inspectable through explicit rules, per-item results, and exportable evidence. It runs the same pure JavaScript engine in the browser and Node tests. All input is provided by the user or the included synthetic fixture; no external facts are inferred.

## Implemented features

- Editable scenario with a synthetic example and reset control.
- Deterministic analysis, summary metrics, filterable result table, and JSON report export.
- Input validation, explicit errors, and invalidation of outdated reports after edits.
- Keyboard-accessible controls, responsive layout, and large-screen CSS.
- Zero runtime dependencies and no external API calls.

## Install and run

Requirements: Python 3 for a static local server, Node.js 22 or later for tests.

```sh
git clone https://github.com/Royalpuskar/release-evidence.git
cd release-evidence
python3 -m http.server 8000
```

Open http://localhost:8000. Do not open index.html through a file URL; ES modules require a server.

```sh
node --test test.mjs
```

## Example and schema

The complete example in `sample.mjs` defines the supported input shape:

```json
{
  "checks": [
    {
      "name": "unit",
      "passed": true
    },
    {
      "name": "lint",
      "passed": false
    }
  ],
  "artifacts": [
    {
      "path": "app.js",
      "expected": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "actual": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    }
  ]
}
```

Edit one value and select **Run analysis**. **Reset example** restores the fixture. **Export report** downloads the current result; it never publishes it.

Input is capped at 200,000 serialized characters, arrays processed by the engine at 500 elements, and numeric magnitudes at 1e12. Domain constraints are checked inside `engine.mjs`; unsupported structures return an error.

## Architecture and request flow

`index.html` loads `app.mjs`, which parses scenario JSON and calls `run` from `engine.mjs`. The engine returns `metrics` and `rows`; the UI renders values with `textContent`, never user-supplied HTML. Editing invalidates the prior report. Export creates a local Blob download.

There is no application authentication, credential store, session cookie, or token lifecycle. GitHub Pages serves public static files. The app does not collect passwords or API keys, contact third-party APIs, persist inputs, or send scenario data over the network. GitHub hosting can still receive ordinary page request metadata. Reloading discards edits.

## Limitations

Compares supplied digest strings; does not hash files, verify signatures, or authenticate CI results.

The interface shares a portfolio design system, while this repository has its own domain engine, fixture, and tests. No accuracy, novelty, production-readiness, or 4K visual-test claim is made. Large-screen CSS is not a substitute for device testing.

## Validation

Three local automated test cases passed on 20 November 2026. Live browser checks covered sample results, invalid-input errors, stale-export prevention, and reset. Filtering and report download were also exercised. These checks do not establish exhaustive browser coverage.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits. GitHub Actions runs the same suite. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Add domain-specific form controls alongside the JSON editor.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.
