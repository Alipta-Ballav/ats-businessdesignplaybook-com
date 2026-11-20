import { useEffect, useRef } from "react";
import { BULLET, isHeading } from "@/lib/export-docx";
import { diffLines } from "@/lib/editor";

/** Live, print-like single-column render of the resume (same rules as the Word export). Changed lines are highlighted. */
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
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Live preview</p>
        <p className="text-xs text-muted-foreground">{changed} changed {changed === 1 ? "line" : "lines"}</p>
      </div>
      <div ref={box} className="max-h-[75vh] overflow-auto px-8 py-8 text-[13px] leading-relaxed">
        {lines.map((l, i) => {
          const t = l.text.trim();
          if (!t) return <div key={i} className="h-2" />;
          const mark = l.changed ? "bg-primary/15 border-l-4 border-primary rounded-r-sm pl-2 -ml-3 transition-colors" : "";
          if (i === first) return <h3 key={i} data-line={i} className={`mb-1 font-display text-xl font-semibold ${mark}`}>{t}</h3>;
          if (isHeading(t)) return <h4 key={i} data-line={i} className={`mb-1.5 mt-4 border-b border-foreground/70 pb-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] ${mark}`}>{t}</h4>;
          if (BULLET.test(t)) return <p key={i} data-line={i} className={`relative pl-4 ${mark}`}><span className="absolute left-0">•</span>{t.replace(BULLET, "")}</p>;
          return <p key={i} data-line={i} className={mark}>{t}</p>;
        })}
      </div>
    </div>
  );
}
