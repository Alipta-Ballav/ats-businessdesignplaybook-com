import { ChevronDown, RotateCcw } from "lucide-react";
import { FTI_DIMENSIONS, type Level } from "@/lib/scoring";
import { ARCHETYPES, type ArchetypeId, type Emphasis, type WeightMap } from "@/lib/weights";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

export type Lens = ArchetypeId | "level";
const SHORT: Record<string, string> = {
  craft: "Craft",
  research: "Research",
  product: "Product",
  systems: "Systems",
  ai: "AI",
  critical: "Critical",
  leadership: "Leadership",
  learning: "Learning",
};
const SHADES = [
  "bg-primary",
  "bg-primary/85",
  "bg-primary/70",
  "bg-primary/55",
  "bg-primary/40",
  "bg-primary/30",
  "bg-primary/20",
  "bg-primary/10",
];
const TIERS: { id: Emphasis; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "standard", label: "Standard" },
  { id: "high", label: "High" },
];

export function WeightLens({
  level,
  lens,
  onLens,
  emphasis,
  onEmphasis,
  weights,
  baseline,
  total,
}: {
  level: Level;
  lens: Lens;
  onLens: (l: Lens) => void;
  emphasis: Partial<Record<string, Emphasis>>;
  onEmphasis: (e: Partial<Record<string, Emphasis>>) => void;
  weights: WeightMap;
  baseline: number;
  total: number;
}) {
  const tuned = Object.values(emphasis).some((v) => v && v !== "standard");
  const custom = lens !== "level" || tuned;
  const delta = total - baseline;
  const options: { id: Lens; name: string; blurb: string }[] = [
    { id: "level", name: "Match my level", blurb: `Standard weights for a ${level}.` },
    ...ARCHETYPES,
  ];
  const current = options.find((o) => o.id === lens);
  const ordered = [...FTI_DIMENSIONS].sort((a, b) => (weights[b.id] ?? 0) - (weights[a.id] ?? 0));

  return (
    <section aria-label="Scoring focus" className="space-y-4 border-t p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Scoring focus
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Weight the 8 dimensions for the role you want. Your evidence stays the same.
          </p>
        </div>
        <p
          aria-live="polite"
          className={`shrink-0 rounded-full px-3 py-1 font-mono text-xs ${
            !custom || delta === 0
              ? "bg-muted text-muted-foreground"
              : delta > 0
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
          }`}
        >
          {custom ? `${baseline} → ${total} (${delta > 0 ? "+" : ""}${delta})` : `${total} at level weights`}
        </p>
      </div>

      <div role="radiogroup" aria-label="Role focus" className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={lens === o.id}
            onClick={() => onLens(o.id)}
            className={`h-10 rounded-full border px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring ${
              lens === o.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            {o.name}
          </button>
        ))}
      </div>
      {current && <p className="text-xs text-muted-foreground">{current.blurb}</p>}

      <div>
        <div className="flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
          {ordered.map((d, i) => (
            <div
              key={d.id}
              title={`${d.name}: ${weights[d.id] ?? 0}%`}
              className={`${SHADES[i] ?? "bg-primary/10"} h-full transition-[width] duration-300 motion-reduce:transition-none`}
              style={{ width: `${weights[d.id] ?? 0}%` }}
            />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ordered.map((d, i) => (
            <li key={d.id} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${SHADES[i] ?? "bg-primary/10"}`} aria-hidden />
              {SHORT[d.id] ?? d.name} <b className="font-mono text-foreground">{weights[d.id] ?? 0}%</b>
            </li>
          ))}
        </ul>
      </div>

      <Collapsible defaultOpen={tuned}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CollapsibleTrigger className="group inline-flex h-10 items-center gap-1.5 text-sm font-medium">
            Fine-tune emphasis
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          {custom && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onLens("level");
                onEmphasis({});
              }}
            >
              <RotateCcw className="size-3.5" /> Reset to my level
            </Button>
          )}
        </div>
        <CollapsibleContent className="mt-2 space-y-1">
          <p className="pb-2 text-xs text-muted-foreground">
            Set what matters more or less. High counts double, Low counts half; we keep the total at 100%.
          </p>
          {FTI_DIMENSIONS.map((d) => {
            const cur = emphasis[d.id] ?? "standard";
            return (
              <div
                key={d.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto_3rem]"
              >
                <span className="min-w-0 truncate text-sm">{d.name}</span>
                <div
                  role="radiogroup"
                  aria-label={`${d.name} emphasis`}
                  className="col-span-2 inline-flex rounded-md border p-0.5 sm:col-span-1"
                >
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={cur === t.id}
                      onClick={() => onEmphasis({ ...emphasis, [d.id]: t.id })}
                      className={`h-9 flex-1 rounded px-3 text-xs sm:flex-none ${
                        cur === t.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <span className="row-start-1 col-start-2 text-right font-mono text-xs sm:row-auto sm:col-auto">
                  {weights[d.id] ?? 0}%
                </span>
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
