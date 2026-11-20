import { describe, it, expect } from "vitest";
import { canApplyFix, canDownloadWord, PLANS } from "./plans";
describe("micro-paywall", () => {
  it("free users get 2 fixes", () => { expect(canApplyFix(1, false)).toBe(true); expect(canApplyFix(2, false)).toBe(false); });
  it("pro is unlimited", () => expect(canApplyFix(50, true)).toBe(true));
  it("word download is paid", () => { expect(canDownloadWord(false)).toBe(false); expect(canDownloadWord(true)).toBe(true); });
  it("prices are ₹99 and ₹199", () => expect(PLANS.map((p) => p.inr)).toEqual([99, 199]));
});
