import { useSyncExternalStore } from "react";

/** One picture pulled from an uploaded resume. Dimensions are the natural pixel size of `src` (a PNG data URL). */
export type ResumeImage = { src: string; w: number; h: number };
export type RawImage = ResumeImage & { page: number; top: number };
export type ResumeImages = { headshot?: ResumeImage; visuals: ResumeImage[]; on: boolean };

export const MAX_VISUALS = 4;
/** Fixed boxes (CSS px at 96dpi) shared by the preview and Word export so both lay out identically. */
export const HEADSHOT_BOX = 115;
export const VISUAL_BOX = { w: 300, h: 200 };

/** Keeps only meaningful pictures: drops slivers, dividers and tiny icons; picks a near-square top-of-page-1 image as the headshot. */
export function classifyImages(raw: RawImage[]): Omit<ResumeImages, "on"> {
  const real = raw.filter((i) => {
    const r = i.w / i.h;
    return i.w >= 24 && i.h >= 24 && r < 6 && r > 1 / 6;
  });
  const headshot = real.find((i) => i.page === 1 && i.top < 0.3 && i.w / i.h >= 0.75 && i.w / i.h <= 1.33 && i.w >= 48);
  const visuals = real
    .filter((i) => i !== headshot && Math.min(i.w, i.h) >= 80)
    .slice(0, MAX_VISUALS);
  const strip = ({ src, w, h }: RawImage): ResumeImage => ({ src, w, h });
  return { ...(headshot ? { headshot: strip(headshot) } : {}), visuals: visuals.map(strip) };
}

/** Scales an image to fit inside a box while keeping its proportions (never stretches, never crops). */
export function fitBox(w: number, h: number, maxW: number, maxH: number) {
  const s = Math.min(maxW / w, maxH / h, 1);
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

let state: ResumeImages = { visuals: [], on: true };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
export const getResumeImages = () => state;
export function setResumeImages(next: Omit<ResumeImages, "on"> | null) {
  state = next ? { ...next, on: true } : { visuals: [], on: true };
  emit();
}
export function toggleResumeImages(on: boolean) {
  state = { ...state, on };
  emit();
}
export function useResumeImages() {
  return useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => state,
    () => state,
  );
}
export const hasImages = (s: ResumeImages) => !!s.headshot || s.visuals.length > 0;

// ---------- extraction (browser only) ----------
type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

/** Renders each PDF page and crops out every painted image using its on-page position. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function extractPdfImages(pdfjs: any, doc: any): Promise<RawImage[]> {
  const out: RawImage[] = [];
  const OPS = pdfjs.OPS;
  for (let p = 1; p <= Math.min(doc.numPages, 3); p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 2 });
    const ops = await page.getOperatorList();
    const boxes: { x: number; y: number; w: number; h: number }[] = [];
    let ctm = vp.transform as M;
    const stack: M[] = [];
    ops.fnArray.forEach((fn: number, k: number) => {
      const a = ops.argsArray[k];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, a as M);
      else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageXObjectRepeat) {
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => [
          ctm[0] * x! + ctm[2] * y! + ctm[4],
          ctm[1] * x! + ctm[3] * y! + ctm[5],
        ]);
        const xs = pts.map((q) => q[0]!), ys = pts.map((q) => q[1]!);
        const x = Math.max(0, Math.min(...xs)), y = Math.max(0, Math.min(...ys));
        boxes.push({ x, y, w: Math.min(vp.width, Math.max(...xs)) - x, h: Math.min(vp.height, Math.max(...ys)) - y });
      }
    });
    if (!boxes.length) continue;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
    for (const b of boxes.slice(0, 20)) {
      if (b.w < 8 || b.h < 8) continue;
      const c = document.createElement("canvas");
      c.width = Math.round(b.w);
      c.height = Math.round(b.h);
      c.getContext("2d")?.drawImage(canvas, b.x, b.y, b.w, b.h, 0, 0, c.width, c.height);
      // sizes reported at 1x (96dpi-ish) for classification
      out.push({ src: c.toDataURL("image/png"), w: Math.round(b.w / 2), h: Math.round(b.h / 2), page: p, top: b.y / vp.height });
    }
  }
  return out;
}

/** Pulls embedded pictures from a .docx in document order (position on page is unknown, so order stands in for it). */
export async function extractDocxImages(buf: ArrayBuffer): Promise<RawImage[]> {
  const mammoth = await import("mammoth");
  const srcs: string[] = [];
  await mammoth.convertToHtml(
    { arrayBuffer: buf },
    {
      convertImage: mammoth.images.imgElement(async (img) => {
        const b64 = await img.readAsBase64String();
        srcs.push(`data:${img.contentType};base64,${b64}`);
        return { src: "" };
      }),
    },
  );
  const out: RawImage[] = [];
  for (const [i, s] of srcs.slice(0, 20).entries()) {
    const el = new Image();
    el.src = s;
    try {
      await el.decode();
    } catch {
      continue;
    }
    const c = document.createElement("canvas");
    c.width = el.naturalWidth;
    c.height = el.naturalHeight;
    c.getContext("2d")?.drawImage(el, 0, 0);
    out.push({ src: c.toDataURL("image/png"), w: el.naturalWidth, h: el.naturalHeight, page: 1, top: i === 0 ? 0 : 1 });
  }
  return out;
}

export function dataUrlBytes(src: string): Uint8Array {
  const b = atob(src.split(",")[1] ?? "");
  const u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
