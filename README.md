# mycareersfuture blocker

chrome extension (manifest v3) that hides jobs from specific companies on https://www.mycareersfuture.gov.sg.

one-click block from any job card, manual keyword rules for broader patterns, auto-advance to the next page when your current page is mostly blocked.

## install

### option 1: from the latest release (recommended for most users)

1. go to the [releases page](https://github.com/Xavierfok/mycareersfuture-blocker/releases/latest) and download `mycareersfuture-blocker-v*.zip`
2. unzip it somewhere (e.g. `~/Downloads/mycareersfuture-blocker/`)
3. open `chrome://extensions/` in chrome
4. toggle **developer mode** on (top-right corner)
5. click **"load unpacked"** and select the unzipped folder
6. the extension is now installed. pin it to your toolbar for easy access.

to update: download the new release, replace the folder, and click the ↻ reload button on the extension card in `chrome://extensions/`.

### option 2: clone and load unpacked (for developers)

1. `git clone https://github.com/Xavierfok/mycareersfuture-blocker.git`
2. (optional) `npm install && npm test` to run the test suite
3. in `chrome://extensions/`, enable developer mode, click "load unpacked", select the repo folder

### option 3: chrome web store

coming soon.

## usage

- on any job listing, click the **🚫 block** button in the top-left of the card to hide that company's jobs
- on any job detail page, click **🚫 block this company**
- click the extension icon in the toolbar to view, unblock, or add keyword rules
- when auto-paginate kicks in (visible cards drop below 10), the extension clicks the site's next-page button automatically

## features

- one-click block by company (normalized: "ABC Pte Ltd" == "abc pte. ltd." == "abc")
- manual keyword rules for broader patterns (recruiter names, job title phrases)
- live updates across tabs via `chrome.storage.sync` (blocklist follows your chrome installs)
- auto-advance to next page when your current page is mostly blocked
- hide-before-ready CSS shield prevents blocked-job flash

## tests

```
npm test
```

runs unit tests for normalization, matching, and storage (using a `chrome.storage` mock), plus fixture-based selector tests against saved HTML captures of the live site.

## project structure

```
manifest.json            # mv3 manifest
background.js            # service worker (init + schema migration hook)
content.js               # injected into mycareersfuture.gov.sg pages
hide-before-ready.css    # shield injected at document_start
match.js                 # normalize() + isBlocked() (tested)
storage.js               # dedup + quota-aware read/write (tested)
selectors.js             # all DOM selectors isolated here
popup.{html,css,js}      # toolbar popup UI
icons/                   # red-circle-slash, 16/48/128 px
scripts/
  capture-fixtures.mjs   # playwright capture of live HTML into tests/fixtures/
  make-icons.mjs         # zero-dep PNG generator for placeholder icons
tests/                   # node --test, fixture-based
docs/superpowers/        # spec + implementation plan
```

## limitations (v1)

- substring keyword match only (no regex)
- no import/export of blocklist
- a11y + i18n polish deferred
- site changes that alter `data-testid` values will require editing `selectors.js` + re-running `scripts/capture-fixtures.mjs`

## privacy

the extension stores only your blocklist (company names + keyword rules), in chrome's built-in storage. no data leaves your browser. the extension makes no network requests and runs only on `mycareersfuture.gov.sg`. full [privacy policy](./PRIVACY.md).

## license

MIT.
