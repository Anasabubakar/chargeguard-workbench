import "./style.css";
import { DATASETS, PAIRING, parseReportText, type Dataset, type Loaded } from "./data.ts";
import { h } from "./dom.ts";
import { featuredPair, groupByScenario, runShape, verdictWord } from "./state.ts";
import { renderCompare, renderRun } from "./view.ts";

interface State {
  datasetId: string;
  mode: "push" | "pull";
  runIndex: number | null;
  loaded: Loaded | null;
  error: string | null;
}

const state: State = { datasetId: "integration", mode: "push", runIndex: null, loaded: null, error: null };

function dataset(): Dataset | null {
  if (state.datasetId === "loaded" && state.loaded) return { id: "loaded", label: "Your report", suite: state.loaded };
  return DATASETS.find((d) => d.id === state.datasetId) ?? DATASETS[0] ?? null;
}

function readHash(): void {
  const m = /^#([a-z]+)(?:\/(\d+))?$/.exec(location.hash);
  if (!m) return;
  if (DATASETS.some((d) => d.id === m[1])) state.datasetId = m[1]!;
  state.runIndex = m[2] !== undefined ? Number(m[2]) : null;
}

function writeHash(): void {
  const next = state.runIndex === null ? `#${state.datasetId}` : `#${state.datasetId}/${state.runIndex}`;
  if (state.datasetId !== "loaded" && location.hash !== next) history.replaceState(null, "", next);
}

async function onFile(file: File): Promise<void> {
  const loaded = parseReportText(await file.text());
  if (!loaded.ok) {
    state.error = loaded.error;
  } else {
    state.error = null;
    state.loaded = loaded;
    state.datasetId = "loaded";
    state.runIndex = 0;
  }
  render();
}

function render(): void {
  const active = document.activeElement as HTMLElement | null;
  const restoreId = active?.id || null;
  const root = document.getElementById("app")!;
  root.replaceChildren();

  root.append(
    h(
      "header",
      { class: "top" },
      h("h1", {}, "ChargeGuard workbench"),
      h("p", { class: "lede" }, "Your SDK can be correct while your deployment breaks its assumptions. These are recorded runs of the same Stellar MPP charge endpoint behind two worker processes, with the replay-protection store as the only thing that changes."),
    ),
    h(
      "aside",
      { class: "honesty", "aria-label": "What this page is and is not" },
      h("p", {}, h("strong", {}, "Recorded, not live. "), "Every number here was produced by chargeguard-runner and is shown as recorded; this page runs no scenario, calls no server and holds no keys."),
      h("p", {}, "A finite number of runs is evidence, not a proof. Nothing here shows linearizability or exactly-once delivery, and payment channels are out of scope."),
    ),
  );

  // Dataset tabs.
  const tabs = h("nav", { class: "tabs", "aria-label": "Evidence set" });
  const sets: Array<{ id: string; label: string }> = [...DATASETS.map((d) => ({ id: d.id, label: d.label })), ...(state.loaded ? [{ id: "loaded", label: "Your report" }] : [])];
  for (const s of sets) {
    const b = h("button", { type: "button", id: `tab-${s.id}`, class: s.id === state.datasetId ? "tab selected" : "tab", "aria-pressed": s.id === state.datasetId ? "true" : "false" }, s.label);
    b.addEventListener("click", () => {
      state.datasetId = s.id;
      state.runIndex = null;
      render();
    });
    tabs.append(b);
  }
  root.append(tabs);

  const ds = dataset();
  const main = h("div", { class: "content" });
  if (!ds) {
    main.append(h("p", { class: "error", role: "alert" }, "No evidence is bundled."));
  } else if (!ds.suite.ok) {
    main.append(h("p", { class: "error", role: "alert" }, `This evidence set did not validate: ${ds.suite.error}`));
  } else {
    const suite = ds.suite.suite;
    main.append(
      h(
        "p",
        { class: "suite-meta" },
        `${suite.evidenceClass} · ${suite.totals.runs} run${suite.totals.runs === 1 ? "" : "s"}: ${suite.totals.pass} pass, ${suite.totals.fail} fail, ${suite.totals.inconclusive} inconclusive; ${suite.totals.matchedExpectation} matched their expectation. A FAIL on an isolated-memory run is the demonstration.`,
      ),
    );

    // Featured comparison.
    const pair = featuredPair(suite, state.mode);
    if (pair && state.runIndex === null) {
      const modeBar = h("div", { class: "modebar", role: "group", "aria-label": "Credential mode" });
      for (const m of ["push", "pull"] as const) {
        const b = h("button", { type: "button", id: `mode-${m}`, class: m === state.mode ? "tab selected" : "tab", "aria-pressed": m === state.mode ? "true" : "false" }, `${m} credential`);
        b.addEventListener("click", () => {
          state.mode = m;
          render();
        });
        modeBar.append(b);
      }
      main.append(
        h("h2", {}, "Repeated credential, two deployments"),
        h("p", { class: "muted" }, "One payment, one credential, presented to worker-a, then worker-b, then worker-a again. Only the store configuration differs."),
        modeBar,
        h("p", { class: "mode-note muted" }, state.mode === "push" ? "Push: the payer broadcasts and confirms first; the workers can only look the hash up, so the store is the only defence against a repeat." : "Pull: a worker broadcasts the signed transaction; the ledger's sequence rule refuses a second broadcast, so a replay can be stopped by the chain even when the store failed. The store-level check still fails."),
        renderCompare(pair.control, pair.shared),
      );
    } else if (state.runIndex === null) {
      main.append(h("p", { class: "muted" }, "This evidence set has no repeated-credential pair; pick a run below."));
    }

    // Run list.
    main.append(h("h2", { id: "runs" }, "All recorded runs"));
    const list = h("div", { class: "runlist" });
    for (const g of groupByScenario(suite)) {
      const sec = h("section", { class: "rungroup" }, h("h3", {}, g.id));
      for (const { index, report } of g.runs) {
        const b = h(
          "button",
          { type: "button", class: index === state.runIndex ? "runbtn selected" : "runbtn", "data-index": String(index), "aria-pressed": index === state.runIndex ? "true" : "false" },
          h("span", { class: `dot tone-${report.verdict === "pass" ? "ok" : report.verdict === "fail" ? "bad" : "warn"}`, "aria-hidden": "true" }),
          h("span", { class: "runbtn-text" }, `${report.scenario.variant ? `${report.scenario.variant} · ` : ""}${runShape(report)}`),
          h("span", { class: "muted runbtn-verdict" }, `${verdictWord(report)}${report.matchesExpectation ? "" : " (unexpected)"}`),
        );
        b.addEventListener("click", () => {
          state.runIndex = index;
          render();
          document.getElementById("run-detail")?.scrollIntoView?.();
        });
        sec.append(b);
      }
      list.append(sec);
    }
    main.append(list);

    if (state.runIndex !== null && suite.reports[state.runIndex]) {
      const back = h("button", { type: "button", id: "back", class: "tab" }, "Back to the comparison");
      back.addEventListener("click", () => {
        state.runIndex = null;
        render();
      });
      main.append(h("div", { id: "run-detail", class: "detail" }, back, renderRun(suite.reports[state.runIndex]!)));
    }
  }
  root.append(main);

  // Load your own report.
  const input = h("input", { type: "file", id: "file", accept: "application/json,.json", "aria-label": "Load a ChargeGuard report JSON" });
  input.addEventListener("change", () => {
    const f = input.files?.[0];
    if (f) void onFile(f);
  });
  root.append(
    h(
      "section",
      { class: "load" },
      h("h2", {}, "Open a report you recorded"),
      h("p", { class: "muted" }, "Pick a run or suite JSON written by `chargeguard run --out` or `chargeguard suite --out`. It is validated against the v1 schema in your browser and never uploaded."),
      input,
      state.error ? h("p", { class: "error", role: "alert" }, state.error) : null,
    ),
    h(
      "footer",
      { class: "foot" },
      h("p", {}, `Reads report version ${PAIRING.reportVersion} from ${PAIRING.package} ${PAIRING.version} (commit ${PAIRING.commit.slice(0, 12)}); the bundled evidence is stamped in vendor/chargeguard-runner/VERSION.json.`),
      h("p", {}, "MIT licensed. Not an audit, and not endorsed by Stellar, the SDK authors or the mppx maintainers."),
    ),
  );

  if (restoreId) document.getElementById(restoreId)?.focus();
  writeHash();
}

readHash();
render();
window.addEventListener("hashchange", () => {
  readHash();
  render();
});
