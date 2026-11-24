import { describe, expect, it } from "vitest";
import { isGrounded, normalizeExtraction } from "./evidence";
import { resumeTips } from "./tips";
import { SEED_CANDIDATES, SEED_JOBS } from "./seed";

const resume =
  "Jane Doe. Led redesign of checkout, increasing conversion by 12% in 2024. Built prototypes in Figma.";
const base = {
  name: "Jane",
  role: "Designer",
  years: 5,
  domain: "Retail",
  requirements: [],
  mandatory: [],
};

describe("evidence grounding", () => {
  it("accepts quotes that appear in the resume", () => {
    expect(isGrounded("increasing conversion by 12%", resume)).toBe(true);
  });
  it("drops invented quotes", () => {
    const out = normalizeExtraction(
      {
        ...base,
        competencies: [
          {
            id: "outcomes",
            proficiency: 5,
            level: 4,
            transferable: false,
            quote: "Grew revenue by 300% at Google",
            source: "x",
          },
        ],
      },
      resume,
    );
    expect(out.competencies["outcomes"]).toBeUndefined();
  });
  it("clamps AI levels to 1-5", () => {
    const out = normalizeExtraction(
      {
        ...base,
        competencies: [
          {
            id: "outcomes",
            proficiency: 9,
            level: 0,
            transferable: false,
            quote: "increasing conversion by 12%",
            source: "Experience",
          },
        ],
      },
      resume,
    );
    expect(out.competencies["outcomes"]).toMatchObject({ proficiency: 5, level: 1 });
  });
});

describe("candidate tips", () => {
  it("puts missing must-haves first", () => {
    const job = SEED_JOBS[0]!;
    const c = { ...SEED_CANDIDATES[0]!, mandatory: {} };
    expect(resumeTips(job, c)[0]?.kind).toBe("requirement");
  });
});
