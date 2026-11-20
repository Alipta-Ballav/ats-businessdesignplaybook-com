import { describe, it, expect } from "vitest";
import { Packer } from "docx";
import { resumeToDocx } from "./export-docx";
describe("resumeToDocx", () => {
  it("produces a real .docx (zip) file", async () => {
    const buf = await Packer.toBuffer(resumeToDocx("Jane Doe\nEXPERIENCE\n- Led design system\nEducation\nBA Design"));
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
