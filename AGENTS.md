# Release Evidence — agent instructions

Release Evidence is an offline-first release manifest auditor with a local SHA-256 verification CLI. It helps developers distinguish evidence from claims before shipping software.

## Setup and verification

Use Node.js 22+; no package installation is required. Run `node --test test.mjs verify-artifact.test.mjs`. Serve the browser app with `python3 -m http.server 8000` and verify sample, reset, filtering, invalid input and export whenever UI behavior changes. The CLI handles explicitly selected local regular files; never run artifacts as programs. Check actual output and exit codes; a successful process alone is insufficient.

## Five project rules

1. **Evidence must name its trust boundary.** Applies to engine, CLI, reports and documentation. A matching digest must never be described as publisher authentication or a verified signature. The expected digest needs an independently trusted source. Why: a malicious distributor could supply both the changed file and its hash.
2. **Fail closed on missing or stale evidence.** Applies to release decisions, test results, and UI exports. Missing checks or invalid, stale, duplicate or mismatched evidence must not imply readiness. Preserve explicit failure states and test them.
3. **Keep private artifacts local.** Applies to UI, CLI, fixtures and logs. No uploads, telemetry, secrets, personal data or external network calls in product code; use synthetic fixtures and files the operator is authorized to read.
4. **One task, one reviewable change.** Applies to all PRs. Map acceptance criteria to tests, record the base and head commits, clearly identify AI-assisted work, and keep existing behavior unless a change is explicitly scoped. Do not modify deployment permissions or merge automatically.
5. **Never invent evidence.** Applies to every status report. Separate implementation, execution, CI, Qodo review and human approval. Record unverified items as pending and do not claim a challenge complete without its actual required evidence.

## Quality gate (Day 9 draft)

Investigate all Qodo findings, across all types. Fix valid High and Medium findings; report Low findings for the owner without changing unrelated code. Document disputed findings with code and test evidence; unresolved High/Medium findings, stale reviews, failing checks or missing verification block completion. Rerun tests and Qodo review after each fix, with a maximum of two repair rounds; then report the blocker. Review must cover the actual latest PR head. No automatic merge. Owner approval required, especially for workflow changes. This gate is written but not yet validated using Qodo.

AI assistance: ChatGPT drafted these standards on November 21, 2026. Entrant review and Qodo import/activation remain pending.
