/** Typography captured from an uploaded Word file so the Word download keeps its look. Same-tab memory only. */
export type ResumeStyle = {
  font: string;
  bodySize: number; // half-points
  nameSize: number;
  titleSize: number;
  titleBold: boolean;
  headingSize: number;
  headingColor: string;
  centerHeader: boolean;
  boldLabels: boolean;
  roleTitleBold: boolean;
};
export const DEFAULT_STYLE: ResumeStyle = {
  font: "Calibri", bodySize: 22, nameSize: 36, titleSize: 22, titleBold: false, headingSize: 22,
  headingColor: "1F2A44", centerHeader: false, boldLabels: false, roleTitleBold: false,
};
let state: ResumeStyle | null = null;
export const getResumeStyle = () => state;
export function setResumeStyle(next: ResumeStyle | null) { state = next; }

const mode = <T,>(xs: T[], fallback: T) => {
  const c = new Map<T, number>();
  xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  let best = fallback, n = 0;
  c.forEach((v, k) => { if (v > n) { best = k; n = v; } });
  return best;
};

/** Read the main typography choices from word/document.xml (+ styles.xml for defaults). */
export function styleFromWordXml(doc: string, styles = ""): ResumeStyle {
  const paras = (doc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []).filter((p) => /<w:t[ >]/.test(p));
  const runs = paras.flatMap((p) => p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []).filter((r) => /<w:t[ >]/.test(r));
  const attr = (x: string, re: RegExp) => x.match(re)?.[1];
  const sizeOf = (x: string) => Number(attr(x, /<w:sz w:val="(\d+)"/) ?? 0);
  const fontDefault = attr(styles, /<w:docDefaults>[\s\S]*?w:ascii="([^"]+)"/) ?? DEFAULT_STYLE.font;
  const font = mode(runs.map((r) => attr(r, /w:ascii="([^"]+)"/)).filter((f): f is string => !!f), fontDefault);
  const bodySize = mode(runs.map(sizeOf).filter((s) => s > 0), DEFAULT_STYLE.bodySize);
  const first = paras[0] ?? "", second = paras[1] ?? "";
  const nameSize = Math.max(sizeOf(first), bodySize + 8) || DEFAULT_STYLE.nameSize;
  const heads = paras.filter((p) => /<w:pStyle w:val="Heading\d"/.test(p) || /^[^a-z]{3,40}$/.test((p.match(/<w:t[^>]*>([^<]*)/g) ?? []).map((t) => t.replace(/<[^>]+>/, "")).join("").trim()));
  const headingSize = mode(heads.map(sizeOf).filter((s) => s > 0), Math.max(bodySize, 18));
  const heading1 = styles.match(/<w:style [^>]*w:styleId="Heading1"[\s\S]*?<\/w:style>/)?.[0] ?? "";
  const headingColor = attr(heads[1] ?? "", /<w:color w:val="([0-9A-Fa-f]{6})"/) ?? attr(heading1, /<w:color w:val="([0-9A-Fa-f]{6})"/) ?? "000000";
  const startsBold = (p: string, re: RegExp) => { const r = (p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? [])[0] ?? ""; return /<w:b\/>/.test(r) && re.test(r.replace(/<[^>]+>/g, "")); };
  return {
    font, bodySize, nameSize,
    titleSize: sizeOf(second) || bodySize,
    titleBold: /<w:b\/>/.test(second),
    headingSize, headingColor: headingColor.toUpperCase() === "AUTO" ? "000000" : headingColor,
    centerHeader: /<w:jc w:val="center"\/>/.test(first),
    boldLabels: paras.filter((p) => startsBold(p, /:\s*$/)).length >= 2,
    roleTitleBold: paras.filter((p) => { const rs = p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) ?? []; return rs.length > 1 && /<w:b\/>/.test(rs[0]!) && /^\s*\|/.test((rs[1] ?? "").replace(/<[^>]+>/g, "")); }).length >= 1,
  };
}

export async function extractDocxStyle(buf: ArrayBuffer): Promise<ResumeStyle | null> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buf);
  const doc = await zip.file("word/document.xml")?.async("string");
  if (!doc) return null;
  return styleFromWordXml(doc, (await zip.file("word/styles.xml")?.async("string")) ?? "");
}

const decode = (s: string) => s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** Word HTML (mammoth) to resume text that keeps list items as "- " bullets; raw text extraction drops them. */
export function htmlToResumeText(html: string): string {
  const out: string[] = [];
  const re = /<(p|h[1-6]|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const inner = (m[2] ?? "").replace(/<(ul|ol)\b[\s\S]*$/i, "");
    const t = decode(inner).replace(/\s+/g, " ").trim();
    if (!t) continue;
    out.push(m[1]!.toLowerCase() === "li" ? `- ${t}` : t);
  }
  return out.join("\n");
}
