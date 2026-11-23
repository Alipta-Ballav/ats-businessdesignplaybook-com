import { describe, expect, it } from "vitest";
import { diffLines, fixesUsed, newFacts } from "./editor";
import { canApplyFix } from "./plans";

describe("newFacts", () => {
  it("rejects a number not in the user's facts", () => {
    expect(newFacts("Cut churn 25%", ["Led redesign", "cut churn 10%"])).toContain("25");
  });
  it("rejects a company name not given", () => {
    expect(newFacts("Led redesign at Google", ["Led redesign"])).toContain("Google");
  });
  it("accepts a draft built from given facts", () => {
    expect(newFacts("Led checkout redesign, cutting churn 10%", ["Led redesign of checkout", "churn 10%"])).toEqual([]);
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
describe("revertFix", () => {
  it("undoes an earlier rewrite without touching a later one", () => {
    const d = "A new\nB new";
    expect(revertFix(d, { added: "A new", removed: "A old" })).toBe("A old\nB new");
  });
  it("removes an added bullet", () => {
    expect(revertFix("x\n- added line\n- other", { added: "added line", removed: "" })).toBe("x\n- other");
  });
});
