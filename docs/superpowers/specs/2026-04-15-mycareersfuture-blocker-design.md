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

## architecture

three components, following manifest v3 conventions.

### 1. content script (`content.js`)

runs on `https://www.mycareersfuture.gov.sg/*`.

responsibilities:
- inject a "🚫 block" button into each job card on listing pages
- inject a "🚫 block this company" button on the job detail page
- hide job cards whose employer matches a blocked company (case-insensitive exact string match)
- hide job cards whose employer or job title contains any blocked keyword (case-insensitive substring match)
- re-run hide/inject logic when the page mutates (SPA navigation, infinite scroll, filter changes)

key technical detail: mycareersfuture is a react SPA. a `MutationObserver` watches the results container and re-applies the block logic whenever new job cards render. the observer also handles route changes within the SPA.

failure mode: if the page's DOM structure changes and selectors stop matching, the extension silently does nothing rather than throwing errors or blocking the user's ability to use the site.

### 2. popup (`popup.html` + `popup.js`)

shown when the user clicks the extension icon in the chrome toolbar.

UI:
- header: "mycareersfuture blocker"
- section 1: blocked companies, vertical list, each with an unblock ✕ button
- section 2: keyword rules, vertical list with remove ✕ buttons, plus an input + "add" button
- footer: "X companies · Y keywords blocked"

behavior:
- loads current blocklist from `chrome.storage.sync` on open
- any add/remove immediately writes back to storage
- the content script listens for storage changes and re-applies blocking live (the user doesn't need to refresh the mycareersfuture tab)

### 3. background service worker (`background.js`)

minimal. on install, initializes `chrome.storage.sync` with empty arrays for `blockedCompanies` and `blockedKeywords` if not already set. no persistent logic.

## data model

stored in `chrome.storage.sync`:

```json
{
  "blockedCompanies": ["acme pte ltd", "globex singapore"],
  "blockedKeywords": ["recruitment", "commission only"]
}
```

- both are arrays of lowercase strings
- companies are stored lowercased on insert; comparison is also lowercased, so matching is case-insensitive
- keywords are stored lowercased; substring match is case-insensitive
- no deduplication logic needed at storage layer; the add-flow in the popup checks for duplicates before inserting

## matching logic

a job card is hidden if **either** of these is true:
1. the card's employer name (lowercased, trimmed) is in `blockedCompanies`
2. the card's employer name OR job title contains any string in `blockedKeywords` as a substring (both lowercased)

the click-to-block button stores the employer string exactly as shown on the page (lowercased, trimmed). if the user wants to block variants ("abc pte ltd" vs "abc pte. ltd."), they add a keyword rule.

## DOM selectors

the content script needs to locate:
- job cards on the listing/search page
- employer name within a card
- job title within a card
- employer name on the job detail page
- a mount point for the "block" button on each card
- a mount point for the "block" button on the detail page

these selectors will be confirmed against the live site during implementation (step 1 of the plan). they are isolated in a single `selectors.js` module so that future DOM changes only require editing one file.

## error handling

- all DOM queries use optional chaining / null checks; missing elements are skipped, not thrown
- storage reads default to empty arrays if keys are absent
- the mutation observer is wrapped in try/catch so a single bad render doesn't break subsequent re-runs
- no network calls, so no network error handling needed

## testing

- manual smoke test on live site: block a company, confirm all its jobs disappear from current and subsequent searches
- test keyword match against both employer and job title
- test unblock flow via popup
- test that blocking in one tab applies to other open mycareersfuture tabs without refresh
- test that blocklist survives browser restart (via storage.sync)
- unit tests for pure matching logic in `match.js` using node + a small assert-based runner (no framework needed)

## file layout

```
mycareersfuture-blocker/
├── manifest.json
├── background.js
├── content.js
├── match.js              # pure matching logic, unit tested
├── selectors.js          # all DOM selectors, isolated for maintenance
├── popup.html
├── popup.js
├── popup.css
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── tests/
│   └── match.test.js
└── docs/
    └── superpowers/specs/2026-04-15-mycareersfuture-blocker-design.md
```

## open items for implementation

- confirm exact DOM selectors against the live site
- create three PNG icons (16, 48, 128 px)
- decide on icon visual (simple red circle with slash, or similar)
