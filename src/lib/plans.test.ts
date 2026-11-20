import { describe, it, expect } from "vitest";
import { canScan, canApplyFix, canDownloadWord, PLANS } from "./plans";
describe("micro-paywall", () => {
  it("free users get 2 fixes", () => { expect(canApplyFix(1, false)).toBe(true); expect(canApplyFix(2, false)).toBe(false); });
  it("pro is unlimited", () => expect(canApplyFix(50, true)).toBe(true));
  it("word download is paid", () => { expect(canDownloadWord(false)).toBe(false); expect(canDownloadWord(true)).toBe(true); });
  it("first scan free, then paid", () => { expect(canScan(0, false)).toBe(true); expect(canScan(1, false)).toBe(false); });
  it("paid users scan unlimited", () => expect(canScan(99, true)).toBe(true));
  it("unlock costs 49", () => expect(PLANS[0]?.inr).toBe(49));
});
