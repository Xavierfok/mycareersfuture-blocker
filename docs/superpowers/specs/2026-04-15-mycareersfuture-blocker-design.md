# mycareersfuture company blocker, design

**date:** 2026-04-15
**target:** https://www.mycareersfuture.gov.sg
**type:** chrome extension (manifest v3)

## purpose

let the user hide jobs from companies they don't want to see on mycareersfuture.gov.sg. blocking is one-click from job listings or job detail pages, plus manual keyword rules for broader patterns (e.g. recruitment agencies, job title keywords).

## scope

in scope:
- hide job cards from blocked companies on search/listing pages
- hide job cards matching user-defined keywords (matched against employer name + job title)
- one-click block button on each job card and on job detail pages
- popup UI to view and manage the blocklist and keyword rules
- blocklist syncs across the user's chrome installs via `chrome.storage.sync`

out of scope (for v1):
- options page / bulk import-export
- blocking on other sites
- regex keyword rules (substring only)
- analytics, logging, telemetry
- shared blocklists between users
- accessibility polish (aria-labels, focus order) and i18n (deferred to v2)

## architecture

three components, following manifest v3 conventions.

### 1. content script (`content.js`)

runs on `https://www.mycareersfuture.gov.sg/*` at `document_idle`. a companion stylesheet (`hide-before-ready.css`) is injected at `document_start` that sets the job-card container's visibility to hidden until the script flips a readiness class, preventing blocked-job flash before the blocklist loads.

responsibilities:
- inject a "🚫 block" button into each job card on listing pages
- inject a "🚫 block this company" button on the job detail page
- hide job cards whose normalized employer matches a blocked company
- hide job cards whose employer or job title contains any blocked keyword (case-insensitive substring)
- re-run hide/inject logic when the page mutates (SPA navigation, infinite scroll, filter changes)

**observer strategy:**
- a single `MutationObserver` is attached to `document.body` with `{ childList: true, subtree: true }`
- observing at body level handles cases where react replaces the entire results subtree on route changes (which a container-scoped observer would miss)
- the handler is debounced with `requestAnimationFrame` + a trailing 100ms timer, so rapid react re-renders coalesce into one pass
- a module-level `applying` flag is set while our own DOM edits run; observer callbacks bail early if `applying === true`, preventing self-trigger loops
- each inject site also gets a sentinel attribute (`data-mcf-blocker="1"`) so we never double-inject a button

failure mode: if selectors stop matching, the extension silently does nothing rather than throwing. the hide-before-ready CSS is also removed once the script has had a chance to run, so a broken script never leaves the page permanently hidden.

### 2. popup (`popup.html` + `popup.js`)

shown when the user clicks the extension icon in the chrome toolbar.

UI:
- header: "mycareersfuture blocker"
- section 1: blocked companies, vertical list, each with an unblock ✕ button
- section 2: keyword rules, vertical list with remove ✕ buttons, plus an input + "add" button
- footer: "X companies · Y keywords blocked"

behavior:
- loads current blocklist from `chrome.storage.sync` on open
- any add/remove goes through the shared `storage.js` module (see below), which handles dedup and quota errors
- the content script listens for `chrome.storage.onChanged` and re-applies blocking live

### 3. background service worker (`background.js`)

on install, initializes `chrome.storage.sync` with `{ schemaVersion: 1, blockedCompanies: [], blockedKeywords: [] }` if keys are missing. on startup, reads `schemaVersion` and runs migrations if needed (none for v1, but the hook is in place). no other persistent logic.

## data model

stored in `chrome.storage.sync`:

```json
{
  "schemaVersion": 1,
  "blockedCompanies": ["acme pte ltd", "globex singapore"],
  "blockedKeywords": ["recruitment", "commission only"]
}
```

notes:
- `schemaVersion` is an integer, incremented when the shape changes; the background worker owns migrations
- `blockedCompanies` holds **normalized** employer strings (see normalization below)
- `blockedKeywords` holds lowercased, trimmed substrings

**quota awareness:** `chrome.storage.sync` caps at ~100KB total, ~8KB per item, and ~1800 writes/hour. the storage module catches `QUOTA_BYTES` / rate-limit errors and surfaces a non-fatal warning in the popup ("storage limit reached, remove some entries"). this is unlikely in practice (a blocklist of 1000 companies is still well under 100KB) but the failure mode is explicit.

## matching and normalization

**normalize(s):**
1. unicode-normalize to NFKC (fixes NBSP, full-width chars, etc.)
2. lowercase
3. replace all whitespace runs with a single space
4. trim
5. strip common singapore company suffixes: `pte ltd`, `pte. ltd.`, `pte. ltd`, `pte ltd.`, `ltd`, `ltd.`, `llp`, `llc`, `inc`, `inc.`, `co.`, `co`, `sdn bhd`
6. strip trailing punctuation

this produces a canonical key so "ABC Pte. Ltd." and "abc pte ltd" both normalize to `"abc"`.

**match rules:**
a job card is hidden if **either** of these is true:
1. normalized(employer name) equals any entry in `blockedCompanies` (which are stored already-normalized)
2. lowercased employer name OR lowercased job title contains any string in `blockedKeywords` as a substring

the click-to-block button runs `normalize()` on the visible employer string and stores that. manual keyword rules in the popup are stored lowercased + trimmed; broader patterns (recruiters, job-title phrases) use keywords.

## storage module (`storage.js`)

single source of truth for reads/writes. both popup and content script go through it.

functions:
- `load()` → `{ schemaVersion, blockedCompanies, blockedKeywords }`, defaults applied if keys missing
- `addCompany(raw)` → normalizes, adds to array only if not already present (dedup), writes
- `removeCompany(normalized)` → filters array, writes
- `addKeyword(raw)` → lowercases + trims, dedups, writes
- `removeKeyword(kw)` → filters, writes
- all writes are wrapped in try/catch with `chrome.runtime.lastError` checks; quota errors are surfaced as thrown errors the popup displays to the user

dedup is enforced at the storage layer (not just the popup) because the page button, popup, and synced-from-another-device writes can all land. without storage-layer dedup, arrays accumulate duplicates over time.

## DOM selectors (`selectors.js`)

the content script needs to locate:
- job cards on the listing/search page
- employer name within a card
- job title within a card
- employer name on the job detail page
- a mount point for the "block" button on each card
- a mount point for the "block" button on the detail page

**implementation step 1** is to open the live site (listing page + a detail page) in devtools and record working selectors. selectors live in `selectors.js` as a single object export so DOM changes require editing one file.

we also capture static HTML fixtures from the live site (one listing page, one detail page) checked into `tests/fixtures/` so selector regressions can be caught by unit tests without a live network call.

## permissions

```json
"host_permissions": ["https://www.mycareersfuture.gov.sg/*"],
"permissions": ["storage"]
```

no `activeTab`, `tabs`, `<all_urls>`, `webRequest`, or `declarativeNetRequest`. the extension only needs to read/write its own storage and run a content script on a single host.

## error handling

- all DOM queries use optional chaining / null checks; missing elements are skipped, not thrown
- storage reads default to the initial shape if keys are absent
- storage writes catch `chrome.runtime.lastError`; quota/rate-limit errors propagate to popup as a user-visible warning
- the mutation observer handler is wrapped in try/catch so a single bad render doesn't detach the observer
- no network calls, so no network error handling needed

## testing

- **unit tests** (`tests/match.test.js`): pure `normalize()` and `isBlocked()` logic, node + assert
- **DOM fixture tests** (`tests/selectors.test.js`): load saved HTML fixtures from `tests/fixtures/`, run the selector module against them, assert expected elements are found; catches selector drift
- **manual smoke tests** on live site:
  - block a company from the listing page, confirm all its cards disappear and button state updates
  - block from the detail page, navigate back, confirm listing hides too
  - block with only a keyword (no company), confirm partial matches hide
  - unblock via popup, confirm jobs reappear in already-open tabs without refresh
  - scroll to trigger infinite scroll / pagination, confirm new cards are also hidden
  - trigger a SPA route change (filter the search), confirm observer still fires
  - survive browser restart (via storage.sync)

## file layout

```
mycareersfuture-blocker/
├── manifest.json
├── background.js
├── content.js
├── hide-before-ready.css
├── match.js              # pure normalize + match logic, unit tested
├── storage.js            # read/write wrapper with dedup + quota handling
├── selectors.js          # all DOM selectors, isolated for maintenance
├── popup.html
├── popup.js
├── popup.css
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── tests/
│   ├── fixtures/
│   │   ├── listing-page.html
│   │   └── detail-page.html
│   ├── match.test.js
│   └── selectors.test.js
└── docs/
    └── superpowers/specs/2026-04-15-mycareersfuture-blocker-design.md
```

## open items for implementation

- confirm DOM selectors against the live site and capture fixture HTML (implementation step 1)
- create three PNG icons (16, 48, 128 px)
- decide on icon visual (simple red circle with slash, or similar)
