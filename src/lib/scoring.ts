export type Dimension = "JR" | "FR" | "HP";
export type EvidenceLevel = 1 | 2 | 3 | 4 | 5;
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  1: "Claimed", 2: "Applied", 3: "Demonstrated", 4: "Impact", 5: "Transfer",
};
export const COMPETENCIES: { id: string; name: string; dim: Dimension }[] = [
  { id: "functional", name: "Functional expertise", dim: "JR" },
  { id: "domain", name: "Domain expertise", dim: "JR" },
  { id: "execution", name: "Execution capability", dim: "JR" },
  { id: "relevance", name: "Experience relevance", dim: "JR" },
  { id: "outcomes", name: "Business outcomes", dim: "JR" },
  { id: "ai", name: "AI fluency", dim: "FR" },
  { id: "systems", name: "Systems intelligence", dim: "FR" },
  { id: "learning", name: "Learning agility", dim: "FR" },
  { id: "flexibility", name: "Cognitive flexibility", dim: "FR" },
  { id: "problem", name: "Problem intelligence", dim: "FR" },
  { id: "creative", name: "Creative intelligence", dim: "HP" },
  { id: "strategic", name: "Strategic intelligence", dim: "HP" },
  { id: "social", name: "Social intelligence", dim: "HP" },
  { id: "decision", name: "Decision intelligence", dim: "HP" },
  { id: "growth", name: "Growth orientation", dim: "HP" },
];
export const DIM_NAMES: Record<Dimension, string> = { JR: "Job Readiness", FR: "Future Readiness", HP: "Human Potential" };

export type Requirement = { name: string; essential: boolean };
export type Job = {
  id: string; title: string; func: string; seniority: string; description: string;
  flexibility: number; preset: string; mandatory: Requirement[]; preferred: string[];
  weights: Record<Dimension, number>; createdAt: string;
};
export type CompEvidence = { proficiency: number; level: EvidenceLevel; transferable?: boolean; quote: string; source: string };
export type Candidate = {
  id: string; jobId: string; name: string; role: string; years: number; domain: string;
  mandatory: Record<string, "met" | "transferable" | "missing">;
  competencies: Record<string, CompEvidence>;
  override?: { status: string; rationale: string; at: string };
};

export const EVIDENCE_FACTOR: Record<EvidenceLevel, number> = { 1: 0.5, 2: 0.7, 3: 0.85, 4: 1, 5: 1 };
export const MIN_COVERAGE = 0.6;

export function matchMode(flex: number) {
  if (flex <= 20) return "Exact Match";
  if (flex <= 40) return "Conservative Match";
  if (flex <= 60) return "Balanced Match";
  if (flex <= 80) return "Transferable Skills";
  return "Potential-led Match";
}
/** How much credit transferable (non-direct) evidence earns: 30% at strict, 100% at fully flexible. */
export const transferCredit = (flex: number) => 0.3 + 0.7 * (Math.max(0, Math.min(100, flex)) / 100);

export function competencyScore(e: CompEvidence | undefined, flex: number): number | null {
  if (!e) return null;
  let s = (e.proficiency / 5) * 100 * EVIDENCE_FACTOR[e.level];
  if (e.transferable) s *= transferCredit(flex);
  return Math.round(s);
}

export function dimensionScore(c: Candidate, dim: Dimension, flex: number) {
  const comps = COMPETENCIES.filter((x) => x.dim === dim);
  const scored = comps.map((x) => competencyScore(c.competencies[x.id], flex)).filter((v): v is number => v !== null);
  const coverage = scored.length / comps.length;
  const score = coverage >= MIN_COVERAGE ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
  return { score, coverage };
}

export function mandatoryStatus(job: Job, c: Candidate) {
  return job.mandatory.map((r) => {
    const v = c.mandatory[r.name] ?? "missing";
    // Flexibility never overrides essential requirements (certifications, legal, safety).
    const accepted = v === "met" || (v === "transferable" && !r.essential && job.flexibility > 60);
    return { ...r, value: v, accepted };
  });
}

export function evaluate(job: Job, c: Candidate) {
  const f = job.flexibility;
  const JR = dimensionScore(c, "JR", f), FR = dimensionScore(c, "FR", f), HP = dimensionScore(c, "HP", f);
  const w = job.weights;
  const total = w.JR + w.FR + w.HP || 1;
  const composite = JR.score !== null && FR.score !== null && HP.score !== null
    ? Math.round((JR.score * w.JR + FR.score * w.FR + HP.score * w.HP) / total) : null;
  const coverage = Math.round(((JR.coverage + FR.coverage + HP.coverage) / 3) * 100);
  const mand = mandatoryStatus(job, c);
  const mandatoryOk = mand.every((m) => m.accepted);
  let status: string;
  if (!mandatoryOk) status = "Significant gaps identified";
  else if (composite === null) status = "Requires further assessment";
  else if ((JR.score ?? 0) >= 70) status = "Strong alignment";
  else if ((FR.score ?? 0) >= 65) status = "Promising transferable fit";
  else status = "Requires further assessment";
  return { JR, FR, HP, composite, coverage, mand, mandatoryOk, status: c.override?.status ?? status, systemStatus: status };
}

export const PRESETS: Record<string, { flexibility: number; weights: Record<Dimension, number> }> = {
  "Exact Match": { flexibility: 10, weights: { JR: 60, FR: 25, HP: 15 } },
  "Balanced Match": { flexibility: 50, weights: { JR: 30, FR: 40, HP: 30 } },
  "Potential-led Hiring": { flexibility: 85, weights: { JR: 20, FR: 35, HP: 45 } },
  "Future-ready Talent": { flexibility: 70, weights: { JR: 20, FR: 55, HP: 25 } },
};
