import { describe, expect, it } from "vitest";
import { htmlToResumeText, styleFromWordXml } from "./resume-style";

const r = (t: string, extra = "") => `<w:r><w:rPr><w:rFonts w:ascii="Aptos"/>${extra}<w:sz w:val="16"/></w:rPr><w:t>${t}</w:t></w:r>`;
const doc = [
  `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:t>JANE DOE</w:t></w:r></w:p>`,
  `<w:p>${r("Product Designer", "<w:b/>")}</w:p>`,
  `<w:p>${r("Tools: ", "<w:b/>")}${r("Figma")}</w:p>`,
  `<w:p>${r("Research: ", "<w:b/>")}${r("Interviews")}</w:p>`,
  `<w:p>${r("Lead Designer", "<w:b/>")}${r(" | Acme | 2020")}</w:p>`,
  `<w:p>${r("Shipped things")}</w:p>`,
].join("");

describe("uploaded Word style", () => {
  it("keeps the upload's font, sizes, centred header and bold lead-ins", () => {
    const s = styleFromWordXml(doc);
    expect(s).toMatchObject({ font: "Aptos", bodySize: 16, nameSize: 40, centerHeader: true, titleBold: true, boldLabels: true, roleTitleBold: true });
  });
  it("keeps Word list items as bullets", () => {
    expect(htmlToResumeText("<h1>EXPERIENCE</h1><ul><li>Led &amp; shipped</li></ul><p>BA</p>")).toBe("EXPERIENCE\n- Led & shipped\nBA");
  });
});
