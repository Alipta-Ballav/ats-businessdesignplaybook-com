import type { Extracted } from "./evidence";
import type { EditorSession } from "./editor-session";
export type GuestScan = {
  id?: string;
  editor?: EditorSession;
  jobId: string | null;
  jobTitle: string;
  jobDescription: string;
  resume: string;
  evidence: Extracted;
  createdAt: string;
};
const KEY = "ft-guest-scan";
export const saveGuestScan = (s: GuestScan) => {
  s.id ??= crypto.randomUUID();
  localStorage.setItem(KEY, JSON.stringify(s));
};
export const saveGuestEditor = (createdAt: string, editor: EditorSession) => {
  const scan = loadGuestScan();
  if (scan?.createdAt === createdAt) saveGuestScan({ ...scan, editor });
};
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const loadGuestScan = (): GuestScan | null => {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? "null") as GuestScan | null;
    if (g && (!Number.isFinite(new Date(g.createdAt).getTime()) || Date.now() - new Date(g.createdAt).getTime() > MAX_AGE_MS)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return g;
  } catch {
    return null;
  }
};
export const clearGuestScan = () => localStorage.removeItem(KEY);
