import { describe, expect, it } from "vitest";
import { paraText, patchDocumentXml } from "./docx-patch";

const p = (runs: string, numbered = false) =>
  `<w:p><w:pPr>${numbered ? "<w:numPr><w:numId w:val=\"1\"/></w:numPr>" : ""}<w:jc w:val="center"/></w:pPr>${runs}</w:p>`;
const r = (t: string, bold = false) => `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:rFonts w:ascii="Aptos"/></w:rPr><w:t>${t}</w:t></w:r>`;
const xml = `<w:body>${p(r("Jane Doe"))}${p(r("AI and Product:", true) + r(" Built a framework"), true)}${p(r("Led a team"), true)}<w:sectPr/></w:body>`;
const text = "Jane Doe\n- AI and Product: Built a framework\n- Led a team";

describe("patchDocumentXml", () => {
  it("rewrites a line in place and keeps its bold label and formatting", () => {
    const out = patchDocumentXml(xml, text, text.replace("Built a framework", "Built a framework used by 40 designers"))!;
    expect(out).toContain("<w:b/>");
    expect(out).toContain("<w:numPr>");
    const paras = out.match(/<w:p>[\s\S]*?<\/w:p>/g)!;
    expect(paraText(paras[1]!)).toBe("AI and Product: Built a framework used by 40 designers");
    expect(out).toContain("<w:sectPr/>");
  });
  it("inserts a new bullet copying the neighbouring bullet's formatting", () => {
    const out = patchDocumentXml(xml, text, `${text}\n- Shipped a design system`)!;
    const paras = out.match(/<w:p>[\s\S]*?<\/w:p>/g)!;
    expect(paras).toHaveLength(4);
    expect(paraText(paras[3]!)).toBe("Shipped a design system");
    expect(paras[3]).toContain("<w:numPr>");
  });
  it("leaves an unchanged document identical", () => {
    expect(patchDocumentXml(xml, text, text)).toBe(xml);
  });
  it("gives up when the text does not match the file", () => {
    expect(patchDocumentXml(xml, "Someone else", "Someone else")).toBeNull();
  });
});
