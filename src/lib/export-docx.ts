import { AlignmentType, BorderStyle, Document, LevelFormat, Packer, Paragraph, TextRun } from "docx";

export const BULLET = /^\s*([-•*▪●–]|\d+[.)])\s+/;
export const isHeading = (l: string) => {
  const t = l.trim();
  if (!t || t.length > 40 || BULLET.test(t) || /[.,;]$/.test(t)) return false;
  return t === t.toUpperCase() && /[A-Z]/.test(t) || /^(summary|profile|experience|work experience|education|skills|projects|certifications|awards|additional evidence|publications|leadership|tools)$/i.test(t);
};

/** Turns plain resume text into an ATS-safe single-column Word document: name, section rules, real bullets. */
export function resumeToDocx(text: string): Document {
  const lines = text.replace(/\r/g, "").split("\n");
  const first = lines.findIndex((l) => l.trim());
  const kids: Paragraph[] = [];
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (!l) return;
    if (i === first) { kids.push(new Paragraph({ alignment: AlignmentType.LEFT, spacing: { after: 60 }, children: [new TextRun({ text: l, bold: true, size: 36 })] })); return; }
    if (isHeading(l)) { kids.push(new Paragraph({ spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F2A44", space: 2 } }, children: [new TextRun({ text: l.toUpperCase(), bold: true, size: 22, color: "1F2A44" })] })); return; }
    if (BULLET.test(l)) { kids.push(new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 40 }, children: [new TextRun(l.replace(BULLET, ""))] })); return; }
    kids.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun(l)] }));
  });
  return new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 } } }, children: kids }],
  });
}

export async function downloadResumeDocx(text: string, filename = "resume-revised.docx") {
  const blob = await Packer.toBlob(resumeToDocx(text));
  const url = URL.createObjectURL(blob); const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
