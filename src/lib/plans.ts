/** Micro-paywall plan catalog. Checkout is not wired yet; `checkoutReady` flips on when a gateway is added. */
export const FREE_FIXES = 2;
export const FREE_SCANS = 3;
export const checkoutReady = false;
export type PlanId = "single";
export const PLANS: { id: PlanId; name: string; inr: number; usd: number; blurb: string; perks: string[]; best?: boolean }[] = [
  { id: "single", name: "Unlock this scan", inr: 49, usd: 0.99, blurb: "One-time, after your 3 free scans", best: true, perks: ["1 more resume scan", "All fix suggestions & rescoring", "ATS-ready Word download", "Custom ATS tuning"] },
];
/** Free users get FREE_FIXES applied suggestions; Pro is unlimited. */
export function canApplyFix(applied: number, pro: boolean) { return pro || applied < FREE_FIXES; }
export function canDownloadWord(pro: boolean) { return pro; }
/** First FREE_SCANS scans are free; then each scan needs a ₹49 unlock. */
export function canScan(used: number, pro: boolean) { return pro || used < FREE_SCANS; }
const KEY = "ft-scans-used";
export const scansUsed = () => (typeof window === "undefined" ? 0 : Number(localStorage.getItem(KEY) ?? 0) || 0);
export const countScan = () => localStorage.setItem(KEY, String(scansUsed() + 1));
