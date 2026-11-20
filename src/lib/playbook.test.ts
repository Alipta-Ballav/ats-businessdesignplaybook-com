import { describe, it, expect } from "vitest";
import { playbookAudit } from "./playbook";
describe("business playbook audit", () => {
  it("counts a formula only when quantified", () => {
    const a = playbookAudit("- Redesigned checkout, lifting conversion by 12%\n- Built design system used by sales team for enterprise demos");
    expect(a.formulas.find((f) => f.id === "growth")?.quantified).toBe(true);
    expect(a.formulas.find((f) => f.id === "enterprise")?.quantified).toBe(false);
    expect(a.covered).toBe(1);
  });
  it("flags unquantified vanity lines", () => {
    expect(playbookAudit("- Created intuitive and seamless experiences for users").vanity).toHaveLength(1);
    expect(playbookAudit("- Improved engagement by 30% across onboarding").vanity).toHaveLength(0);
  });
});
