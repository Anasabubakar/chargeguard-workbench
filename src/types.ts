/** Mirrors schema/report.v1.schema.json and suite.v1.schema.json of chargeguard-runner (vendored, version-stamped). */

export type EvidenceClass = "in-process" | "integration" | "testnet settlement";

export interface Levels {
  accepted: number;
  submitted: "worker" | "client" | null;
  confirmed: "SUCCESS" | "FAILED" | "NOT_FOUND" | "UNKNOWN";
  fulfilled: number;
}

export interface Payment {
  id: string;
  mode: "push" | "pull";
  txHash: string;
  challengeId: string;
  levels: Levels;
  note: string | null;
}

export interface TimelineEntry {
  t: number;
  durationMs: number;
  worker: string;
  label: string;
  request: "challenge" | "credential";
  status: number;
  outcome: "challenge" | "accepted" | "rejected" | "unavailable" | "error";
  paymentId: string | null;
  detail: string | null;
}

export interface Broadcast {
  t: number;
  paymentId: string | null;
  txHash: string;
  outcome: "PENDING" | "DUPLICATE" | "ERROR" | "DROPPED" | "UNKNOWN";
  resultCode: string | null;
}

export interface FaultEvent {
  t: number;
  kind: string;
  detail: string;
}

export interface Check {
  id: string;
  description: string;
  passed: boolean;
  detail: string;
}

export interface Environment {
  node: string;
  platform: string;
  arch: string;
  chargeguardRunner: string;
  sdk: { "@stellar/mpp": string; mppx: string; "@stellar/stellar-sdk": string };
}

export interface Report {
  reportVersion: "1";
  kind: "run";
  generatedAt: string;
  command: string;
  environment: Environment;
  evidenceClass: EvidenceClass;
  chain: { kind: "stub" | "testnet"; description: string };
  deployment: { workers: number; store: "memory" | "sqlite"; mode: "push" | "pull" };
  scenario: { id: string; variant: string | null; title: string; invariant: string; faultSchedule: string[] };
  expectation: "pass" | "fail";
  verdict: "pass" | "fail" | "inconclusive";
  matchesExpectation: boolean;
  summary: string;
  checks: Check[];
  observations: string[];
  payments: Payment[];
  broadcasts: Broadcast[];
  timeline: TimelineEntry[];
  faultEvents: FaultEvent[];
  limits: string[];
}

export interface Suite {
  reportVersion: "1";
  kind: "suite";
  generatedAt: string;
  command: string;
  environment: Environment;
  evidenceClass: EvidenceClass;
  reports: Report[];
  totals: { runs: number; pass: number; fail: number; inconclusive: number; matchedExpectation: number };
  limits: string[];
}
