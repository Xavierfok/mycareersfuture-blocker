import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installChromeMock } from "./chrome-mock.js";

let mock;
beforeEach(() => { mock = installChromeMock(); });

test("load: returns defaults when empty", async () => {
  const { load } = await import("../storage.js");
  const state = await load();
  assert.deepEqual(state, { schemaVersion: 1, blockedCompanies: [], blockedKeywords: [] });
});

test("addCompany: normalizes and stores", async () => {
  const { addCompany, load } = await import("../storage.js");
  await addCompany("ACME Pte Ltd");
  const state = await load();
  assert.deepEqual(state.blockedCompanies, ["acme"]);
});

test("addCompany: dedups", async () => {
  const { addCompany, load } = await import("../storage.js");
  await addCompany("ACME");
  await addCompany("acme");
  await addCompany("Acme Pte Ltd");
  const state = await load();
  assert.deepEqual(state.blockedCompanies, ["acme"]);
});

test("removeCompany: filters out entry", async () => {
  const { addCompany, removeCompany, load } = await import("../storage.js");
  await addCompany("ACME");
  await addCompany("Globex");
  await removeCompany("acme");
  const state = await load();
  assert.deepEqual(state.blockedCompanies, ["globex"]);
});

test("addKeyword: lowercases, trims, dedups", async () => {
  const { addKeyword, load } = await import("../storage.js");
  await addKeyword("  Recruitment ");
  await addKeyword("RECRUITMENT");
  const state = await load();
  assert.deepEqual(state.blockedKeywords, ["recruitment"]);
});

test("removeKeyword: filters out entry", async () => {
  const { addKeyword, removeKeyword, load } = await import("../storage.js");
  await addKeyword("foo");
  await removeKeyword("foo");
  const state = await load();
  assert.deepEqual(state.blockedKeywords, []);
});

test("addCompany: surfaces quota error", async () => {
  const { addCompany } = await import("../storage.js");
  mock.triggerQuotaError();
  await assert.rejects(() => addCompany("acme"), /quota/i);
});
