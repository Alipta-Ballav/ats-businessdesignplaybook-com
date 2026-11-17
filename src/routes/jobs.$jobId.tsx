import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { competencyScore, evaluate } from "@/lib/scoring";
import { EvalConfig } from "@/components/EvalConfig";
import { Card, StatusBadge } from "@/components/ui-bits";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () => ({ meta: [
    { title: "Role candidates — FutureTalent AI" },
    { name: "description", content: "Compare candidates for this role on job readiness, future readiness and human potential." },
    { property: "og:title", content: "Candidate comparison — FutureTalent AI" },
    { property: "og:description", content: "Rank and compare candidates with explainable evidence." },
  ] }),
  component: JobPage,
});

type Rank = "composite" | "JR" | "FR";

function JobPage() {
  const { jobId } = Route.useParams();
  const { jobs, candidates } = useStore();
  const job = jobs.find((j) => j.id === jobId);
  const [rank, setRank] = useState<Rank>("composite");
  if (!job) return <p>Role not found. <Link to="/" className="underline">Back to dashboard</Link></p>;
  const rows = candidates.filter((c) => c.jobId === job.id).map((c) => ({ c, ev: evaluate(job, c) }));
  const key = (r: (typeof rows)[number]) => (rank === "composite" ? r.ev.composite : r.ev[rank].score) ?? -1;
  rows.sort((a, b) => key(b) - key(a));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{job.func} · {job.seniority}</p>
        <h1 className="font-display text-3xl">{job.title}</h1>
        {job.description && <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{job.description}</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <h2 className="mb-4 font-display text-lg">Evaluation policy</h2>
          <EvalConfig job={job} onChange={actions.updateJob} />
          <div className="mt-5 text-sm">
            <p className="font-medium">Mandatory</p>
            <ul className="list-disc pl-5 text-muted-foreground">{job.mandatory.map((m) => <li key={m.name}>{m.name}{m.essential && " (essential)"}</li>)}</ul>
            {job.preferred.length > 0 && <><p className="mt-3 font-medium">Preferred</p><p className="text-muted-foreground">{job.preferred.join(", ")}</p></>}
          </div>
        </Card>
        <Card className="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg">Candidate comparison</h2>
            <div className="flex gap-1 text-xs">
              {([["composite", "Best overall"], ["JR", "Best current fit"], ["FR", "Best future-ready"]] as [Rank, string][]).map(([k, l]) => (
                <button key={k} onClick={() => setRank(k)} className={`rounded px-2 py-1 ${rank === k ? "bg-primary text-primary-foreground" : "border"}`}>{l}</button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No candidates yet for this role.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2">Candidate</th><th>Job</th><th>Future</th><th>Potential</th><th>AI</th><th>Systems</th><th>Learning</th><th>Coverage</th><th>Mandatory</th><th>Overall</th>
            </tr></thead>
            <tbody>
              {rows.map(({ c, ev }) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="py-3 pr-2">
                    <Link to="/report/$jobId/$candidateId" params={{ jobId: job.id, candidateId: c.id }} className="font-medium underline-offset-2 hover:underline">{c.name}</Link>
                    <div className="text-xs text-muted-foreground">{c.role}</div>
                    <div className="mt-1"><StatusBadge status={ev.status} /></div>
                  </td>
                  {[ev.JR.score, ev.FR.score, ev.HP.score, competencyScore(c.competencies.ai, job.flexibility), competencyScore(c.competencies.systems, job.flexibility), competencyScore(c.competencies.learning, job.flexibility)].map((v, i) => (
                    <td key={i} className="py-3 font-mono">{v ?? "—"}</td>
                  ))}
                  <td className="py-3 font-mono">{ev.coverage}%</td>
                  <td className="py-3">{ev.mandatoryOk ? <span className="text-success">Met</span> : <span className="text-destructive">Review</span>}</td>
                  <td className="py-3 font-mono font-semibold">{ev.composite ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>)}
          <p className="mt-4 text-xs text-muted-foreground">"—" means not enough evidence to score. Rankings support your decision; open a report to check the evidence before acting.</p>
        </Card>
      </div>
    </div>
  );
}
