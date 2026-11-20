import { useState } from "react";
import { ATS_SYSTEMS, atsFormatPenalty, evaluate, formatRisks, type Candidate, type Job } from "@/lib/scoring";
import { Card, StatusBadge } from "@/components/ui-bits";

const GROUPS = [
  { style: "legacy" as const, label: "Strict parsers", note: "Literal keyword matching — exact terms matter most." },
  { style: "semantic" as const, label: "Semantic readers", note: "Read context and transferable skills." },
];

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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Which ATS is the employer using?</h2>
        <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs text-accent-foreground">{Object.keys(ATS_SYSTEMS).length} engines simulated</span>
      </div>
      <p className="mb-5 text-xs text-muted-foreground">Every engine scores the same resume differently. Pick the one the employer runs — your score and formatting fixes change with it.</p>
      {GROUPS.map((g) => {
        const items = Object.entries(ATS_SYSTEMS).filter(([, x]) => x.style === g.style);
        return (
          <div key={g.label} className="mb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${g.style === "legacy" ? "bg-destructive" : "bg-success"}`} />
                <h3 className="text-sm font-medium">{g.label}</h3>
                <span className="font-mono text-[11px] text-muted-foreground">{items.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{g.note}</p>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {items.map(([name, x]) => (
                <button key={name} type="button" onClick={() => { setSys(name); window.__lovableEvents?.track?.("project.ats_system_selected", { system: name }); }} className={`rounded-md border p-3 text-left text-sm transition ${sys === name ? "border-primary bg-accent" : "bg-background hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{name}</span><span className="font-mono text-xs">{score(name).n ?? "—"}</span></div>
                  <div className="mt-2 h-1 rounded-full bg-muted"><div className={`h-1 rounded-full ${g.style === "legacy" ? "bg-destructive/70" : "bg-success/70"}`} style={{ width: `${x.flexibility}%` }} /></div>
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{x.how}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="rounded-md border bg-secondary p-3 text-sm">In <span className="font-medium">{sys}</span> you'd be rated: <StatusBadge status={cur.e.status} /> <span className="font-mono text-muted-foreground">{cur.n ?? "—"}</span></div>
      <h3 className="mt-4 text-sm font-medium">Formatting fixes for {sys}</h3>
      {risks.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No formatting issues that {sys} would trip on.</p> : (
        <ul className="mt-2 space-y-2">{risks.map((r) => (
          <li key={r.issue} className="rounded border p-2 text-sm"><span className="font-medium">{r.issue}</span><p className="text-muted-foreground">{r.fix}</p></li>))}</ul>)}
    </Card>
  );
}
