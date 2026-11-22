# Release Evidence

Audit a release manifest for failed checks, duplicate artifacts, and mismatched SHA-256 digests.

**Status:** integrated development candidate, not deployed. The existing main-branch manifest auditor was deployed and smoke-tested on 20 November 2026. The integrated candidate requires fresh combined CI, Qodo review, browser acceptance and owner approval.

## Website

Live website: https://royalpuskar.github.io/release-evidence/

## Evidence Desk (proposed extension)

On this development branch, serve the repository with `python3 -m http.server 8000` and open `http://localhost:8000/investigate.html`. The new interface computes SHA-256 from a selected local file (maximum 32 MiB), compares it with a supplied independently trusted digest, identifies outstanding gates, and exports a local evidence receipt. Manual review attestations are explicitly unverified claims; the strongest result is ready for human review, not approval. File/reference changes invalidate claims. No file uploads or external API calls. Run `node --test test.mjs verify-artifact.test.mjs` for all three test groups: `test.mjs` directly registers the three manifest tests and imports `./investigate.test.mjs`, which registers six Evidence Desk tests (including the Node DOM-harness UI test). `verify-artifact.test.mjs` registers six CLI tests. Do not also pass `investigate.test.mjs` as a separate entry point while that import exists. The deployed website has not yet received this extension. Browser validation remains pending; subsequent commits require fresh validation. AI-assisted development; review and challenge mapping remain pending.

## Candidate verification and navigation

The candidate combines PR #2 (streaming CLI and verified action pins), PR #3 (Evidence Desk), PR #5 (factory map), PR #6 (browser harness) and PR #8 (guard runner). The home page links to Evidence Desk. No source PR has been merged into main.

- [CLI usage and limitations](docs/artifact-verification.md).
- [Factory verification map](docs/factory-verification-map.md).
- Run the combined Node suite with `node --test test.mjs verify-artifact.test.mjs`. The explicit import in `test.mjs` includes the Evidence Desk suite in both local runs and CI (15 tests total).
- Run `python scripts/check-guards.py` and `python scripts/test-check-guards.py` manually (Python 3.8+). Existing CI does not run these Python scripts.
- For actual browser acceptance, install Python Playwright and Chromium on an authorized machine, then run `python scripts/browser-smoke.py`. Previous environment blocked loopback navigation; do not infer a browser pass from helper tests.

Each source PR's review and test reports are revision-specific, not evidence of this combined candidate. AI-assisted implementation; human acceptance, deployment and official hackathon submissions remain pending.

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
node --test test.mjs verify-artifact.test.mjs
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

The original manifest auditor compares supplied digest strings. Evidence Desk and the CLI additionally hash local file bytes. None verifies publisher signatures or authenticates CI reports.

The interface shares a portfolio design system, while this repository has its own domain engine, fixture, and tests. No accuracy, novelty, production-readiness, or 4K visual-test claim is made. Large-screen CSS is not a substitute for device testing.

## Validation

**Historical integrated-candidate CI:** [run 45003373912, job 137149538159](https://github.com/Royalpuskar/release-evidence/actions/runs/45003373912/job/137149538159) executed `node --test test.mjs verify-artifact.test.mjs` on PR #9 head `fb44ff6709a38a5a60d24fcb99d7fc23d53df7d9` against base `a249a71ec6644d23f45038ff7050509cf03c90e6` on 22 November 2026. The logs record 15 tests, 15 passed, zero failed or skipped. This is evidence for that earlier revision only; fresh CI and Qodo review are required for subsequent commits. Python guard and browser tests are not covered by that Node run. Check [PR #9](https://github.com/Royalpuskar/release-evidence/pull/9) for current-head checks.

**Historical main-branch baseline (20 November 2026):** three local automated test cases passed. Live browser checks of the original manifest auditor covered sample results, invalid-input errors, stale-export prevention, reset, filtering and report download. These checks do not cover Evidence Desk or the integrated candidate.

`test.mjs` checks domain outcomes and edge cases, deterministic behavior, input preservation, malformed roots, and size limits, and imports `./investigate.test.mjs`. GitHub Actions invokes `test.mjs` and `verify-artifact.test.mjs`, thereby running the three manifest, six Evidence Desk and six CLI tests. For revision-specific proof of this import path, [run 45004277847, job 137152278606](https://github.com/Royalpuskar/release-evidence/actions/runs/45004277847/job/137152278606) records all six named `investigation` subtests as passing (including the UI integration test), with 15 passed, zero failed and zero skipped in total for head `cbb4fbc72f1e7e49b12d5ccb3deae58834102db0` on 22 November 2026. That log is historical evidence for the cited head, not a claim of execution on later revisions. Review the tests themselves to see exactly what is covered; passing these checks does not establish security or exhaustive correctness.

## Roadmap

- Add more independently reviewed domain fixtures and explicit schema documentation.
- Add domain-specific form controls alongside the JSON editor.
- Expand accessibility and mobile browser testing.
- Revisit the documented domain limitations before production use.

## Contribution and license

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [LICENSE](LICENSE).

© 2026 Puskar (Royalpuskar). All rights reserved except permissions granted by the MIT license. Preserve applicable third-party notices.
