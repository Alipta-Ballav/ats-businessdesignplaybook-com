/**
 * Keeps an uploaded Word file's exact formatting: applied text changes are written
 * into the original document.xml instead of rebuilding the document. Same-tab memory only.
 */
type Source = { buf: ArrayBuffer; text: string; name: string };
let source: Source | null = null;
export const getResumeSource = () => source;
export function setResumeSource(next: Source | null) { source = next; }

const PARA = /<w:p(?:\s[^>]*)?>(?:(?!<w:p[\s>])[\s\S])*?<\/w:p>/g;
const WT = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&amp;/g, "&");
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stripMd = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*\s][^*]*)\*/g, "$1");
/** Text as written to Word: no bullet marker (Word numbering supplies it) and no markdown. */
const content = (s: string) => stripMd(s.trim().replace(/^(?:[-•*▪●–]|\d+[.)])\s+/, "")).trim();
const norm = (s: string) => content(s).replace(/\s+/g, " ").toLowerCase();
export const paraText = (p: string) => [...p.matchAll(WT)].map((m) => decode(m[1] ?? "")).join("");

/** Rewrites a paragraph's text, keeping leading runs (e.g. a bold "Label:") whose text still prefixes the new line. */
export function setParaText(p: string, text: string): string {
  const runs = [...p.matchAll(WT)];
  let rest = text, keep = 0;
  // Keep leading runs untouched while they still prefix the new text; the next run takes the rest.
  while (keep < runs.length) {
    const t = decode(runs[keep]![1] ?? "");
    if (!t || !rest.startsWith(t)) break;
    rest = rest.slice(t.length);
    keep++;
  }
  if (keep === runs.length && runs.length) {
    // Pure addition at the end: a new plain run (outside any link) with the body text's formatting.
    if (!rest) return p;
    const plainRun = p.replace(/<w:hyperlink\b[\s\S]*?<\/w:hyperlink>/g, "").match(/<w:r[ >][\s\S]*?<\/w:r>/)?.[0];
    const rPr = plainRun?.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0]?.replace(/<w:b\/>|<w:b w:val="[^"]*"\/>/g, "") ?? "";
    return p.replace(/<\/w:p>$/, `<w:r>${rPr}<w:t xml:space="preserve">${escape(rest)}</w:t></w:r></w:p>`);
  }
  let n = -1;
  return p.replace(WT, (whole) => {
    n++;
    if (n < keep) return whole;
    if (n === keep) return `<w:t xml:space="preserve">${escape(rest)}</w:t>`;
    return whole.replace(/>[^<]*</, "><");
  });
}

type Op = { kind: "keep"; o: number } | { kind: "del"; o: number } | { kind: "add"; text: string };
function diff(a: string[], b: string[]): Op[] {
  const A = a.map(norm), B = b.map(norm);
  const L = Array.from({ length: A.length + 1 }, () => new Array<number>(B.length + 1).fill(0));
  for (let i = A.length - 1; i >= 0; i--)
    for (let j = B.length - 1; j >= 0; j--)
      L[i]![j] = A[i] === B[j] ? L[i + 1]![j + 1]! + 1 : Math.max(L[i + 1]![j]!, L[i]![j + 1]!);
  const ops: Op[] = [];
  let i = 0, j = 0;
  while (i < A.length || j < B.length) {
    if (i < A.length && j < B.length && A[i] === B[j]) { ops.push({ kind: "keep", o: i }); i++; j++; }
    // Deletions first, so a changed line pairs with its replacement and is edited in place.
    else if (i < A.length && (j >= B.length || L[i + 1]![j]! >= L[i]![j + 1]!)) { ops.push({ kind: "del", o: i }); i++; }
    else { ops.push({ kind: "add", text: b[j]! }); j++; }
  }
  return ops;
}

/** Returns patched document.xml, or null when the text can't be matched safely to the file's paragraphs. */
export function patchDocumentXml(xml: string, originalText: string, draft: string): string | null {
  const lines = (s: string) => s.split("\n").filter((l) => norm(l));
  const orig = lines(originalText), next = lines(draft);
  const paras = [...xml.matchAll(PARA)].map((m) => ({ start: m.index!, xml: m[0] }));
  // Map each original line to its paragraph, in document order.
  const at: number[] = [];
  let k = 0;
  for (const l of orig) {
    const n = norm(l);
    while (k < paras.length && norm(paraText(paras[k]!.xml)) !== n) k++;
    if (k >= paras.length) return null;
    at.push(k++);
  }
  const out = paras.map((p) => p.xml);
  const after = new Map<number, string[]>(); // paragraph index -> inserted paragraphs after it
  const ops = diff(orig, next);
  let last = -1; // last original line seen
  for (let x = 0; x < ops.length; x++) {
    const op = ops[x]!;
    if (op.kind === "keep") { last = op.o; continue; }
    if (op.kind === "del") {
      const nxt = ops[x + 1];
      if (nxt?.kind === "add") { out[at[op.o]!] = setParaText(paras[at[op.o]!]!.xml, content(nxt.text)); x++; }
      else out[at[op.o]!] = "";
      last = op.o;
      continue;
    }
    // Pure insertion: copy the neighbouring paragraph's formatting (bullet, font, spacing).
    const ref = last >= 0 ? at[last]! : at[0];
    if (ref === undefined) return null;
    const model = /^\s*(?:[-•*▪●–]|\d+[.)])\s+/.test(op.text)
      ? paras[(last >= 0 ? [...orig.keys()].slice(0, last + 1).reverse().map((o) => at[o]!).find((p) => /<w:numPr>/.test(paras[p]!.xml)) : undefined) ?? ref]!.xml
      : paras[ref]!.xml;
    const clean = model.replace(/<w:hyperlink\b[^>]*>([\s\S]*?)<\/w:hyperlink>/g, "$1");
    const key = last >= 0 ? ref : -1;
    after.set(key, [...(after.get(key) ?? []), setParaText(clean, content(op.text))]);
  }
  let res = "", pos = 0;
  if (after.has(-1) && paras[0]) { res += xml.slice(0, paras[0].start) + after.get(-1)!.join(""); pos = paras[0].start; }
  paras.forEach((p, i) => {
    res += xml.slice(pos, p.start) + out[i] + (after.get(i)?.join("") ?? "");
    pos = p.start + p.xml.length;
  });
  return res + xml.slice(pos);
}

/** Builds a .docx from the uploaded file with the draft's text changes; null when not possible. */
export async function patchedDocx(draft: string): Promise<Blob | null> {
  if (!source) return null;
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(source.buf.slice(0));
  const file = zip.file("word/document.xml");
  if (!file) return null;
  const xml = patchDocumentXml(await file.async("string"), source.text, draft);
  if (xml === null) return null;
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
