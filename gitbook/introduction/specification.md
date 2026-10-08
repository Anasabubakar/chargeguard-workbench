# Specification

## User
Someone deciding whether a multi-worker Stellar MPP deployment's replay protection holds, who wants to see evidence, not read a claim.

## Scope
Render ChargeGuard report v1 (run and suite): verdict and expectation, evidence class, per-worker request lanes, four levels per payment, checks, observations, planned fault schedule and actual chronology, recording command and environment, limits. Bundled evidence: the stub-chain suite and the testnet suite. Load a user's own report file.

## Non-goals
Running scenarios, contacting workers or chains, computing verdicts (all come from the report), editing reports, payment channels, claiming proof of linearizability or exactly-once delivery.

## Data and interfaces
Input: `report.v1` / `suite.v1` JSON (vendored schemas). Pairing: `vendor/chargeguard-runner/VERSION.json` and `compat.json`. Views are pure functions of a report. The URL hash selects an evidence set and run.

## Failure classes handled
Unsupported version, wrong kind, schema violation, non-JSON, oversized file: each shows an error and leaves the bundled data intact. Hostile strings in a report render as text.

## Safety
Strict CSP, precompiled validator, no HTML injection, no network access after load.

## Acceptance
1. Bundled evidence validates and its checksums match the stamp. 2. The isolated-memory run shows two acceptances and two deliveries; the shared run one. 3. Both evidence classes are labelled. 4. Paid-but-not-delivered and double-delivery payments are flagged. 5. No horizontal overflow at 375 px (main.scrollWidth <= clientWidth). 6. Markup in a report is displayed as text. 7. CSP has no unsafe-eval.
