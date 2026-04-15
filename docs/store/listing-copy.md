# chrome web store listing copy

copy-paste values for the developer console submission form.

## extension name
```
mycareersfuture blocker
```
(max 45 chars, this is 23)

## short description (summary)
the one-liner shown in search results. max 132 characters.

```
hide jobs from specific companies on mycareersfuture.gov.sg. one-click block, keyword rules, syncs across your chrome installs.
```
(131 chars)

## detailed description
shown on the listing page itself. markdown not supported, use plain text + line breaks.

```
hide jobs from companies you don't want to see on mycareersfuture.gov.sg (the Singapore government's official job portal).

how it works:

• click the "🚫 block" button on any job card to hide all jobs from that company
• click "🚫 block this company" on a job detail page to do the same
• add keyword rules in the popup to catch recruiter names, job title phrases, or anything else you want to filter
• when your current page is mostly blocked, the extension auto-clicks the next page so you see fresh results
• everything syncs across your chrome installs via chrome's built-in storage (no server, no account)

what it does not do:

• no data collection. no analytics. no telemetry. no network requests.
• works only on mycareersfuture.gov.sg. does not touch any other site.
• does not track you. does not sell data. does not have ads.

open source, MIT licensed, source code and privacy policy at:
https://github.com/Xavierfok/mycareersfuture-blocker

built because a job seeker got tired of seeing the same recruitment agencies and companies they had already ruled out. block once, never see them again.
```

## category
```
Productivity
```

## language
```
English
```

## developer name
```
Xavier Fok
```
(or whatever you prefer, will be shown publicly on the listing)

## developer email
use one you monitor, it'll receive store messages.

## website
```
https://github.com/Xavierfok/mycareersfuture-blocker
```

## privacy policy URL
```
https://github.com/Xavierfok/mycareersfuture-blocker/blob/main/PRIVACY.md
```

## permissions justification

the store will ask for a one-to-two sentence justification for each permission. paste these in the matching fields:

### storage
```
used to remember the user's blocklist (company names and keyword rules) across browser sessions, using chrome.storage.sync.
```

### host permission for https://www.mycareersfuture.gov.sg/*
```
the extension runs a content script only on mycareersfuture.gov.sg to hide blocked companies' job cards and inject the "block" button. no other sites are accessed.
```

### single purpose statement
if asked "what is the single purpose of this extension":
```
to hide jobs from companies the user has chosen to block on mycareersfuture.gov.sg.
```

## data usage disclosure
the store form will ask which types of user data you handle. check these boxes:

- [ ] personally identifiable information: NO
- [ ] health information: NO
- [ ] financial and payment information: NO
- [ ] authentication information: NO
- [ ] personal communications: NO
- [ ] location: NO
- [ ] web history: NO
- [ ] user activity: NO
- [ ] website content: NO (we read employer/title text from the page but never send it anywhere)

declare these (only these):
- [x] none of the above

also confirm:
- [x] i do not sell or transfer user data to third parties
- [x] i do not use or transfer user data for purposes unrelated to the item's single purpose
- [x] i do not use or transfer user data to determine creditworthiness or for lending purposes

## upload
the zipped extension:
```
~/Desktop/mycareersfuture-blocker/dist/mycareersfuture-blocker-v0.1.0.zip
```

re-run `./scripts/build-zip.sh` to rebuild after any code change, then upload the new zip.
