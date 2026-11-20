import { useEffect, useRef } from "react";
import { BULLET, isHeading, isRoleLine } from "@/lib/export-docx";
import { diffLines } from "@/lib/editor";

/** Live, print-like single-column render of the resume (same rules as the Word export). Changed lines are highlighted on screen only. */
export function ResumePreview({ original, draft }: { original: string; draft: string }) {
  const lines = diffLines(original, draft);
  const first = lines.findIndex((l) => l.text.trim());
  const changed = lines.filter((l) => l.changed).length;
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(draft);
  useEffect(() => {
    const prev = last.current.split("\n"); last.current = draft;
    const idx = draft.split("\n").findIndex((l, i) => l !== prev[i]);
    if (idx >= 0) box.current?.querySelector(`[data-line="${idx}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [draft]);
  return (
    <div className="rounded-sm border bg-card shadow-sheet">
      <div className="flex items-center justify-between border-b px-5 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live preview · as in Word</p>
        <p className="text-xs text-muted-foreground">{changed} changed {changed === 1 ? "line" : "lines"}</p>
      </div>
      <div className="max-h-[75vh] overflow-auto bg-muted/60 p-4">
      <div ref={box} className="mx-auto min-h-[600px] max-w-[640px] bg-background px-10 py-10 text-[13px] leading-relaxed text-foreground shadow-sheet" style={{ fontFamily: "Calibri, Carlito, 'Segoe UI', Arial, sans-serif" }}>
        {lines.map((l, i) => {
          const t = l.text.trim();
          if (!t) return <div key={i} className="h-2" />;
          const mark = l.changed ? "bg-primary/15 border-l-4 border-primary rounded-r-sm pl-2 -ml-3 transition-colors" : "";
          if (i === first) return <h3 key={i} data-line={i} className={`mb-1 text-2xl font-bold ${mark}`}>{t}</h3>;
          if (isHeading(t)) return <h4 key={i} data-line={i} className={`mb-1.5 mt-4 border-b border-foreground/70 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] ${mark}`}>{t}</h4>;
          if (isRoleLine(t)) return <p key={i} data-line={i} className={`mt-2 font-bold ${mark}`}>{t}</p>;
          if (BULLET.test(t)) return <p key={i} data-line={i} className={`relative pl-4 ${mark}`}><span className="absolute left-0">•</span>{t.replace(BULLET, "")}</p>;
          return <p key={i} data-line={i} className={mark}>{t}</p>;
        })}
      </div>
      </div>
    </div>
  );
}
