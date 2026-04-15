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
