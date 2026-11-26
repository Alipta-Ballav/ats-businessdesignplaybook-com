import { RESUME_PAGE, inlineRuns, resumeBlocks } from "./export-docx";
import type { jsPDF } from "jspdf";

export const PDF_PAGE = {
  width: RESUME_PAGE.width / 20,
  height: RESUME_PAGE.height / 20,
  margin: RESUME_PAGE.margin / 20,
};

/** Selectable text; fixed A4 geometry; no screenshots or rasterized resume text. */
export function renderResumePdf(pdf: jsPDF, text: string) {
  const { width, height, margin } = PDF_PAGE;
  const bottom = height - margin;
  let y = margin;
  const newPage = () => { pdf.addPage(); y = margin; };
  const blocks = resumeBlocks(text);
  blocks.forEach((block, index) => {
    const bold = block.kind === "name" || block.kind === "heading" || block.kind === "role";
    const size = block.kind === "name" ? 18 : 11;
    const leading = size * 1.45;
    const before = block.kind === "heading" ? 12 : block.kind === "role" ? 6 : 0;
    const after = block.kind === "bullet" ? 2 : 4;
    const indent = block.kind === "bullet" ? 18 : 0;
    pdf.setFont("NotoSans", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const content = inlineRuns(block.text).map(run => run.text).join("");
    const lines = pdf.splitTextToSize(content, width - 2 * margin - indent) as string[];
    const keepNext = (block.kind === "heading" || block.kind === "role") && index < blocks.length - 1;
    const needed = before + lines.length * leading + after + (keepNext ? 32 : 0);
    if (y + needed > bottom && needed < bottom - margin) newPage();
    y += before;
    lines.forEach((line, lineIndex) => {
      if (y + leading > bottom) newPage();
      if (block.kind === "bullet" && lineIndex === 0) pdf.text("•", margin + 6, y + size);
      pdf.text(line, margin + indent, y + size);
      y += leading;
    });
    y += after;
  });
  return pdf;
}

export async function downloadResumePdf(text: string) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: [PDF_PAGE.width, PDF_PAGE.height], compress: true });
  await Promise.all((["Regular", "Bold"] as const).map(async weight => {
    const response = await fetch(`/fonts/NotoSans-${weight}.ttf`);
    if (!response.ok) throw new Error("Could not load the PDF font. Please try again.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    pdf.addFileToVFS(`${weight}.ttf`, btoa(binary));
    pdf.addFont(`${weight}.ttf`, "NotoSans", weight === "Bold" ? "bold" : "normal");
  }));
  pdf.setProperties({ title: "Revised resume", creator: "FutureTalent AI" });
  renderResumePdf(pdf, text).save("resume-revised.pdf");
}