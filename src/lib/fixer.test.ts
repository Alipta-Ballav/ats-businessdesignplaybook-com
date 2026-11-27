import { describe, expect, it } from "vitest";
import { applySuggestion, ADDED_HEADING, insertionLocations } from "./fixer";

describe("applySuggestion", () => {
  it("inserts under the selected role without creating Additional evidence", () => {
    const resume = "Alex\nExperience\nDesigner | Acme | 2022 – Present\n• Built checkout\n\nDesigner | Beta | 2019 – 2022\n• Ran research\n\nSkills\nFigma";
    const location = insertionLocations(resume).find((l) => l.label === "Under Designer | Acme | 2022 – Present");
    if (!location) throw new Error("Missing role location");
    expect(applySuggestion(resume, { kind: "add" }, "Validated checkout", location.insertAt)).toBe("Alex\nExperience\nDesigner | Acme | 2022 – Present\n• Built checkout\n• Validated checkout\n\nDesigner | Beta | 2019 – 2022\n• Ran research\n\nSkills\nFigma");
  });
  it("inserts after a whole wrapped bullet, not inside its continuation", () => {
    const resume = "Alex\nExperience\n- Built checkout with\nengineering support\n- Ran research";
    const location = insertionLocations(resume).find((l) => l.id === "line:2");
    if (!location) throw new Error("Missing line location");
    expect(applySuggestion(resume, { kind: "add" }, "Validated checkout", location.insertAt)).toBe("Alex\nExperience\n- Built checkout with\nengineering support\n- Validated checkout\n- Ran research");
  });
  it("does not append a rewrite when its original line has been removed", () => {
    expect(applySuggestion("Alex\nSkills\nFigma", { kind: "rewrite", original: "Removed bullet" }, "Replacement")).toBe("Alex\nSkills\nFigma");
  });
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
  const job = SEED_JOBS[0];
  const candidate = SEED_CANDIDATES[0];
  if (!job || !candidate) throw new Error("Missing test fixtures");
  const q = buildQueue(job, { ...candidate, mandatory: {} }, "- Worked on designs.\n- Helped the team.");
  const rank = { critical: 0, impact: 1, polish: 2 } as const;
  it("puts critical job must-haves before impact and polish items", () => {
    const order = q.map((s) => rank[s.tier ?? "polish"]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it("marks missing job requirements as critical", () => {
    if (job.mandatory.length) expect(q[0]?.tier).toBe("critical");
  });
});

import { dimensionGaps } from "./fixer";
describe("dimension gaps reach the priority queue", () => {
  const job = { ...SEED_JOBS[0]!, mandatory: [], description: "" };
  const c = { ...SEED_CANDIDATES[0]!, mandatory: {}, competencies: {} };
  it("turns every 8-dimension score under 45 into a critical item", () => {
    const gaps = dimensionGaps(c, "Senior Product Designer");
    expect(gaps).toHaveLength(8);
    expect(gaps.every((g) => g.tier === "critical")).toBe(true);
    expect(buildQueue(job, c, "- Worked on designs.")[0]?.id.startsWith("g:")).toBe(true);
  });
  it("adds nothing for dimensions at or above the gap line", () => {
    const strong = Object.fromEntries(
      ["functional","domain","execution","relevance","outcomes","ai","systems","learning","flexibility","problem","creative","strategic","social","decision","growth"].map((id) => [id, { proficiency: 5, level: 4, transferable: false, quote: "q", source: "s" }]),
    );
    expect(dimensionGaps({ ...c, competencies: strong } as never, "Senior Product Designer")).toHaveLength(0);
  });
});
