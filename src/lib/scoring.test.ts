import { describe, expect, it } from "vitest";
import { evaluate, matchMode, transferCredit } from "./scoring";
import { SEED_CANDIDATES, SEED_JOBS } from "./seed";

const job = SEED_JOBS[0]!;
const tomas = SEED_CANDIDATES.find((c) => c.id === "c-tomas")!;
const ana = SEED_CANDIDATES.find((c) => c.id === "c-ana")!;

describe("scoring rules", () => {
  it("slider bands map to the PRD modes", () => {
    expect(matchMode(20)).toBe("Exact Match");
    expect(matchMode(50)).toBe("Balanced Match");
    expect(matchMode(81)).toBe("Potential-led Match");
  });
  it("default weights are 30/40/30", () => {
    expect(job.weights).toEqual({ JR: 30, FR: 40, HP: 30 });
  });
  it("missing mandatory requirement is flagged even with high future readiness", () => {
    expect(evaluate({ ...job, flexibility: 100 }, tomas).status).toBe(
      "Significant gaps identified",
    );
  });
  it("essential requirements are never waived by flexibility", () => {
    const strictJob = {
      ...job,
      flexibility: 100,
      mandatory: [{ name: "Product design experience", essential: true }],
    };
    expect(evaluate(strictJob, tomas).mandatoryOk).toBe(false);
    expect(
      evaluate(
        { ...strictJob, mandatory: [{ name: "Product design experience", essential: false }] },
        tomas,
      ).mandatoryOk,
    ).toBe(true);
  });
  it("insufficient evidence gives no composite score", () => {
    expect(evaluate(job, ana).composite).toBeNull();
  });
  it("transferable evidence earns more credit when flexible", () => {
    expect(transferCredit(0)).toBeCloseTo(0.3);
    expect(transferCredit(100)).toBe(1);
  });
});

import { DESIGN_LEVELS, SCREEN_LENSES } from "./scoring";
describe("design presets", () => {
  it("weights total 100", () => {
    for (const p of [...Object.values(DESIGN_LEVELS), ...Object.values(SCREEN_LENSES)])
      expect(p.weights.JR + p.weights.FR + p.weights.HP).toBe(100);
  });
  it("recruiter screen is the strictest lens", () => {
    expect(SCREEN_LENSES["Recruiter screen"]!.flexibility).toBeLessThan(
      SCREEN_LENSES["VP / Head of Design"]!.flexibility,
    );
  });
});

import { ATS_SYSTEMS, atsFormatPenalty, formatRisks } from "./scoring";
describe("target ATS", () => {
  it("ships 8 engines: 4 strict parsers and 4 semantic readers", () => {
    expect(Object.keys(ATS_SYSTEMS).sort()).toEqual(
      [
        "Ashby",
        "BambooHR",
        "Greenhouse",
        "Lever",
        "SuccessFactors",
        "Taleo",
        "Workday",
        "iCIMS",
      ].sort(),
    );
    const strict = Object.entries(ATS_SYSTEMS).filter(([, s]) => s.style === "legacy");
    const semantic = Object.entries(ATS_SYSTEMS).filter(([, s]) => s.style === "semantic");
    expect(strict).toHaveLength(4);
    expect(semantic).toHaveLength(4);
    for (const [, s] of [...strict, ...semantic]) expect(s.how.length).toBeGreaterThan(10);
  });
  it("Taleo is the strictest and Ashby the most flexible engine", () => {
    const flex = Object.values(ATS_SYSTEMS).map((s) => s.flexibility);
    expect(ATS_SYSTEMS["Taleo"]!.flexibility).toBe(Math.min(...flex));
    expect(ATS_SYSTEMS["Ashby"]!.flexibility).toBe(Math.max(...flex));
  });
  it("Workday is stricter than Greenhouse and Ashby", () => {
    expect(ATS_SYSTEMS["Workday"]!.flexibility).toBeLessThan(
      ATS_SYSTEMS["Greenhouse"]!.flexibility,
    );
    expect(ATS_SYSTEMS["Workday"]!.flexibility).toBeLessThan(ATS_SYSTEMS["Ashby"]!.flexibility);
  });
  it("formatting risks cost more on Workday than on Ashby", () => {
    const bad = "Jane  Designer\tPortfolio\t\tLead";
    expect(formatRisks(bad).length).toBeGreaterThan(0);
    expect(atsFormatPenalty("Workday", bad)).toBeGreaterThan(atsFormatPenalty("Ashby", bad));
  });
});

import { FTI_DIMENSIONS, futureTalentIndex } from "./scoring";
describe("Future Talent Index", () => {
  it("weights total 100 across 8 dimensions", () => {
    expect(FTI_DIMENSIONS).toHaveLength(8);
    expect(FTI_DIMENSIONS.reduce((a, d) => a + d.weight, 0)).toBe(100);
  });
  it("empty resume scores 0, full impact evidence scores 100", () => {
    expect(futureTalentIndex({ competencies: {} }).total).toBe(0);
    const all = Object.fromEntries(
      FTI_DIMENSIONS.flatMap((d) => d.comps).map((id) => [
        id,
        { proficiency: 5, level: 4 as const, quote: "x", source: "" },
      ]),
    );
    expect(futureTalentIndex({ competencies: all }).total).toBe(100);
  });
});

import { LEVELS, LEVEL_WEIGHTS, inferLevel } from "./scoring";
describe("Seniority levels", () => {
  it("each level's weights sum to 100", () => {
    for (const l of LEVELS)
      expect(Object.values(LEVEL_WEIGHTS[l]).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("title wins over years", () => {
    expect(inferLevel(4, "Head of Design")).toBe("Head / Director of Design");
    expect(inferLevel(15, "Design Manager")).toBe("Design Manager / Lead");
    expect(inferLevel(3, "Principal Designer")).toBe("Staff / Principal Designer");
  });
  it("falls back to years", () => {
    expect(inferLevel(4, "Product Designer")).toBe("Senior Product Designer");
    expect(inferLevel(8, "Product Designer")).toBe("Staff / Principal Designer");
    expect(inferLevel(13, "")).toBe("Head / Director of Design");
  });
});

import { dimensionEvidenceScore } from "./scoring";
import { ARCHETYPES, applyEmphasis, baseWeights } from "./weights";
describe("Rubric weighting", () => {
  it("one strong competency no longer zeroes a dimension", () => {
    expect(dimensionEvidenceScore([80, 0, 0])).toBe(64);
    expect(dimensionEvidenceScore([])).toBe(0);
  });
  it("every archetype covers 8 dimensions and sums to 100", () => {
    for (const a of ARCHETYPES) {
      expect(Object.keys(a.weights)).toHaveLength(8);
      expect(Object.values(a.weights).reduce((x, y) => x + y, 0)).toBe(100);
    }
  });
  it("High emphasis doubles before rescaling and still sums to 100", () => {
    const w = applyEmphasis(baseWeights("level", "Senior Product Designer"), { research: "high" });
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100);
    expect(w["research"]).toBe(26); // 30 / 115
    expect(applyEmphasis(baseWeights("leader", "Senior Product Designer"), {})["leadership"]).toBe(35);
  });
  it("custom weights change the total deterministically", () => {
    const c = { competencies: { growth: { proficiency: 5, level: 4 as const, quote: "x", source: "" } } };
    const lead = futureTalentIndex(c, undefined, baseWeights("leader", "Senior Product Designer")).total;
    const res = futureTalentIndex(c, undefined, baseWeights("research", "Senior Product Designer")).total;
    expect(lead).toBeGreaterThan(res);
    expect(futureTalentIndex(c, undefined, baseWeights("leader", "Senior Product Designer")).total).toBe(lead);
  });
});
