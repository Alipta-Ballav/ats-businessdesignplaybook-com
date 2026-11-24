import type { Extracted } from "./evidence";
export type GuestScan = {
  jobId: string | null;
  jobTitle: string;
  jobDescription: string;
  resume: string;
  evidence: Extracted;
  createdAt: string;
};
const KEY = "ft-guest-scan";
export const saveGuestScan = (s: GuestScan) => localStorage.setItem(KEY, JSON.stringify(s));
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const loadGuestScan = (): GuestScan | null => {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? "null") as GuestScan | null;
    if (g && Date.now() - new Date(g.createdAt).getTime() > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return g;
  } catch {
    return null;
  }
};
export const clearGuestScan = () => localStorage.removeItem(KEY);
