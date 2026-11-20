/** Micro-paywall plan catalog. Checkout is not wired yet; `checkoutReady` flips on when a gateway is added. */
export const FREE_FIXES = 2;
export const checkoutReady = false;
export type PlanId = "single" | "sprint";
export const PLANS: { id: PlanId; name: string; inr: number; usd: number; blurb: string; perks: string[]; best?: boolean }[] = [
  { id: "single", name: "This resume", inr: 99, usd: 1.99, blurb: "One-time, for this role", perks: ["All fix suggestions", "ATS-ready Word download", "For this job only"] },
  { id: "sprint", name: "Weekend Sprint", inr: 199, usd: 2.99, blurb: "48 hours, unlimited", best: true, perks: ["Unlimited role scans for 48h", "Workday / Greenhouse / Ashby tuning", "Unlimited fixes & Word downloads"] },
];
/** Free users get FREE_FIXES applied suggestions; Pro is unlimited. */
export function canApplyFix(applied: number, pro: boolean) { return pro || applied < FREE_FIXES; }
export function canDownloadWord(pro: boolean) { return pro; }
