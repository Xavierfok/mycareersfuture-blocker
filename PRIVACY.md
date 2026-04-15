# privacy policy, mycareersfuture blocker

**last updated:** 2026-04-15

## what data the extension stores

the extension stores only two things, both entered by you:

- **blocked company names** you clicked the block button on
- **keyword rules** you typed into the popup

that's it. nothing else.

## where the data is stored

in chrome's built-in `chrome.storage.sync`. if you're signed into chrome, your blocklist syncs across your own chrome installs via google's sync infrastructure. if you're not signed in, it stays only on this device.

the extension never sends your data anywhere else. it does not make network requests. it does not have a server. it does not have analytics or telemetry.

## what the extension does not collect

- no personal info, no email, no name, no location, no ip address
- no browsing history beyond what you explicitly block
- no tracking across sites; the extension only runs on https://www.mycareersfuture.gov.sg
- no third-party services
- no cookies set by the extension

## permissions used

- `storage`: to remember your blocklist across sessions
- `host_permissions` for `https://www.mycareersfuture.gov.sg/*`: to read job listings on that one site and hide cards you've blocked

the extension does not have permission to access any other site.

## data sharing

none. the data never leaves your chrome storage.

## data deletion

to clear the blocklist:
- open the extension popup and remove entries one at a time with the ✕ buttons, or
- uninstall the extension (removes all its storage automatically)

## contact

source code and issues: https://github.com/Xavierfok/mycareersfuture-blocker

## changes to this policy

if the policy changes, the updated version will be in this file in the repo. the "last updated" date at the top will reflect the change.
