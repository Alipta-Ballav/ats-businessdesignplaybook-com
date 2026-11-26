import type React from "react";
import { useEffect, useRef, useState } from "react";
import { BULLET, inlineRuns, resumeBlocks, RESUME_PAGE } from "@/lib/export-docx";
import { Button } from "@/components/ui/button";

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
import {
  HEADSHOT_BOX,
  VISUAL_BOX,
  fitBox,
  hasImages,
  toggleResumeImages,
  useResumeImages,
  type ResumeImage,
} from "@/lib/resume-images";

const Pic = ({ img, w, h }: { img: ResumeImage; w: number; h: number }) => {
  const f = fitBox(img.w, img.h, w, h);
  return <img src={img.src} alt="" width={f.w} height={f.h} style={{ width: f.w, height: f.h }} />;
};

const PAGE_H = Math.round(RESUME_PAGE.height / 15); // A4 at 96dpi

/** Live, print-like single-column render of the resume (same rules as the Word export). Changed lines are highlighted on screen only. */
export function ResumePreview({
  original,
  draft,
  withImages = false,
  focus,
  targets = [],
  onPick,
}: {
  original: string;
  draft: string;
  withImages?: boolean;
  /** Resume line to spotlight (the recommendation currently open). */
  focus?: string | undefined;
  /** Lines that have a recommendation; clicking one calls onPick with it. */
  targets?: string[];
  onPick?: (line: string) => void;
}) {
  const norm = (x: string) => plain(x.trim()).replace(BULLET, "").trim();
  const match = (t: string, o: string) => {
    const a = norm(t);
    const b = norm(o);
    return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
  };
  const imgs = useResumeImages();
  const showToggle = withImages && hasImages(imgs);
  const on = showToggle && imgs.on;
  const lines = diffLines(original, draft);
  const blocks = resumeBlocks(draft);
  const changed = lines.filter((l) => l.changed).length;
  const box = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const last = useRef(draft);
  const [fit, setFit] = useState(1);
  const [zoom, setZoom] = useState(100);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const resize = () =>
      setFit(Math.min(1, Math.max(1, el.clientWidth - 32) / (RESUME_PAGE.width / 15)));
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const prev = last.current.split("\n");
    last.current = draft;
    const idx = draft.split("\n").findIndex((l, i) => l !== prev[i]);
    if (idx >= 0)
      box.current
        ?.querySelector(`[data-lines~="${idx}"]`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [draft]);
  useEffect(() => {
    if (focus)
      box.current
        ?.querySelector('[data-focus="true"]')
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);
  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-sheet">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-primary text-[10px] font-bold text-primary-foreground">
            W
          </span>
          <p className="truncate text-xs font-medium">Resume.docx · Print layout</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="hidden sm:inline font-mono">Calibri · 11pt · A4</span>
          {showToggle && (
            <label className="flex cursor-pointer items-center gap-1">
              <input
                type="checkbox"
                checked={imgs.on}
                onChange={(e) => toggleResumeImages(e.target.checked)}
              />
              Images
            </label>
          )}
          <span>{changed} changed</span>
          <div className="flex items-center rounded border bg-background">
            <Button
              variant="ghost"
              size="icon"
              title="Zoom out"
              type="button"
              aria-label="Zoom out"
              className="h-6 w-6"
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
            >
              −
            </Button>
            <span className="w-9 text-center font-mono">{zoom}%</span>
            <Button
              variant="ghost"
              size="icon"
              title="Zoom in"
              type="button"
              aria-label="Zoom in"
              className="h-6 w-6"
              onClick={() => setZoom((z) => Math.min(150, z + 10))}
            >
              +
            </Button>
          </div>
        </div>
      </div>
      <div ref={viewport} className="max-h-[75vh] overflow-auto bg-muted p-4">
        <div style={{ zoom: (fit * zoom) / 100 }} className="mx-auto w-fit">
          <div
            ref={box}
            className="relative max-w-none bg-background text-foreground shadow-sheet"
            style={{
              fontFamily: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif",
              width: RESUME_PAGE.width / 15,
              padding: RESUME_PAGE.margin / 15,
              fontSize: 44 / 3,
              lineHeight: 1.35,
              minHeight: PAGE_H,
            }}
          >
            {(() => {
              const render = (l: (typeof blocks)[number]) => {
                const i = l.lineIndices[0];
                const t = l.text.trim();
                if (!t) return <div key={i} className="h-2" />;
                const isFocus = !!focus && match(t, focus);
                const target = onPick ? targets.find((o) => match(t, o)) : undefined;
                const mark = `${
                  isFocus
                    ? "bg-warning/20 ring-2 ring-warning rounded-sm transition-colors"
                    : l.lineIndices.some((index) => lines[index]?.changed)
                      ? "bg-primary/15 ring-1 ring-primary rounded-sm transition-colors"
                      : ""
                } ${target && !isFocus ? "cursor-pointer underline decoration-warning/70 decoration-dotted underline-offset-4 hover:bg-warning/10" : ""}`;
                const pick = target
                  ? {
                      "data-focus": isFocus ? "true" : undefined,
                      "data-lines": l.lineIndices.join(" "),
                      role: "button",
                      tabIndex: 0,
                      title: "Open the recommendation for this line",
                      onClick: () => onPick?.(target),
                      onKeyDown: (e: React.KeyboardEvent) => e.key === "Enter" && onPick?.(target),
                    }
                  : {
                      "data-focus": isFocus ? "true" : undefined,
                      "data-lines": l.lineIndices.join(" "),
                    };
                if (l.kind === "name")
                  return (
                    <h3 key={i} data-line={i} className={`mb-1 font-bold text-[24px] ${mark}`}>
                      <Rich t={t} />
                    </h3>
                  );
                if (l.kind === "heading")
                  return (
                    <h4
                      key={i}
                      data-line={i}
                      className={`mb-1.5 mt-4 border-b border-foreground/70 pb-0.5 text-[14.67px] font-semibold uppercase ${mark}`}
                    >
                      {plain(t)}
                    </h4>
                  );
                if (l.kind === "role")
                  return (
                    <p key={i} data-line={i} className={`mt-2 font-bold ${mark}`}>
                      <Rich t={t} />
                    </p>
                  );
                if (l.kind === "bullet")
                  return (
                    <p
                      key={i}
                      data-line={i}
                      {...pick}
                      className={`relative mb-[2.67px] pl-6 ${mark}`}
                    >
                      <span className="absolute left-2">•</span>
                      <Rich t={t} />
                    </p>
                  );
                return (
                  <p key={i} data-line={i} {...pick} className={`mb-1 ${mark}`}>
                    <Rich t={t} />
                  </p>
                );
              };
              const els = blocks.map(render);
              let h = blocks.findIndex((l) => l.kind === "heading");
              if (h < 0) h = Math.min(1, blocks.length);
              return (
                <>
                  {on && imgs.headshot ? (
                    <div className="flex items-start">
                      <div className="min-w-0 flex-1">{els.slice(0, h)}</div>
                      <div className="shrink-0" style={{ width: 120 }}>
                        <div className="flex justify-end">
                          <Pic img={imgs.headshot} w={HEADSHOT_BOX} h={HEADSHOT_BOX} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    els.slice(0, h)
                  )}
                  {els.slice(h)}
                  {on && imgs.visuals.length > 0 && (
                    <>
                      <h4 className="mb-1.5 mt-4 border-b border-foreground/70 pb-0.5 text-[14.67px] font-semibold uppercase">
                        Portfolio visuals
                      </h4>
                      <div className="grid grid-cols-2 gap-y-2">
                        {imgs.visuals.map((v, k) => (
                          <div key={k}>
                            <Pic img={v} w={VISUAL_BOX.w} h={VISUAL_BOX.h} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
      <div className="border-t bg-muted/40 px-4 py-1.5 text-[11px] text-muted-foreground">
        A4 · Word pagination may vary with installed fonts
      </div>
    </div>
  );
}
