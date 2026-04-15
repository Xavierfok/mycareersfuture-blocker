import { normalize } from "./match.js";

const KEYS = { SCHEMA: "schemaVersion", COMPANIES: "blockedCompanies", KEYWORDS: "blockedKeywords" };

export async function load() {
  const raw = await chrome.storage.sync.get([KEYS.SCHEMA, KEYS.COMPANIES, KEYS.KEYWORDS]);
  return {
    schemaVersion: raw[KEYS.SCHEMA] ?? 1,
    blockedCompanies: raw[KEYS.COMPANIES] ?? [],
    blockedKeywords: raw[KEYS.KEYWORDS] ?? [],
  };
}

async function write(partial) {
  try {
    await chrome.storage.sync.set(partial);
  } catch (err) {
    if (/quota/i.test(String(err?.message || err?.name || ""))) {
      throw new Error("storage quota exceeded; remove some entries");
    }
    throw err;
  }
}

export async function addCompany(raw) {
  const norm = normalize(raw);
  if (!norm) return;
  const state = await load();
  if (state.blockedCompanies.includes(norm)) return;
  await write({ [KEYS.COMPANIES]: [...state.blockedCompanies, norm] });
}

export async function removeCompany(norm) {
  const state = await load();
  await write({ [KEYS.COMPANIES]: state.blockedCompanies.filter(x => x !== norm) });
}

export async function addKeyword(raw) {
  const kw = (raw ?? "").trim().toLowerCase();
  if (!kw) return;
  const state = await load();
  if (state.blockedKeywords.includes(kw)) return;
  await write({ [KEYS.KEYWORDS]: [...state.blockedKeywords, kw] });
}

export async function removeKeyword(kw) {
  const state = await load();
  await write({ [KEYS.KEYWORDS]: state.blockedKeywords.filter(x => x !== kw) });
}

export async function initDefaults() {
  const raw = await chrome.storage.sync.get([KEYS.SCHEMA]);
  if (raw[KEYS.SCHEMA] == null) {
    await write({ [KEYS.SCHEMA]: 1, [KEYS.COMPANIES]: [], [KEYS.KEYWORDS]: [] });
  }
}
