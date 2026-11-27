import { describe, expect, it } from "vitest";
import { passSummary } from "./plans";
const t = Date.parse("2026-11-01T00:00:00Z");
const at = new Date(t).toISOString();
describe("passSummary", () => {
  it("shows Power Searcher when a ₹299 pass is active", () =>
    expect(passSummary([{ plan: "power_60", amount: 29900, status: "completed", paid_at: at }], t + 864e5).tier).toBe("power"));
  it("shows Job Hunt with 30-day expiry", () => {
    const s = passSummary([{ plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: at }], t + 10 * 864e5);
    expect(s.tier).toBe("job_hunt");
    expect(s.daysLeft).toBe(20);
  });
  it("marks a pass expired after 30 days", () =>
    expect(passSummary([{ plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: at }], t + 31 * 864e5).tier).toBe("expired"));
  it("is free with no payments", () => expect(passSummary([]).tier).toBe("none"));
});
