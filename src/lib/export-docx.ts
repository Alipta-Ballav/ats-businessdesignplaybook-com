import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LevelFormat,
  Table,
  TableCell,
  TableRow,
  VerticalAlign,
  WidthType,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import {
  HEADSHOT_BOX,
  VISUAL_BOX,
  dataUrlBytes,
  fitBox,
  getResumeImages,
  type ResumeImage,
  type ResumeImages,
} from "@/lib/resume-images";

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const CONTENT_W = 10224; // page width minus margins, in twentieths of a point
const picture = (img: ResumeImage, maxW: number, maxH: number) => {
  const f = fitBox(img.w, img.h, maxW, maxH);
  return new ImageRun({ type: "png", data: dataUrlBytes(img.src), transformation: { width: f.w, height: f.h } });
};

export const BULLET = /^\s*([-•*▪●–]|\d+[.)])\s+/;
export const isHeading = (l: string) => {
  const t = l.trim();
  if (!t || t.length > 40 || BULLET.test(t) || /[.,;]$/.test(t)) return false;
  return (
    (t === t.toUpperCase() && /[A-Z]/.test(t)) ||
    /^(summary|profile|experience|work experience|education|skills|projects|certifications|awards|additional evidence|publications|leadership|tools)$/i.test(
      t,
    )
  );
};

/** Splits **bold** and *italic* markers into styled segments (shared by preview and Word export). */
export function inlineRuns(t: string): { text: string; bold?: boolean; italic?: boolean }[] {
  const out: { text: string; bold?: boolean; italic?: boolean }[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    if (m.index > last) out.push({ text: t.slice(last, m.index) });
    out.push(m[1] ? { text: m[1], bold: true } : { text: m[2] ?? "", italic: true });
    last = re.lastIndex;
  }
  if (last < t.length) out.push({ text: t.slice(last) });
  return out;
}
const runs = (t: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
  inlineRuns(t).map(
    (r) =>
      new TextRun({
        text: r.text,
        bold: !!(o.bold || r.bold),
        italics: !!r.italic,
        ...(o.size ? { size: o.size } : {}),
        ...(o.color ? { color: o.color } : {}),
      }),
  );
const plain = (t: string) =>
  inlineRuns(t)
    .map((r) => r.text)
    .join("");

/** A job-title / company / dates line, e.g. "Lead Designer | Acme | 2021 – Present". */
export const isRoleLine = (l: string) => {
  const t = l.trim();
  return (
    !BULLET.test(t) &&
    t.length <= 120 &&
    !/[.;]$/.test(t) &&
    /((19|20)\d{2}|present|current)/i.test(t) &&
    /[|–—·,-]/.test(t)
  );
};

/** Turns plain resume text into an ATS-safe single-column Word document: name, section rules, real bullets. */
export function resumeToDocx(text: string, images?: ResumeImages): Document {
  const lines = text.replace(/\r/g, "").split("\n");
  const first = lines.findIndex((l) => l.trim());
  const kids: Paragraph[] = [];
  let headerEnd = -1; // number of paragraphs before the first section heading
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (!l) return;
    if (i === first) {
      kids.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { after: 60 },
          children: runs(l, { bold: true, size: 36 }),
        }),
      );
      return;
    }
    if (isHeading(plain(l))) {
      if (headerEnd < 0) headerEnd = kids.length;
      kids.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F2A44", space: 2 } },
          children: [
            new TextRun({ text: plain(l).toUpperCase(), bold: true, size: 22, color: "1F2A44" }),
          ],
        }),
      );
      return;
    }
    if (isRoleLine(plain(l))) {
      kids.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 120, after: 40 },
          children: runs(l, { bold: true }),
        }),
      );
      return;
    }
    if (BULLET.test(l)) {
      kids.push(
        new Paragraph({
          numbering: { reference: "b", level: 0 },
          spacing: { after: 40 },
          children: runs(l.replace(BULLET, "")),
        }),
      );
      return;
    }
    kids.push(new Paragraph({ spacing: { after: 60 }, children: runs(l) }));
  });
  const on = images?.on !== false;
  const body: (Paragraph | Table)[] = [...kids];
  if (on && images?.headshot) {
    // Borderless fixed-width table: text left, photo right. Inline image, never floating, so nothing reflows.
    const n = headerEnd < 0 ? Math.min(1, kids.length) : headerEnd;
    const photoW = 1800;
    body.splice(
      0,
      n,
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W - photoW, photoW],
        layout: "fixed",
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: CONTENT_W - photoW, type: WidthType.DXA },
                borders: NO_BORDERS,
                children: kids.slice(0, n).length ? kids.slice(0, n) : [new Paragraph("")],
              }),
              new TableCell({
                width: { size: photoW, type: WidthType.DXA },
                borders: NO_BORDERS,
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [picture(images.headshot, HEADSHOT_BOX, HEADSHOT_BOX)],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    );
  }
  if (on && images?.visuals.length) {
    body.push(
      new Paragraph({
        keepNext: true,
        spacing: { before: 240, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F2A44", space: 2 } },
        children: [new TextRun({ text: "PORTFOLIO VISUALS", bold: true, size: 22, color: "1F2A44" })],
      }),
    );
    const half = CONTENT_W / 2;
    const rows: TableRow[] = [];
    for (let i = 0; i < images.visuals.length; i += 2) {
      const pair = images.visuals.slice(i, i + 2);
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [0, 1].map(
            (k) =>
              new TableCell({
                width: { size: half, type: WidthType.DXA },
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    spacing: { after: 120 },
                    children: pair[k] ? [picture(pair[k], VISUAL_BOX.w, VISUAL_BOX.h)] : [],
                  }),
                ],
              }),
          ),
        }),
      );
    }
    body.push(
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [half, half],
        layout: "fixed",
        borders: NO_BORDERS,
        rows,
      }),
    );
  }
  return new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    numbering: {
      config: [
        {
          reference: "b",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1008, right: 1008, bottom: 1008, left: 1008 },
          },
        },
        children: body,
      },
    ],
  });
}

export async function downloadResumeDocx(text: string, filename = "resume-revised.docx") {
  const blob = await Packer.toBlob(resumeToDocx(text, getResumeImages()));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
