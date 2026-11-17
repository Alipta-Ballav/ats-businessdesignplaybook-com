import { COMPETENCIES, type CompEvidence, type EvidenceLevel, type Requirement } from "./scoring";

export type Extracted = {
  name: string; role: string; years: number; domain: string;
  requirements: Requirement[];
  mandatory: Record<string, "met" | "transferable" | "missing">;
  competencies: Record<string, CompEvidence>;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** A quote only counts as evidence if it actually appears in the resume (guards against invented evidence). */
export function isGrounded(quote: string, resume: string) {
  const q = norm(quote);
  return q.length >= 8 && norm(resume).includes(q);
}

type RawComp = { id: string; proficiency: number; level: number; transferable: boolean; quote: string; source: string };
type RawMand = { name: string; value: string };

export function normalizeExtraction(
  raw: { name: string; role: string; years: number; domain: string; requirements: Requirement[]; mandatory: RawMand[]; competencies: RawComp[] },
  resume: string,
): Extracted {
  const ids = new Set(COMPETENCIES.map((c) => c.id));
  const competencies: Record<string, CompEvidence> = {};
  for (const c of raw.competencies) {
    if (!ids.has(c.id) || competencies[c.id] || !isGrounded(c.quote, resume)) continue;
    competencies[c.id] = {
      proficiency: Math.max(1, Math.min(5, Math.round(c.proficiency))),
      level: Math.max(1, Math.min(5, Math.round(c.level))) as EvidenceLevel,
      transferable: !!c.transferable,
      quote: c.quote.trim().slice(0, 300),
      source: (c.source || "Resume").slice(0, 60),
    };
  }
  const mandatory: Extracted["mandatory"] = {};
  for (const m of raw.mandatory) {
    mandatory[m.name] = m.value === "met" || m.value === "transferable" ? m.value : "missing";
  }
  return {
    name: raw.name.trim() || "Unnamed candidate",
    role: raw.role.trim(), domain: raw.domain.trim(),
    years: Math.max(0, Math.min(60, Math.round(raw.years || 0))),
    requirements: raw.requirements.filter((r) => r.name.trim()).slice(0, 8).map((r) => ({ name: r.name.trim(), essential: !!r.essential })),
    mandatory, competencies,
  };
}
