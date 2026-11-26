---
name: pricing-pass-quota-guard
description: Guardrails for prices, passes, credits and Razorpay payments. Use when changing plans.ts, pro.ts, payments functions, Razorpay code, the paywall, the Pass page, pricing copy, launch offer, or Multi-Resume Workspace gating.
---

# Pricing & Pass Quota Guard

1. Source of truth: prices, days and evaluation counts come from src/lib/plans.ts constants — never hardcode amounts in UI copy. Check memory for current pricing terms first.
2. Payment proof: only confirmPaymentRow re-reading the Razorpay order marks payments completed; the webhook never trusts its body. Amounts are computed server-side from PLANS.
3. Entitlement: use the shared hasPaidAccess / pass helpers on verified payment rows in both browser and server; never sessionStorage flags. Passes expire on time even with credits left; stacked passes add credits.
4. Gating: payment requires sign-in; Multi-Resume Workspace needs an active Power Searcher pass and is enforced server-side too.
5. Copy honesty: no "unlimited" or "free" claims that contradict real limits; show credits left and expiry clearly; renewal link always reachable.
6. Verify: run plans/pro/power-pass tests with `bunx vitest run`; for checkout changes, open the Pass page in a browser and confirm the Razorpay amount.
