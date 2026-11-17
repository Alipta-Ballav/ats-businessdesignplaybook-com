import { useState } from "react";
import { Lock } from "lucide-react";
import { DESIGN_LEVELS, DIM_NAMES, SCREEN_LENSES, evaluate, matchMode, type Candidate, type Dimension, type Job } from "@/lib/scoring";
import { Card, StatusBadge } from "@/components/ui-bits";

/** Free: compare the fixed screening lenses. Pro (locked preview): tune strictness, weights and level yourself. */
export function AtsSimulator({ job, c }: { job: Job; c: Candidate }) {
  const [lens, setLens] = useState("Hiring manager");
  const l = SCREEN_LENSES[lens]!;
  const ev = evaluate({ ...job, flexibility: l.flexibility, weights: l.weights }, c);
  return (
    <Card>
      <h2 className="mb-1 font-display text-lg">Who's reading your resume?</h2>
      <p className="mb-4 text-xs text-muted-foreground">See how the same resume scores with different reviewers in a design hiring process.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(SCREEN_LENSES).map(([name, x]) => {
          const e = evaluate({ ...job, flexibility: x.flexibility, weights: x.weights }, c);
          return (
            <button key={name} type="button" onClick={() => setLens(name)} className={`rounded-md border p-3 text-left text-sm ${lens === name ? "border-primary bg-accent" : "bg-background"}`}>
              <div className="flex justify-between"><span className="font-medium">{name}</span><span className="font-mono">{e.composite ?? "—"}</span></div>
              <p className="mt-1 text-xs text-muted-foreground">{x.who}</p>
            </button>);
        })}
      </div>
      <div className="mt-3 text-sm">With the {lens.toLowerCase()} you'd be rated: <StatusBadge status={ev.status} /></div>

      <div className="relative mt-6 rounded-md border p-4">
        <div aria-hidden className="pointer-events-none select-none space-y-4 opacity-40 blur-[1px]">
          <div><p className="text-sm">Design level</p><div className="mt-1 flex flex-wrap gap-2">{Object.keys(DESIGN_LEVELS).map((d) => <span key={d} className="rounded border px-2 py-1 text-xs">{d}</span>)}</div></div>
          <div><div className="flex justify-between text-sm"><span>Strictness</span><span className="font-mono">{matchMode(50)}</span></div><div className="mt-2 h-2 rounded bg-muted" /></div>
          <div className="grid grid-cols-3 gap-2">{(["JR", "FR", "HP"] as Dimension[]).map((d) => <div key={d} className="rounded border p-2 text-xs">{DIM_NAMES[d]}</div>)}</div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 p-4 text-center">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"><Lock className="h-3 w-3" /> Pro</span>
          <p className="font-medium">Tune the screen yourself</p>
          <p className="max-w-sm text-xs text-muted-foreground">Set strictness, skill weights and your target level, from Senior Designer to Director of Design. Coming soon.</p>
        </div>
      </div>
    </Card>
  );
}
