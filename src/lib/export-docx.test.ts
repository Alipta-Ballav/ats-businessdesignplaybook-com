import { describe, it, expect } from "vitest";
import { Packer } from "docx";
import { resumeToDocx } from "./export-docx";
describe("resumeToDocx", () => {
  it("produces a real .docx (zip) file", async () => {
    const buf = await Packer.toBuffer(resumeToDocx("Jane Doe\nEXPERIENCE\n- Led design system\nEducation\nBA Design"));
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});

import { inlineRuns as ir } from "./export-docx";
import { test as t2, expect as e2 } from "vitest";
t2("keeps bold and italic segments", () => {
  e2(ir("Led **checkout** for *Acme*")).toEqual([{ text: "Led " }, { text: "checkout", bold: true }, { text: " for " }, { text: "Acme", italic: true }]);
});
