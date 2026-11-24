import type { Candidate } from "./scoring";

/** Numbers and capitalised names in a draft that do not appear in the allowed source text. */
const COMMON = new Set([
  "ux",
  "ui",
  "ios",
  "android",
  "web",
  "saas",
  "b2b",
  "b2c",
  "api",
  "ai",
  "ml",
  "llm",
  "figma",
  "sketch",
  "miro",
  "jira",
  "mvp",
  "kpi",
  "okr",
  "roi",
  "nps",
  "qa",
  "cx",
  "dx",
  "hci",
  "design",
  "product",
]);
export function newFacts(draft: string, sources: string[]): string[] {
  const src = sources.join(" ").toLowerCase();
  const srcNums = new Set((src.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", ".")));
  const out = new Set<string>();
  for (const n of draft.replace(/\bQ[1-4]\b/g, "").match(/\d+(?:[.,]\d+)?/g) ?? [])
    if (!srcNums.has(n.replace(",", "."))) out.add(n);
  const words = draft.split(/\s+/).map((w) => w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ""));
  words.forEach((w, i) => {
    if (i === 0 || !w || !/^\p{Lu}/u.test(w) || w.length < 2) return;
    const lw = w.toLowerCase();
    if (COMMON.has(lw) || src.includes(lw) || /^Q[1-4]$/.test(w)) return;
    out.add(w);
  });
  return [...out];
}

export type LineDiff = { text: string; changed: boolean };
/** Marks lines of the draft that are not present in the original resume. */
export function diffLines(original: string, draft: string): LineDiff[] {
  const orig = new Set(
    original
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean),
  );
  return draft
    .split("\n")
    .map((text) => ({ text, changed: !!text.trim() && !orig.has(text.trim()) }));
}

/** Live estimate: drop evidence whose quote was removed from the draft. Official score comes from a rescore. */
export function estimateCandidate(c: Candidate, draft: string): Candidate {
  const comps = Object.fromEntries(
    Object.entries(c.competencies).filter(([, e]) => !e?.quote || draft.includes(e.quote)),
  );
  return { ...c, competencies: comps };
}

/** Free fixes count manual and AI fixes alike. */
export const fixesUsed = (log: { source: "manual" | "ai" }[]) => log.length;

export type FixEntry = { id: string; source: "manual" | "ai"; added: string; removed: string };
/** Revert one applied fix, in any order: restore the original line, or drop the added bullet. */
export function revertFix(draft: string, f: Pick<FixEntry, "added" | "removed">): string {
  if (f.removed) return draft.includes(f.added) ? draft.replace(f.added, f.removed) : draft;
  const lines = draft.split("\n");
  const i = lines.findIndex((l) => l.trim() === `- ${f.added}`);
  if (i < 0) return draft;
  lines.splice(i, 1);
  return lines.join("\n");
}
