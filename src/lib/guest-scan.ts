import type { Extracted } from "./evidence";
export type GuestScan = { jobId: string | null; jobTitle: string; jobDescription: string; resume: string; evidence: Extracted; createdAt: string };
const KEY = "ft-guest-scan";
export const saveGuestScan = (s: GuestScan) => localStorage.setItem(KEY, JSON.stringify(s));
export const loadGuestScan = (): GuestScan | null => { try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; } };
export const clearGuestScan = () => localStorage.removeItem(KEY);
