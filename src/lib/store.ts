import { useSyncExternalStore } from "react";
import type { Candidate, Job } from "./scoring";
import { SEED_CANDIDATES, SEED_JOBS } from "./seed";

type State = { jobs: Job[]; candidates: Candidate[] };
const KEY = "futuretalent-v1";
let state: State = { jobs: SEED_JOBS, candidates: SEED_CANDIDATES };
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try { const raw = localStorage.getItem(KEY); if (raw) state = JSON.parse(raw); } catch { /* ignore */ }
}
function set(next: State) {
  state = next;
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
const serverState: State = { jobs: SEED_JOBS, candidates: SEED_CANDIDATES };
export function useStore() {
  return useSyncExternalStore(
    (f) => { subs.add(f); if (!loaded) { load(); f(); } return () => subs.delete(f); },
    () => { load(); return state; },
    () => serverState,
  );
}
export const actions = {
  addJob(job: Job) { set({ ...state, jobs: [job, ...state.jobs] }); },
  updateJob(job: Job) { set({ ...state, jobs: state.jobs.map((j) => (j.id === job.id ? job : j)) }); },
  overrideCandidate(id: string, status: string, rationale: string) {
    set({ ...state, candidates: state.candidates.map((c) => c.id === id ? { ...c, override: { status, rationale, at: new Date().toISOString() } } : c) });
  },
  reset() { set({ jobs: SEED_JOBS, candidates: SEED_CANDIDATES }); },
};
