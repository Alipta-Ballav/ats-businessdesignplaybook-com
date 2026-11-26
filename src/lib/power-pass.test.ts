import { describe, it, expect } from "vitest";
import { hasPaidAccess, passScansLeft, planTerms } from "./plans";
const paid = "2026-11-01T00:00:00Z";
const t = Date.parse(paid);
describe("Power Searcher Pass", () => {
  it("grants 20 scans for 60 days", () => expect(planTerms("power_60")).toEqual({ days: 60, scans: 20 }));
  it("is active on day 59 and expired on day 61", () => {
    const p = { plan: "power_60", amount: 29900, status: "completed", paid_at: paid };
    expect(hasPaidAccess(p, t + 59 * 864e5)).toBe(true);
    expect(hasPaidAccess(p, t + 61 * 864e5)).toBe(false);
  });
  it("rejects a wrong amount", () =>
    expect(hasPaidAccess({ plan: "power_60", amount: 9900, status: "completed", paid_at: paid }, t + 1)).toBe(false));
  it("stacks with a job hunt pass to 25 scans", () =>
    expect(passScansLeft(0, ["power_60", "job_hunt_30"])).toBe(25));
});
