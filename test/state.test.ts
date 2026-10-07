import { describe, expect, it } from "vitest";
import { DATASETS } from "../src/data.ts";
import { buildLanes, chronology, featuredPair, formatMs, groupByScenario, levelText, levelTone, paymentAlert, shortHash } from "../src/state.ts";
import type { Levels, Payment, Suite } from "../src/types.ts";

const integration = (): Suite => {
  const d = DATASETS[0]!.suite;
  if (!d.ok) throw new Error(d.error);
  return d.suite;
};
const L = (o: Partial<Levels>): Levels => ({ accepted: 1, submitted: "client", confirmed: "SUCCESS", fulfilled: 1, ...o });
const P = (levels: Levels): Payment => ({ id: "p", mode: "push", txHash: "a".repeat(64), challengeId: "c", levels, note: null });

describe("level reading", () => {
  it("marks double acceptance and double delivery as bad, single as ok", () => {
    expect(levelTone(L({ accepted: 2 }), "accepted")).toBe("bad");
    expect(levelTone(L({ accepted: 1 }), "accepted")).toBe("ok");
    expect(levelTone(L({ fulfilled: 2 }), "fulfilled")).toBe("bad");
    expect(levelTone(L({ fulfilled: 1 }), "fulfilled")).toBe("ok");
  });
  it("marks a confirmed payment that was never delivered as a warning, and an unconfirmed one as neutral", () => {
    expect(levelTone(L({ accepted: 0, fulfilled: 0 }), "fulfilled")).toBe("warn");
    expect(levelTone(L({ accepted: 0, fulfilled: 0, confirmed: "NOT_FOUND" }), "fulfilled")).toBe("neutral");
  });
  it("treats FAILED as bad and NOT_FOUND/UNKNOWN as warn", () => {
    expect(levelTone(L({ confirmed: "FAILED" }), "confirmed")).toBe("bad");
    expect(levelTone(L({ confirmed: "NOT_FOUND" }), "confirmed")).toBe("warn");
    expect(levelTone(L({ confirmed: "UNKNOWN" }), "confirmed")).toBe("warn");
  });
  it("words each level without conflating them", () => {
    expect(levelText(L({ accepted: 2 }), "accepted")).toBe("2 responses");
    expect(levelText(L({ submitted: null }), "submitted")).toBe("not observed");
    expect(levelText(L({ submitted: "worker" }), "submitted")).toBe("by the worker");
    expect(levelText(L({ confirmed: "NOT_FOUND" }), "confirmed")).toBe("not found");
    expect(levelText(L({ fulfilled: 0 }), "fulfilled")).toBe("never delivered");
  });
  it("raises payment alerts only for the two risky shapes", () => {
    expect(paymentAlert(P(L({ fulfilled: 2 })))).toBe("double-delivery");
    expect(paymentAlert(P(L({ accepted: 0, fulfilled: 0 })))).toBe("paid-not-delivered");
    expect(paymentAlert(P(L({})))).toBeNull();
    expect(paymentAlert(P(L({ accepted: 0, fulfilled: 0, confirmed: "FAILED" })))).toBeNull();
  });
});

describe("timelines", () => {
  it("builds one lane per worker, each in time order", () => {
    const pair = featuredPair(integration())!;
    const lanes = buildLanes(pair.control);
    expect(lanes.map((l) => l.worker)).toEqual(["worker-a", "worker-b"]);
    for (const l of lanes) expect(l.entries.map((e) => e.t)).toEqual([...l.entries.map((e) => e.t)].sort((a, b) => a - b));
    expect(lanes.flatMap((l) => l.entries).length).toBe(pair.control.timeline.length);
  });
  it("interleaves requests, faults and broadcasts on one clock", () => {
    const run = integration().reports.find((r) => r.scenario.variant === "unconfirmed-then-lands")!;
    const rows = chronology(run);
    expect(rows.map((r) => r.t)).toEqual([...rows.map((r) => r.t)].sort((a, b) => a - b));
    expect(new Set(rows.map((r) => r.source))).toEqual(new Set(["request", "fault", "broadcast"]));
  });
  it("finds the featured pair for both credential modes", () => {
    for (const mode of ["push", "pull"] as const) {
      const pair = featuredPair(integration(), mode)!;
      expect(pair.control.deployment.store).toBe("memory");
      expect(pair.shared.deployment.store).toBe("sqlite");
      expect(pair.control.deployment.mode).toBe(mode);
    }
  });
  it("groups every run under its scenario", () => {
    const s = integration();
    expect(groupByScenario(s).flatMap((g) => g.runs).length).toBe(s.reports.length);
  });
  it("formats durations and hashes", () => {
    expect(formatMs(12)).toBe("12 ms");
    expect(formatMs(12_345)).toBe("12.3 s");
    expect(shortHash("a".repeat(64))).toBe("aaaaaaaa…aaaaaa");
  });
});
