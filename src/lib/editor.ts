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

export type FixEntry = { id: string; source: "manual" | "ai"; added: string; removed: string; edit?: { before: string; after: string; cleanupHeading?: boolean } };
/** Revert one applied fix, in any order: restore the original line, or drop the added bullet. */
export function revertFix(draft: string, f: Pick<FixEntry, "added" | "removed" | "edit">): string {
  if (f.edit) {
    if (draft === f.edit.after) return f.edit.before;
    const before = f.edit.before.split("\n"), after = f.edit.after.split("\n"), current = draft.split("\n");
    let start = 0, tail = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start++;
    while (tail < before.length - start && tail < after.length - start && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
    const added = after.slice(start, after.length - tail);
    // An appended bullet consumes the previous trailing blank line; it is not part of the earlier edit.
    if (current.length > after.length && added.at(-1) === "") added.pop();
    const matches = (i: number) => added.every((line, offset) => current[i + offset] === line);
    const at = matches(start) ? start : current.findIndex((_, i) => matches(i));
    if (at < 0 || !added.length) return draft;
    const preserved = before.slice(start, before.length - tail);
    if (added.some((line) => line.trim() === "Additional evidence") && current.slice(at + added.length).some((line) => line.trim())) {
      const heading = added.findIndex((line) => line.trim() === "Additional evidence");
      preserved.push(...added.slice(0, heading + 1));
    }
    current.splice(at, added.length, ...preserved);
    if (f.edit.cleanupHeading) {
      const heading = current.findIndex((line) => line.trim() === "Additional evidence");
      if (heading >= 0 && current.slice(heading + 1).every((line) => !line.trim())) {
        current.splice(heading);
        while (current.length && !current.at(-1)?.trim()) current.pop();
      }
    }
    return current.join("\n");
  }
  if (f.removed) return draft.includes(f.added) ? draft.replace(f.added, f.removed) : draft;
  const lines = draft.split("\n");
  const i = lines.findIndex((l) => l.trim() === `- ${f.added}`);
  if (i < 0) return draft;
  lines.splice(i, 1);
  const heading = lines.findIndex((l) => l.trim() === "Additional evidence");
  if (heading >= 0 && lines.slice(heading + 1).every((l) => !l.trim())) {
    lines.splice(heading);
    while (!lines.at(-1)?.trim() && lines.length) lines.pop();
  }
  return lines.join("\n");
}
