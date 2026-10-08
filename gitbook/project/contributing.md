# Contributing

```bash
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm test && pnpm build
pnpm vendor ../chargeguard-runner && pnpm gen   # after the runner's schema or evidence changes; commit vendor/ and src/generated/
```

- No `innerHTML`, no runtime zod, no `unsafe-eval`; tests enforce them.
- The page computes no verdicts. Anything shown must come from a report.
- Verify UI changes in a real browser, including `main.scrollWidth <= main.clientWidth` at 375 px (not `window.innerWidth`).
- Keep the four levels visually separate; never add a single "paid" indicator.
- Do not claim linearizability, exactly-once delivery or endorsement.
- One logical change per commit; AI-assisted changes are welcome if you understand and verified them.
