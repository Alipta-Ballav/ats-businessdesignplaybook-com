import { useState } from "react";
import { ATS_SYSTEMS, atsFormatPenalty, evaluate, formatRisks, type Candidate, type Job } from "@/lib/scoring";
import { Card, StatusBadge } from "@/components/ui-bits";

/** Pick the ATS the employer uses; scores and formatting fixes adapt to it. */
export function AtsTarget({ job, c, resume }: { job: Job; c: Candidate; resume: string }) {
  const [sys, setSys] = useState("Workday");
  const s = ATS_SYSTEMS[sys]!;
  const score = (name: string) => {
    const x = ATS_SYSTEMS[name]!; const e = evaluate({ ...job, flexibility: x.flexibility, weights: x.weights }, c);
    return { e, n: e.composite == null ? null : Math.max(0, e.composite - atsFormatPenalty(name, resume)) };
  };
  const cur = score(sys);
  const risks = formatRisks(resume).filter((r) => s.style === "legacy" || r.severity === "high");
  return (
    <Card>
      <h2 className="mb-1 font-display text-lg">Which ATS is the employer using?</h2>
      <p className="mb-4 text-xs text-muted-foreground">Workday parses rigidly; Greenhouse and Ashby read context. Your score and fixes change with it.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(ATS_SYSTEMS).map(([name, x]) => (
          <button key={name} type="button" onClick={() => { setSys(name); window.__lovableEvents?.track?.("project.ats_system_selected", { system: name }); }} className={`rounded-md border p-3 text-left text-sm ${sys === name ? "border-primary bg-accent" : "bg-background"}`}>
            <div className="flex justify-between"><span className="font-medium">{name}</span><span className="font-mono">{score(name).n ?? "—"}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{x.how}</p>
          </button>))}
      </div>
      <div className="mt-3 text-sm">In {sys} you'd be rated: <StatusBadge status={cur.e.status} /></div>
      <h3 className="mt-4 text-sm font-medium">Formatting fixes for {sys}</h3>
      {risks.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No formatting issues that {sys} would trip on.</p> : (
        <ul className="mt-2 space-y-2">{risks.map((r) => (
          <li key={r.issue} className="rounded border p-2 text-sm"><span className="font-medium">{r.issue}</span><p className="text-muted-foreground">{r.fix}</p></li>))}</ul>)}
    </Card>
  );
}
