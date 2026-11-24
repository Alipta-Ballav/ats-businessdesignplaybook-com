/** Micro-paywall plan catalog. Prices here are the source of truth; the server builds Razorpay orders from them. */
export const FREE_FIXES = 2;
export const FREE_SCANS = 1;
export const checkoutReady = true;
export const PASS_DAYS = 30;
export const PASS_SCANS = 5;
export const PASS_DURATION_MS = PASS_DAYS * 24 * 60 * 60 * 1000;
/** Launch offer: the first LAUNCH_SPOTS completed passes cost LAUNCH_INR, later ones REGULAR_INR. */
export const LAUNCH_INR = 99;
export const REGULAR_INR = 149;
export const LAUNCH_SPOTS = 50;
export const LAUNCH_BANNER = `Launch offer: ₹${LAUNCH_INR} for the first ${LAUNCH_SPOTS} users (then ₹${REGULAR_INR})`;
export function passPriceInr(completedPasses: number) { return completedPasses < LAUNCH_SPOTS ? LAUNCH_INR : REGULAR_INR; }
export type PlanId = "job_hunt_30";
export const PLANS: { id: PlanId; name: string; inr: number; usd: number; blurb: string; perks: string[]; best?: boolean }[] = [
  { id: "job_hunt_30", name: "30-Day Job Hunt Pass", inr: 99, usd: 1.19, blurb: "5 scans + all features for 30 days from payment. No auto-renewal.", best: true, perks: ["5 verified scores in 30 days (new resumes or rescores)", "ATS-ready Word downloads", "Custom ATS tuning"] },
];
/** Applying recommendations (AI or manual) is free for everyone; the paywall sits on the official rescore and Word download. */
export function canApplyFix(_applied: number, _pro: boolean) { return true; }
/** Official AI rescore after edits needs an active pass. */
export function canRescore(pro: boolean) { return pro; }
export function canDownloadWord(pro: boolean) { return pro; }
/** First FREE_SCANS scans are free; an active prepaid pass unlocks further scans. */
export function canScan(used: number, pro: boolean) { return pro || used < FREE_SCANS; }

export type AccessPayment = { plan: string; amount: number; status: string; paid_at: string | null };
/** Earlier lifetime purchases keep their terms; new passes expire exactly 30 days after verified payment. */
export function hasPaidAccess(payment: AccessPayment, now = Date.now()): boolean {
  if (payment.status !== "completed") return false;
  if (payment.plan === "single" && payment.amount === 4900) return true;
  if (payment.plan !== "job_hunt_30" || (payment.amount !== LAUNCH_INR * 100 && payment.amount !== REGULAR_INR * 100) || !payment.paid_at) return false;
  const paidAt = Date.parse(payment.paid_at);
  return Number.isFinite(paidAt) && now >= paidAt && now < paidAt + PASS_DURATION_MS;
}
const KEY = "ft-scans-used";
export const scansUsed = () => (typeof window === "undefined" ? 0 : Number(localStorage.getItem(KEY) ?? 0) || 0);
export const countScan = () => localStorage.setItem(KEY, String(scansUsed() + 1));

/** A 30-day pass includes PASS_SCANS new scans counted from the pass start; admins are uncapped. */
export function passScansLeft(scansSincePass: number, activePasses = 1) { return Math.max(0, PASS_SCANS * activePasses - scansSincePass); }
