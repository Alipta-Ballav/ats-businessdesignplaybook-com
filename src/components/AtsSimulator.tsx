import { useState } from "react";
import { ProGate } from "@/components/ProGate";
import { DESIGN_LEVELS, DIM_NAMES, SCREEN_LENSES, evaluate, matchMode, type Candidate, type Dimension, type Job } from "@/lib/scoring";
import { Card, StatusBadge } from "@/components/ui-bits";

/** Free: compare the fixed screening lenses. Pro (locked preview): tune strictness, weights and level yourself. */
export function AtsSimulator({ job, c }: { job: Job; c: Candidate }) {
  const [lens, setLens] = useState("Hiring manager");
  const l = SCREEN_LENSES[lens]!;
  const ev = evaluate({ ...job, flexibility: l.flexibility, weights: l.weights }, c);
  const [tune, setTune] = useState({ flexibility: 50, weights: { JR: 40, FR: 35, HP: 25 } as Record<Dimension, number>, level: "" });
  const tw = tune.weights.JR + tune.weights.FR + tune.weights.HP;
  const tuned = evaluate({ ...job, flexibility: tune.flexibility, weights: tune.weights }, c);
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

      <div className="mt-6"><ProGate title="Tune the screen yourself" blurb="Set strictness, skill weights and your target level, from Senior Designer to Director of Design.">
        <div className="space-y-4">
          <div><p className="text-sm">Target design level</p><div className="mt-1 flex flex-wrap gap-2">{Object.entries(DESIGN_LEVELS).map(([d, x]) => (
            <button key={d} type="button" onClick={() => setTune({ flexibility: x.flexibility, weights: x.weights, level: d })} className={`rounded border px-2 py-1 text-xs ${tune.level === d ? "border-primary bg-accent" : ""}`}>{d}</button>))}</div></div>
          <div><div className="flex justify-between text-sm"><span>Strictness</span><span className="font-mono">{tune.flexibility} · {matchMode(tune.flexibility)}</span></div>
            <input type="range" min={0} max={100} value={tune.flexibility} aria-label="Strictness" onChange={(e) => setTune({ ...tune, level: "", flexibility: Number(e.target.value) })} className="mt-2 w-full accent-[var(--primary)]" /></div>
          <div className="grid grid-cols-3 gap-2">{(["JR", "FR", "HP"] as Dimension[]).map((d) => (
            <label key={d} className="text-xs text-muted-foreground">{DIM_NAMES[d]} %<input type="number" min={0} max={100} value={tune.weights[d]} onChange={(e) => setTune({ ...tune, level: "", weights: { ...tune.weights, [d]: Number(e.target.value) } })} className="w-full rounded border bg-background px-2 py-1 text-sm" /></label>))}</div>
          <p className="text-sm">Your tuned score: <span className="font-mono">{tw === 100 ? (tuned.composite ?? "—") : "weights must total 100%"}</span> <StatusBadge status={tuned.status} /></p>
        </div>
      </ProGate></div>
    </Card>
  );
}
