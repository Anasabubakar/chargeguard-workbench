import type { Levels, Payment, Report, Suite, TimelineEntry } from "./types.ts";

export const runTitle = (r: Report): string => `${r.scenario.id}${r.scenario.variant ? `/${r.scenario.variant}` : ""}`;
export const runShape = (r: Report): string => `${r.deployment.store === "memory" ? "isolated memory" : "shared sqlite"} · ${r.deployment.mode}`;

export type Tone = "ok" | "bad" | "warn" | "info" | "neutral";

/** How a level should be read for one payment. Pure presentation of facts the runner recorded. */
export function levelTone(levels: Levels, level: "accepted" | "submitted" | "confirmed" | "fulfilled"): Tone {
  switch (level) {
    case "accepted":
      return levels.accepted === 0 ? "neutral" : levels.accepted === 1 ? "ok" : "bad";
    case "submitted":
      return levels.submitted === null ? "neutral" : "info";
    case "confirmed":
      return levels.confirmed === "SUCCESS" ? "ok" : levels.confirmed === "FAILED" ? "bad" : "warn";
    case "fulfilled":
      if (levels.fulfilled > 1) return "bad";
      if (levels.fulfilled === 1) return "ok";
      return levels.confirmed === "SUCCESS" ? "warn" : "neutral";
  }
}

export function levelText(levels: Levels, level: "accepted" | "submitted" | "confirmed" | "fulfilled"): string {
  switch (level) {
    case "accepted":
      return levels.accepted === 0 ? "none" : levels.accepted === 1 ? "1 response" : `${levels.accepted} responses`;
    case "submitted":
      return levels.submitted === null ? "not observed" : `by the ${levels.submitted}`;
    case "confirmed":
      return levels.confirmed === "NOT_FOUND" ? "not found" : levels.confirmed.toLowerCase();
    case "fulfilled":
      return levels.fulfilled === 0 ? "never delivered" : levels.fulfilled === 1 ? "delivered once" : `delivered ${levels.fulfilled} times`;
  }
}

export type PaymentAlert = "double-delivery" | "paid-not-delivered" | null;

export function paymentAlert(p: Payment): PaymentAlert {
  if (p.levels.fulfilled > 1) return "double-delivery";
  if (p.levels.confirmed === "SUCCESS" && p.levels.fulfilled === 0) return "paid-not-delivered";
  return null;
}

export interface Lane {
  worker: string;
  entries: TimelineEntry[];
}

/** Worker lanes in name order, each holding that worker's requests in time order. */
export function buildLanes(report: Report): Lane[] {
  const byWorker = new Map<string, TimelineEntry[]>();
  for (const e of report.timeline) {
    const list = byWorker.get(e.worker) ?? [];
    list.push(e);
    byWorker.set(e.worker, list);
  }
  return [...byWorker.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([worker, entries]) => ({ worker, entries: [...entries].sort((x, y) => x.t - y.t) }));
}

export interface ChronologyRow {
  t: number;
  source: "request" | "fault" | "broadcast";
  text: string;
  tone: Tone;
}

/** Requests, injected faults and chain broadcasts on one clock, as the runner recorded them. */
export function chronology(report: Report): ChronologyRow[] {
  const rows: ChronologyRow[] = [];
  for (const e of report.timeline) {
    rows.push({
      t: e.t,
      source: "request",
      text: `${e.worker} answered ${e.status === 0 ? "nothing" : e.status} (${e.outcome}) to: ${e.label}${e.detail ? ` [${e.detail}]` : ""}`,
      tone: e.outcome === "accepted" ? "ok" : e.outcome === "rejected" || e.outcome === "challenge" ? "neutral" : "warn",
    });
  }
  for (const f of report.faultEvents) rows.push({ t: f.t, source: "fault", text: `${f.kind}: ${f.detail}`, tone: "info" });
  for (const b of report.broadcasts) {
    rows.push({ t: b.t, source: "broadcast", text: `chain endpoint saw sendTransaction for ${b.paymentId ?? "an unknown payment"}: ${b.outcome}${b.resultCode ? ` (${b.resultCode})` : ""}`, tone: b.outcome === "PENDING" ? "info" : "warn" });
  }
  return rows.sort((a, b) => a.t - b.t);
}

/** The headline demonstration: the same scenario on isolated memory stores and on the shared store. */
export function featuredPair(suite: Suite, mode: "push" | "pull" = "push"): { control: Report; shared: Report } | null {
  const pick = (store: "memory" | "sqlite") => suite.reports.find((r) => r.scenario.id === "repeated-credential" && r.deployment.store === store && r.deployment.mode === mode);
  const control = pick("memory");
  const shared = pick("sqlite");
  return control && shared ? { control, shared } : null;
}

export function groupByScenario(suite: Suite): Array<{ id: string; runs: Array<{ index: number; report: Report }> }> {
  const groups = new Map<string, Array<{ index: number; report: Report }>>();
  suite.reports.forEach((report, index) => {
    const list = groups.get(report.scenario.id) ?? [];
    list.push({ index, report });
    groups.set(report.scenario.id, list);
  });
  return [...groups.entries()].map(([id, runs]) => ({ id, runs }));
}

export function verdictWord(r: Report): string {
  return r.verdict === "pass" ? "PASS" : r.verdict === "fail" ? "FAIL" : "INCONCLUSIVE";
}

export function formatMs(ms: number): string {
  return ms >= 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

export function shortHash(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-6)}`;
}
