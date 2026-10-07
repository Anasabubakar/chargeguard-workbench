// Copies the report schemas and recorded evidence from a chargeguard-runner checkout and stamps the pairing.
// Usage: node scripts/vendor-runner.mjs ../chargeguard-runner
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

const runnerDir = resolve(process.argv[2] ?? "../chargeguard-runner");
const out = resolve("vendor/chargeguard-runner");
mkdirSync(out, { recursive: true });

const pkg = JSON.parse(readFileSync(join(runnerDir, "package.json"), "utf8"));
const commit = execFileSync("git", ["-C", runnerDir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const files = [
  ["schema/report.v1.schema.json", "report.v1.schema.json"],
  ["schema/suite.v1.schema.json", "suite.v1.schema.json"],
  ["docs/evidence/suite-stub.json", "suite-stub.json"],
  ["docs/evidence/suite-testnet.json", "suite-testnet.json"],
];
const stamped = {};
for (const [from, to] of files) {
  copyFileSync(join(runnerDir, from), join(out, to));
  stamped[to] = sha(join(out, to));
}
const evidence = {};
for (const to of ["suite-stub.json", "suite-testnet.json"]) {
  const s = JSON.parse(readFileSync(join(out, to), "utf8"));
  evidence[to] = { evidenceClass: s.evidenceClass, generatedAt: s.generatedAt, command: s.command, runs: s.totals.runs, sdk: s.environment.sdk, node: s.environment.node };
}
writeFileSync(
  join(out, "VERSION.json"),
  JSON.stringify({ package: pkg.name, version: pkg.version, commit, reportVersion: "1", vendoredFor: "chargeguard-workbench", sha256: stamped, evidence }, null, 2) + "\n",
);
console.log(`vendored ${pkg.name}@${pkg.version} (${commit.slice(0, 12)})`);
