# How it stays honest

- `vendor/chargeguard-runner/` holds the runner's JSON Schemas and the two recorded suites, copied by `pnpm vendor ../chargeguard-runner` and stamped in `VERSION.json` (package version, commit, SHA-256 of every file). `pnpm check:vendor` (part of `pnpm build`) fails if a file drifts from its stamp. The page builds from a clean clone with no sibling-path imports.
- Reports are validated by a **precompiled** standalone validator (`pnpm gen`, ajv standalone), so no code is generated at runtime. Strict CSP (`script-src 'self'`, no `unsafe-eval`, no `unsafe-inline`) in `index.html` and `vercel.json`, asserted by a test.
- All report text is inserted as text nodes; a test feeds markup through the views. No `innerHTML` anywhere (tested).
- Narrow screens: checked in a real browser at 375 px with `main.scrollWidth <= main.clientWidth` on all 30 bundled runs with every section expanded.
- Reads report version 1 only; anything else is refused with a message.
