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

export type Suggestion = {
  id: string;
  kind: "rewrite" | "add";
  title: string;
  detail: string;
  original?: string;
  playbook?: string[];
};

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
  }));
  const adds: Suggestion[] = resumeTips(job, c).map((t) => ({
    id: `a:${t.title}`,
    kind: "add",
    title: t.title,
    detail: t.detail,
  }));
  return [...rewrites, ...adds].map(withPlaybook);
}

/** Replace the original line with the revision, or append a new bullet under an "Additional evidence" section. Never invents text. */
export function applySuggestion(
  resume: string,
  s: Pick<Suggestion, "kind" | "original">,
  text: string,
): string {
  const t = cleanLine(text);
  if (!t) return resume;
  if (s.kind === "rewrite" && s.original) {
    const lines = resume.split("\n");
    const i = lines.findIndex((l) => l.includes(s.original!));
    if (i >= 0) {
      // Keep the line's indentation + bullet marker so Word/preview keep it as a bullet.
      const prefix = lines[i]!.match(/^\s*(?:[-•*▪●–]|\d+[.)])?\s*/)?.[0] ?? "";
      lines[i] =
        lines[i]!.trim().replace(/^(?:[-•*▪●–]|\d+[.)])\s+/, "") === s.original
          ? prefix + t
          : lines[i]!.replace(s.original, t);
      return lines.join("\n");
    }
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
