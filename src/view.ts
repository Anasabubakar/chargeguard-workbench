import { h } from "./dom.ts";
import { buildLanes, chronology, formatMs, levelText, levelTone, paymentAlert, runShape, runTitle, shortHash, verdictWord, type Tone } from "./state.ts";
import type { Report } from "./types.ts";

const LEVEL_ORDER = ["accepted", "submitted", "confirmed", "fulfilled"] as const;
const LEVEL_HELP: Record<(typeof LEVEL_ORDER)[number], string> = {
  accepted: "A worker verified the credential and answered 200.",
  submitted: "A transaction for the payment reached a Stellar node.",
  confirmed: "The ledger status, observed by the runner, not by a worker.",
  fulfilled: "The paid resource was delivered (worker fulfillment log).",
};

const badge = (text: string, tone: Tone) => h("span", { class: `badge tone-${tone}` }, text);

export function renderVerdict(r: Report): HTMLElement {
  const tone: Tone = r.verdict === "pass" ? "ok" : r.verdict === "fail" ? "bad" : "warn";
  return h(
    "div",
    { class: "verdict-row" },
    badge(verdictWord(r), tone),
    h("span", { class: "muted" }, `expected ${r.expectation.toUpperCase()}: ${r.matchesExpectation ? "as expected" : "NOT as expected"}`),
  );
}

export function renderEvidenceClass(r: Report): HTMLElement {
  return h(
    "p",
    { class: "evidence-class" },
    badge(r.evidenceClass, r.evidenceClass === "testnet settlement" ? "info" : "neutral"),
    " ",
    h("span", { class: "muted" }, `chain: ${r.chain.description}`),
  );
}

/** Per-worker lanes: one column per worker, each request a card in time order. */
export function renderLanes(r: Report): HTMLElement {
  const lanes = buildLanes(r);
  const wrap = h("div", { class: `lanes lanes-${Math.min(lanes.length, 4)}`, role: "list", "aria-label": "Requests per worker" });
  for (const lane of lanes) {
    const accepted = lane.entries.filter((e) => e.outcome === "accepted").length;
    const col = h(
      "section",
      { class: "lane", role: "listitem", "aria-label": `${lane.worker} timeline` },
      h("h4", {}, lane.worker),
      h("p", { class: "lane-count muted" }, `${lane.entries.length} request${lane.entries.length === 1 ? "" : "s"}, ${accepted} accepted`),
    );
    for (const e of lane.entries) {
      const tone: Tone = e.outcome === "accepted" ? "ok" : e.outcome === "rejected" ? "neutral" : e.outcome === "challenge" ? "neutral" : "warn";
      col.append(
        h(
          "article",
          { class: `req tone-${tone}`, "data-outcome": e.outcome },
          h("div", { class: "req-head" }, h("strong", {}, `${e.status === 0 ? "—" : e.status}`), h("span", {}, e.outcome), h("time", { class: "muted" }, `+${formatMs(e.t)}`)),
          e.paymentId ? h("div", { class: "req-pay" }, e.paymentId) : null,
          h("div", { class: "req-label" }, e.label),
          e.detail ? h("div", { class: "req-detail muted" }, e.detail) : null,
        ),
      );
    }
    wrap.append(col);
  }
  return wrap;
}

/** The four levels, per payment, side by side so one cannot be read as another. */
export function renderPayments(r: Report): HTMLElement {
  const box = h("div", { class: "payments" });
  if (r.payments.length === 0) {
    box.append(h("p", { class: "muted" }, "This run built no payment."));
    return box;
  }
  const legend = h("dl", { class: "legend" });
  for (const l of LEVEL_ORDER) legend.append(h("dt", {}, l), h("dd", {}, LEVEL_HELP[l]));
  box.append(legend);
  const list = h("div", { class: "payment-list" });
  const compact = r.payments.length > 4;
  for (const p of r.payments) {
    const alert = paymentAlert(p);
    const card = h(
      "article",
      { class: `payment${alert ? ` alert-${alert}` : ""}`, "data-payment": p.id },
      h("header", {}, h("strong", {}, p.id), h("span", { class: "muted" }, `${p.mode} mode · tx ${shortHash(p.txHash)}`), alert === "double-delivery" ? badge("one payment, several deliveries", "bad") : alert === "paid-not-delivered" ? badge("paid on chain, not delivered", "warn") : null),
    );
    const grid = h("div", { class: "levels" });
    for (const l of LEVEL_ORDER) {
      grid.append(h("div", { class: `level tone-${levelTone(p.levels, l)}`, "data-level": l }, h("span", { class: "level-name" }, l), h("span", { class: "level-value" }, levelText(p.levels, l))));
    }
    card.append(grid);
    if (p.note && !compact) card.append(h("p", { class: "note" }, p.note));
    list.append(card);
  }
  if (compact) {
    const doubles = r.payments.filter((p) => p.levels.fulfilled > 1).length;
    box.append(
      h("p", { class: "note" }, `${r.payments.length} payments. Delivered more than once: ${doubles}. Accepted per payment: ${r.payments.map((p) => p.levels.accepted).join(", ")}.`),
      h("details", {}, h("summary", {}, `Show all ${r.payments.length} payments`), list),
    );
  } else {
    box.append(list);
  }
  return box;
}

export function renderChecks(r: Report): HTMLElement {
  const list = h("ul", { class: "checks" });
  for (const c of r.checks) {
    list.append(
      h(
        "li",
        { class: c.passed ? "check pass" : "check fail", "data-check": c.id },
        h("div", { class: "check-head" }, badge(c.passed ? "pass" : "FAIL", c.passed ? "ok" : "bad"), h("code", {}, c.id)),
        h("p", {}, c.description),
        h("p", { class: "muted" }, c.detail),
      ),
    );
  }
  return list;
}

export function renderFaults(r: Report): HTMLElement {
  const box = h("div", { class: "faults" });
  box.append(h("h4", {}, "Planned fault schedule"));
  const plan = h("ol", {});
  for (const step of r.scenario.faultSchedule) plan.append(h("li", {}, step));
  box.append(plan);
  box.append(h("h4", {}, "What happened, on one clock"));
  const rows = h("ol", { class: "chrono" });
  for (const row of chronology(r)) {
    rows.append(h("li", { class: `chrono-row tone-${row.tone}`, "data-source": row.source }, h("time", {}, `+${formatMs(row.t)}`), h("span", { class: "chrono-src" }, row.source), h("span", {}, row.text)));
  }
  box.append(rows);
  return box;
}

export function renderRun(r: Report): HTMLElement {
  const root = h("article", { class: "run", "data-run": runTitle(r) });
  root.append(
    h("h3", {}, r.scenario.title, r.scenario.variant ? h("span", { class: "muted" }, ` — ${r.scenario.variant}`) : null),
    renderVerdict(r),
    renderEvidenceClass(r),
    h("p", { class: "shape" }, `Deployment: ${r.deployment.workers} worker processes, ${runShape(r)}`),
    h("p", { class: "summary" }, r.summary),
    h("p", { class: "invariant" }, h("strong", {}, "Invariant under test: "), r.scenario.invariant),
    h("h4", {}, "Per-worker timeline"),
    renderLanes(r),
    h("h4", {}, "Four levels, per payment"),
    renderPayments(r),
    h("h4", {}, "Checks"),
    renderChecks(r),
  );
  if (r.observations.length) {
    const obs = h("ul", { class: "observations" });
    for (const o of r.observations) obs.append(h("li", {}, o));
    root.append(h("h4", {}, "Observations (reported, not pass/fail)"), obs);
  }
  root.append(
    h("details", {}, h("summary", {}, "Fault schedule and chronology"), renderFaults(r)),
    h(
      "details",
      {},
      h("summary", {}, "How this was recorded"),
      h("p", {}, h("strong", {}, "Command: "), h("code", { class: "wrap" }, r.command)),
      h("p", {}, `Environment: node ${r.environment.node} on ${r.environment.platform}/${r.environment.arch}; @stellar/mpp ${r.environment.sdk["@stellar/mpp"]}, mppx ${r.environment.sdk.mppx}, @stellar/stellar-sdk ${r.environment.sdk["@stellar/stellar-sdk"]}; runner ${r.environment.chargeguardRunner}.`),
      h("p", {}, `Recorded ${r.generatedAt}.`),
    ),
    h("h4", {}, "Limits of this run"),
    h("ul", { class: "limits" }, ...r.limits.map((l) => h("li", {}, l))),
  );
  return root;
}

export function renderCompare(control: Report, shared: Report): HTMLElement {
  const col = (title: string, r: Report) =>
    h("section", { class: "compare-col", "data-compare": r.deployment.store }, h("h3", {}, title), renderVerdict(r), h("p", { class: "summary" }, r.summary), renderLanes(r), renderPayments(r));
  return h(
    "div",
    { class: "compare" },
    col("Isolated in-memory stores (the failing deployment)", control),
    col("Shared sqlite store (the declared passing deployment)", shared),
  );
}
