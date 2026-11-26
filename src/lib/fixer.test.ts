import { describe, expect, it } from "vitest";
import { applySuggestion, ADDED_HEADING } from "./fixer";

describe("applySuggestion", () => {
  it("replaces the original line with the revised bullet", () => {
    expect(
      applySuggestion(
        "A\nLed design work.\nB",
        { kind: "rewrite", original: "Led design work." },
        "Led redesign; cut churn 10%.",
      ),
    ).toBe("A\nLed redesign; cut churn 10%.\nB");
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
d2("business playbook", () => {
  i2("has 3 formulas", () => {
    e2(BUSINESS_PLAYBOOK).toHaveLength(3);
  });
});

describe("applySuggestion keeps bullet formatting", () => {
  it("preserves the bullet marker and replaces the whole line", async () => {
    const { applySuggestion } = await import("./fixer");
    const r = "Work\n• Led checkout redesign. Shipped it fast.\n• Other";
    const out = applySuggestion(
      r,
      { kind: "rewrite", original: "Led checkout redesign. Shipped it fast." },
      "- Redesigned checkout into 2 steps",
    );
    expect(out).toBe("Work\n• Redesigned checkout into 2 steps\n• Other");
  });
  it("finds whole bullets, not sentence fragments", async () => {
    const { inspectBullets } = await import("./diagnostics");
    const f = inspectBullets(
      "• Spearheaded the redesign of the onboarding flow. Worked with engineers.",
    );
    expect(f[0]?.original).toBe(
      "Spearheaded the redesign of the onboarding flow. Worked with engineers.",
    );
  });
});

import { buildQueue } from "./fixer";
import { SEED_CANDIDATES, SEED_JOBS } from "./seed";
describe("priority queue", () => {
  const job = SEED_JOBS[0]!;
  const q = buildQueue(job, { ...SEED_CANDIDATES[0]!, mandatory: {} } as never, "- Worked on designs.\n- Helped the team.");
  const rank = { critical: 0, impact: 1, polish: 2 } as const;
  it("puts critical job must-haves before impact and polish items", () => {
    const order = q.map((s) => rank[s.tier!]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("marks missing job requirements as critical", () => {
    if (job.mandatory.length) expect(q[0]?.tier).toBe("critical");
  });
});
