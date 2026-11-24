import { useEffect, useRef, useState } from "react";
import { BULLET, inlineRuns, isHeading, isRoleLine } from "@/lib/export-docx";

const Rich = ({ t }: { t: string }) => (
  <>
    {inlineRuns(t).map((r, k) =>
      r.bold ? (
        <b key={k}>{r.text}</b>
      ) : r.italic ? (
        <i key={k}>{r.text}</i>
      ) : (
        <span key={k}>{r.text}</span>
      ),
    )}
  </>
);
const plain = (t: string) =>
  inlineRuns(t)
    .map((r) => r.text)
    .join("");
import { diffLines } from "@/lib/editor";

const PAGE_H = 1123; // A4 at 96dpi

/** Live, print-like single-column render of the resume (same rules as the Word export). Changed lines are highlighted on screen only. */
export function ResumePreview({ original, draft }: { original: string; draft: string }) {
  const lines = diffLines(original, draft);
  const first = lines.findIndex((l) => l.text.trim());
  const changed = lines.filter((l) => l.changed).length;
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(draft);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPages(Math.max(1, Math.ceil(el.scrollHeight / PAGE_H))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const prev = last.current.split("\n");
    last.current = draft;
    const idx = draft.split("\n").findIndex((l, i) => l !== prev[i]);
    if (idx >= 0)
      box.current
        ?.querySelector(`[data-line="${idx}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [draft]);
  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-sheet">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">
            W
          </span>
          <p className="truncate text-xs font-medium">Resume.docx · Print layout</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline font-mono">Calibri · 11pt · A4</span>
          <span>{changed} changed</span>
          <div className="flex items-center rounded border bg-background">
            <button
              type="button"
              aria-label="Zoom out"
              className="px-1.5 hover:text-foreground"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
            >
              −
            </button>
            <span className="w-9 text-center font-mono">{zoom}%</span>
            <button
              type="button"
              aria-label="Zoom in"
              className="px-1.5 hover:text-foreground"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className="max-h-[75vh] overflow-auto bg-muted p-6">
        <div style={{ zoom: zoom / 100 }} className="mx-auto w-fit">
          <div
            ref={box}
            className="relative w-[794px] max-w-none bg-background px-[72px] py-[72px] text-[14.5px] leading-[1.35] text-foreground shadow-sheet"
            style={{
              fontFamily: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
              minHeight: PAGE_H * pages,
              backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${PAGE_H - 12}px, var(--muted) ${PAGE_H - 12}px, var(--muted) ${PAGE_H}px)`,
            }}
          >
            {Array.from({ length: pages }, (_, n) => (
              <span
                key={n}
                className="pointer-events-none absolute right-4 font-mono text-[10px] text-muted-foreground"
                style={{ top: PAGE_H * (n + 1) - 32 }}
              >
                Page {n + 1} of {pages}
              </span>
            ))}
            {lines.map((l, i) => {
              const t = l.text.trim();
              if (!t) return <div key={i} className="h-2" />;
              const mark = l.changed
                ? "bg-primary/15 border-l-4 border-primary rounded-r-sm pl-2 -ml-3 transition-colors"
                : "";
              if (i === first)
                return (
                  <h3 key={i} data-line={i} className={`mb-1 text-2xl font-bold ${mark}`}>
                    <Rich t={t} />
                  </h3>
                );
              if (isHeading(plain(t)))
                return (
                  <h4
                    key={i}
                    data-line={i}
                    className={`mb-1.5 mt-4 border-b border-foreground/70 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] ${mark}`}
                  >
                    {plain(t)}
                  </h4>
                );
              if (isRoleLine(plain(t)))
                return (
                  <p key={i} data-line={i} className={`mt-2 font-bold ${mark}`}>
                    <Rich t={t} />
                  </p>
                );
              if (BULLET.test(t))
                return (
                  <p key={i} data-line={i} className={`relative pl-4 ${mark}`}>
                    <span className="absolute left-0">•</span>
                    <Rich t={t.replace(BULLET, "")} />
                  </p>
                );
              return (
                <p key={i} data-line={i} className={mark}>
                  <Rich t={t} />
                </p>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t bg-muted/40 px-4 py-1.5 text-[11px] text-muted-foreground">
        Page {pages > 1 ? `1–${pages}` : 1} of {pages} · Downloaded Word file uses the same layout
      </div>
    </div>
  );
}
