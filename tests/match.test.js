import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize } from "../match.js";

test("normalize: lowercases and trims", () => {
  assert.equal(normalize("  ACME  "), "acme");
});

test("normalize: collapses whitespace", () => {
  assert.equal(normalize("acme   corp"), "acme corp");
});

test("normalize: strips pte ltd suffix variants", () => {
  assert.equal(normalize("ABC Pte Ltd"), "abc");
  assert.equal(normalize("ABC Pte. Ltd."), "abc");
  assert.equal(normalize("ABC pte. ltd"), "abc");
});

test("normalize: strips other common suffixes", () => {
  assert.equal(normalize("Globex LLP"), "globex");
  assert.equal(normalize("Foo Inc."), "foo");
  assert.equal(normalize("Bar Sdn Bhd"), "bar");
});

test("normalize: NFKC handles NBSP and full-width", () => {
  assert.equal(normalize("acme\u00a0corp"), "acme corp");
  assert.equal(normalize("ＡＢＣ"), "abc");
});

test("normalize: strips trailing punctuation", () => {
  assert.equal(normalize("acme."), "acme");
  assert.equal(normalize("acme,"), "acme");
});

import { hasAppliedText } from "../match.js";

test("hasAppliedText: matches any occurrence of the word Applied", () => {
  assert.equal(hasAppliedText("Applied 3 days ago"), true);
  assert.equal(hasAppliedText("Applied 1 day ago"), true);
  assert.equal(hasAppliedText("Applied today"), true);
  assert.equal(hasAppliedText("Applied just now"), true);
  assert.equal(hasAppliedText("Status: Applied"), true);
  assert.equal(hasAppliedText("Applied"), true);
  assert.equal(hasAppliedText("APPLIED 2 WEEKS AGO"), true);
});

test("hasAppliedText: ignores unrelated text", () => {
  assert.equal(hasAppliedText("Apply now"), false);
  assert.equal(hasAppliedText("Reapplied for role"), false);
  assert.equal(hasAppliedText(""), false);
  assert.equal(hasAppliedText(null), false);
});

import { isBlocked } from "../match.js";

test("isBlocked: exact normalized employer match hides", () => {
  const state = { blockedCompanies: ["acme"], blockedKeywords: [] };
  assert.equal(isBlocked({ employer: "ACME Pte Ltd", title: "Engineer" }, state), true);
});

test("isBlocked: no match returns false", () => {
  const state = { blockedCompanies: ["acme"], blockedKeywords: [] };
  assert.equal(isBlocked({ employer: "Globex", title: "Engineer" }, state), false);
});

test("isBlocked: keyword substring in employer hides", () => {
  const state = { blockedCompanies: [], blockedKeywords: ["recruitment"] };
  assert.equal(isBlocked({ employer: "Acme Recruitment", title: "Engineer" }, state), true);
});

test("isBlocked: keyword substring in title hides", () => {
  const state = { blockedCompanies: [], blockedKeywords: ["commission only"] };
  assert.equal(isBlocked({ employer: "Acme", title: "Sales - Commission Only" }, state), true);
});

test("isBlocked: empty state never blocks", () => {
  const state = { blockedCompanies: [], blockedKeywords: [] };
  assert.equal(isBlocked({ employer: "Acme", title: "Engineer" }, state), false);
});

test("isBlocked: handles missing fields", () => {
  const state = { blockedCompanies: ["acme"], blockedKeywords: [] };
  assert.equal(isBlocked({ employer: "", title: "" }, state), false);
  assert.equal(isBlocked({ employer: null, title: null }, state), false);
});
