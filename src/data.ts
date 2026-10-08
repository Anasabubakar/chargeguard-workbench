import validateReportFn from "./generated/validateReport.js";
import validateSuiteFn from "./generated/validateSuite.js";
import pairing from "../vendor/chargeguard-runner/VERSION.json";
import stubSuite from "../vendor/chargeguard-runner/suite-stub.json";
import testnetSuite from "../vendor/chargeguard-runner/suite-testnet.json";
import type { Report, Suite } from "./types.ts";

type SchemaError = { instancePath: string; message?: string };
type Check = ((data: unknown) => boolean) & { errors?: SchemaError[] | null };
const checkReport = validateReportFn as unknown as Check;
const checkSuite = validateSuiteFn as unknown as Check;

/** The runner version, commit and checksums this workbench was built and tested against. */
export const PAIRING = pairing;

export type Loaded = { ok: true; suite: Suite; origin: "recorded" | "loaded" } | { ok: false; error: string };

/** Headline fields must follow from the evidence in the same document; otherwise the file contradicts itself. */
export function consistencyProblem(reports: Report[], totals?: Suite["totals"]): string | null {
  for (const r of reports) {
    const failedChecks = r.checks.filter((c) => !c.passed).length;
    if (r.verdict === "pass" && failedChecks > 0) return `Inconsistent report ${r.scenario.id}: verdict is "pass" but ${failedChecks} check(s) failed.`;
    if (r.verdict === "fail" && failedChecks === 0) return `Inconsistent report ${r.scenario.id}: verdict is "fail" but every check passed.`;
    if (r.matchesExpectation !== (r.verdict === r.expectation)) return `Inconsistent report ${r.scenario.id}: matchesExpectation does not follow from verdict and expectation.`;
  }
  if (totals) {
    const count = (v: string) => reports.filter((r) => r.verdict === v).length;
    if (totals.runs !== reports.length || totals.pass !== count("pass") || totals.fail !== count("fail") || totals.inconclusive !== count("inconclusive") || totals.matchedExpectation !== reports.filter((r) => r.matchesExpectation).length) {
      return "Inconsistent suite: its totals do not agree with its run reports.";
    }
  }
  return null;
}

const issues = (c: Check) => (c.errors ?? []).slice(0, 5).map((e) => `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim()).join("; ");

/** Validates a parsed JSON value as a v1 suite or a single v1 run report (wrapped into a one-run suite). */
export function toSuite(raw: unknown, origin: "recorded" | "loaded"): Loaded {
  const o = raw as { reportVersion?: unknown; kind?: unknown } | null;
  if (!o || typeof o !== "object") return { ok: false, error: "Not a ChargeGuard report: expected a JSON object." };
  if (o.reportVersion !== "1") return { ok: false, error: `Unsupported report version ${JSON.stringify(o.reportVersion)}. This workbench reads report version 1 only.` };
  if (o.kind === "suite") {
    if (!checkSuite(raw)) return { ok: false, error: `Suite does not match the v1 suite schema: ${issues(checkSuite)}` };
    const suite = raw as unknown as Suite;
    const bad = consistencyProblem(suite.reports, suite.totals);
    return bad ? { ok: false, error: bad } : { ok: true, suite, origin };
  }
  if (o.kind === "run") {
    if (!checkReport(raw)) return { ok: false, error: `Report does not match the v1 report schema: ${issues(checkReport)}` };
    const r = raw as unknown as Report;
    const suite: Suite = {
      reportVersion: "1",
      kind: "suite",
      generatedAt: r.generatedAt,
      command: r.command,
      environment: r.environment,
      evidenceClass: r.evidenceClass,
      reports: [r],
      totals: { runs: 1, pass: r.verdict === "pass" ? 1 : 0, fail: r.verdict === "fail" ? 1 : 0, inconclusive: r.verdict === "inconclusive" ? 1 : 0, matchedExpectation: r.matchesExpectation ? 1 : 0 },
      limits: r.limits,
    };
    const bad = consistencyProblem(suite.reports);
    return bad ? { ok: false, error: bad } : { ok: true, suite, origin };
  }
  return { ok: false, error: `Unknown report kind ${JSON.stringify(o.kind)}: expected "run" or "suite".` };
}

export function parseReportText(text: string): Loaded {
  if (text.length > 8_000_000) return { ok: false, error: "File is larger than 8 MB; reports are far smaller than that." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  return toSuite(raw, "loaded");
}

export interface Dataset {
  id: string;
  label: string;
  suite: Loaded;
}

/** The recorded evidence bundled with the page, validated at load time. */
export const DATASETS: Dataset[] = [
  { id: "integration", label: "Integration (stub chain)", suite: toSuite(stubSuite, "recorded") },
  { id: "testnet", label: "Testnet settlement", suite: toSuite(testnetSuite, "recorded") },
];
