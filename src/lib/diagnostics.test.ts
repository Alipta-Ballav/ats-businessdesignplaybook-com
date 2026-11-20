import { describe, expect, it } from "vitest";
import { buildEvidenceBullet, decodeJob, inspectBullets } from "./diagnostics";

describe("evidence-safe diagnostics", () => {
  it("does not assign employer maturity without a matching quote", () => {
    expect(decodeJob("Designer", "We are looking for a designer.").level).toBeNull();
  });
  it("links a maturity hypothesis to the exact description", () => {
    const description = "Own design strategy across our design organization.";
    const result = decodeJob("Director of Design", description);
    expect(result.level).toBe(5);
    expect(result.signals[0]?.quote).toBe(description);
  });
  it("flags senior individual contributor titles with explicit team management scope", () => {
    expect(decodeJob("Senior Product Designer", "Manage a team of designers.").scopeWarnings).toEqual(["Manage a team of designers."]);
    expect(decodeJob("Design Manager", "Manage a team of designers.").scopeWarnings).toEqual([]);
  });
  it("identifies generic claims without labelling them AI-written", () => {
    expect(inspectBullets("Spearheaded innovative solutions for our product design team.")[0]?.issues).toContain("Generic wording obscures the work");
  });
  it("never invents achievements when details are empty", () => {
    expect(buildEvidenceBullet("Led our design system", { action: "", constraint: "", outcome: "" })).toBe("Led our design system.");
  });
  it("only adds the facts supplied by the user", () => {
    expect(buildEvidenceBullet("Led design", { action: "Built tokens", constraint: "Resolved legacy constraints", outcome: "Adopted by 4 squads" })).toBe("Built tokens; Resolved legacy constraints; Adopted by 4 squads.");
  });
});