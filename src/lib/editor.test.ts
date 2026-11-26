import { describe, expect, it } from "vitest";
import { diffLines, fixesUsed, newFacts, proposalFlags } from "./editor";
import { canApplyFix } from "./plans";

describe("newFacts", () => {
  it("rejects a number not in the user's facts", () => {
    expect(newFacts("Cut churn 25%", ["Led redesign", "cut churn 10%"])).toContain("25");
  });
  it("rejects a company name not given", () => {
    expect(newFacts("Led redesign at Google", ["Led redesign"])).toContain("Google");
  });
  it("accepts a draft built from given facts", () => {
    expect(
      newFacts("Led checkout redesign, cutting churn 10%", [
        "Led redesign of checkout",
        "churn 10%",
      ]),
    ).toEqual([]);
  });
});
describe("proposal grounding", () => {
  it("allows user-written evidence with new numbers and company names", () => {
    expect(proposalFlags("Led research at Google, improving conversion 30%", [], "manual")).toEqual([]);
  });
  it("still blocks unsupported facts in AI drafts", () => {
    expect(proposalFlags("Led research at Google, improving conversion 30%", ["Led research"], "ai")).toEqual(["30", "Google"]);
  });
  it("allows AI to rephrase facts supplied in a manual draft", () => {
    expect(proposalFlags("Improved conversion 30% at Google through research", ["Led research at Google, improving conversion 30%"], "ai")).toEqual([]);
  });
});
describe("diffLines", () => {
  it("marks replaced lines", () => {
    expect(diffLines("A\nOld", "A\nNew").map((d) => d.changed)).toEqual([false, true]);
  });
});
describe("free fixes", () => {
  it("counts AI fixes toward the 2 free fixes", () => {
    expect(canApplyFix(fixesUsed([{ source: "manual" }, { source: "ai" }]), false)).toBe(true);
  });
});
describe("newFacts design terms", () => {
  it("does not flag UX, iOS or Q3", () => {
    expect(newFacts("Led UX redesign for iOS in Q3", ["Led redesign"])).toEqual([]);
  });
});

import { revertFix } from "./editor";
import { applySuggestion } from "./fixer";
describe("revertFix", () => {
  it("keeps a generated section while another added bullet remains", () => {
    const before = "Alex\nExperience\n- Built checkout";
    const after = applySuggestion(before, { kind: "add" }, "Ran research");
    const later = applySuggestion(after, { kind: "add" }, "Validated designs");
    const undone = revertFix(later, { added: "Ran research", removed: "", edit: { before, after, cleanupHeading: true } });
    expect(undone).toBe("Alex\nExperience\n- Built checkout\n\nAdditional evidence\n- Validated designs\n");
    expect(revertFix(undone, { added: "Validated designs", removed: "", edit: { before: after, after: later, cleanupHeading: true } })).toBe(before);
  });
  it("restores the exact original including whitespace after undoing a generated section", () => {
    const before = "Alex\nExperience\n- Built checkout\n";
    const after = applySuggestion(before, { kind: "add" }, "Ran research");
    expect(revertFix(after, { added: "Ran research", removed: "", edit: { before, after } })).toBe(before);
  });
  it("undoes targeted insertion without removing an identical bullet elsewhere", () => {
    const before = "Alex\nExperience\n- Ran research\n- Built checkout\nSkills";
    const after = applySuggestion(before, { kind: "add" }, "Ran research", 4);
    expect(revertFix(after + "\nFigma", { added: "Ran research", removed: "", edit: { before, after } })).toBe(before + "\nFigma");
  });
  it("undoes an earlier insertion while preserving later unrelated changes", () => {
    const before = "Alex\nExperience\n- Built checkout\nSkills\nFigma";
    const after = applySuggestion(before, { kind: "add" }, "Ran research", 3);
    expect(revertFix(after.replace("Figma", "Figma and Sketch"), { added: "Ran research", removed: "", edit: { before, after } })).toBe(before.replace("Figma", "Figma and Sketch"));
  });
  it("cleans an empty generated heading for legacy fixes", () => {
    expect(revertFix("Alex\n\nAdditional evidence\n- Ran research\n", { added: "Ran research", removed: "" })).toBe("Alex");
  });
  it("undoes an earlier rewrite without touching a later one", () => {
    const d = "A new\nB new";
    expect(revertFix(d, { added: "A new", removed: "A old" })).toBe("A old\nB new");
  });
  it("removes an added bullet", () => {
    expect(revertFix("x\n- added line\n- other", { added: "added line", removed: "" })).toBe(
      "x\n- other",
    );
  });
});
