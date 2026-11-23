/** Micro-paywall plan catalog. Prices here are the source of truth; the server builds Razorpay orders from them. */
export const FREE_FIXES = 2;
export const FREE_SCANS = 1;
export const checkoutReady = true;
export const PASS_DAYS = 30;
export const PASS_DURATION_MS = PASS_DAYS * 24 * 60 * 60 * 1000;
export type PlanId = "job_hunt_30";
export const PLANS: { id: PlanId; name: string; inr: number; usd: number; blurb: string; perks: string[]; best?: boolean }[] = [
  { id: "job_hunt_30", name: "30-Day Job Hunt Pass", inr: 99, usd: 1.19, blurb: "All features for 30 days from payment. No auto-renewal.", best: true, perks: ["Unlimited resume scans for 30 days", "Official AI rescore after edits", "AI line drafting and unlimited fixes", "ATS-ready Word downloads", "Custom ATS tuning"] },
];
/** Free users get FREE_FIXES applied suggestions; Pro is unlimited. */
export function canApplyFix(applied: number, pro: boolean) { return pro || applied < FREE_FIXES; }
export function canDownloadWord(pro: boolean) { return pro; }
/** First FREE_SCANS scans are free; an active prepaid pass unlocks further scans. */
export function canScan(used: number, pro: boolean) { return pro || used < FREE_SCANS; }

export type AccessPayment = { plan: string; amount: number; status: string; paid_at: string | null };
/** Earlier lifetime purchases keep their terms; new passes expire exactly 30 days after verified payment. */
export function hasPaidAccess(payment: AccessPayment, now = Date.now()): boolean {
  if (payment.status !== "completed") return false;
  if (payment.plan === "single" && payment.amount === 4900) return true;
  if (payment.plan !== "job_hunt_30" || payment.amount !== 9900 || !payment.paid_at) return false;
  const paidAt = Date.parse(payment.paid_at);
  return Number.isFinite(paidAt) && now >= paidAt && now < paidAt + PASS_DURATION_MS;
}
const KEY = "ft-scans-used";
export const scansUsed = () => (typeof window === "undefined" ? 0 : Number(localStorage.getItem(KEY) ?? 0) || 0);
export const countScan = () => localStorage.setItem(KEY, String(scansUsed() + 1));
