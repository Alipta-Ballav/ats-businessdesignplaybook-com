import { describe, it, expect } from "vitest";
import { passScansLeft, canScan, canRescore, canApplyFix, canDownloadWord, hasPaidAccess, PASS_DAYS, PLANS } from "./plans";
describe("micro-paywall", () => {
  it("free users can apply any number of fixes", () => expect(canApplyFix(20, false)).toBe(true));
  it("official rescore needs the pass", () => { expect(canRescore(false)).toBe(false); expect(canRescore(true)).toBe(true); });
  it("pro is unlimited", () => expect(canApplyFix(50, true)).toBe(true));
  it("word download is paid", () => { expect(canDownloadWord(false)).toBe(false); expect(canDownloadWord(true)).toBe(true); });
  it("first scan free, then paid", () => { expect(canScan(0, false)).toBe(true); expect(canScan(1, false)).toBe(false); });
  it("paid users scan unlimited", () => expect(canScan(99, true)).toBe(true));
  it("Job Hunt Pass costs INR 99 / 9900 paise", () => { expect(PLANS[0]?.inr).toBe(99); expect((PLANS[0]?.inr ?? 0) * 100).toBe(9900); });
  it("pass lasts exactly 30 days from verified payment", () => {
    const start = Date.parse("2026-11-23T07:51:00Z");
    const payment = { plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: new Date(start).toISOString() };
    expect(PASS_DAYS).toBe(30);
    expect(hasPaidAccess(payment, start)).toBe(true);
    expect(hasPaidAccess(payment, start + 30 * 86400000 - 1)).toBe(true);
    expect(hasPaidAccess(payment, start + 30 * 86400000)).toBe(false);
  });
  it("an expired pass does not unlock another scan or Word export", () => {
    const active = hasPaidAccess({ plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: "2026-10-01T00:00:00Z" }, Date.parse("2026-11-23T00:00:00Z"));
    expect(canScan(1, active)).toBe(false); expect(canDownloadWord(active)).toBe(false);
  });
  it("pending, malformed and future payments never grant access", () => {
    const now = Date.parse("2026-11-23T00:00:00Z");
    for (const payment of [
      { plan: "job_hunt_30", amount: 9900, status: "pending", paid_at: "2026-11-23T00:00:00Z" },
      { plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: null },
      { plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: "invalid" },
      { plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: "2026-11-24T00:00:00Z" },
      { plan: "job_hunt_30", amount: 4900, status: "completed", paid_at: "2026-11-23T00:00:00Z" },
    ]) expect(hasPaidAccess(payment, now)).toBe(false);
  });
  it("existing completed INR 49 lifetime purchases retain access", () => expect(hasPaidAccess({ plan: "single", amount: 4900, status: "completed", paid_at: "2026-01-01T00:00:00Z" }, Date.parse("2027-01-01T00:00:00Z"))).toBe(true));
  it("a newly purchased pass restores access after the previous one expires", () => {
    const now = Date.parse("2026-11-23T00:00:00Z");
    expect([
      { plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: "2026-10-01T00:00:00Z" },
      { plan: "job_hunt_30", amount: 9900, status: "completed", paid_at: "2026-11-23T00:00:00Z" },
    ].some(p => hasPaidAccess(p, now))).toBe(true);
  });
});

describe("pass scan cap", () => {
  it("a pass includes 5 scans", () => { expect(passScansLeft(0)).toBe(5); expect(passScansLeft(4)).toBe(1); expect(passScansLeft(5)).toBe(0); expect(passScansLeft(9)).toBe(0); });
  it("renewing while a pass is active adds 5 more scans", () => { expect(passScansLeft(5, 2)).toBe(5); expect(passScansLeft(7, 2)).toBe(3); expect(passScansLeft(10, 2)).toBe(0); });
});
