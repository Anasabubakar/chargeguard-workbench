# chargeguard-workbench

**Documentation:** https://stellar-developer-tools.gitbook.io/chargeguard-workbench/

Hosted demo: https://chargeguard-workbench-anasamasama.vercel.app

A static page that shows **recorded ChargeGuard evidence**: the same Stellar MPP charge endpoint behind two worker processes, once with isolated in-memory stores (a repeated credential is accepted twice) and once with a shared atomic store (accepted once). It renders the per-worker timeline of accepted and rejected requests, keeps the four levels apart (accepted credential, submitted transaction, chain confirmation, service fulfillment), and shows the checks, the fault schedule and the limits.

It runs nothing: no scenario, no server call, no keys. Every state on screen comes from a report that [chargeguard-runner](https://github.com/Anasabubakar/chargeguard-runner) produced from real worker processes (integration evidence against a local stub chain, and testnet-settlement evidence against Stellar testnet). A finite number of runs is evidence, not a proof; nothing here shows linearizability or exactly-once delivery; payment channels are out of scope.

## Use

```bash
pnpm install --frozen-lockfile
pnpm dev          # or: pnpm build && pnpm preview
pnpm test
```

Open a run or suite JSON you recorded with `chargeguard run --out` / `suite --out` through the file picker; it is validated against the v1 schema in the browser and never uploaded.

## How it stays honest

- `vendor/chargeguard-runner/` holds the runner's JSON Schemas and the two recorded suites, copied by `pnpm vendor ../chargeguard-runner` and stamped in `VERSION.json` (package version, commit, SHA-256 of every file). `pnpm check:vendor` (part of `pnpm build`) fails if a file drifts from its stamp. The page builds from a clean clone with no sibling-path imports.
- Reports are validated by a **precompiled** standalone validator (`pnpm gen`, ajv standalone), so no code is generated at runtime. Strict CSP (`script-src 'self'`, no `unsafe-eval`, no `unsafe-inline`) in `index.html` and `vercel.json`, asserted by a test.
- All report text is inserted as text nodes; a test feeds markup through the views. No `innerHTML` anywhere (tested).
- Narrow screens: checked in a real browser at 375 px with `main.scrollWidth <= main.clientWidth` on all 30 bundled runs with every section expanded.
- Reads report version 1 only; anything else is refused with a message.

## Verification

`pnpm run typecheck && pnpm test` (33 tests, vitest + jsdom), `pnpm build`. Pairing: runner 0.1.1 (see `compat.json`).

## Limits and status

Shows recorded runs only; the bundled evidence is as old as its stamp. Not an audit or endorsement. Hosted on Vercel; GitHub CI is green. MIT licensed.

## Contributors

<a href="https://github.com/Anasabubakar/chargeguard-workbench/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Anasabubakar/chargeguard-workbench" alt="Contributors to chargeguard-workbench" />
</a>
