import { describe, it, expect } from "vitest";
import { canCreateVariant, hasPowerAccess } from "./plans";
const paid = "2026-11-01T00:00:00Z";
const t = Date.parse(paid) + 864e5;
describe("Multi-resume workspace gating", () => {
  it("lets everyone save one master resume", () => expect(canCreateVariant(false, 0)).toBe(true));
  it("blocks a second resume without Power Searcher", () => expect(canCreateVariant(false, 1)).toBe(false));
  it("allows many variants with Power Searcher", () => expect(canCreateVariant(true, 7)).toBe(true));
  it("does not treat a ₹99 Job Hunt Pass as Power access", () =>
    expect(hasPowerAccess([{ plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: paid }], t)).toBe(false));
  it("grants access with an active ₹299 pass", () =>
    expect(hasPowerAccess([{ plan: "power_60", amount: 29900, status: "completed", paid_at: paid }], t)).toBe(true));
});
