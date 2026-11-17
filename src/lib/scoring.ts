export type Dimension = "JR" | "FR" | "HP";
export type EvidenceLevel = 1 | 2 | 3 | 4 | 5;
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  1: "Claimed", 2: "Applied", 3: "Demonstrated", 4: "Impact", 5: "Transfer",
};
export const COMPETENCIES: { id: string; name: string; dim: Dimension }[] = [
  { id: "functional", name: "Design craft & interaction quality", dim: "JR" },
  { id: "domain", name: "Product domain knowledge", dim: "JR" },
  { id: "execution", name: "End-to-end delivery & shipping", dim: "JR" },
  { id: "relevance", name: "Relevant design experience", dim: "JR" },
  { id: "outcomes", name: "Business & user impact (metrics)", dim: "JR" },
  { id: "ai", name: "AI-augmented design fluency", dim: "FR" },
  { id: "systems", name: "Design systems & scale", dim: "FR" },
  { id: "learning", name: "Learning agility", dim: "FR" },
  { id: "flexibility", name: "Research rigor & discovery", dim: "FR" },
  { id: "problem", name: "Problem framing", dim: "FR" },
  { id: "creative", name: "Creative vision", dim: "HP" },
  { id: "strategic", name: "Design strategy & product vision", dim: "HP" },
  { id: "social", name: "Cross-functional influence", dim: "HP" },
  { id: "decision", name: "Decision making & prioritisation", dim: "HP" },
  { id: "growth", name: "Team leadership & mentorship", dim: "HP" },
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

/** Design-career seniority archetypes: how each level is typically screened. */
export const DESIGN_LEVELS: Record<string, { flexibility: number; weights: Record<Dimension, number>; focus: string }> = {
  "Senior Product Designer": { flexibility: 40, weights: { JR: 50, FR: 30, HP: 20 }, focus: "Deep craft and end-to-end delivery" },
  "Staff / Principal Designer": { flexibility: 50, weights: { JR: 35, FR: 40, HP: 25 }, focus: "Design systems leverage and org-wide impact" },
  "Design Manager / Lead": { flexibility: 55, weights: { JR: 30, FR: 25, HP: 45 }, focus: "Team mentorship, delivery and design ops" },
  "Head / Director of Design": { flexibility: 65, weights: { JR: 20, FR: 30, HP: 50 }, focus: "Org strategy and executive partnership" },
};

/** Who is reading the resume: each lens is a fixed, published screening policy. */
export const SCREEN_LENSES: Record<string, { flexibility: number; weights: Record<Dimension, number>; who: string }> = {
  "Recruiter screen": { flexibility: 15, weights: { JR: 60, FR: 25, HP: 15 }, who: "Strict must-haves and exact experience" },
  "Hiring manager": { flexibility: 50, weights: { JR: 40, FR: 35, HP: 25 }, who: "Craft, delivery and relevant impact" },
  "VP / Head of Design": { flexibility: 75, weights: { JR: 20, FR: 35, HP: 45 }, who: "Strategy, leadership and outcomes" },
};
