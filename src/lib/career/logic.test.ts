import { describe, expect, it } from "vitest";
import { BULLETS, filterBullets } from "./content";
import {
  comparisonKey,
  nextReminder,
  promotionAudit,
  reminderCalendar,
  teardown,
  versionScore,
  weeklyIndex,
} from "./logic";
import type { Candidate, Job } from "@/lib/scoring";
import { headlineScore } from "@/lib/fixer";
const c: Candidate = {
  id: "c",
  jobId: "j",
  name: "Designer",
  role: "Senior Designer",
  years: 5,
  domain: "",
  mandatory: {},
  competencies: {},
};
const j: Job = {
  id: "j",
  title: "",
  func: "",
  seniority: "",
  description: "",
  flexibility: 50,
  preset: "",
  mandatory: [],
  preferred: [],
  weights: { JR: 30, FR: 40, HP: 30 },
  createdAt: "",
};
describe("career rules", () => {
  it("provides more than 100 distinct templates across all eight dimensions", () => {
    expect(BULLETS.length).toBe(128);
    expect(new Set(BULLETS.map((b) => b.id)).size).toBe(128);
    expect(new Set(BULLETS.map((b) => b.dimension)).size).toBe(8);
  });
  it("filters saved templates", () => {
    expect(filterBullets("", "", "", true, ["craft-0-0"]).map((b) => b.id)).toEqual(["craft-0-0"]);
  });
  it("uses the published Director weights, not an AI readiness number", () => {
    const a = promotionAudit(c, "Head / Director of Design");
    expect(a.total).toBe(0);
    expect(a.priorities[0]?.id).toBe("leadership");
    expect(a.priorities[0]?.weight).toBe(30);
  });
  it("never attaches an official score to an unrescored draft", () => {
    expect(
      versionScore({
        candidate: c,
        job: j,
        level: "Senior Product Designer",
        resume_text: "new",
        scored_text: "old",
      }),
    ).toBeNull();
  });
  it("preserves the target rubric when a saved Director version is rescored", () => {
    const candidate: Candidate = {
      ...c,
      competencies: {
        social: {
          proficiency: 5,
          level: 4,
          quote: "Led cross-functional design",
          source: "Resume",
        },
        growth: { proficiency: 5, level: 4, quote: "Mentored the design team", source: "Resume" },
      },
    };
    expect(headlineScore(j, candidate, "Head / Director of Design")).toBe(30);
    expect(
      versionScore({
        candidate,
        job: j,
        level: "Head / Director of Design",
        resume_text: "same",
        scored_text: "same",
      }),
    ).toBe(30);
    expect(headlineScore(j, candidate, "Senior Product Designer")).toBe(5);
  });
  it("separates scores from different roles and target levels", () => {
    expect(comparisonKey({ job: j, level: "Senior Product Designer" })).not.toBe(
      comparisonKey({ job: j, level: "Head / Director of Design" }),
    );
    expect(comparisonKey({ job: j, level: "Senior Product Designer" })).not.toBe(
      comparisonKey({
        job: { ...j, description: "Different role" },
        level: "Senior Product Designer",
      }),
    );
  });
  it("sets the review after exactly 90 days with recurring reminders", () => {
    const date = new Date("2026-11-23T09:00:00Z");
    expect(nextReminder(date).toISOString()).toBe("2027-02-21T09:00:00.000Z");
    expect(reminderCalendar(date, "https://example.com")).toContain("RRULE:FREQ=DAILY;INTERVAL=90");
  });
  it("quotes only the supplied role description", () => {
    const d = teardown("Build design systems. Partner with engineering.");
    expect(d.find((x) => x.id === "systems")?.quote).toBe("Build design systems.");
    expect(d.find((x) => x.id === "research")?.quote).toBe("");
  });
  it("keeps the weekly feature stable within a week", () => {
    expect(weeklyIndex(new Date("2026-11-23"), 10)).toBe(weeklyIndex(new Date("2026-11-24"), 10));
  });
});
