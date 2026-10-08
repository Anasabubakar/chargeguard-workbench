# Overview

Hosted demo: https://chargeguard-workbench-anasamasama.vercel.app

A static page that shows **recorded ChargeGuard evidence**: the same Stellar MPP charge endpoint behind two worker processes, once with isolated in-memory stores (a repeated credential is accepted twice) and once with a shared atomic store (accepted once). It renders the per-worker timeline of accepted and rejected requests, keeps the four levels apart (accepted credential, submitted transaction, chain confirmation, service fulfillment), and shows the checks, the fault schedule and the limits.

It runs nothing: no scenario, no server call, no keys. Every state on screen comes from a report that [chargeguard-runner](https://github.com/Charge-Guard/chargeguard-runner) produced from real worker processes (integration evidence against a local stub chain, and testnet-settlement evidence against Stellar testnet). A finite number of runs is evidence, not a proof; nothing here shows linearizability or exactly-once delivery; payment channels are out of scope.

Source: [chargeguard-workbench on GitHub](https://github.com/Charge-Guard/chargeguard-workbench). Releases: [GitHub releases](https://github.com/Charge-Guard/chargeguard-workbench/releases).
