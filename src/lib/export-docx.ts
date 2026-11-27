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
  ExternalHyperlink,
} from "docx";
import { DEFAULT_STYLE, getResumeStyle, type ResumeStyle } from "@/lib/resume-style";
import { getResumeSource, patchedDocx } from "@/lib/docx-patch";
import { getResumeLinks, linkSegments, type ResumeLinks } from "@/lib/resume-links";
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
const NO_BORDERS = {
  top: NONE,
  bottom: NONE,
  left: NONE,
  right: NONE,
  insideHorizontal: NONE,
  insideVertical: NONE,
};
export const RESUME_PAGE = { width: 11906, height: 16838, margin: 1080, contentWidth: 9746 };
const CONTENT_W = RESUME_PAGE.contentWidth; // A4 minus two 0.75-inch margins, in twips
const picture = (img: ResumeImage, maxW: number, maxH: number) => {
  const f = fitBox(img.w, img.h, maxW, maxH);
  return new ImageRun({
    type: "png",
    data: dataUrlBytes(img.src),
    transformation: { width: f.w, height: f.h },
  });
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
let activeLinks: ResumeLinks = {};
let activeStyle: ResumeStyle = DEFAULT_STYLE;
const runs = (t: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
  inlineRuns(t).flatMap((r) =>
    linkSegments(r.text, activeLinks).map((seg) => {
      const run = new TextRun({
        text: seg.text,
        font: activeStyle.font,
        bold: !!(o.bold || r.bold),
        italics: !!r.italic,
        ...(o.size ? { size: o.size } : {}),
        ...(seg.url ? { color: "1F4E9E", underline: {} } : o.color ? { color: o.color } : {}),
      });
      return seg.url ? new ExternalHyperlink({ link: seg.url, children: [run] }) : run;
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
    /\b((19|20)\d{2}|present|current)\b/i.test(t) &&
    !/@|https?:\/\/|www\.|linkedin\.com|\+\d[\d\s()-]{7,}/i.test(t) &&
    /[|–—·,-]/.test(t)
  );
};

export type ResumeBlock = {
  kind: "name" | "heading" | "role" | "bullet" | "paragraph";
  text: string;
  lineIndices: number[];
};

/** Reflow only for presentation; never change the stored text used for evidence/scoring. */
export function resumeBlocks(text: string): ResumeBlock[] {
  const blocks: ResumeBlock[] = [];
  let header = true;
  let separated = true;
  text
    .replace(/\r/g, "")
    .split("\n")
    .forEach((raw, i) => {
      const t = raw.trim();
      if (!t) {
        separated = true;
        return;
      }
      const p = plain(t);
      const kind: ResumeBlock["kind"] =
        blocks.length === 0
          ? "name"
          : isHeading(p)
            ? "heading"
            : isRoleLine(p)
              ? "role"
              : BULLET.test(t)
                ? "bullet"
                : "paragraph";
      if (kind === "heading" || kind === "role" || kind === "bullet") header = false;
      const prev = blocks.at(-1);
      const labelled = /^[\p{L}][\p{L} &/,-]{1,35}:\s/u.test(p);
      const contact = /@|https?:\/\/|www\.|\+\d[\d\s()-]{7,}/i.test(p);
      const continuation =
        kind === "paragraph" &&
        !header &&
        !separated &&
        prev &&
        ((prev.kind === "bullet" &&
          (!labelled || /^case study:/i.test(p)) &&
          (!/[.!?]$/.test(prev.text) || /^[a-z]/.test(p) || /^case study:/i.test(p))) ||
          (!labelled &&
            !contact &&
            prev.kind === "paragraph" &&
            (/^[a-z]/.test(p) || !/[.!?]$/.test(prev.text))));
      if (continuation && prev) {
        // Keep hyphenated words/URLs contiguous, otherwise restore the missing space.
        prev.text += /-$/.test(prev.text) ? t : ` ${t}`;
        prev.lineIndices.push(i);
      } else {
        blocks.push({
          kind,
          text: kind === "bullet" ? t.replace(BULLET, "") : t,
          lineIndices: [i],
        });
      }
      separated = false;
    });
  return blocks;
}

/** Turns plain resume text into an ATS-safe single-column Word document: name, section rules, real bullets. */
export function resumeToDocx(text: string, images?: ResumeImages, links: ResumeLinks = {}, style?: ResumeStyle | null): Document {
  activeLinks = links;
  const st = style ?? DEFAULT_STYLE;
  activeStyle = st;
  const body1 = { size: st.bodySize };
  // "Label: details" lines and "Title | Company | Dates" lines keep the upload's bold lead-in.
  const lead = (l: string, re: RegExp, on: boolean) => {
    const m = on ? l.match(re) : null;
    return m ? [...runs(m[1]!, { ...body1, bold: true }), ...runs(l.slice(m[1]!.length), body1)] : null;
  };
  let headerLine = 0;
  const blocks = resumeBlocks(text);
  const kids: Paragraph[] = [];
  let headerEnd = -1; // number of paragraphs before the first section heading
  blocks.forEach(({ text: l, kind }) => {
    if (kind === "name") {
      kids.push(
        new Paragraph({
          alignment: st.centerHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { after: 60 },
          children: runs(l, { bold: true, size: st.nameSize }),
        }),
      );
      return;
    }
    if (kind === "heading") {
      if (headerEnd < 0) headerEnd = kids.length;
      kids.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: st.headingColor, space: 2 } },
          children: [
            new TextRun({
              text: plain(l).toUpperCase(),
              font: st.font,
              bold: true,
              size: st.headingSize,
              color: st.headingColor,
            }),
          ],
        }),
      );
      return;
    }
    if (kind === "role") {
      kids.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: 120, after: 40 },
          children: lead(l, /^([^|]+?)(?=\s*\|)/, st.roleTitleBold) ?? runs(l, { ...body1, bold: true }),
        }),
      );
      return;
    }
    if (kind === "bullet") {
      kids.push(
        new Paragraph({
          numbering: { reference: "b", level: 0 },
          indent: { left: 360, hanging: 240 },
          widowControl: true,
          spacing: { after: 40 },
          children: lead(l, /^([^:]{2,40}:)\s/, st.boldLabels) ?? runs(l, body1),
        }),
      );
      return;
    }
    if (headerEnd < 0) {
      const title = headerLine++ === 0 && st.titleBold;
      kids.push(new Paragraph({
        alignment: st.centerHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { after: 40 },
        children: runs(l, title ? { bold: true, size: st.titleSize } : body1),
      }));
      return;
    }
    kids.push(new Paragraph({ spacing: { after: 60 }, children: lead(l, /^([^:]{2,40}:)\s/, st.boldLabels) ?? runs(l, body1) }));
  });
  const on = images?.on !== false;
  const body: (Paragraph | Table)[] = [...kids];
  if (on && images?.headshot) {
    // Fixed-width columns and inline images constrain reflow across document readers.
    const n = headerEnd < 0 ? Math.min(1, kids.length) : headerEnd;
    const photoW = 1800;
    body.splice(
      0,
      n,
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: [CONTENT_W - photoW, photoW],
        layout: "fixed",
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
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
        children: [
          new TextRun({
            text: "PORTFOLIO VISUALS",
            font: "Calibri",
            bold: true,
            size: 22,
            color: "1F2A44",
          }),
        ],
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
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        borders: NO_BORDERS,
        rows,
      }),
    );
  }
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: st.font, size: st.bodySize },
          paragraph: { alignment: AlignmentType.LEFT, spacing: { line: style ? 264 : 324, after: 60 } },
        },
      },
    },
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
            size: { width: RESUME_PAGE.width, height: RESUME_PAGE.height },
            margin: {
              top: RESUME_PAGE.margin,
              right: RESUME_PAGE.margin,
              bottom: RESUME_PAGE.margin,
              left: RESUME_PAGE.margin,
            },
          },
        },
        children: body,
      },
    ],
  });
}

export async function downloadResumeDocx(text: string, filename = "resume-revised.docx") {
  // An uploaded Word file is edited in place so its formatting stays exactly the same.
  const kept = await patchedDocx(text).catch(() => null);
  const src = getResumeSource();
  if (kept && src) filename = src.name.replace(/\.docx$/i, "") + "-revised.docx";
  const blob = kept ?? (await Packer.toBlob(resumeToDocx(text, getResumeImages(), getResumeLinks(), getResumeStyle())));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
