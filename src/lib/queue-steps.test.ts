import { describe, expect, it } from "vitest";
import { numberSteps } from "./queue-steps";

describe("queue step numbering", () => {
  const queue = [
    { id: "a", tier: "critical" },
    { id: "b", tier: "impact" },
    { id: "c", tier: "polish" },
    { id: "d", tier: "impact" },
    { id: "e", tier: "impact" },
  ];
  it("starts each tab at 1 instead of using global positions", () => {
    for (const tier of ["critical", "impact", "polish"]) {
      expect(numberSteps(queue.filter((item) => item.tier === tier))[0]?.step).toBe(1);
    }
    expect(numberSteps(queue.filter((item) => item.tier === "impact")).map(({ step }) => step)).toEqual([1, 2, 3]);
  });
  it("leaves no gaps after hiding or skipping items and expanding the queue", () => {
    const remaining = queue.filter((item) => item.tier === "impact" && item.id !== "d");
    expect(numberSteps(remaining.slice(0, 1)).map(({ step }) => step)).toEqual([1]);
    expect(numberSteps(remaining).map(({ step }) => step)).toEqual([1, 2]);
  });
  it("numbers completed steps chronologically even if the source order differs", () => {
    expect(numberSteps([queue[4], queue[1], queue[0]]).map(({ step }) => step)).toEqual([1, 2, 3]);
    expect(numberSteps([])).toEqual([]);
  });
});