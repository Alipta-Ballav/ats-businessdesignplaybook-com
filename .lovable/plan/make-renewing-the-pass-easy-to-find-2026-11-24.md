# Make renewing the pass easy to find

## Today
- "Renew pass" only appears after all 5 scans are used, inside small text on Check, Dashboard and Editor.
- There is no permanent place to buy or renew. While scans remain or after the pass expires, there is no visible way to pay.

## Changes
1. Add a **Pass** page (`/pass`) that always shows: your plan, scans left, expiry date, past payments, and one big button **Buy pass / Renew · ₹99**. That button opens the Razorpay payment window.
2. Add a **Pass · N left** link in the header for signed-in users (shows "Get pass" if none, "Renew" if expired or 0 left). Guests see "Pricing" which opens the same page.
3. Replace the small inline "Renew pass" links on Check, Dashboard and Editor with a clear "Renew pass" link to that page, shown when scans are 0 or the pass is expired (expired case is missing today).
4. If the payment window fails to open (Razorpay not loaded / not connected), show a clear message instead of nothing.

## Verification
- Sign in as a test user, open the Pass page, click Renew and confirm the Razorpay window opens (no real payment).
- Check the header link in light and dark mode.
- Run existing tests.

## Technical details
- New route `src/routes/_authenticated/pass.tsx` reusing `PaywallModal` checkout logic, `passScansLeft`/`hasPaidAccess` from `pro.ts`.
- Header link in shared layout; listens to `ft-pro-changed` to refresh count.
- Add `/pass` to sitemap excluded (private), head() metadata added.
