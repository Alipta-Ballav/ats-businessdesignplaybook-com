import { describe, expect, it } from "vitest";
import { applySuggestion, ADDED_HEADING } from "./fixer";

describe("applySuggestion", () => {
  it("replaces the original line with the revised bullet", () => {
    expect(applySuggestion("A\nLed design work.\nB", { kind: "rewrite", original: "Led design work." }, "Led redesign; cut churn 10%.")).toBe("A\nLed redesign; cut churn 10%.\nB");
  });
  it("appends new evidence under one shared section", () => {
    const once = applySuggestion("Resume", { kind: "add" }, "Ran 12 usability tests");
    const twice = applySuggestion(once, { kind: "add" }, "Shipped tokens");
    expect(twice).toBe(`Resume\n\n${ADDED_HEADING}\n- Ran 12 usability tests\n- Shipped tokens\n`);
  });
  it("ignores empty text", () => {
    expect(applySuggestion("Resume", { kind: "add" }, "  ")).toBe("Resume");
  });
});

import { describe as d2, it as i2, expect as e2 } from "vitest";
import { BUSINESS_PLAYBOOK } from "./fixer";
d2("business playbook", () => { i2("has 3 formulas", () => { e2(BUSINESS_PLAYBOOK).toHaveLength(3); }); });
