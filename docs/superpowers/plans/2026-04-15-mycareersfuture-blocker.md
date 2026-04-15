# mycareersfuture blocker implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** build a chrome manifest v3 extension that lets the user block specific companies (and keyword patterns) from appearing on mycareersfuture.gov.sg job listings.

**Architecture:** content script + popup + minimal background worker. pure logic (normalization, matching) lives in separate modules with unit tests. DOM selectors are isolated behind a `selectors.js` module and covered by fixture tests captured from the live site. storage goes through a shared `storage.js` that handles dedup and quota errors.

**Tech Stack:** vanilla JavaScript (ES modules), `chrome.storage.sync`, `MutationObserver`, node's built-in `node:test` runner + `node:assert` for tests, `jsdom` for fixture-based selector tests.

---

## file structure

files to create under `~/Desktop/mycareersfuture-blocker/`:

```
manifest.json
background.js
content.js
hide-before-ready.css
match.js
storage.js
selectors.js
popup.html
popup.js
popup.css
icons/icon-16.png
icons/icon-48.png
icons/icon-128.png
package.json                       # for node_modules + test script only
tests/chrome-mock.js               # mock chrome.storage for node tests
tests/match.test.js
tests/storage.test.js
tests/selectors.test.js
tests/fixtures/listing-page.html   # captured from live site
tests/fixtures/detail-page.html    # captured from live site
scripts/make-icons.mjs             # generate placeholder PNG icons
```

---

### Task 1: project scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: write package.json**

```json
{
  "name": "mycareersfuture-blocker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  },
  "devDependencies": {
    "jsdom": "^24.0.0"
  }
}
```

- [ ] **Step 2: write .gitignore**

```
node_modules/
*.log
.DS_Store
dist/
*.zip
```

- [ ] **Step 3: install dev dependency**

Run: `cd ~/Desktop/mycareersfuture-blocker && npm install`
Expected: `jsdom` in `node_modules/`, `package-lock.json` created.

- [ ] **Step 4: commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: scaffold package.json and gitignore"
```

---

### Task 2: normalize() with TDD

**Files:**
- Create: `match.js`
- Test: `tests/match.test.js`

- [ ] **Step 1: write the failing test**

```javascript
// tests/match.test.js
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
```

- [ ] **Step 2: run test, verify failure**

Run: `npm test`
Expected: FAIL with "Cannot find module '../match.js'" or similar.

- [ ] **Step 3: implement normalize()**

```javascript
// match.js
const SUFFIXES = [
  "pte. ltd.", "pte ltd.", "pte. ltd", "pte ltd",
  "sdn bhd",
  "llp", "llc",
  "inc.", "inc",
  "ltd.", "ltd",
  "co.", "co",
];

export function normalize(s) {
  if (!s) return "";
  let out = s.normalize("NFKC").toLowerCase();
  out = out.replace(/\s+/g, " ").trim();
  // strip matching suffix repeatedly in case of chains
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of SUFFIXES) {
      if (out.endsWith(" " + suf) || out === suf) {
        out = out.slice(0, out.length - suf.length).trim();
        changed = true;
        break;
      }
    }
  }
  out = out.replace(/[.,;:!?]+$/g, "").trim();
  return out;
}
```

- [ ] **Step 4: run tests, verify pass**

Run: `npm test`
Expected: all normalize tests PASS.

- [ ] **Step 5: commit**

```bash
git add match.js tests/match.test.js
git commit -m "feat: add normalize() with unit tests"
```

---

### Task 3: isBlocked() with TDD

**Files:**
- Modify: `match.js`
- Modify: `tests/match.test.js`

- [ ] **Step 1: add failing tests**

Append to `tests/match.test.js`:

```javascript
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
```

- [ ] **Step 2: run tests, verify new ones fail**

Run: `npm test`
Expected: new tests FAIL with "isBlocked is not a function".

- [ ] **Step 3: implement isBlocked()**

Append to `match.js`:

```javascript
export function isBlocked(job, state) {
  const employer = job?.employer ?? "";
  const title = job?.title ?? "";
  if (!employer && !title) return false;

  const normEmployer = normalize(employer);
  if (state.blockedCompanies.includes(normEmployer)) return true;

  const lowerEmployer = employer.toLowerCase();
  const lowerTitle = title.toLowerCase();
  for (const kw of state.blockedKeywords) {
    if (!kw) continue;
    if (lowerEmployer.includes(kw) || lowerTitle.includes(kw)) return true;
  }
  return false;
}
```

- [ ] **Step 4: run tests, verify pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 5: commit**

```bash
git add match.js tests/match.test.js
git commit -m "feat: add isBlocked() with unit tests"
```

---

### Task 4: storage.js with dedup + quota handling

**Files:**
- Create: `storage.js`
- Create: `tests/chrome-mock.js`
- Create: `tests/storage.test.js`

- [ ] **Step 1: write chrome-mock helper**

```javascript
// tests/chrome-mock.js
export function installChromeMock(initialData = {}) {
  const store = { ...initialData };
  let quotaError = false;
  globalThis.chrome = {
    runtime: { lastError: null },
    storage: {
      sync: {
        async get(keys) {
          const out = {};
          const k = keys === null ? Object.keys(store) : (Array.isArray(keys) ? keys : [keys]);
          for (const key of k) if (key in store) out[key] = store[key];
          return out;
        },
        async set(obj) {
          if (quotaError) {
            const err = new Error("QUOTA_BYTES exceeded");
            err.name = "QuotaExceededError";
            throw err;
          }
          Object.assign(store, obj);
        },
      },
    },
  };
  return {
    store,
    triggerQuotaError() { quotaError = true; },
    reset() { for (const k of Object.keys(store)) delete store[k]; quotaError = false; },
  };
}
```

- [ ] **Step 2: write failing storage tests**

```javascript
// tests/storage.test.js
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
```

- [ ] **Step 3: run tests, verify fail**

Run: `npm test`
Expected: FAIL "Cannot find module '../storage.js'".

- [ ] **Step 4: implement storage.js**

```javascript
// storage.js
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
```

- [ ] **Step 5: run tests, verify pass**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 6: commit**

```bash
git add storage.js tests/chrome-mock.js tests/storage.test.js
git commit -m "feat: add storage.js with dedup and quota handling"
```

---

### Task 5: capture live DOM fixtures

**Files:**
- Create: `tests/fixtures/listing-page.html`
- Create: `tests/fixtures/detail-page.html`

this is a manual task that blocks selectors.js (Task 6).

- [ ] **Step 1: capture listing page HTML**

1. open `https://www.mycareersfuture.gov.sg/search?sortBy=relevancy&page=0` in chrome
2. wait for results to fully render (search with a generic term like "engineer" if the default is empty)
3. open devtools → elements → right-click `<html>` → "copy" → "copy outerHTML"
4. paste into `tests/fixtures/listing-page.html`

- [ ] **Step 2: capture detail page HTML**

1. click any job card to open the detail page
2. wait for it to fully render
3. copy outerHTML the same way
4. paste into `tests/fixtures/detail-page.html`

- [ ] **Step 3: identify selectors (record findings as comments in selectors.js draft)**

in devtools for each fixture, note:
- job card container selector (listing page)
- employer name selector within a card
- job title selector within a card
- detail-page employer name selector
- a stable parent element on each to mount the block button inside

record these in a scratch file or plan margin, used in Task 6.

- [ ] **Step 4: commit**

```bash
git add tests/fixtures/
git commit -m "test: add live-captured HTML fixtures for selector tests"
```

---

### Task 6: selectors.js + fixture tests

**Files:**
- Create: `selectors.js`
- Create: `tests/selectors.test.js`

- [ ] **Step 1: write failing fixture test**

```javascript
// tests/selectors.test.js
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

test("detail page: extracts employer", () => {
  const dom = new JSDOM(detailHtml);
  const job = extractJobFromDetail(dom.window.document);
  assert.ok(job.employer && job.employer.length > 0, "employer should be non-empty");
});
```

- [ ] **Step 2: run tests, verify fail**

Run: `npm test`
Expected: FAIL "Cannot find module '../selectors.js'".

- [ ] **Step 3: implement selectors.js using selectors recorded in Task 5**

(exact selector strings come from Task 5 findings; fill them in here.)

```javascript
// selectors.js
// all DOM selectors for mycareersfuture.gov.sg live in this file.
// when the site updates, only this file should need changes.

export const SELECTORS = {
  listingCard: "",        // e.g. '[data-testid="job-card"]', fill from Task 5
  cardEmployer: "",       // selector within a card
  cardTitle: "",          // selector within a card
  cardMount: "",          // where to insert the block button inside a card
  detailEmployer: "",     // selector on the detail page
  detailMount: "",        // where to insert the block button on detail page
};

export function extractJobFromCard(cardEl) {
  const employer = cardEl?.querySelector(SELECTORS.cardEmployer)?.textContent?.trim() ?? "";
  const title = cardEl?.querySelector(SELECTORS.cardTitle)?.textContent?.trim() ?? "";
  return { employer, title };
}

export function extractJobFromDetail(doc) {
  const employer = doc?.querySelector(SELECTORS.detailEmployer)?.textContent?.trim() ?? "";
  return { employer, title: "" };
}
```

- [ ] **Step 4: run tests, verify pass**

Run: `npm test`
Expected: all tests PASS. if any fail, adjust the selectors in `selectors.js` (not the tests) until they match the fixture DOM.

- [ ] **Step 5: commit**

```bash
git add selectors.js tests/selectors.test.js
git commit -m "feat: add selectors.js with fixture-based tests"
```

---

### Task 7: hide-before-ready CSS

**Files:**
- Create: `hide-before-ready.css`

- [ ] **Step 1: write the stylesheet**

```css
/* hide-before-ready.css
   injected at document_start; hides the job results area until the content
   script flips the body class to signal readiness. prevents blocked-job flash. */

html:not(.mcf-blocker-ready) [data-mcf-results-container],
html:not(.mcf-blocker-ready) main ul,
html:not(.mcf-blocker-ready) main [role="list"] {
  visibility: hidden !important;
}
```

(the second/third selectors are defensive fallbacks since we can't know the exact results container without live inspection. Task 6 selectors will refine this.)

- [ ] **Step 2: commit**

```bash
git add hide-before-ready.css
git commit -m "feat: add hide-before-ready CSS to prevent blocked-job flash"
```

---

### Task 8: manifest.json

**Files:**
- Create: `manifest.json`

- [ ] **Step 1: write manifest**

```json
{
  "manifest_version": 3,
  "name": "mycareersfuture blocker",
  "version": "0.1.0",
  "description": "block specific companies from appearing in your mycareersfuture.gov.sg searches.",
  "permissions": ["storage"],
  "host_permissions": ["https://www.mycareersfuture.gov.sg/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://www.mycareersfuture.gov.sg/*"],
      "js": ["content.js"],
      "run_at": "document_idle",
      "type": "module"
    },
    {
      "matches": ["https://www.mycareersfuture.gov.sg/*"],
      "css": ["hide-before-ready.css"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_title": "mycareersfuture blocker",
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

note: chrome ignores `"type": "module"` on content_scripts in older versions; if loading errors, we'll switch to a bundler later. for v1, we attempt native ES module content scripts.

- [ ] **Step 2: commit**

```bash
git add manifest.json
git commit -m "feat: add manifest.json with scoped host permissions"
```

---

### Task 9: background.js

**Files:**
- Create: `background.js`

- [ ] **Step 1: write background service worker**

```javascript
// background.js
import { initDefaults } from "./storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await initDefaults();
  } catch (err) {
    console.error("[mcf-blocker] initDefaults failed", err);
  }
});

// migration hook: when schemaVersion changes in a future release, handle it here.
// chrome.runtime.onStartup can also be used if persistent checks are needed.
```

- [ ] **Step 2: commit**

```bash
git add background.js
git commit -m "feat: add background worker with init + migration hook"
```

---

### Task 10: content.js initial hide pass

**Files:**
- Create: `content.js`

- [ ] **Step 1: write initial version (no observer yet)**

```javascript
// content.js
import { load } from "./storage.js";
import { isBlocked } from "./match.js";
import { SELECTORS, extractJobFromCard } from "./selectors.js";

let state = { schemaVersion: 1, blockedCompanies: [], blockedKeywords: [] };
let applying = false;

async function init() {
  try {
    state = await load();
  } catch (err) {
    console.error("[mcf-blocker] load failed", err);
  }
  applyBlocking();
  document.documentElement.classList.add("mcf-blocker-ready");
}

function applyBlocking() {
  if (applying) return;
  applying = true;
  try {
    if (!SELECTORS.listingCard) return;
    const cards = document.querySelectorAll(SELECTORS.listingCard);
    for (const card of cards) {
      const job = extractJobFromCard(card);
      if (isBlocked(job, state)) {
        card.style.display = "none";
        card.setAttribute("data-mcf-hidden", "1");
      } else if (card.getAttribute("data-mcf-hidden") === "1") {
        card.style.display = "";
        card.removeAttribute("data-mcf-hidden");
      }
    }
  } catch (err) {
    console.error("[mcf-blocker] applyBlocking failed", err);
  } finally {
    applying = false;
  }
}

// safety: always lift the hide-before-ready veil even if init throws
init().finally(() => {
  document.documentElement.classList.add("mcf-blocker-ready");
});
```

- [ ] **Step 2: commit**

```bash
git add content.js
git commit -m "feat: add content.js with initial hide pass"
```

---

### Task 11: content.js MutationObserver with debounce + self-guard

**Files:**
- Modify: `content.js`

- [ ] **Step 1: add observer logic**

Append to `content.js`:

```javascript
let rafHandle = null;
let trailingTimer = null;

function scheduleApply() {
  if (rafHandle) return;
  rafHandle = requestAnimationFrame(() => {
    rafHandle = null;
    if (trailingTimer) clearTimeout(trailingTimer);
    trailingTimer = setTimeout(() => {
      trailingTimer = null;
      applyBlocking();
    }, 100);
  });
}

const observer = new MutationObserver((mutations) => {
  if (applying) return;
  for (const m of mutations) {
    if (m.type === "childList" && (m.addedNodes.length || m.removedNodes.length)) {
      scheduleApply();
      break;
    }
  }
});

function startObserver() {
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    return;
  }
  observer.observe(document.body, { childList: true, subtree: true });
}

startObserver();
```

- [ ] **Step 2: commit**

```bash
git add content.js
git commit -m "feat: add debounced MutationObserver with self-trigger guard"
```

---

### Task 12: inject block button on listing cards

**Files:**
- Modify: `content.js`
- Modify: `storage.js` (re-export addCompany already available)

- [ ] **Step 1: add button injection to applyBlocking()**

Replace the `for (const card of cards)` loop in `applyBlocking()` with:

```javascript
for (const card of cards) {
  const job = extractJobFromCard(card);
  if (isBlocked(job, state)) {
    card.style.display = "none";
    card.setAttribute("data-mcf-hidden", "1");
    continue;
  } else if (card.getAttribute("data-mcf-hidden") === "1") {
    card.style.display = "";
    card.removeAttribute("data-mcf-hidden");
  }
  injectCardButton(card, job);
}
```

Then add the helper (also import `addCompany`):

```javascript
import { load, addCompany } from "./storage.js";

function injectCardButton(card, job) {
  if (card.querySelector("[data-mcf-blocker-btn]")) return;
  const mount = card.querySelector(SELECTORS.cardMount) || card;
  const btn = document.createElement("button");
  btn.setAttribute("data-mcf-blocker-btn", "1");
  btn.type = "button";
  btn.textContent = "🚫 block";
  btn.style.cssText = "margin-left:8px;padding:2px 6px;font-size:11px;background:#fff;border:1px solid #c00;color:#c00;border-radius:4px;cursor:pointer;";
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await addCompany(job.employer);
      state = await load();
      applyBlocking();
    } catch (err) {
      alert("mcf-blocker: " + err.message);
    }
  });
  mount.appendChild(btn);
}
```

- [ ] **Step 2: commit**

```bash
git add content.js
git commit -m "feat: inject block button on each listing card"
```

---

### Task 13: inject block button on detail page

**Files:**
- Modify: `content.js`

- [ ] **Step 1: add detail-page detection and injection**

Append to `content.js`:

```javascript
import { extractJobFromDetail } from "./selectors.js";

function tryInjectDetailButton() {
  if (!SELECTORS.detailMount) return;
  if (document.querySelector("[data-mcf-blocker-detail-btn]")) return;
  const mount = document.querySelector(SELECTORS.detailMount);
  if (!mount) return;
  const job = extractJobFromDetail(document);
  if (!job.employer) return;

  const btn = document.createElement("button");
  btn.setAttribute("data-mcf-blocker-detail-btn", "1");
  btn.type = "button";
  btn.textContent = "🚫 block this company";
  btn.style.cssText = "margin:8px 0;padding:6px 12px;background:#fff;border:1px solid #c00;color:#c00;border-radius:4px;cursor:pointer;";
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await addCompany(job.employer);
      state = await load();
      applyBlocking();
      btn.textContent = "🚫 blocked";
      btn.disabled = true;
    } catch (err) {
      alert("mcf-blocker: " + err.message);
    }
  });
  mount.appendChild(btn);
}
```

Update `applyBlocking()` to also call `tryInjectDetailButton()` at the end.

- [ ] **Step 2: commit**

```bash
git add content.js
git commit -m "feat: inject block button on job detail page"
```

---

### Task 14: listen for storage changes (live update)

**Files:**
- Modify: `content.js`

- [ ] **Step 1: add storage.onChanged listener**

Append to `content.js`:

```javascript
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync") return;
  if (!("blockedCompanies" in changes) && !("blockedKeywords" in changes)) return;
  try {
    state = await load();
    applyBlocking();
  } catch (err) {
    console.error("[mcf-blocker] onChanged reload failed", err);
  }
});
```

- [ ] **Step 2: commit**

```bash
git add content.js
git commit -m "feat: live-update blocking when storage changes"
```

---

### Task 15: popup HTML + CSS

**Files:**
- Create: `popup.html`
- Create: `popup.css`

- [ ] **Step 1: write popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
  <title>mycareersfuture blocker</title>
</head>
<body>
  <header><h1>mycareersfuture blocker</h1></header>

  <section>
    <h2>blocked companies</h2>
    <ul id="companies" class="list"></ul>
    <p id="empty-companies" class="empty">no companies blocked yet. click "🚫 block" next to any job to add one.</p>
  </section>

  <section>
    <h2>keyword rules</h2>
    <ul id="keywords" class="list"></ul>
    <p id="empty-keywords" class="empty">no keyword rules.</p>
    <form id="kw-form">
      <input id="kw-input" type="text" placeholder="add a keyword (e.g. recruitment)" maxlength="100" required>
      <button type="submit">add</button>
    </form>
  </section>

  <footer id="footer"></footer>
  <div id="error" class="error" hidden></div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: write popup.css**

```css
body { font-family: system-ui, -apple-system, sans-serif; width: 320px; margin: 0; padding: 12px; font-size: 13px; color: #222; }
h1 { font-size: 14px; margin: 0 0 12px; font-weight: 600; }
h2 { font-size: 12px; margin: 12px 0 6px; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
.list { list-style: none; padding: 0; margin: 0; max-height: 180px; overflow-y: auto; }
.list li { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #eee; }
.list li button { background: none; border: none; color: #c00; cursor: pointer; font-size: 14px; padding: 2px 6px; }
.list li button:hover { background: #fee; border-radius: 3px; }
.empty { color: #999; font-size: 12px; font-style: italic; margin: 4px 0; }
form { display: flex; gap: 4px; margin-top: 6px; }
input[type=text] { flex: 1; padding: 4px 6px; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
button[type=submit] { padding: 4px 10px; background: #080; color: #fff; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; }
footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; color: #888; font-size: 11px; }
.error { margin-top: 8px; padding: 6px 8px; background: #fee; border: 1px solid #c00; color: #c00; border-radius: 3px; font-size: 12px; }
```

- [ ] **Step 3: commit**

```bash
git add popup.html popup.css
git commit -m "feat: add popup HTML + CSS"
```

---

### Task 16: popup.js

**Files:**
- Create: `popup.js`

- [ ] **Step 1: write popup.js**

```javascript
// popup.js
import { load, addCompany, removeCompany, addKeyword, removeKeyword } from "./storage.js";

const els = {
  companies: document.getElementById("companies"),
  keywords: document.getElementById("keywords"),
  emptyCompanies: document.getElementById("empty-companies"),
  emptyKeywords: document.getElementById("empty-keywords"),
  footer: document.getElementById("footer"),
  kwForm: document.getElementById("kw-form"),
  kwInput: document.getElementById("kw-input"),
  error: document.getElementById("error"),
};

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}
function clearError() { els.error.hidden = true; els.error.textContent = ""; }

async function render() {
  clearError();
  const state = await load();

  els.companies.innerHTML = "";
  for (const c of state.blockedCompanies) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = c;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.title = "unblock";
    btn.addEventListener("click", async () => {
      try { await removeCompany(c); await render(); }
      catch (err) { showError(err.message); }
    });
    li.append(span, btn);
    els.companies.appendChild(li);
  }
  els.emptyCompanies.hidden = state.blockedCompanies.length > 0;

  els.keywords.innerHTML = "";
  for (const k of state.blockedKeywords) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = k;
    const btn = document.createElement("button");
    btn.textContent = "✕";
    btn.title = "remove";
    btn.addEventListener("click", async () => {
      try { await removeKeyword(k); await render(); }
      catch (err) { showError(err.message); }
    });
    li.append(span, btn);
    els.keywords.appendChild(li);
  }
  els.emptyKeywords.hidden = state.blockedKeywords.length > 0;

  els.footer.textContent = `${state.blockedCompanies.length} companies · ${state.blockedKeywords.length} keywords blocked`;
}

els.kwForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = els.kwInput.value;
  try {
    await addKeyword(raw);
    els.kwInput.value = "";
    await render();
  } catch (err) {
    showError(err.message);
  }
});

render();
```

- [ ] **Step 2: commit**

```bash
git add popup.js
git commit -m "feat: add popup.js with add/remove/render + error display"
```

---

### Task 17: placeholder icons

**Files:**
- Create: `scripts/make-icons.mjs`
- Create: `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`

- [ ] **Step 1: write icon generator script**

we avoid adding an image-processing dep; instead, generate simple PNGs from raw pixel data.

```javascript
// scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

// 32-bit PNG encoder (red circle with white slash on white bg)
function encodePng(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      // diagonal slash region (rotate 45°, band width based on size)
      const onSlash = Math.abs((dx + dy) / Math.SQRT2) < size * 0.06;
      if (dist < r && dist > r - size * 0.14) {
        // ring
        pixels[i] = 204; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 255;
      } else if (dist < r && onSlash) {
        pixels[i] = 204; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 255;
      } else if (dist < r) {
        pixels[i] = 255; pixels[i+1] = 255; pixels[i+2] = 255; pixels[i+3] = 255;
      } else {
        pixels[i] = 0; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 0;
      }
    }
  }

  // build PNG
  const scanlines = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    scanlines[y * (size * 4 + 1)] = 0;
    pixels.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = deflateSync(scanlines);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcInput = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput) >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (crc ^ buf[i]) & 0xff;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crc = (crc >>> 8) ^ c;
    }
    return crc ^ 0xffffffff;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;      // bit depth
  ihdr[9] = 6;      // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("icons", { recursive: true });
for (const s of [16, 48, 128]) {
  writeFileSync(`icons/icon-${s}.png`, encodePng(s));
  console.log(`wrote icons/icon-${s}.png`);
}
```

- [ ] **Step 2: generate icons**

Run: `cd ~/Desktop/mycareersfuture-blocker && node scripts/make-icons.mjs`
Expected: three PNG files created in `icons/`.

- [ ] **Step 3: verify icons**

Run: `ls -la icons/`
Expected: icon-16.png, icon-48.png, icon-128.png present with non-zero sizes.

- [ ] **Step 4: commit**

```bash
git add scripts/make-icons.mjs icons/
git commit -m "feat: generate placeholder icons via node script"
```

---

### Task 18: load extension in chrome + manual smoke test

**Files:** none

this is a fully manual task.

- [ ] **Step 1: open chrome extensions page**

navigate to `chrome://extensions/`, enable "developer mode" toggle (top right).

- [ ] **Step 2: load unpacked**

click "load unpacked" → select `~/Desktop/mycareersfuture-blocker/` folder.
expected: extension appears in the list with no errors. if errors, read the error message and fix the referenced file.

- [ ] **Step 3: verify popup opens**

click the extension icon in the toolbar → popup appears showing empty lists + footer "0 companies · 0 keywords blocked".

- [ ] **Step 4: smoke test block-from-listing**

navigate to `https://www.mycareersfuture.gov.sg/search`. pick any company visible. click its "🚫 block" button on the card.
expected: that card disappears. all other cards from the same company also disappear. open popup and confirm the company appears in the list.

- [ ] **Step 5: smoke test block-from-detail**

click into any job detail page. click "🚫 block this company".
expected: button disables and text changes to "blocked". navigate back to listing. all jobs from that company are hidden.

- [ ] **Step 6: smoke test keyword rule**

open popup. add keyword "recruitment" (or any word likely to match). close popup.
expected: listing updates within ~1 second. all job titles/employers containing "recruitment" are hidden.

- [ ] **Step 7: smoke test unblock**

open popup. click ✕ next to a blocked company or keyword. close popup.
expected: those jobs reappear in the listing without a page refresh.

- [ ] **Step 8: smoke test infinite scroll**

scroll the listing until more cards load.
expected: new cards from blocked companies are also hidden (no flash).

- [ ] **Step 9: smoke test SPA route change**

change the search filter (e.g. apply a location filter). this triggers a react route change.
expected: blocking continues to apply to the new result set.

- [ ] **Step 10: smoke test persistence**

close chrome entirely, reopen it, go back to mycareersfuture.
expected: blocklist survives.

- [ ] **Step 11: write findings**

if any step fails, note the failure mode and fix. common fixes:
- wrong selector → update `selectors.js`, re-test
- observer not firing → check `document.body` is attached, check debounce logic
- button doesn't appear → check `SELECTORS.cardMount` / `detailMount` resolve
- button appears twice → check the sentinel attribute `data-mcf-blocker-btn`

- [ ] **Step 12: commit any fixes made during smoke test**

```bash
git add -A
git commit -m "fix: resolve smoke-test findings"
```

(skip if no changes were needed.)

---

### Task 19: README + package

**Files:**
- Create: `README.md`

- [ ] **Step 1: write README**

```markdown
# mycareersfuture blocker

chrome extension to hide jobs from specific companies on https://www.mycareersfuture.gov.sg.

## install (developer mode)

1. clone or download this folder
2. `npm install` (only needed if you want to run tests)
3. open `chrome://extensions/`, enable developer mode
4. click "load unpacked", select this folder

## usage

- on any job listing, click "🚫 block" to hide that company's jobs
- on any job detail page, click "🚫 block this company"
- click the extension icon in the toolbar to view, unblock, or add keyword rules

## tests

```
npm test
```

runs unit tests for normalization, matching, and storage, plus fixture-based selector tests.

## limitations (v1)

- substring keyword match only (no regex)
- no import/export of blocklist
- a11y + i18n polish deferred
```

- [ ] **Step 2: commit**

```bash
git add README.md
git commit -m "docs: add README"
```

- [ ] **Step 3: tag v0.1.0**

```bash
git tag v0.1.0
git log --oneline
```

---

## completion criteria

- `npm test` passes with all unit + fixture tests green
- extension loads in chrome with no manifest or script errors
- all 10 smoke-test steps in Task 18 pass
- popup renders and edits persist
- blocklist survives browser restart
