# Unofficial Ordermark Kitchen Dashboard

Do you use Ordermark for your restaurant? Maybe this Chrome extension will work for you. Can be used on Android devices using the Yandex browser (somehow — I don't have an Android device to test with, and I'm too lazy to setup Android Studio to test with an emulator).

## Chrome Setup
I've been testing in Chrome.

* Navigate to: chrome://extensions/
* Enable 'Developer mode'
* Select 'Load unpacked' and select the uncompressed `unofficial-ordermark-kitchen-dashboard` directory.
* Then, navigate to https://ordermark.com and sign in. (You'll need to do this when your session expires.)

## How it Works
After inspecting the Network tab, I found a request being made to `https://dashboard.ordermark.com/api/orderV2/dashboard?h=24&a=0,1,2`.
* The `a` in the query string corresponds to the indices for the collection of your 'Locations' (they seem to be referred to as 'applications' in Ordermark nomenclature), and for the account used in this request, there are 3 configured locations. You will have to change this if you have more locations.
* The `h` in the query string corresponds to how far back in time (in hours) the query for orders should be.

### Features
* Tickets can be minimized using the caret.
* Ticket items can be crossed off simply by tapping on them.
* Once all items have been crossed off, the ticket can be closed.
* Closed tickets can be restored by selecting the "hamburger menu," selecting 'Unclose Tickets,' and then selecting the desired tickets from the listing.
* Because this Chrome extension uses local storage to keep track of completed items, minimized tickets, and completed tickets, there is also a 'Clear Local Storage' option under the hamburger menu.

### Dev Notes
* Uses Handlebars JS (patterned after an old official Google example — I didn't know much about Chrome Extensions, so I didn't want to fight a setup with better tooling.)
  * Despite using the same pattern as Google's official example, `"content_security_policy": "script-src 'self' 'unsafe-eval'; object-src 'self'"` had to be added to `manifest.json` to get Handlebars to work correctly.
* The code itself is fairly janky, but it works; however, it could definitely be cleaned up and refactored (or rewritten entirely, as I don't really like it). ¯\_(ツ)_/¯