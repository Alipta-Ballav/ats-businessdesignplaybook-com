export type Dimension = "JR" | "FR" | "HP";
export type EvidenceLevel = 1 | 2 | 3 | 4 | 5;
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  1: "Claimed",
  2: "Applied",
  3: "Demonstrated",
  4: "Impact",
  5: "Transfer",
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
export const DIM_NAMES: Record<Dimension, string> = {
  JR: "Job Readiness",
  FR: "Future Readiness",
  HP: "Human Potential",
};

export type Requirement = { name: string; essential: boolean };
export type Job = {
  id: string;
  title: string;
  func: string;
  seniority: string;
  description: string;
  flexibility: number;
  preset: string;
  mandatory: Requirement[];
  preferred: string[];
  weights: Record<Dimension, number>;
  createdAt: string;
};
export type CompEvidence = {
  proficiency: number;
  level: EvidenceLevel;
  transferable?: boolean;
  quote: string;
  source: string;
};
export type Candidate = {
  id: string;
  jobId: string;
  name: string;
  role: string;
  years: number;
  domain: string;
  mandatory: Record<string, "met" | "transferable" | "missing">;
  competencies: Record<string, CompEvidence>;
  override?: { status: string; rationale: string; at: string };
};

export const EVIDENCE_FACTOR: Record<EvidenceLevel, number> = {
  1: 0.5,
  2: 0.7,
  3: 0.85,
  4: 1,
  5: 1,
};
export const MIN_COVERAGE = 0.6;

export function matchMode(flex: number) {
  if (flex <= 20) return "Exact Match";
  if (flex <= 40) return "Conservative Match";
  if (flex <= 60) return "Balanced Match";
  if (flex <= 80) return "Transferable Skills";
  return "Potential-led Match";
}
/** How much credit transferable (non-direct) evidence earns: 30% at strict, 100% at fully flexible. */
export const transferCredit = (flex: number) =>
  0.3 + 0.7 * (Math.max(0, Math.min(100, flex)) / 100);

export function competencyScore(e: CompEvidence | undefined, flex: number): number | null {
  if (!e) return null;
  let s = (e.proficiency / 5) * 100 * EVIDENCE_FACTOR[e.level];
  if (e.transferable) s *= transferCredit(flex);
  return Math.round(s);
}

export function dimensionScore(c: Candidate, dim: Dimension, flex: number) {
  const comps = COMPETENCIES.filter((x) => x.dim === dim);
  const scored = comps
    .map((x) => competencyScore(c.competencies[x.id], flex))
    .filter((v): v is number => v !== null);
  const coverage = scored.length / comps.length;
  const score =
    coverage >= MIN_COVERAGE ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null;
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
  const JR = dimensionScore(c, "JR", f),
    FR = dimensionScore(c, "FR", f),
    HP = dimensionScore(c, "HP", f);
  const w = job.weights;
  const total = w.JR + w.FR + w.HP || 1;
  const composite =
    JR.score !== null && FR.score !== null && HP.score !== null
      ? Math.round((JR.score * w.JR + FR.score * w.FR + HP.score * w.HP) / total)
      : null;
  const coverage = Math.round(((JR.coverage + FR.coverage + HP.coverage) / 3) * 100);
  const mand = mandatoryStatus(job, c);
  const mandatoryOk = mand.every((m) => m.accepted);
  let status: string;
  if (!mandatoryOk) status = "Significant gaps identified";
  else if (composite === null) status = "Requires further assessment";
  else if ((JR.score ?? 0) >= 70) status = "Strong alignment";
  else if ((FR.score ?? 0) >= 65) status = "Promising transferable fit";
  else status = "Requires further assessment";
  return {
    JR,
    FR,
    HP,
    composite,
    coverage,
    mand,
    mandatoryOk,
    status: c.override?.status ?? status,
    systemStatus: status,
  };
}

export const PRESETS: Record<string, { flexibility: number; weights: Record<Dimension, number> }> =
  {
    "Exact Match": { flexibility: 10, weights: { JR: 60, FR: 25, HP: 15 } },
    "Balanced Match": { flexibility: 50, weights: { JR: 30, FR: 40, HP: 30 } },
    "Potential-led Hiring": { flexibility: 85, weights: { JR: 20, FR: 35, HP: 45 } },
    "Future-ready Talent": { flexibility: 70, weights: { JR: 20, FR: 55, HP: 25 } },
  };

/** Design-career seniority archetypes: how each level is typically screened. */
export const DESIGN_LEVELS: Record<
  string,
  { flexibility: number; weights: Record<Dimension, number>; focus: string }
> = {
  "Senior Product Designer": {
    flexibility: 40,
    weights: { JR: 50, FR: 30, HP: 20 },
    focus: "Deep craft and end-to-end delivery",
  },
  "Staff / Principal Designer": {
    flexibility: 50,
    weights: { JR: 35, FR: 40, HP: 25 },
    focus: "Design systems leverage and org-wide impact",
  },
  "Design Manager / Lead": {
    flexibility: 55,
    weights: { JR: 30, FR: 25, HP: 45 },
    focus: "Team mentorship, delivery and design ops",
  },
  "Head / Director of Design": {
    flexibility: 65,
    weights: { JR: 20, FR: 30, HP: 50 },
    focus: "Org strategy and executive partnership",
  },
};

/** Who is reading the resume: each lens is a fixed, published screening policy. */
export const SCREEN_LENSES: Record<
  string,
  { flexibility: number; weights: Record<Dimension, number>; who: string }
> = {
  "Recruiter screen": {
    flexibility: 15,
    weights: { JR: 60, FR: 25, HP: 15 },
    who: "Strict must-haves and exact experience",
  },
  "Hiring manager": {
    flexibility: 50,
    weights: { JR: 40, FR: 35, HP: 25 },
    who: "Craft, delivery and relevant impact",
  },
  "VP / Head of Design": {
    flexibility: 75,
    weights: { JR: 20, FR: 35, HP: 45 },
    who: "Strategy, leadership and outcomes",
  },
};

/** Target ATS platforms: each is a fixed, published parsing + screening policy. */
export const ATS_SYSTEMS: Record<
  string,
  {
    flexibility: number;
    weights: Record<Dimension, number>;
    style: "legacy" | "semantic";
    how: string;
  }
> = {
  Workday: {
    flexibility: 10,
    weights: { JR: 65, FR: 20, HP: 15 },
    style: "legacy",
    how: "Rigid parsing and strict keyword matching",
  },
  Greenhouse: {
    flexibility: 45,
    weights: { JR: 45, FR: 30, HP: 25 },
    style: "semantic",
    how: "Structured scorecards, reads context",
  },
  Ashby: {
    flexibility: 55,
    weights: { JR: 40, FR: 35, HP: 25 },
    style: "semantic",
    how: "Modern semantic matching, credits transferable skills",
  },
  Taleo: {
    flexibility: 5,
    weights: { JR: 70, FR: 18, HP: 12 },
    style: "legacy",
    how: "Oracle Taleo: strictest parser, exact keyword knock-outs",
  },
  iCIMS: {
    flexibility: 15,
    weights: { JR: 60, FR: 22, HP: 18 },
    style: "legacy",
    how: "Enterprise knock-out questions and keyword filters",
  },
  SuccessFactors: {
    flexibility: 15,
    weights: { JR: 60, FR: 22, HP: 18 },
    style: "legacy",
    how: "SAP SuccessFactors: structured fields, literal matching",
  },
  Lever: {
    flexibility: 40,
    weights: { JR: 45, FR: 30, HP: 25 },
    style: "semantic",
    how: "Tag and stage based, recruiter reads context",
  },
  BambooHR: {
    flexibility: 50,
    weights: { JR: 40, FR: 35, HP: 25 },
    style: "semantic",
    how: "Light filtering, human review for agencies and mid-size teams",
  },
};

/** Deterministic formatting checks; legacy parsers are hurt by all of them, semantic ones only by "high". */
export function formatRisks(
  resume: string,
): { issue: string; fix: string; severity: "high" | "medium" }[] {
  const t = resume ?? "";
  const out: { issue: string; fix: string; severity: "high" | "medium" }[] = [];
  if (t.trim().length < 400)
    out.push({
      issue: "Very little text could be read",
      fix: "Your file may be an image or scanned PDF. Export a text-based PDF or Word file.",
      severity: "high",
    });
  if (!/\b(experience|employment|work history)\b/i.test(t))
    out.push({
      issue: 'No standard "Experience" heading',
      fix: 'Use a plain heading like "Experience" so the parser finds your jobs.',
      severity: "high",
    });
  if (!/\b(skills|tools)\b/i.test(t))
    out.push({
      issue: 'No "Skills" section',
      fix: "Add a short Skills section listing tools and methods (Figma, research, design systems).",
      severity: "medium",
    });
  if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(t))
    out.push({
      issue: "No email address found",
      fix: "Put your email in plain text at the top, not in a header image.",
      severity: "medium",
    });
  if (/\t{2,}|\S {4,}\S/.test(t))
    out.push({
      issue: "Looks like columns or a table",
      fix: "Use a single-column layout; multi-column text gets scrambled.",
      severity: "medium",
    });
  if (/[\u2605\u2606\u25CF\u25CB\u2B50]/.test(t))
    out.push({
      issue: "Skill rating dots or stars",
      fix: "Replace graphics-based ratings with plain words.",
      severity: "medium",
    });
  return out;
}

/** Score penalty applied for formatting risks under a given ATS. */
export function atsFormatPenalty(system: string, resume: string): number {
  const s = ATS_SYSTEMS[system];
  if (!s) return 0;
  const r = formatRisks(resume);
  const pts = r.reduce((n, x) => n + (x.severity === "high" ? 8 : s.style === "legacy" ? 4 : 0), 0);
  return Math.min(25, s.style === "legacy" ? pts : Math.round(pts / 2));
}

/** Future Talent Index: the tool's own 8 published dimensions, built from the same grounded competency evidence. No job description needed. */
export const FTI_DIMENSIONS: {
  id: string;
  name: string;
  weight: number;
  comps: string[];
  skills: string[];
  tip: string;
}[] = [
  {
    id: "craft",
    name: "Design Craft & Execution",
    weight: 15,
    comps: ["functional", "execution", "relevance"],
    skills: [
      "Interaction design",
      "Visual design",
      "Information architecture",
      "Wireframing & prototyping",
      "Design systems",
      "Responsive design",
      "Accessibility & inclusive design",
      "UX writing & content design",
      "UX engineering",
      "Design quality & craft",
    ],
    tip: "Show a shipped flow: the interaction, IA or accessibility decisions you made and how it reached production.",
  },
  {
    id: "research",
    name: "Research & Human Understanding",
    weight: 10,
    comps: ["flexibility"],
    skills: [
      "User research",
      "Qualitative research",
      "Quantitative research",
      "User behavior analysis",
      "Usability testing",
      "Journey mapping",
      "Persona development",
      "Research synthesis",
      "Insight generation",
      "Human-centered design",
    ],
    tip: "Name a study you ran and the insight that changed what the team built.",
  },
  {
    id: "product",
    name: "Product & Business Thinking",
    weight: 15,
    comps: ["outcomes", "strategic", "domain"],
    skills: [
      "Product thinking",
      "Business acumen",
      "Product strategy",
      "Product discovery",
      "Business model understanding",
      "Value proposition design",
      "Product metrics & KPIs",
      "Prioritization & trade-offs",
      "Commercial awareness",
      "Outcome-driven design",
    ],
    tip: "Tie a design decision to a product metric: conversion, activation, retention, revenue or cost.",
  },
  {
    id: "systems",
    name: "Systems & Complexity Thinking",
    weight: 10,
    comps: ["systems"],
    skills: [
      "Systems thinking",
      "Complex workflow design",
      "Enterprise UX",
      "Service design",
      "Information modeling",
      "Design architecture",
      "Data visualization",
      "Dependency mapping",
      "State & exception management",
      "End-to-end experience design",
    ],
    tip: "Describe a complex workflow, platform or multi-team system you untangled, including edge and error states.",
  },
  {
    id: "ai",
    name: "AI & Emerging Technology Fluency",
    weight: 15,
    comps: ["ai"],
    skills: [
      "AI literacy",
      "AI experience design",
      "Agentic UX design",
      "Human-AI interaction",
      "Prompt engineering",
      "Context engineering",
      "AI memory & context design",
      "AI agent orchestration",
      "AI evaluation & testing",
      "Responsible AI design",
      "AI-assisted prototyping",
      "Vibe coding",
    ],
    tip: "Show a concrete AI product or agent experience you designed, or how you prototyped with AI tools.",
  },
  {
    id: "critical",
    name: "Critical Thinking & Problem Solving",
    weight: 10,
    comps: ["problem", "decision"],
    skills: [
      "Problem framing",
      "Critical thinking",
      "Analytical reasoning",
      "Computational thinking",
      "First-principles thinking",
      "Hypothesis formation",
      "Root cause analysis",
      "Decision making",
      "Ambiguity navigation",
      "Second-order thinking",
    ],
    tip: "Explain how you reframed a problem, tested a hypothesis or found the root cause before designing.",
  },
  {
    id: "leadership",
    name: "Collaboration & Design Leadership",
    weight: 15,
    comps: ["social", "growth"],
    skills: [
      "Cross-functional collaboration",
      "Stakeholder management",
      "Communication & storytelling",
      "Design facilitation",
      "Negotiation & influence",
      "Design advocacy",
      "Mentoring & coaching",
      "Team leadership",
      "Design operations",
      "Organizational influence",
    ],
    tip: "Show how you aligned PM, engineering or leadership, ran workshops, or grew designers.",
  },
  {
    id: "learning",
    name: "Learning Agility & Innovation",
    weight: 10,
    comps: ["learning", "creative"],
    skills: [
      "Learning agility",
      "Cognitive flexibility",
      "Creative thinking",
      "Creative synthesis",
      "Experimentation",
      "Adaptability",
      "Unlearning & relearning",
      "Intellectual curiosity",
      "Innovation management",
      "Knowledge transfer",
    ],
    tip: "Mention a new domain or tool you learned fast, or an experiment you ran and what it taught you.",
  },
];

export const LEVELS = [
  "Senior Product Designer",
  "Staff / Principal Designer",
  "Design Manager / Lead",
  "Head / Director of Design",
] as const;
export type Level = (typeof LEVELS)[number];
/** Per-level weights across the 8 Product & UX dimensions (each row sums to 100). */
export const LEVEL_WEIGHTS: Record<Level, Record<string, number>> = {
  "Senior Product Designer": {
    craft: 25,
    research: 15,
    product: 10,
    systems: 10,
    ai: 15,
    critical: 10,
    leadership: 5,
    learning: 10,
  },
  "Staff / Principal Designer": {
    craft: 15,
    research: 10,
    product: 15,
    systems: 20,
    ai: 15,
    critical: 10,
    leadership: 10,
    learning: 5,
  },
  "Design Manager / Lead": {
    craft: 10,
    research: 10,
    product: 15,
    systems: 10,
    ai: 10,
    critical: 10,
    leadership: 25,
    learning: 10,
  },
  "Head / Director of Design": {
    craft: 5,
    research: 5,
    product: 20,
    systems: 10,
    ai: 10,
    critical: 10,
    leadership: 30,
    learning: 10,
  },
};
export const LEVEL_EXAMPLES: Record<Level, string> = {
  "Senior Product Designer":
    "Redesigned onboarding end to end after 15 usability sessions, lifting activation 12%.",
  "Staff / Principal Designer":
    "Built the token-based design system adopted by 6 squads, cutting UI build time 30%.",
  "Design Manager / Lead":
    "Hired and mentored 5 designers and set up critique rituals that halved rework.",
  "Head / Director of Design":
    "Set the design vision with the CPO, grew the org to 20 and tied design OKRs to revenue.",
};
/** Deterministic level from title keywords first, then years of experience. */
export function inferLevel(years: number, role: string): Level {
  const r = role.toLowerCase();
  if (/\b(head|director|vp|vice president|chief|cdo)\b/.test(r)) return "Head / Director of Design";
  if (/\b(manager|lead)\b/.test(r)) return "Design Manager / Lead";
  if (/\b(staff|principal)\b/.test(r)) return "Staff / Principal Designer";
  if (years >= 12) return "Head / Director of Design";
  if (years >= 6) return "Staff / Principal Designer";
  return "Senior Product Designer";
}

/** Neutral (flexibility 50) scoring; a dimension with no evidence scores 0. With a level, weights follow LEVEL_WEIGHTS. */
/** Strongest verified evidence carries 70%, breadth across the dimension's competencies 30%, so one missed tag can't zero a strong dimension. */
export function dimensionEvidenceScore(vals: number[]) {
  if (!vals.length) return 0;
  const best = Math.max(...vals);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(best * 0.7 + mean * 0.3);
}
export function futureTalentIndex(
  c: Pick<Candidate, "competencies">,
  level?: Level,
  weights?: Record<string, number>,
) {
  const lw = weights ?? (level ? LEVEL_WEIGHTS[level] : undefined);
  const dims = FTI_DIMENSIONS.map((d) => {
    const vals = d.comps.map((id) => competencyScore(c.competencies[id], 50) ?? 0);
    const score = dimensionEvidenceScore(vals);
    const quotes = d.comps.map((id) => c.competencies[id]?.quote).filter((q): q is string => !!q);
    return { ...d, weight: lw?.[d.id] ?? d.weight, score, quotes };
  });
  const total = Math.round(dims.reduce((a, d) => a + d.score * d.weight, 0) / 100);
  return { total, dims };
}
