import { describe, expect, it } from "vitest";
import { DATASETS } from "../src/data.ts";
import { featuredPair } from "../src/state.ts";
import { renderCompare, renderRun } from "../src/view.ts";
import type { Report, Suite } from "../src/types.ts";

const suite = (): Suite => {
  const d = DATASETS[0]!.suite;
  if (!d.ok) throw new Error(d.error);
  return d.suite;
};

describe("views", () => {
  it("compare shows both deployments with lanes and all four levels", () => {
    const pair = featuredPair(suite())!;
    const el = renderCompare(pair.control, pair.shared);
    expect(el.querySelectorAll(".compare-col")).toHaveLength(2);
    expect(el.querySelectorAll(".lane").length).toBe(4);
    const bad = el.querySelector('[data-compare="memory"]')!;
    expect(bad.textContent).toContain("FAIL");
    expect(bad.querySelector(".alert-double-delivery")).not.toBeNull();
    expect(bad.querySelector('[data-level="fulfilled"]')!.textContent).toContain("delivered 2 times");
    const good = el.querySelector('[data-compare="sqlite"]')!;
    expect(good.querySelector(".alert-double-delivery")).toBeNull();
    for (const l of ["accepted", "submitted", "confirmed", "fulfilled"]) expect(good.querySelector(`[data-level="${l}"]`)).not.toBeNull();
  });

  it("run detail lists every check, the limits and the recording command", () => {
    const r = suite().reports[0]!;
    const el = renderRun(r);
    expect(el.querySelectorAll(".check").length).toBe(r.checks.length);
    expect(el.textContent).toContain("not a proof");
    expect(el.textContent).toContain(r.command);
  });

  it("flags paid-on-chain-but-not-delivered runs", () => {
    const r = suite().reports.find((x) => x.scenario.variant === "unconfirmed-then-lands")!;
    expect(renderRun(r).querySelector(".alert-paid-not-delivered")).not.toBeNull();
  });

  it("renders report text as text, never as markup", () => {
    const r: Report = structuredClone(suite().reports[0]!);
    r.timeline[0]!.label = '<img src=x onerror="window.pwned=1">';
    r.summary = "<script>window.pwned=1</script>";
    const el = renderRun(r);
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("script")).toBeNull();
    expect(el.textContent).toContain("<img src=x");
  });
});
