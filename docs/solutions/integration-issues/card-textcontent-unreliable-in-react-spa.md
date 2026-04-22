---
title: card.textContent silently drops descendant text in React SPA extensions
category: integration-issues
problem_type: content_script_dom_mismatch
component: content-script-matcher
severity: high
symptoms:
  - regex passes in fixture, fails on live site
  - querySelector finds element but parent.textContent misses its text
  - extension reports zero matches despite visible badge text
date: 2026-04-22
tags:
  - chrome-extension
  - manifest-v3
  - react-spa
  - dom-matching
  - mutationobserver
  - chrome-storage-sync
related:
  - project:mycareersfuture-blocker (v0.1.4)
  - github:Xavierfok/mycareersfuture-blocker/releases/tag/v0.1.4
---

# card.textContent silently drops descendant text in React SPA extensions

## Problem

Chrome extension's matcher used `card.textContent` to detect "Applied N days ago" badges and hide those cards. The matcher **passed every unit test and every Playwright end-to-end reproducer** but **silently failed on the live site** — badges were visible, but `textContent` didn't include them.

### Observable symptoms

- Live site: applied jobs keep showing up despite `hideApplied: true` in storage.
- Fixture + Playwright repro: same extension hides the same structure correctly.
- Per-card diagnostic log:
  ```
  [mcf-blocker] pass: cards=20 hideApplied=true hidApplied=0 hidBlocked=13 skipWithAppliedBadge=1
  ```
  `skipWithAppliedBadge > 0` while `hidApplied == 0` proved the badge was findable via `querySelector` but `hasAppliedText(card.textContent)` returned false.
- `card.querySelector('[data-cy="job-card-date-info"]').textContent` → `"Applied 9 days ago"` ✓
- `/\bApplied\b/i.test(card.textContent)` → `false` ✗

## Root cause

On MCF's live React 18 app, the date-info badge sits inside the job card element according to `closest(...)` (light DOM), yet `card.textContent` does not include the badge's text. Most likely culprits (not definitively isolated — MCF is closed source):

1. **Shadow DOM boundary** — if the badge is projected through a slot, `textContent` on the host does not traverse into the shadow tree. `querySelector` also does not cross shadow roots, so why it still found the badge is unclear — possibly a nested light-DOM host wrapping an open shadow root, or React portals that reparent the badge at paint time.
2. **React 18 concurrent rendering / suspense boundaries** — the badge text may be committed into a separate React root attached at a different DOM point than the card, with visual position controlled purely by CSS flex/grid. The user-perceived "card" and DOM "card" aren't the same subtree.
3. **Virtualization wrappers** — some list virtualizers (e.g. `@tanstack/react-virtual`) render rows in wrappers that aren't semantic ancestors of the "card" element queried by `data-testid`.

The Playwright fixture used plain, synchronous DOM — none of these conditions reproduced.

## Solution

Match the badge directly instead of grepping the card's textContent:

```javascript
function cardIsApplied(card) {
  // Check badge spans directly — card.textContent doesn't reliably include
  // descendant text on MCF's live React DOM, even though querySelectorAll does
  // find the badge elements.
  const badges = card.querySelectorAll('[data-cy="job-card-date-info"]');
  for (const b of badges) {
    if (/\bApplied\b/i.test(b.textContent)) return true;
  }
  // Fallback to full-card scan in case the site changes the badge selector.
  return hasAppliedText(card.textContent);
}
```

### Supporting defensive layers (all shipped in v0.1.4)

1. **CSS enforcement** — inline `display: none` set by JS can be clobbered by React re-renders. Enforce via attribute + CSS:
   ```css
   [data-mcf-hidden="1"] { display: none !important; }
   ```
   This lives in `hide-before-ready.css` (injected at `document_start`) so it's active before any React render.

2. **MutationObserver expansion** — original observer watched `childList` only. Extended to `characterData` to catch late-arriving badge text:
   ```javascript
   observer.observe(document.body, {
     childList: true,
     subtree: true,
     characterData: true,   // NEW
   });
   ```

3. **Fallback retries** — applyBlocking re-runs at 1s, 3s, 6s after init, catching any race-condition misses from React's async rendering:
   ```javascript
   setTimeout(applyBlocking, 1000);
   setTimeout(applyBlocking, 3000);
   setTimeout(applyBlocking, 6000);
   ```

4. **Per-pass diagnostic log** — invaluable for diagnosing. Log structured counters:
   ```javascript
   console.log(`[mcf-blocker] pass: cards=${cards.length} hideApplied=${state.hideApplied} hidApplied=${hidApplied} hidBlocked=${hidBlocked}`);
   ```

## Secondary bug: chrome.storage.sync out-of-sync with popup UI

Independent of the matcher bug, a storage drift masked the real issue for hours:

- Extension popup showed the "hide applied" checkbox visually **checked**.
- `chrome.storage.sync.get('hideApplied')` returned **false**.

Root cause: an earlier version had written `false` to storage. The popup's `render()` does `els.hideApplied.checked = state.hideApplied`, so it should have rendered unchecked — which means either the render fired after the user's eyes caught the default unchecked-on-HTML state, or an intermediate toggle set it to true visually without persisting. (Unclear — hard to reproduce without user's full interaction history.)

**Fix:** have user toggle checkbox off → on to force a storage write. Added to `initDefaults` would prevent this for new installs but existing installs already have schemaVersion set so `initDefaults` skips.

**Debugging signal:** the per-pass log's `hideApplied=false` vs popup's visual "checked" was the contradiction that exposed the drift. Without that log, this bug would have stayed invisible.

## Prevention

1. **Don't trust `element.textContent` as a substitute for targeted queries in SPA content scripts.** If you already have a selector for the thing you want to match, match on that element's text directly.

2. **Always log structured counters from content scripts**, at least during development. A single `[prefix] pass: key1=val1 key2=val2` line per run lets future debugging skip the "does it even run?" phase.

3. **Build a Playwright fixture, but don't trust it alone.** Test against the real target site at least once before release — SPA rendering differs from synthetic DOM.

4. **Version your extension's storage schema.** When you add a boolean flag, bump `schemaVersion` and migrate existing installs by setting the default explicitly. Don't rely on `?? defaultValue` at read time — persist the default once.

5. **Inject hide-by-attribute CSS at `document_start`.** Inline `style.display` from content scripts is brittle against React; CSS with `!important` on a data attribute survives.

6. **Expand MutationObserver options deliberately.** Default `childList` often misses React's text-only updates. Add `characterData` when watching text-rendered state.

## Verification

- `docs/solutions/integration-issues/card-textcontent-unreliable-in-react-spa.md` (this doc)
- `scripts/repro-applied-hide.mjs` — headless Chromium reproducer, verifies extension hides both initial-render and late-insert badges
- Released as [v0.1.4 on GitHub](https://github.com/Xavierfok/mycareersfuture-blocker/releases/tag/v0.1.4)
- Live verified on `https://www.mycareersfuture.gov.sg/search` — 4 applied jobs hidden after fix, 13 blocked-by-company still hidden as before
