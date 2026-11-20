/** Micro-paywall plan catalog. Prices here are the source of truth; the server builds Razorpay orders from them. */
export const FREE_FIXES = 2;
export const FREE_SCANS = 1;
export const checkoutReady = true;
export type PlanId = "single";
export const PLANS: { id: PlanId; name: string; inr: number; usd: number; blurb: string; perks: string[]; best?: boolean }[] = [
  { id: "single", name: "Unlock everything", inr: 49, usd: 0.99, blurb: "One-time payment after your free scan", best: true, perks: ["Unlimited resume scans", "All fix suggestions & rescoring", "ATS-ready Word download", "Custom ATS tuning"] },
];
/** Free users get FREE_FIXES applied suggestions; Pro is unlimited. */
export function canApplyFix(applied: number, pro: boolean) { return pro || applied < FREE_FIXES; }
export function canDownloadWord(pro: boolean) { return pro; }
/** First FREE_SCANS scans are free; then a one-time ₹49 payment unlocks everything. */
export function canScan(used: number, pro: boolean) { return pro || used < FREE_SCANS; }
const KEY = "ft-scans-used";
export const scansUsed = () => (typeof window === "undefined" ? 0 : Number(localStorage.getItem(KEY) ?? 0) || 0);
export const countScan = () => localStorage.setItem(KEY, String(scansUsed() + 1));
