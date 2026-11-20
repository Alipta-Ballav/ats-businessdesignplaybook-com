import { JobDiagnostics } from "@/components/JobDiagnostics";
import { ResumeFixer } from "@/components/ResumeFixer";
import { FtiReport } from "@/components/FtiReport";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q, scanToPair } from "@/lib/db";
import { evaluate } from "@/lib/scoring";
import { resumeTips } from "@/lib/tips";
import { ScoreDetails, ScoreHeader } from "@/components/ScoreReport";
import { Card, StatusBadge } from "@/components/ui-bits";
import { AtsSimulator } from "@/components/AtsSimulator";
import { AtsTarget } from "@/components/AtsTarget";

export const Route = createFileRoute("/_authenticated/candidate/scans/$scanId")({
  head: () => ({ meta: [{ title: "Your resume score — FutureTalent AI" }, { name: "description", content: "Your scores, the evidence behind them, and how to improve." }, { property: "og:title", content: "Your resume score — FutureTalent AI" }, { property: "og:description", content: "Your scores, the evidence behind them, and how to improve." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ScanResult,
});

function ScanResult() {
  const { scanId } = Route.useParams();
  const { data: s, isLoading } = useQuery(q.scan(scanId));
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!s) return <p>Result not found. <Link to="/candidate" className="underline">Back</Link></p>;
  const { job, cand } = scanToPair(s);
  const ev = evaluate(job, cand);
  const tips = resumeTips(job, cand);
  if (!s.job_description.trim()) return <div className="space-y-6"><Link to="/candidate" className="text-sm text-muted-foreground">← New check</Link><FtiReport c={cand} /><ResumeFixer job={job} cand={cand} resume={s.resume_text ?? ""} /></div>;
  return (
    <div className="space-y-6">
      <Link to="/candidate" className="text-sm text-muted-foreground">← New check</Link>
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div><p className="text-sm text-muted-foreground">Your fit for</p><h1 className="font-display text-3xl">{s.job_title}</h1>
          <div className="mt-2"><StatusBadge status={ev.status} /></div>
        </div>
        <ScoreHeader job={job} c={cand} />
      </Card>
      <Card>
        <h2 className="mb-1 font-display text-lg">How to improve your resume</h2>
        <p className="mb-4 text-xs text-muted-foreground">Ordered by impact. Re-run the check after editing to see your new score.</p>
        {tips.length === 0 ? <p className="text-sm">Your resume shows strong evidence across the board.</p> : (
          <ul className="space-y-3">{tips.slice(0, 10).map((t, i) => (
            <li key={i} className="rounded border p-3 text-sm">
              <span className={`mr-2 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${t.kind === "requirement" ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>{t.kind === "requirement" ? "must-have" : t.kind}</span>
              <span className="font-medium">{t.title}</span><p className="mt-1 text-muted-foreground">{t.detail}</p>
            </li>))}</ul>)}
      </Card>
      <JobDiagnostics title={s.job_title} description={s.job_description} />
      <ResumeFixer job={job} cand={cand} resume={s.resume_text ?? ""} />
      <FtiReport c={cand} />
      <AtsTarget job={job} c={cand} resume={s.resume_text ?? ""} />
        <AtsSimulator job={job} c={cand} />
      <ScoreDetails job={job} c={cand} audience="candidate" />
      <p className="text-xs text-muted-foreground">Scores use a balanced policy. Each employer may weigh things differently. AI only finds quotes from your resume; scores come from fixed, published rules.</p>
    </div>
  );
}
