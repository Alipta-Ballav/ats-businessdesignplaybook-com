import { useId } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { FTI_DIMENSIONS, LEVELS, type Level } from "@/lib/scoring";
import { ARCHETYPES, type ArchetypeId, type Emphasis, type WeightMap } from "@/lib/weights";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export type Lens = ArchetypeId | "level";
const NAMES: Record<Lens, string> = {
  level: "Any design role (recommended)", product: "Product design", research: "Research",
  systems: "Design systems", leader: "Design leadership",
};
const TIERS: { id: Emphasis; label: string }[] = [
  { id: "low", label: "Less" }, { id: "standard", label: "Normal" }, { id: "high", label: "More" },
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
          <h3 className="text-base font-semibold">Who are you being compared against?</h3>
          <p className="mt-1 text-sm text-muted-foreground">Pick the role you're applying for. This changes which skills count most — not your resume or your evidence.</p>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            Now: {level} · {NAMES[lens]}{tuned ? " · fine-tuned" : ""}
          </p>
        </div>
        {custom && <Button variant="ghost" className="h-10" onClick={() => { onLens("level"); onEmphasis({}); }}>
          <RotateCcw className="size-4" />Reset
        </Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-level`} className="text-sm font-medium">Your level</label>
          <select id={`${id}-level`} className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" value={level} onChange={(e) => onLevel(e.target.value as Level)}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}{l === detected ? " (detected)" : ""}</option>)}
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor={`${id}-focus`} className="text-sm font-medium">Type of design role</label>
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
        {custom ? <p className="text-xs">Your score for this role: <strong>{total}</strong> (was {baseline} with the standard benchmark, {delta > 0 ? "+" : ""}{delta}). Your resume didn't change — only what's being prioritised.</p>
          : <p className="text-xs text-muted-foreground">Priorities follow your level. Changing them changes the overall score only — never your resume or the eight evidence scores.</p>}
      </div>
      <Collapsible defaultOpen={tuned}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="group h-10 max-w-full justify-start whitespace-normal px-0 text-left">
            <ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
            {tuned ? "Fine-tune what matters (adjusted)" : "Fine-tune what matters (advanced)"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-lg text-xs text-muted-foreground">Only if a job post stresses something specific. Example: the post says "strong research"? Set Research to More. Percentages rebalance to 100% automatically.</p>
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
            <p className="py-2">More doubles a skill's weight, Less halves it, and Normal keeps it. We then balance all eight to 100%. A zero-weight dimension stays at zero in that preset.</p>
          </details>
        </CollapsibleContent>
      </Collapsible>
      <details className="text-xs text-muted-foreground">
        <summary className="flex min-h-10 cursor-pointer items-center">Why this level?</summary>
        <p className="py-2">Detected from {readAs}: {detected}. This is an estimate from your resume, not a seniority assessment.</p>
      </details>
    </section>
  );
}