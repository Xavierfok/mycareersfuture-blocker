# chrome web store screenshot plan

the store requires 1-5 screenshots. either **1280×800** or **640×400** (no mixing sizes).

recommended: **1280×800**, shows more detail.

## what to capture (in order of importance)

### screenshot 1: the block button in action on a listing page (hero shot)
- go to https://www.mycareersfuture.gov.sg/search?search=engineer
- take a screenshot showing 3-4 job cards, with the red "🚫 block" button clearly visible in the top-left of each
- can annotate with an arrow + text "one click to block this company" (optional but recommended)
- size: 1280×800

### screenshot 2: the popup showing a populated blocklist
- block 3-4 companies first so the popup isn't empty
- open the extension popup
- take a screenshot of JUST the popup, then paste onto a 1280×800 canvas with a neutral background, maybe with a mycareersfuture browser tab behind it
- consider adding text: "review, unblock, or add keyword rules"

### screenshot 3: keyword rule hiding a job mid-list
- before/after of a listing page with a keyword like "recruitment" added
- show "X jobs hidden by keyword rule" or similar
- or just the "after" with the popup open showing the keyword in the rules list

### screenshot 4: auto-paginate (optional)
- harder to show statically; maybe a caption on a listing page: "auto-advance to next page when your current page is mostly blocked"

### screenshot 5: detail page block button
- job detail page with the "🚫 block this company" button visible
- less essential than #1-3 but good for completeness

## how to capture

easiest path (macOS):

1. resize your chrome window to exactly 1280×800. use a window sizer extension or run in terminal:
   ```
   osascript -e 'tell application "Google Chrome" to set the bounds of the front window to {0, 0, 1280, 800}'
   ```
2. use cmd+shift+4, space, click the chrome window to screenshot just the window content (will be 1280×800 minus the chrome title bar, so you may need to crop to 1280×800 exactly)
3. or use a screenshot tool like CleanShot X or the built-in screenshot utility to capture a region and size it precisely

pro tip: cover up any sensitive personal info (location, saved jobs count if you were logged in, etc.) before uploading.

## optional promo tiles

the store also supports promo tiles, which make your listing look more polished in search:

- **small tile**: 440×280 px
- **marquee tile**: 1400×560 px (shown in the "featured" banner area)

these are optional but strongly recommended for visibility. a simple branded tile with the extension name + the red-circle-slash icon + a one-line tagline is enough.

can be made in figma, canva, or any design tool. not blocking submission.
