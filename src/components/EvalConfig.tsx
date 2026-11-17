import { matchMode, PRESETS, DIM_NAMES, type Dimension, type Job } from "@/lib/scoring";

export const FUNCTIONS = ["UX and Product Design", "Software Engineering", "Product Management", "Business and Strategy", "Marketing", "Data Science and Analytics", "Operations", "Leadership", "Finance", "Human Resources"];
export const SENIORITY = ["Junior", "Mid-level", "Senior", "Principal / Staff", "Leadership / Executive"];
const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

export function EvalConfig({ job, onChange }: { job: Job; onChange: (j: Job) => void }) {
  const total = job.weights.JR + job.weights.FR + job.weights.HP;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Job function
          <select className={input} value={job.func} onChange={(e) => onChange({ ...job, func: e.target.value })}>{FUNCTIONS.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label className="text-sm">Seniority
          <select className={input} value={job.seniority} onChange={(e) => onChange({ ...job, seniority: e.target.value })}>{SENIORITY.map((f) => <option key={f}>{f}</option>)}</select></label>
      </div>
      <div>
        <p className="mb-2 text-sm">Preset</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((p) => (
            <button key={p} type="button" onClick={() => onChange({ ...job, preset: p, ...PRESETS[p] })}
              className={`rounded-md border px-3 py-1.5 text-sm ${job.preset === p ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>{p}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm"><span>Evaluation flexibility</span><span className="font-mono">{job.flexibility} · {matchMode(job.flexibility)}</span></div>
        <input type="range" min={0} max={100} value={job.flexibility} aria-label="Evaluation flexibility"
          onChange={(e) => onChange({ ...job, preset: "Custom", flexibility: Number(e.target.value) })} className="mt-2 w-full accent-[var(--primary)]" />
        <div className="flex justify-between text-xs text-muted-foreground"><span>Strict check</span><span>Flexible check</span></div>
        <p className="mt-2 text-xs text-muted-foreground">Flexibility widens what counts as equivalent experience. It never waives requirements marked essential.</p>
      </div>
      <div>
        <p className="mb-2 text-sm">Dimension weights <span className={total === 100 ? "text-muted-foreground" : "text-destructive"}>({total}% — must total 100%)</span></p>
        <div className="grid grid-cols-3 gap-3">
          {(["JR", "FR", "HP"] as Dimension[]).map((d) => (
            <label key={d} className="text-xs text-muted-foreground">{DIM_NAMES[d]}
              <input type="number" min={0} max={100} className={input} value={job.weights[d]}
                onChange={(e) => onChange({ ...job, preset: "Custom", weights: { ...job.weights, [d]: Number(e.target.value) } })} /></label>
          ))}
        </div>
      </div>
    </div>
  );
}
