# ADR 0001: Why a separate viewer

Status: accepted, 2026-10-07. Based on reading the runner's own output formats and the sources listed in the runner's ADR 0001.

The runner prints a text report. A text report cannot easily put two deployments side by side, lay requests out per worker, and keep four levels visually distinct. Neither stellar-mpp-sdk nor mppx (see the runner's ADR 0001) ships a report viewer or a multi-process replay test, so there is nothing to extend.

Decision: a static, read-only page over the runner's versioned JSON. It vendors the runner's schema and recorded suites with a checksum stamp (the pattern contractatlas-studio uses) instead of importing the runner, because the runner pulls in the Stellar SDK stack a viewer does not need.

Consequences: the page shows evidence as old as its stamp; runner and page are paired by `compat.json`; the page cannot refute or extend a run.
