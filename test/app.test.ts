import { readFileSync, readdirSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

async function boot(hash = ""): Promise<void> {
  document.body.innerHTML = '<main id="app"></main>';
  history.replaceState(null, "", `/${hash}`);
  const { vi } = await import("vitest");
  vi.resetModules();
  await import("../src/main.ts");
}
const click = (sel: string) => (document.querySelector(sel) as HTMLElement).click();

describe("app", () => {
  beforeEach(async () => {
    await boot();
  });

  it("opens on the isolated-versus-shared comparison from recorded evidence", () => {
    expect(document.querySelector("h1")!.textContent).toBe("ChargeGuard workbench");
    expect(document.querySelector('[data-compare="memory"]')).not.toBeNull();
    expect(document.body.textContent).toContain("Recorded, not live");
    expect(document.body.textContent).toContain("not a proof");
    expect(document.querySelectorAll(".runbtn").length).toBe(21);
  });

  it("switches to the testnet evidence and to pull credentials", () => {
    click("#tab-testnet");
    expect(document.querySelectorAll(".runbtn").length).toBe(9);
    expect(document.body.textContent).toContain("testnet settlement");
    click("#mode-pull");
    expect(document.querySelector("#mode-pull")!.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[data-compare="memory"]')!.textContent).toContain("FAIL");
  });

  it("opens one run and goes back", () => {
    click('.runbtn[data-index="3"]');
    expect(document.querySelector("#run-detail .run")).not.toBeNull();
    expect(document.querySelector(".compare")).toBeNull();
    click("#back");
    expect(document.querySelector(".compare")).not.toBeNull();
  });

  it("shows an error for a file that is not a report and keeps the bundled data", async () => {
    const input = document.querySelector("#file") as HTMLInputElement;
    const file = new File(["{nope"], "x.json", { type: "application/json" });
    Object.defineProperty(input, "files", { value: [file] });
    input.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector(".error")!.textContent).toMatch(/Not valid JSON/);
    expect(document.querySelectorAll(".runbtn").length).toBe(21);
  });

  it("loads a valid run report the user recorded", async () => {
    const raw = JSON.parse(readFileSync("vendor/chargeguard-runner/suite-stub.json", "utf8")).reports[0];
    const input = document.querySelector("#file") as HTMLInputElement;
    Object.defineProperty(input, "files", { value: [new File([JSON.stringify(raw)], "r.json")] });
    input.dispatchEvent(new Event("change"));
    await new Promise((r) => setTimeout(r, 20));
    expect(document.querySelector("#tab-loaded")).not.toBeNull();
    expect(document.querySelector("#run-detail .run")).not.toBeNull();
  });
});

describe("security posture", () => {
  const files = readdirSync("src").filter((f) => f.endsWith(".ts") || f.endsWith(".css"));
  it("never writes markup from data: no innerHTML, outerHTML, insertAdjacentHTML, eval or Function", () => {
    for (const f of files) {
      const text = readFileSync(`src/${f}`, "utf8");
      expect(text, f).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/);
    }
  });
  it("does not use zod at runtime (validators are precompiled)", () => {
    for (const f of files) expect(readFileSync(`src/${f}`, "utf8"), f).not.toMatch(/from "zod"/);
  });
  it("has the same strict CSP in index.html and vercel.json, without unsafe-eval or unsafe-inline", () => {
    const html = readFileSync("index.html", "utf8");
    const meta = /Content-Security-Policy" content="([^"]+)"/.exec(html)![1]!;
    const header = JSON.parse(readFileSync("vercel.json", "utf8")).headers[0].headers.find((h: { key: string }) => h.key === "Content-Security-Policy").value as string;
    expect(meta).toBe(header);
    expect(meta).not.toMatch(/unsafe-/);
    expect(meta).toContain("script-src 'self'");
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/);
    expect(html).not.toMatch(/\son[a-z]+=/);
  });
});
