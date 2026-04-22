// Reproduce the "applied jobs still show" bug by loading the extension
// into a real Chrome instance and rendering MCF-shaped cards.
// Tests both initial-render and React-late-insert scenarios.

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT = resolve(__dirname, "..");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>mcf fixture</title>
  <style>body{font-family:sans-serif;padding:20px} [data-testid="job-card"]{border:1px solid #ccc;margin:8px 0;padding:12px}</style>
</head>
<body>
  <div data-testid="card-list">
    <div data-testid="job-card" id="c1">
      <section data-testid="job-title-info">
        <div data-testid="company-hire-info">ACME CORP</div>
        <h3 data-testid="job-card__job-title">Posted Job - no apply</h3>
      </section>
      <div class="tail-initial">Posted 3 days ago</div>
    </div>
    <div data-testid="job-card" id="c2">
      <section data-testid="job-title-info">
        <div data-testid="company-hire-info">BETA INC</div>
        <h3 data-testid="job-card__job-title">Applied Initial Card</h3>
      </section>
      <span data-cy="job-card-date-info">Applied 9 days ago</span>
    </div>
    <div data-testid="job-card" id="c3">
      <section data-testid="job-title-info">
        <div data-testid="company-hire-info">GAMMA LTD</div>
        <h3 data-testid="job-card__job-title">Late Text Card</h3>
      </section>
      <span data-cy="job-card-date-info" id="late-span"></span>
    </div>
  </div>
  <script>
    // Simulate React populating the date-info span 500ms after load.
    setTimeout(() => {
      document.getElementById("late-span").textContent = "Applied 2 days ago";
    }, 500);
  </script>
</body>
</html>`;

const tmpPath = "/tmp/mcf-fixture.html";
await (await import("node:fs/promises")).writeFile(tmpPath, html);

const userDataDir = "/tmp/mcf-playwright-profile";
await (await import("node:fs/promises")).rm(userDataDir, { recursive: true, force: true });

console.log("[repro] launching chromium with extension from", EXT);
const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: true,
  channel: "chromium",
  args: [
    `--disable-extensions-except=${EXT}`,
    `--load-extension=${EXT}`,
    "--no-sandbox",
    "--headless=new",
  ],
});

// open the mycareersfuture.gov.sg host so the extension's host_permissions match.
// We'll inject our fixture HTML into a blank page under that origin via file:// -> no, we need https://www.mycareersfuture.gov.sg/*
// Easiest: navigate to MCF itself, then replace the body with our fixture.
const page = await ctx.newPage();
await page.goto("https://www.mycareersfuture.gov.sg/search", { waitUntil: "domcontentloaded" }).catch(() => {});
await page.evaluate((bodyHtml) => {
  document.open();
  document.write(bodyHtml);
  document.close();
}, html);

await page.waitForTimeout(2000);

const snap1 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-testid="job-card"]')).map(c => ({
    id: c.id,
    hidden_attr: c.getAttribute("data-mcf-hidden"),
    display: c.style.display || getComputedStyle(c).display,
    text_tail: c.textContent.slice(-60),
  }));
});
console.log("[repro] @2s after load:", JSON.stringify(snap1, null, 2));

// Simulate React populating the empty span LATE, after applyBlocking has already run.
console.log("[repro] injecting late text into c3 span...");
await page.evaluate(() => {
  const span = document.getElementById("late-span");
  span.textContent = "Applied 2 days ago";
});

// Wait for observer + fallback retries to catch it.
await page.waitForTimeout(7000);

const snap2 = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-testid="job-card"]')).map(c => ({
    id: c.id,
    hidden_attr: c.getAttribute("data-mcf-hidden"),
    display: c.style.display || getComputedStyle(c).display,
    text_tail: c.textContent.slice(-60),
  }));
});
console.log("[repro] @9s after load:", JSON.stringify(snap2, null, 2));

const c2hidden = snap2.find(s => s.id === "c2")?.display === "none";
const c3hidden = snap2.find(s => s.id === "c3")?.display === "none";
console.log("\n[repro] VERDICT:");
console.log("  c2 (initial applied):", c2hidden ? "HIDDEN ✓" : "STILL VISIBLE ✗");
console.log("  c3 (late applied):", c3hidden ? "HIDDEN ✓" : "STILL VISIBLE ✗");

await ctx.close();
