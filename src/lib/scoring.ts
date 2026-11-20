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

/** Target ATS platforms: each is a fixed, published parsing + screening policy. */
export const ATS_SYSTEMS: Record<string, { flexibility: number; weights: Record<Dimension, number>; style: "legacy" | "semantic"; how: string }> = {
  Workday: { flexibility: 10, weights: { JR: 65, FR: 20, HP: 15 }, style: "legacy", how: "Rigid parsing and strict keyword matching" },
  Greenhouse: { flexibility: 45, weights: { JR: 45, FR: 30, HP: 25 }, style: "semantic", how: "Structured scorecards, reads context" },
  Ashby: { flexibility: 55, weights: { JR: 40, FR: 35, HP: 25 }, style: "semantic", how: "Modern semantic matching, credits transferable skills" },
  Taleo: { flexibility: 5, weights: { JR: 70, FR: 18, HP: 12 }, style: "legacy", how: "Oracle Taleo: strictest parser, exact keyword knock-outs" },
  iCIMS: { flexibility: 15, weights: { JR: 60, FR: 22, HP: 18 }, style: "legacy", how: "Enterprise knock-out questions and keyword filters" },
  SuccessFactors: { flexibility: 15, weights: { JR: 60, FR: 22, HP: 18 }, style: "legacy", how: "SAP SuccessFactors: structured fields, literal matching" },
  Lever: { flexibility: 40, weights: { JR: 45, FR: 30, HP: 25 }, style: "semantic", how: "Tag and stage based, recruiter reads context" },
  BambooHR: { flexibility: 50, weights: { JR: 40, FR: 35, HP: 25 }, style: "semantic", how: "Light filtering, human review for agencies and mid-size teams" },
};

/** Deterministic formatting checks; legacy parsers are hurt by all of them, semantic ones only by "high". */
export function formatRisks(resume: string): { issue: string; fix: string; severity: "high" | "medium" }[] {
  const t = resume ?? ""; const out: { issue: string; fix: string; severity: "high" | "medium" }[] = [];
  if (t.trim().length < 400) out.push({ issue: "Very little text could be read", fix: "Your file may be an image or scanned PDF. Export a text-based PDF or Word file.", severity: "high" });
  if (!/\b(experience|employment|work history)\b/i.test(t)) out.push({ issue: "No standard \"Experience\" heading", fix: "Use a plain heading like \"Experience\" so the parser finds your jobs.", severity: "high" });
  if (!/\b(skills|tools)\b/i.test(t)) out.push({ issue: "No \"Skills\" section", fix: "Add a short Skills section listing tools and methods (Figma, research, design systems).", severity: "medium" });
  if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) out.push({ issue: "No email address found", fix: "Put your email in plain text at the top, not in a header image.", severity: "medium" });
  if (/\t{2,}|\S {4,}\S/.test(t)) out.push({ issue: "Looks like columns or a table", fix: "Use a single-column layout; multi-column text gets scrambled.", severity: "medium" });
  if (/[\u2605\u2606\u25CF\u25CB\u2B50]/.test(t)) out.push({ issue: "Skill rating dots or stars", fix: "Replace graphics-based ratings with plain words.", severity: "medium" });
  return out;
}

/** Score penalty applied for formatting risks under a given ATS. */
export function atsFormatPenalty(system: string, resume: string): number {
  const s = ATS_SYSTEMS[system]; if (!s) return 0;
  const r = formatRisks(resume);
  const pts = r.reduce((n, x) => n + (x.severity === "high" ? 8 : s.style === "legacy" ? 4 : 0), 0);
  return Math.min(25, s.style === "legacy" ? pts : Math.round(pts / 2));
}

/** Future Talent Index: the tool's own 8 published dimensions, built from the same grounded competency evidence. No job description needed. */
export const FTI_DIMENSIONS: { id: string; name: string; weight: number; comps: string[]; tip: string }[] = [
  { id: "domain", name: "Domain & Functional Expertise", weight: 15, comps: ["functional", "domain", "relevance"], tip: "Name the products, platforms and design disciplines you've gone deep in." },
  { id: "ai", name: "AI Fluency & Intelligence", weight: 15, comps: ["ai"], tip: "Show a concrete project where you designed with or for AI, LLMs or automation." },
  { id: "systems", name: "Systems Thinking", weight: 15, comps: ["systems"], tip: "Describe a design system, platform or multi-team problem you shaped." },
  { id: "critical", name: "Critical & Analytical Thinking", weight: 15, comps: ["problem", "flexibility", "decision"], tip: "Explain how research or data changed a decision you made." },
  { id: "learning", name: "Learning Agility", weight: 10, comps: ["learning"], tip: "Mention a new skill, tool or domain you picked up quickly and applied." },
  { id: "business", name: "Business & Strategic Acumen", weight: 10, comps: ["strategic", "outcomes"], tip: "Tie your work to revenue, retention, cost or another business metric." },
  { id: "human", name: "Human Collaboration & Influence", weight: 10, comps: ["social", "growth"], tip: "Show how you aligned leaders, partners or grew a team." },
  { id: "innovation", name: "Innovation & Execution", weight: 10, comps: ["creative", "execution"], tip: "Describe an idea you took from experiment to shipped outcome." },
];

/** Neutral (flexibility 50) scoring; a dimension with no evidence scores 0. */
export function futureTalentIndex(c: Pick<Candidate, "competencies">) {
  const dims = FTI_DIMENSIONS.map((d) => {
    const vals = d.comps.map((id) => competencyScore(c.competencies[id], 50) ?? 0);
    const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    const quotes = d.comps.map((id) => c.competencies[id]?.quote).filter((q): q is string => !!q);
    return { ...d, score, quotes };
  });
  const total = Math.round(dims.reduce((a, d) => a + d.score * d.weight, 0) / 100);
  return { total, dims };
}
