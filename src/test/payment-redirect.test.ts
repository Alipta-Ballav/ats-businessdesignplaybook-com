import { describe, expect, it } from "vitest";

import { shouldLandOnCandidate } from "@/components/PaywallModal";

// A confirmed payment must land the buyer on the resume checker, except when
// they are already inside it — leaving mid-edit would discard their unsaved draft.
describe("post-payment landing", () => {
  it("sends a buyer who paid from the pass page to the resume checker", () => {
    expect(shouldLandOnCandidate("/pass")).toBe(true);
    expect(shouldLandOnCandidate("/check")).toBe(true);
    expect(shouldLandOnCandidate("/promotion")).toBe(true);
    expect(shouldLandOnCandidate("/")).toBe(true);
  });

  it("keeps a buyer already inside the resume checker or a saved scan", () => {
    expect(shouldLandOnCandidate("/candidate")).toBe(false);
    expect(shouldLandOnCandidate("/candidate/scans/7f2c")).toBe(false);
  });
});
