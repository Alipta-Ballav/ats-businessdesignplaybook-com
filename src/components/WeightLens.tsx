import { useId } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { FTI_DIMENSIONS, LEVELS, type Level } from "@/lib/scoring";
import { ARCHETYPES, type ArchetypeId, type Emphasis, type WeightMap } from "@/lib/weights";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export type Lens = ArchetypeId | "level";
const NAMES: Record<Lens, string> = {
  level: "Level-based (recommended)", product: "Product design", research: "Research",
  systems: "Design systems", leader: "Design leadership",
};
const TIERS: { id: Emphasis; label: string }[] = [
  { id: "low", label: "Low" }, { id: "standard", label: "Standard" }, { id: "high", label: "High" },
];

export function WeightLens({ level, onLevel, detected, readAs, lens, onLens, emphasis, onEmphasis, weights, baseline, total }: {
  level: Level; onLevel: (l: Level) => void; detected: Level; readAs: string;
  lens: Lens; onLens: (l: Lens) => void;
  emphasis: Partial<Record<string, Emphasis>>;
  onEmphasis: (e: Partial<Record<string, Emphasis>>) => void;
  weights: WeightMap; baseline: number; total: number;
}) {
  const id = useId();
  const tuned = Object.values(emphasis).some((v) => v && v !== "standard");
  const custom = lens !== "level" || tuned;
  const delta = total - baseline;
  const ordered = [...FTI_DIMENSIONS].sort((a, b) => (weights[b.id] ?? 0) - (weights[a.id] ?? 0));
  const leading = ordered.slice(0, 2);
  return (
    <section aria-label="Benchmark target" className="space-y-4 border-t p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Benchmark target</h3>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {level} · {lens === "level" ? "Level-based priorities" : NAMES[lens]}{tuned ? " · Custom weights" : ""}
          </p>
        </div>
        {custom && <Button variant="ghost" className="h-10" onClick={() => { onLens("level"); onEmphasis({}); }}>
          <RotateCcw className="size-4" />Reset weights
        </Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-level`} className="text-sm font-medium">Career level</label>
          <select id={`${id}-level`} className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" value={level} onChange={(e) => onLevel(e.target.value as Level)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}{l === detected ? " (detected)" : ""}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-focus`} className="text-sm font-medium">Role emphasis</label>
          <select id={`${id}-focus`} className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" value={lens} onChange={(e) => onLens(e.target.value as Lens)}>
            <option value="level">{NAMES.level}</option>
            {ARCHETYPES.map((a) => <option key={a.id} value={a.id}>{NAMES[a.id]}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2 text-sm" aria-live="polite">
        <p>{leading.map((d) => `${d.name} (${weights[d.id] ?? 0}%)`).join(" and ")} contribute most to this rubric.</p>
        <p className="text-xs text-muted-foreground">
          {lens === "level" ? "Priorities follow your career level." : "This role preset replaces the level-based weights."} Changing weights changes the overall score—not your resume or the eight evidence scores.
        </p>
        {custom && <p className="font-mono text-xs">Level default {baseline} → Your weighting {total} ({delta > 0 ? "+" : ""}{delta}) · not a resume improvement</p>}
      </div>
      <Collapsible defaultOpen={tuned}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="group h-10 max-w-full justify-start whitespace-normal px-0 text-left">
            <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            {tuned ? "Custom dimension weights" : "Customize dimension weights (optional)"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-lg text-xs text-muted-foreground">Set a dimension to matter more or less. The percentages balance automatically to 100%; your choices stay as you set them.</p>
            {tuned && <Button variant="ghost" className="h-10" onClick={() => onEmphasis({})}><RotateCcw className="size-4" />Reset adjustments</Button>}
          </div>
          <div className="divide-y">
            {FTI_DIMENSIONS.map((d) => <div key={d.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_3rem]">
              <span className="min-w-0 text-sm">{d.name}</span>
              <div role="radiogroup" aria-label={`${d.name} emphasis`} className="col-span-2 flex rounded-md border p-0.5 sm:col-span-1">
                {TIERS.map((t) => <Button key={t.id} variant="ghost" role="radio" aria-checked={(emphasis[d.id] ?? "standard") === t.id} onClick={() => onEmphasis({ ...emphasis, [d.id]: t.id })} className={`h-10 flex-1 rounded px-3 text-xs sm:flex-none ${(emphasis[d.id] ?? "standard") === t.id ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "text-muted-foreground"}`}>{t.label}</Button>)}
              </div>
              <span aria-live="polite" className="col-start-2 row-start-1 text-right font-mono text-xs sm:col-auto sm:row-auto">{weights[d.id] ?? 0}%</span>
            </div>)}
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="flex min-h-10 cursor-pointer items-center">How these weights are calculated</summary>
            <p className="py-2">High doubles a preset weight, Low halves it, and Standard keeps it. We then balance all eight to 100%. A zero-weight dimension stays at zero in that preset.</p>
          </details>
        </CollapsibleContent>
      </Collapsible>
      <details className="text-xs text-muted-foreground">
        <summary className="flex min-h-10 cursor-pointer items-center">Why this career level?</summary>
        <p className="py-2">Detected from {readAs}: {detected}. This is an estimate from your resume, not a seniority assessment.</p>
      </details>
    </section>
  );
}