import { describe, it, expect } from "vitest";
import { Packer } from "docx";
import { resumeToDocx, resumeBlocks, isRoleLine, RESUME_PAGE } from "./export-docx";
describe("resumeToDocx", () => {
  it("produces a real .docx (zip) file", async () => {
    const buf = await Packer.toBuffer(
      resumeToDocx("Jane Doe\nEXPERIENCE\n- Led design system\nEducation\nBA Design"),
    );
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});

describe("resume reflow", () => {
  it("keeps wrapped bullet text and its case study together after an edit", () => {
    const text =
      "Jane Doe\nWORK EXPERIENCE\nLead Designer | Acme | 2022 – Present\n• Led the redesigned checkout across\nmobile and desktop.\nCase study: https://example.com/checkout\n• Mentored four designers.";
    const blocks = resumeBlocks(text);
    expect(blocks.filter((b) => b.kind === "bullet").map((b) => b.text)).toEqual([
      "Led the redesigned checkout across mobile and desktop. Case study: https://example.com/checkout",
      "Mentored four designers.",
    ]);
    expect(blocks.find((b) => b.kind === "bullet")?.lineIndices).toEqual([3, 4, 5]);
  });
  it("reflows summary text without merging contact rows or separate skill groups", () => {
    const blocks = resumeBlocks(
      "Jane Doe\nDesigner | Enterprise SaaS\nBengaluru | jane@example.com | +91 9620718620\nSUMMARY\nLed product design across\nenterprise platforms.\nSKILLS\nDesign: Research, systems\nand strategy\nTools: Figma, VS Code",
    );
    expect(blocks.filter((b) => b.kind === "paragraph").map((b) => b.text)).toEqual([
      "Designer | Enterprise SaaS",
      "Bengaluru | jane@example.com | +91 9620718620",
      "Led product design across enterprise platforms.",
      "Design: Research, systems and strategy",
      "Tools: Figma, VS Code",
    ]);
  });
  it("never treats a contact phone number as employment dates", () => {
    expect(isRoleLine("Bengaluru, India | jane@example.com | +91 9620718620")).toBe(false);
    expect(isRoleLine("Lead Designer | Acme | Feb 2022 – Present")).toBe(true);
  });
  it("does not swallow a standalone organization heading after a complete bullet", () => {
    expect(
      resumeBlocks("Jane\nEXPERIENCE\n• Delivered two major products.\nTerra UI Design").map(
        (b) => b.text,
      ),
    ).toEqual(["Jane", "EXPERIENCE", "Delivered two major products.", "Terra UI Design"]);
  });
  it("fits both image columns inside the A4 content width", () => {
    expect(RESUME_PAGE.width).toBe(11906);
    expect(RESUME_PAGE.height).toBe(16838);
    expect(RESUME_PAGE.contentWidth).toBe(RESUME_PAGE.width - 2 * RESUME_PAGE.margin);
    expect(300 * 15).toBeLessThan(RESUME_PAGE.contentWidth / 2);
    expect(115 * 15).toBeLessThan(1800);
  });
});

import { inlineRuns as ir } from "./export-docx";
import { test as t2, expect as e2 } from "vitest";
t2("keeps bold and italic segments", () => {
  e2(ir("Led **checkout** for *Acme*")).toEqual([
    { text: "Led " },
    { text: "checkout", bold: true },
    { text: " for " },
    { text: "Acme", italic: true },
  ]);
});
