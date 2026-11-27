import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { FTI_DIMENSIONS, LEVELS, type Level } from "@/lib/scoring";
import { ARCHETYPES, type ArchetypeId, type Emphasis, type WeightMap } from "@/lib/weights";
import { Button } from "@/components/ui/button";

export type Lens = ArchetypeId | "level";
const NAMES: Record<Lens, string> = {
  level: "Same type of role as now", product: "Product design", research: "Research",
  systems: "Design systems", leader: "Design leadership",
};

export function WeightLens({ level, onLevel, detected, readAs, lens, onLens, emphasis, onEmphasis, weights, baseline, total }: {
  level: Level; onLevel: (l: Level) => void; detected: Level; readAs: string;
  lens: Lens; onLens: (l: Lens) => void;
  emphasis: Partial<Record<string, Emphasis>>;
  onEmphasis: (e: Partial<Record<string, Emphasis>>) => void;
  weights: WeightMap; baseline: number; total: number;
}) {
  const id = useId();
  const tuned = Object.values(emphasis).some((v) => v && v !== "standard"); // legacy adjustments, cleared on reset
  const custom = lens !== "level" || tuned;
  const delta = total - baseline;
  const ordered = [...FTI_DIMENSIONS].sort((a, b) => (weights[b.id] ?? 0) - (weights[a.id] ?? 0));
  const leading = ordered.slice(0, 2);
  return (
    <section aria-label="Benchmark target" className="space-y-4 border-t p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Where you are vs. where you're aiming</h3>
          <p className="mt-1 text-sm text-muted-foreground">Your current level comes from your CV. Pick the role you're targeting to see which skills it expects most — your resume and evidence stay the same.</p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            Now: {level} → {NAMES[lens]}
          </p>
        </div>
        {custom && <Button variant="ghost" className="h-10" onClick={() => { onLens("level"); onEmphasis({}); }}>
          <RotateCcw className="size-4" />Reset
        </Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-level`} className="text-sm font-medium">Current level (from your CV)</label>
          <select id={`${id}-level`} className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" value={level} onChange={(e) => onLevel(e.target.value as Level)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}{l === detected ? " (detected)" : ""}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-focus`} className="text-sm font-medium">Target role</label>
          <select id={`${id}-focus`} className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" value={lens} onChange={(e) => onLens(e.target.value as Lens)}>
            <option value="level">{NAMES.level}</option>
            {ARCHETYPES.map((a) => <option key={a.id} value={a.id}>{NAMES[a.id]}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2 text-sm" aria-live="polite">
        {lens !== "level" && <p className="text-xs text-muted-foreground">{ARCHETYPES.find((a) => a.id === lens)?.blurb} These count more.</p>}
        <div className="flex h-3 w-full overflow-hidden rounded-full border" aria-hidden>
          {ordered.map((d, i) => <div key={d.id} title={`${d.name} ${weights[d.id] ?? 0}%`} className={i < 2 ? "bg-primary" : "bg-muted-foreground/30"} style={{ width: `${weights[d.id] ?? 0}%`, borderRight: "1px solid var(--background)" }} />)}
        </div>
        <p>For this role, <strong>{leading.map((d) => `${d.name} (${weights[d.id] ?? 0}%)`).join(" and ")}</strong> matter most.</p>
        {custom ? <p className="text-xs">Your score for this role: <strong>{total}</strong> (was {baseline} with your current role type, {delta > 0 ? "+" : ""}{delta}). Your resume didn't change — only what's being prioritised.</p>
          : <p className="text-xs text-muted-foreground">Priorities follow your level. Changing them changes the overall score only — never your resume or the eight evidence scores.</p>}
      </div>
      <details className="text-xs text-muted-foreground">
        <summary className="flex min-h-10 cursor-pointer items-center">Why this level?</summary>
        <p className="py-2">Detected from {readAs}: {detected}. This is an estimate from your resume, not a seniority assessment.</p>
      </details>
    </section>
  );
}