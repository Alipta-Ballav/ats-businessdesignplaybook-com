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
export function passPriceInr(completedPasses: number) {
  return completedPasses < LAUNCH_SPOTS ? LAUNCH_INR : REGULAR_INR;
}
export const POWER_INR = 299;
export const POWER_DAYS = 60;
export const POWER_SCANS = 20;
export type PlanId = "job_hunt_30" | "power_60";
/** Days and verified scans granted by each pass plan. */
export function planTerms(plan: string): { days: number; scans: number } {
  return plan === "power_60" ? { days: POWER_DAYS, scans: POWER_SCANS } : { days: PASS_DAYS, scans: PASS_SCANS };
}
export function passEndsAt(p: { plan: string; paid_at: string | null }) {
  return Date.parse(p.paid_at ?? "") + planTerms(p.plan).days * 864e5;
}
export const PLANS: {
  id: PlanId;
  name: string;
  days: number;
  inr: number;
  usd: number;
  blurb: string;
  perks: string[];
  best?: boolean;
}[] = [
  {
    id: "job_hunt_30",
    name: "30-Day Job Hunt Pass",
    days: PASS_DAYS,
    inr: 99,
    usd: 1.19,
    blurb: "5 scans + all features for 30 days from payment. No auto-renewal.",
    best: true,
    perks: [
      "5 verified scores in 30 days (new resumes or rescores)",
      "ATS-ready Word & PDF downloads",
      "Custom ATS tuning",
    ],
  },
  {
    id: "power_60",
    name: "60-Day Power Searcher Pass",
    days: POWER_DAYS,
    inr: POWER_INR,
    usd: 3.59,
    blurb: "20 scans + all features for 60 days. For tailoring to many roles. No auto-renewal.",
    perks: [
      "20 verified scores in 60 days (new resumes or rescores)",
      "Tailor and rescore for many job posts",
      "ATS-ready Word & PDF downloads",
      "Custom ATS tuning",
    ],
  },
];
/** Applying recommendations (AI or manual) is free for everyone; the paywall sits on the official rescore and Word download. */
export function canApplyFix(_applied: number, _pro: boolean) {
  return true;
}
/** Official AI rescore after edits needs an active pass. */
export function canRescore(pro: boolean) {
  return pro;
}
export function canDownloadWord(pro: boolean) {
  return pro;
}
/** First FREE_SCANS scans are free; an active prepaid pass unlocks further scans. */
export function canScan(used: number, pro: boolean) {
  return pro || used < FREE_SCANS;
}

export type AccessPayment = {
  plan: string;
  amount: number;
  status: string;
  paid_at: string | null;
};
/** Earlier lifetime purchases keep their terms; new passes expire exactly 30 days after verified payment. */
export function hasPaidAccess(payment: AccessPayment, now = Date.now()): boolean {
  if (payment.status !== "completed") return false;
  if (payment.plan === "single" && payment.amount === 4900) return true;
  if (payment.plan === "power_60") {
    if (payment.amount !== POWER_INR * 100 || !payment.paid_at) return false;
    const at = Date.parse(payment.paid_at);
    return Number.isFinite(at) && now >= at && now < passEndsAt(payment);
  }
  if (
    payment.plan !== "job_hunt_30" ||
    (payment.amount !== LAUNCH_INR * 100 && payment.amount !== REGULAR_INR * 100) ||
    !payment.paid_at
  )
    return false;
  const paidAt = Date.parse(payment.paid_at);
  return Number.isFinite(paidAt) && now >= paidAt && now < paidAt + PASS_DURATION_MS;
}
const KEY = "ft-scans-used";
export const scansUsed = () =>
  typeof window === "undefined" ? 0 : Number(localStorage.getItem(KEY) ?? 0) || 0;
export const countScan = () => localStorage.setItem(KEY, String(scansUsed() + 1));

/** A 30-day pass includes PASS_SCANS new scans counted from the pass start; admins are uncapped. */
export function passScansLeft(scansSincePass: number, activePasses: number | string[] = 1) {
  const total = Array.isArray(activePasses)
    ? activePasses.reduce((n, plan) => n + planTerms(plan).scans, 0)
    : PASS_SCANS * activePasses;
  return Math.max(0, total - scansSincePass);
}

/** Free and Job Hunt users keep one master resume; role variants need an active Power Searcher Pass (also enforced in the database). */
export const MASTER_RESUMES = 1;
export function hasPowerAccess(payments: AccessPayment[], now = Date.now()) {
  return payments.some((p) => p.plan === "power_60" && hasPaidAccess(p, now));
}
export function canCreateVariant(power: boolean, saved: number) {
  return power || saved < MASTER_RESUMES;
}

export type PassTier = "power" | "job_hunt" | "lifetime" | "expired" | "none";
/** Which pass a user is on right now and when access ends (latest expiry across stacked passes). */
export function passSummary(payments: AccessPayment[], now = Date.now()): { tier: PassTier; endsAt: number | null; daysLeft: number | null } {
  const active = payments.filter((p) => hasPaidAccess(p, now));
  if (active.some((p) => p.plan === "single")) return { tier: "lifetime", endsAt: null, daysLeft: null };
  if (!active.length) return { tier: payments.some((p) => p.status === "completed") ? "expired" : "none", endsAt: null, daysLeft: null };
  const endsAt = Math.max(...active.map((p) => passEndsAt(p)));
  return { tier: active.some((p) => p.plan === "power_60") ? "power" : "job_hunt", endsAt, daysLeft: Math.max(1, Math.ceil((endsAt - now) / 864e5)) };
}
