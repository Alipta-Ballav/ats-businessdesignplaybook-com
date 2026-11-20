import { COMPETENCIES, evaluate, futureTalentIndex, type Candidate, type Job } from "./scoring";
import { inspectBullets } from "./diagnostics";
import { resumeTips } from "./tips";

export type Suggestion = { id: string; kind: "rewrite" | "add"; title: string; detail: string; original?: string };
export const ADDED_HEADING = "Additional evidence";

/** Ordered queue: vague bullets to rewrite first, then missing/weak evidence to add. */
export function buildQueue(job: Job, c: Candidate, resume: string): Suggestion[] {
  const rewrites: Suggestion[] = inspectBullets(resume).map((f) => ({ id: `r:${f.original}`, kind: "rewrite", title: "Make this bullet concrete", detail: f.issues.join(" · "), original: f.original }));
  const adds: Suggestion[] = resumeTips(job, c).map((t) => ({ id: `a:${t.title}`, kind: "add", title: t.title, detail: t.detail }));
  return [...rewrites, ...adds];
}

/** Replace the original line with the revision, or append a new bullet under an "Additional evidence" section. Never invents text. */
export function applySuggestion(resume: string, s: Pick<Suggestion, "kind" | "original">, text: string): string {
  const t = text.trim();
  if (!t) return resume;
  if (s.kind === "rewrite" && s.original && resume.includes(s.original)) return resume.replace(s.original, t);
  const base = resume.replace(/\s+$/, "");
  return base.includes(`\n${ADDED_HEADING}\n`) ? `${base}\n- ${t}\n` : `${base}\n\n${ADDED_HEADING}\n- ${t}\n`;
}

/** Headline score: FTI for a generic audit, composite fit for a job match. */
export function headlineScore(job: Job, c: Candidate): number {
  if (!job.description.trim()) return futureTalentIndex(c).total;
  return evaluate(job, c).composite ?? 0;
}
export { COMPETENCIES };
