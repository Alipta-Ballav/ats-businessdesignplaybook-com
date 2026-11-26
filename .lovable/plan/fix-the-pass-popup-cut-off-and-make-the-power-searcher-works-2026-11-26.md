# Fix the pass popup cut-off and make the Power Searcher workspace reachable

## What's wrong
1. **The pass popup gets cut off.** Both pass cards sit one above the other in a single column, and the popup has no height limit or scrolling. On your screen (about 717px tall) the top and bottom fall outside the window, so the price banner, the Power Searcher card and the pay buttons can be hidden.
2. **No clear way to reach the ₹299 workspace.** "My resumes" isn't in the main header or on the Pass page. It only appears on a few side pages (Swipe file, Teardowns, Promotion). Your account now has the Power Searcher Pass, but there's no obvious way to get to it.

## Fix
**Pass popup**
- Show the two passes side by side on laptop screens and stacked on phones.
- Limit the popup to the screen height and let it scroll inside, so the close button and pay buttons are always reachable.
- Tighten the card spacing and change the footer to "Pay again only when you want another pass", since passes now last 30 or 60 days.

**Getting to the workspace**
- Add "My resumes" to the main header for signed-in users, on both desktop and mobile.
- On the Pass page, add an "Open Multi-Resume Workspace" button for anyone with an active Power Searcher Pass. Everyone else sees a short line saying it comes with the ₹299 pass.
- In the candidate checker, add a "Save as role variant / My resumes" link under the score.

## Check
- Sign in as your account, open the popup at 1025x717 and at mobile size, and take screenshots to confirm nothing is cut off.
- Click from the header to My resumes, then create a role variant to confirm the Power Searcher Pass unlocks it.
- Run the pass tests.

## Technical details
- `PaywallModal.tsx`: `DialogContent` gets `max-h-[90vh] overflow-y-auto sm:max-w-3xl`, and the plan grid becomes `md:grid-cols-2`.
- Add a header link where the "Pass" and "Account" links are rendered, plus a `usePowerPass()` call-to-action on `pass.tsx`.
