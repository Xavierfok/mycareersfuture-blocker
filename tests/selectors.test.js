import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { SELECTORS, extractJobFromCard, extractJobFromDetail } from "../selectors.js";

const listingHtml = readFileSync(new URL("./fixtures/listing-page.html", import.meta.url), "utf8");
const detailHtml = readFileSync(new URL("./fixtures/detail-page.html", import.meta.url), "utf8");

test("listing page: finds at least one job card", () => {
  const dom = new JSDOM(listingHtml);
  const cards = dom.window.document.querySelectorAll(SELECTORS.listingCard);
  assert.ok(cards.length > 0, "expected at least one job card");
});

test("listing page: extracts employer and title from card", () => {
  const dom = new JSDOM(listingHtml);
  const card = dom.window.document.querySelector(SELECTORS.listingCard);
  const job = extractJobFromCard(card);
  assert.ok(job.employer && job.employer.length > 0, "employer should be non-empty");
  assert.ok(job.title && job.title.length > 0, "title should be non-empty");
});

test("listing page: card count matches job link count (sanity)", () => {
  const dom = new JSDOM(listingHtml);
  const cards = dom.window.document.querySelectorAll(SELECTORS.listingCard);
  const links = dom.window.document.querySelectorAll('a[href*="/job/"]');
  // each card has a link, but some non-card links may exist; cards should not exceed links
  assert.ok(cards.length >= 3, `expected 3+ cards, got ${cards.length}`);
  assert.ok(links.length >= cards.length, "expected at least as many job links as cards");
});

test("detail page: extracts employer", () => {
  const dom = new JSDOM(detailHtml);
  const job = extractJobFromDetail(dom.window.document);
  assert.ok(job.employer && job.employer.length > 0, "employer should be non-empty");
});
