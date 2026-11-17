import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { q, scanToPair } from "@/lib/db";
import { evaluate } from "@/lib/scoring";
import { resumeTips } from "@/lib/tips";
import { ScoreDetails, ScoreHeader } from "@/components/ScoreReport";
import { Card, StatusBadge } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/candidate/scans/$scanId")({
  head: () => ({ meta: [{ title: "Your resume score — FutureTalent AI" }, { name: "description", content: "Your scores, the evidence behind them, and how to improve." }, { property: "og:title", content: "Your resume score — FutureTalent AI" }, { property: "og:description", content: "Your scores, the evidence behind them, and how to improve." }] }),
  component: ScanResult,
});

function ScanResult() {
  const { scanId } = Route.useParams();
  const qc = useQueryClient();
  const { data: me } = useQuery(q.me());
  const { data: s, isLoading } = useQuery(q.scan(scanId));
  const { data: mine = [] } = useQuery({ ...q.myApplications(me?.id ?? ""), enabled: !!me });
  const [busy, setBusy] = useState(false);
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!s) return <p>Result not found. <Link to="/candidate" className="underline">Back</Link></p>;
  const { job, cand } = scanToPair(s);
  const ev = evaluate(job, cand);
  const tips = resumeTips(job, cand);
  const applied = s.job_id && mine.some((a) => a.job_id === s.job_id);
  const apply = async () => {
    if (!me || !s.job_id) return; setBusy(true);
    const { error } = await supabase.from("applications").insert({ job_id: s.job_id, candidate_user_id: me.id, name: me.name || cand.name, job_role: cand.role, years: cand.years, domain: cand.domain, resume_text: s.resume_text, evidence: { mandatory: cand.mandatory, competencies: cand.competencies } });
    setBusy(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["apps"] }); toast.success("Application sent with your evidence report");
  };
  return (
    <div className="space-y-6">
      <Link to="/candidate" className="text-sm text-muted-foreground">← New check</Link>
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div><p className="text-sm text-muted-foreground">Your fit for</p><h1 className="font-display text-3xl">{s.job_title}</h1>
          <div className="mt-2"><StatusBadge status={ev.status} /></div>
          {s.job_id && (applied ? <p className="mt-3 text-sm text-success">✓ You've applied to this role</p>
            : <button disabled={busy} onClick={apply} className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">Apply with this report</button>)}
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
      <ScoreDetails job={job} c={cand} audience="candidate" />
      <p className="text-xs text-muted-foreground">Scores use a balanced policy. Each employer may weigh things differently. AI only finds quotes from your resume; scores come from fixed, published rules.</p>
    </div>
  );
}
