import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATASETS, PAIRING, parseReportText, toSuite } from "../src/data.ts";
import type { Report, Suite } from "../src/types.ts";

const suiteOf = (id: string): Suite => {
  const d = DATASETS.find((x) => x.id === id)!;
  if (!d.suite.ok) throw new Error(d.suite.error);
  return d.suite.suite;
};

describe("bundled evidence", () => {
  it("validates against the vendored v1 schemas", () => {
    for (const d of DATASETS) expect(d.suite.ok, d.id).toBe(true);
  });

  it("is stamped: checksums match VERSION.json and the report version is 1", () => {
    expect(PAIRING.reportVersion).toBe("1");
    for (const [file, sha] of Object.entries(PAIRING.sha256)) {
      expect(createHash("sha256").update(readFileSync(`vendor/chargeguard-runner/${file}`)).digest("hex"), file).toBe(sha);
    }
  });

  it("has totals that agree with its own runs", () => {
    for (const d of DATASETS) {
      const s = suiteOf(d.id);
      expect(s.totals.runs).toBe(s.reports.length);
      expect(s.totals.pass).toBe(s.reports.filter((r) => r.verdict === "pass").length);
      expect(s.totals.fail).toBe(s.reports.filter((r) => r.verdict === "fail").length);
      expect(s.totals.matchedExpectation).toBe(s.reports.filter((r) => r.matchesExpectation).length);
    }
  });

  it("labels each set with the right evidence class, in the suite and in every run", () => {
    expect(suiteOf("integration").evidenceClass).toBe("integration");
    expect(suiteOf("testnet").evidenceClass).toBe("testnet settlement");
    for (const d of DATASETS) for (const r of suiteOf(d.id).reports) expect(r.evidenceClass).toBe(suiteOf(d.id).evidenceClass);
    expect(suiteOf("integration").reports.every((r) => r.chain.kind === "stub")).toBe(true);
    expect(suiteOf("testnet").reports.every((r) => r.chain.kind === "testnet")).toBe(true);
  });

  it("records the failing isolated-memory deployment and the passing shared-store deployment", () => {
    for (const id of ["integration", "testnet"]) {
      const s = suiteOf(id);
      const pick = (store: "memory" | "sqlite"): Report => s.reports.find((r) => r.scenario.id === "repeated-credential" && r.deployment.store === store && r.deployment.mode === "push")!;
      const bad = pick("memory");
      const good = pick("sqlite");
      expect(bad.verdict, id).toBe("fail");
      expect(bad.matchesExpectation).toBe(true);
      expect(bad.payments[0]!.levels.fulfilled).toBe(2);
      expect(bad.payments[0]!.levels.accepted).toBe(2);
      expect(good.verdict, id).toBe("pass");
      expect(good.payments[0]!.levels.fulfilled).toBe(1);
    }
  });

  it("testnet evidence carries real transaction hashes confirmed SUCCESS and no ambiguous-settlement runs", () => {
    const s = suiteOf("testnet");
    expect(s.reports.some((r) => r.scenario.id === "ambiguous-settlement")).toBe(false);
    const confirmed = s.reports.flatMap((r) => r.payments).filter((p) => p.levels.confirmed === "SUCCESS");
    expect(confirmed.length).toBeGreaterThan(5);
    for (const p of confirmed) expect(p.txHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never contains a secret key", () => {
    for (const f of ["suite-stub.json", "suite-testnet.json"]) expect(readFileSync(`vendor/chargeguard-runner/${f}`, "utf8")).not.toMatch(/\bS[A-Z2-7]{55}\b/);
  });
});

describe("loading a report", () => {
  const good = (): Report => suiteOf("integration").reports[0]!;

  it("accepts a single run and wraps it in a one-run suite", () => {
    const r = toSuite(good(), "loaded");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.suite.reports).toHaveLength(1);
  });

  it("rejects a wrong version, a wrong kind and a missing level", () => {
    expect(toSuite({ ...good(), reportVersion: "2" }, "loaded").ok).toBe(false);
    expect(toSuite({ ...good(), kind: "other" }, "loaded").ok).toBe(false);
    const broken = structuredClone(good());
    delete (broken.payments[0]!.levels as Partial<typeof broken.payments[0]["levels"]>).fulfilled;
    const r = toSuite(broken, "loaded");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/schema/);
  });

  it("rejects non-JSON text, non-objects and oversized input", () => {
    expect(parseReportText("{nope").ok).toBe(false);
    expect(parseReportText("42").ok).toBe(false);
    expect(parseReportText(" ".repeat(8_000_001)).ok).toBe(false);
  });
});
