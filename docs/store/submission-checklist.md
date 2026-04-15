# chrome web store submission checklist

work through this top-to-bottom. everything you need is in this `docs/store/` directory plus the repo root.

## 1. one-time setup

- [ ] go to https://chrome.google.com/webstore/devconsole
- [ ] sign in with the google account you want to publish under
- [ ] pay the **$5 USD one-time developer registration fee**
- [ ] complete the developer profile (name, email, country, contact URL)

## 2. prepare assets

- [x] `PRIVACY.md` is live at https://github.com/Xavierfok/mycareersfuture-blocker/blob/main/PRIVACY.md (required)
- [x] repo is public (required so the privacy policy URL is accessible)
- [x] `dist/mycareersfuture-blocker-v0.1.0.zip` built by `./scripts/build-zip.sh`
- [x] `docs/store/listing-copy.md` has all the text to paste into the form
- [ ] **screenshots** (1-5, all 1280×800 or all 640×400): see `docs/store/screenshot-plan.md`
- [ ] **optional: nicer 128×128 icon** (current is a placeholder red ring; store listings look better with real art; if you want, ask Claude to generate something with the banana skill or design it in figma)
- [ ] **optional: promo tiles** (440×280 small, 1400×560 marquee)

## 3. in the developer dashboard

- [ ] click "new item", upload `dist/mycareersfuture-blocker-v0.1.0.zip`
- [ ] fill in the "Store Listing" tab using values from `listing-copy.md`:
  - extension name
  - short description
  - detailed description
  - category: productivity
  - language: english
  - screenshots: upload the 1-5 screenshots
  - icon: the 128×128 from the zip is auto-detected
- [ ] fill in the "Privacy" tab using values from `listing-copy.md`:
  - single purpose statement
  - permission justifications (storage, host permission)
  - data usage disclosures (all "no")
  - privacy policy URL
- [ ] fill in the "Distribution" tab:
  - visibility: public
  - regions: all (or restrict to SG-only if you prefer; this is mycareersfuture which is SG-focused anyway, but blocking is also useful for anyone accessing it from abroad)
  - pricing: free

## 4. submit for review

- [ ] click "submit for review"
- [ ] wait 1-3 business days (can be up to 2-3 weeks for first-time developer accounts or if anything gets flagged)
- [ ] if rejected, read the rejection email carefully and fix the flagged issue. common rejection reasons for a simple extension like this:
  - permissions broader than the functionality justifies (we're already minimal here, so this should be fine)
  - privacy policy missing or not reachable (we have one, and the repo is public)
  - description overpromising or mentioning unrelated keywords (we're clean)

## 5. after approval

- [ ] get the chrome web store URL from the dashboard
- [ ] update README.md: replace "coming soon" under "option 3: chrome web store" with the real URL
- [ ] optional: post about it on linkedin/twitter/reddit SG job-seeker communities

## updating the extension later

1. edit code, commit
2. bump `manifest.json` version (e.g. 0.1.0 → 0.1.1)
3. `./scripts/build-zip.sh` rebuilds with the new version
4. in the dev console, upload the new zip
5. submit for review (usually faster than first-time review)
