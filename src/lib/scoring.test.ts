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
    expect(evaluate({ ...job, flexibility: 100 }, tomas).status).toBe("Significant gaps identified");
  });
  it("essential requirements are never waived by flexibility", () => {
    const strictJob = { ...job, flexibility: 100, mandatory: [{ name: "Product design experience", essential: true }] };
    expect(evaluate(strictJob, tomas).mandatoryOk).toBe(false);
    expect(evaluate({ ...strictJob, mandatory: [{ name: "Product design experience", essential: false }] }, tomas).mandatoryOk).toBe(true);
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
    for (const p of [...Object.values(DESIGN_LEVELS), ...Object.values(SCREEN_LENSES)]) expect(p.weights.JR + p.weights.FR + p.weights.HP).toBe(100);
  });
  it("recruiter screen is the strictest lens", () => {
    expect(SCREEN_LENSES["Recruiter screen"]!.flexibility).toBeLessThan(SCREEN_LENSES["VP / Head of Design"]!.flexibility);
  });
});

import { ATS_SYSTEMS, atsFormatPenalty, formatRisks } from "./scoring";
describe("target ATS", () => {
  it("Workday is stricter than Greenhouse and Ashby", () => {
    expect(ATS_SYSTEMS["Workday"]!.flexibility).toBeLessThan(ATS_SYSTEMS["Greenhouse"]!.flexibility);
    expect(ATS_SYSTEMS["Workday"]!.flexibility).toBeLessThan(ATS_SYSTEMS["Ashby"]!.flexibility);
  });
  it("formatting risks cost more on Workday than on Ashby", () => {
    const bad = "Jane  Designer\tPortfolio\t\tLead";
    expect(formatRisks(bad).length).toBeGreaterThan(0);
    expect(atsFormatPenalty("Workday", bad)).toBeGreaterThan(atsFormatPenalty("Ashby", bad));
  });
});
