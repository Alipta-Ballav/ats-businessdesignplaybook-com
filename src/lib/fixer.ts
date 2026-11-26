import {
  COMPETENCIES,
  evaluate,
  futureTalentIndex,
  inferLevel,
  type Level,
  type Candidate,
  type Job,
} from "./scoring";
import { inspectBullets } from "./diagnostics";
import { resumeTips } from "./tips";
import { resumeBlocks } from "./export-docx";

export type Suggestion = {
  id: string;
  kind: "rewrite" | "add";
  title: string;
  detail: string;
  original?: string;
  playbook?: string[];
  /** Triage group: critical = job must-haves, impact = missing evidence or outcomes, polish = wording. */
  tier?: Tier;
};
export type Tier = "critical" | "impact" | "polish";
export const TIERS: { id: Tier; label: string }[] = [
  { id: "critical", label: "Critical" },
  { id: "impact", label: "High impact" },
  { id: "polish", label: "Polish" },
];

/** Business Design Playbook framing formulas: structure prompts only, the candidate supplies every fact. */
export const BUSINESS_PLAYBOOK = [
  "Growth: friction you removed → behaviour that changed → commercial metric (conversion, expansion revenue, acquisition cost)",
  "Cost-to-serve: system or self-service flow → efficiency lever → engineering time or support tickets reduced",
  "Enterprise: workflow redesign → readiness or compliance unlocked → win rate or contract value",
];
const VANITY = /\b(delight|engagement|user satisfaction|better experience|improved (the )?ux)\b/i;
const BIZ_NAMES = COMPETENCIES.filter((x) => x.id === "strategic" || x.id === "outcomes").map((x) =>
  x.name.toLowerCase(),
);
const withPlaybook = (s: Suggestion): Suggestion => {
  const t = `${s.title} ${s.original ?? ""}`.toLowerCase();
  return BIZ_NAMES.some((n) => t.includes(n)) || VANITY.test(s.original ?? "")
    ? { ...s, playbook: BUSINESS_PLAYBOOK }
    : s;
};
export const ADDED_HEADING = "Additional evidence";

/** Ordered queue: vague bullets to rewrite first, then missing/weak evidence to add. */
export function buildQueue(job: Job, c: Candidate, resume: string): Suggestion[] {
  const rewrites: Suggestion[] = inspectBullets(resume).map((f) => ({
    id: `r:${f.original}`,
    kind: "rewrite",
    title: "Make this bullet concrete",
    detail: f.issues.join(" · "),
    original: f.original,
    tier: f.issues.some((i) => /outcome/i.test(i)) ? "impact" : "polish",
  }));
  const adds: Suggestion[] = resumeTips(job, c).map((t) => ({
    id: `a:${t.title}`,
    kind: "add",
    title: t.title,
    detail: t.detail,
    tier: t.kind === "requirement" ? "critical" : t.kind === "missing" ? "impact" : "polish",
  }));
  const rank: Record<Tier, number> = { critical: 0, impact: 1, polish: 2 };
  return [...rewrites, ...adds]
    .map(withPlaybook)
    .sort((a, b) => rank[a.tier ?? "polish"] - rank[b.tier ?? "polish"]);
}

/** Source-line insertion points; display reflow must never change editing coordinates. */
export function insertionLocations(resume: string): { id: string; label: string; insertAt: number }[] {
  const blocks = resumeBlocks(resume);
  const lines = resume.split("\n");
  return blocks.flatMap((block, i) => {
    const start = block.lineIndices[0];
    if (start === undefined || block.kind === "name") return [];
    if (block.kind === "heading" || block.kind === "role") {
      const next = blocks.slice(i + 1).find((b) => b.kind === "heading" || b.kind === "role");
      let end = next?.lineIndices[0] ?? lines.length;
      while (end > start + 1 && !lines[end - 1]?.trim()) end--;
      return [{ id: `section:${start}`, label: `Under ${block.text}`, insertAt: end }];
    }
    const last = block.lineIndices.at(-1);
    return last === undefined ? [] : [{ id: `line:${start}`, label: `After: ${block.text}`, insertAt: last + 1 }];
  });
}

/** Replace a source line or insert at the user's chosen source-line boundary. */
export function applySuggestion(
  resume: string,
  s: Pick<Suggestion, "kind" | "original">,
  text: string,
  insertAt?: number,
): string {
  const t = cleanLine(text);
  if (!t) return resume;
  if (s.kind === "rewrite" && s.original) {
    const original = s.original;
    const lines = resume.split("\n");
    const i = lines.findIndex((l) => l.includes(original));
    const line = lines[i];
    if (i >= 0 && line !== undefined) {
      // Keep the line's indentation + bullet marker so Word/preview keep it as a bullet.
      const prefix = line.match(/^\s*(?:[-•*▪●–]|\d+[.)])?\s*/)?.[0] ?? "";
      lines[i] =
        line.trim().replace(/^(?:[-•*▪●–]|\d+[.)])\s+/, "") === original
          ? prefix + t
          : line.replace(original, t);
      return lines.join("\n");
    }
    return resume;
  }
  if (insertAt !== undefined) {
    const lines = resume.split("\n");
    if (!Number.isInteger(insertAt) || insertAt < 0 || insertAt > lines.length) return resume;
    const previous = lines.slice(0, insertAt).reverse().find((l) => /^\s*[-•*▪●–]\s+/.test(l));
    const marker = previous?.match(/^(\s*[-•*▪●–]\s+)/)?.[1] ?? "- ";
    lines.splice(insertAt, 0, `${marker}${t}`);
    return lines.join("\n");
  }
  const base = resume.replace(/\s+$/, "");
  return base.includes(`\n${ADDED_HEADING}\n`)
    ? `${base}\n- ${t}\n`
    : `${base}\n\n${ADDED_HEADING}\n- ${t}\n`;
}

/** Strip bullet markers / line breaks the AI or user may add, so a revision is one clean line. */
export const cleanLine = (text: string) =>
  text
    .replace(/\s*\n+\s*/g, " ")
    .trim()
    .replace(/^(?:[-•*▪●–]|\d+[.)])\s+/, "")
    .trim();

/** Headline score: FTI for a generic audit, composite fit for a job match. */
export function headlineScore(job: Job, c: Candidate, level?: Level): number {
  if (!job.description.trim())
    return futureTalentIndex(c, level ?? inferLevel(c.years ?? 0, c.role ?? "")).total;
  return evaluate(job, c).composite ?? 0;
}
export { COMPETENCIES };
