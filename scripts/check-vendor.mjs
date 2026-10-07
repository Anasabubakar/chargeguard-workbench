// Fails when a vendored file no longer matches the checksum stamped in VERSION.json, so the pairing cannot drift silently.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const dir = "vendor/chargeguard-runner";
const version = JSON.parse(readFileSync(`${dir}/VERSION.json`, "utf8"));
let bad = false;
for (const [file, expected] of Object.entries(version.sha256)) {
  const actual = createHash("sha256").update(readFileSync(`${dir}/${file}`)).digest("hex");
  if (actual !== expected) {
    console.error(`${dir}/${file} does not match the stamped checksum; run pnpm vendor`);
    bad = true;
  }
}
if (bad) process.exit(1);
console.log(`vendor ok: ${version.package}@${version.version} (${version.commit.slice(0, 12)}), report v${version.reportVersion}`);
