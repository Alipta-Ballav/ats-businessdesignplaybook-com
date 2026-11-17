import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { COMPETENCIES, DIM_NAMES, EVIDENCE_LABELS, competencyScore, evaluate, type Dimension } from "@/lib/scoring";
import { Bar, Card, ScoreRing, StatusBadge } from "@/components/ui-bits";

export const Route = createFileRoute("/report/$jobId/$candidateId")({
  head: () => ({ meta: [
    { title: "Candidate evaluation report — FutureTalent AI" },
    { name: "description", content: "Evidence-based evaluation across job readiness, future readiness and human potential." },
    { property: "og:title", content: "Candidate evaluation report — FutureTalent AI" },
    { property: "og:description", content: "Every score linked to its evidence." },
  ] }),
  component: Report,
});

const STATUSES: string[] = ["Strong alignment", "Promising transferable fit", "Requires further assessment", "Significant gaps identified"];

function Report() {
  const { jobId, candidateId } = Route.useParams();
  const { jobs, candidates } = useStore();
  const job = jobs.find((j) => j.id === jobId);
  const c = candidates.find((x) => x.id === candidateId);
  const [status, setStatus] = useState<string>("Strong alignment");
  const [why, setWhy] = useState("");
  if (!job || !c) return <p>Report not found. <Link to="/" className="underline">Back</Link></p>;
  const ev = evaluate(job, c);
  const gaps = COMPETENCIES.filter((x) => !c.competencies[x.id]);
  return (
    <div className="space-y-6">
      <Link to="/jobs/$jobId" params={{ jobId }} className="text-sm text-muted-foreground">← {job.title}</Link>
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl">{c.name}</h1>
          <p className="text-muted-foreground">{c.role} · {c.years} yrs · {c.domain}</p>
          <div className="mt-2"><StatusBadge status={ev.status} />{c.override && <span className="ml-2 text-xs text-muted-foreground">recruiter override</span>}</div>
        </div>
        <div className="flex gap-6">
          <ScoreRing value={ev.JR.score} label="Job Readiness" tone="jr" />
          <ScoreRing value={ev.FR.score} label="Future Readiness" tone="fr" />
          <ScoreRing value={ev.HP.score} label="Human Potential" tone="hp" />
          <ScoreRing value={ev.composite} label={`Overall · ${ev.coverage}% coverage`} tone="ink" />
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg">Mandatory requirements</h2>
        <ul className="grid gap-2 sm:grid-cols-3 text-sm">
          {ev.mand.map((m) => (
            <li key={m.name} className="rounded border p-2">
              <span className={m.accepted ? "text-success" : "text-destructive"}>{m.accepted ? "✓" : "!"}</span> {m.name}
              <div className="text-xs text-muted-foreground">{m.value === "transferable" ? (m.accepted ? "Accepted as transferable" : m.essential ? "Transferable only — essential, needs direct evidence" : "Transferable only — raise flexibility above 60 to accept") : m.value === "met" ? "Directly evidenced" : "Not evidenced — review"}</div>
            </li>
          ))}
        </ul>
      </Card>
      {(["JR", "FR", "HP"] as Dimension[]).map((d) => (
        <Card key={d}>
          <h2 className="mb-3 font-display text-lg">{DIM_NAMES[d]}</h2>
          <div className="space-y-4">
            {COMPETENCIES.filter((x) => x.dim === d).map((x) => {
              const e = c.competencies[x.id];
              const s = competencyScore(e, job.flexibility);
              return (
                <div key={x.id} className="grid gap-2 sm:grid-cols-[200px_1fr_60px] sm:items-start">
                  <span className="text-sm font-medium">{x.name}</span>
                  <div className="space-y-1">
                    <Bar value={s} tone={d.toLowerCase() as "jr" | "fr" | "hp"} />
                    {e ? <p className="text-xs text-muted-foreground">"{e.quote}" <span className="font-mono">— {e.source} · L{e.level} {EVIDENCE_LABELS[e.level]} · proficiency {e.proficiency}/5{e.transferable && " · transferable"}</span></p>
                      : <p className="text-xs text-muted-foreground italic">Not evidenced — does not mean the capability is absent.</p>}
                  </div>
                  <span className="font-mono text-sm sm:text-right">{s ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-display text-lg">Evidence gaps</h2>
          <p className="text-sm text-muted-foreground">{gaps.length ? gaps.map((g) => g.name).join(", ") : "None"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Consider a practical assessment to gather evidence for these.</p>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg">Your decision</h2>
          <p className="text-xs text-muted-foreground">System suggests: {ev.systemStatus}. Labels support, never replace, your judgement.</p>
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <textarea rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Why are you changing the recommendation?" value={why} onChange={(e) => setWhy(e.target.value)} />
          <button disabled={!why.trim()} onClick={() => { actions.overrideCandidate(c.id, status, why.trim()); setWhy(""); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Record override</button>
          {c.override && <p className="text-xs text-muted-foreground">Recorded {new Date(c.override.at).toLocaleString()}: "{c.override.rationale}"</p>}
        </Card>
      </div>
    </div>
  );
}
