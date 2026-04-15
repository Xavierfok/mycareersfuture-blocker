// one-off script: capture fully-rendered HTML from mycareersfuture.gov.sg
// writes tests/fixtures/listing-page.html and tests/fixtures/detail-page.html
// usage: npx playwright install chromium && node scripts/capture-fixtures.mjs

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const LISTING_URL = "https://www.mycareersfuture.gov.sg/search?search=engineer&sortBy=relevancy&page=0";
const FIXTURES = new URL("../tests/fixtures/", import.meta.url);

mkdirSync(FIXTURES, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const ctx = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  console.log("navigating to listing page...");
  await page.goto(LISTING_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // wait for job cards to render. the site uses react; try a few likely selectors.
  console.log("waiting for job cards to render...");
  await page
    .waitForFunction(
      () => {
        const candidates = [
          '[data-testid*="job-card"]',
          '[data-testid*="JobCard"]',
          '[class*="JobCard"]',
          '[class*="job-card"]',
          'article',
          'a[href*="/job/"]',
        ];
        for (const sel of candidates) {
          if (document.querySelectorAll(sel).length >= 3) return sel;
        }
        return false;
      },
      { timeout: 45000 },
    )
    .catch((err) => {
      console.warn("warning: standard job-card selectors did not appear within 45s; saving whatever is there. err:", err.message);
    });

  // give it another 2s to settle any trailing renders
  await page.waitForTimeout(2000);

  const listingHtml = await page.content();
  writeFileSync(new URL("listing-page.html", FIXTURES), listingHtml);
  console.log(`saved listing-page.html (${listingHtml.length} chars)`);

  // extract first job link so we can navigate to a detail page
  const jobLinkHref = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href*="/job/"]'));
    return anchors.length > 0 ? anchors[0].href : null;
  });

  if (!jobLinkHref) {
    throw new Error("no job detail link found on listing page; inspect listing-page.html to discover the right selector");
  }

  console.log(`navigating to detail page: ${jobLinkHref}`);
  await page.goto(jobLinkHref, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  const detailHtml = await page.content();
  writeFileSync(new URL("detail-page.html", FIXTURES), detailHtml);
  console.log(`saved detail-page.html (${detailHtml.length} chars)`);

  // bonus: try to print candidate selectors we can see in the DOM
  const hints = await page.evaluate(() => {
    const collect = (sel) => {
      const els = document.querySelectorAll(sel);
      return { sel, count: els.length };
    };
    return [
      collect('[data-testid]'),
      collect('[class*="Card"]'),
      collect('[class*="card"]'),
      collect('article'),
      collect('a[href*="/job/"]'),
    ];
  });
  console.log("detail-page selector hints:", JSON.stringify(hints, null, 2));
} finally {
  await browser.close();
  console.log("done.");
}
