import { COMPETENCIES, EVIDENCE_LABELS, type Candidate, type Job } from "./scoring";
import { evaluate } from "./scoring";

export type Tip = { kind: "missing" | "weak" | "requirement"; title: string; detail: string };

/** Deterministic resume coaching for candidates, derived from extracted evidence. */
export function resumeTips(job: Job, c: Candidate): Tip[] {
  const tips: Tip[] = [];
  const ev = evaluate(job, c);
  for (const m of ev.mand) {
    if (m.value === "missing")
      tips.push({
        kind: "requirement",
        title: `Show "${m.name}"`,
        detail:
          "This is a must-have for the role and we couldn't find it in your resume. If you have it, name it explicitly with an example.",
      });
    else if (m.value === "transferable")
      tips.push({
        kind: "requirement",
        title: `Make "${m.name}" direct`,
        detail:
          "Your resume shows related experience only. Describe a project where you did this exact thing.",
      });
  }
  for (const x of COMPETENCIES) {
    const e = c.competencies[x.id];
    if (!e)
      tips.push({
        kind: "missing",
        title: `No evidence of ${x.name.toLowerCase()}`,
        detail:
          "Add a bullet with a concrete example — what you did and what changed because of it.",
      });
    else if (e.level <= 2)
      tips.push({
        kind: "weak",
        title: `Strengthen ${x.name.toLowerCase()}`,
        detail: `"${e.quote}" reads as ${EVIDENCE_LABELS[e.level]}. Add a measurable result (%, time saved, revenue, users) to reach Impact.`,
      });
  }
  const order = { requirement: 0, weak: 1, missing: 2 };
  return tips.sort((a, b) => order[a.kind] - order[b.kind]);
}
