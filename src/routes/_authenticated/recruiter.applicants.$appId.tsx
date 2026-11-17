import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { q } from "@/lib/db";
import { COMPETENCIES, evaluate } from "@/lib/scoring";
import { ScoreDetails, ScoreHeader } from "@/components/ScoreReport";
import { Card, StatusBadge } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/recruiter/applicants/$appId")({
  head: () => ({ meta: [{ title: "Applicant report — FutureTalent AI" }, { name: "description", content: "Evidence-based evaluation of an applicant." }, { property: "og:title", content: "Applicant report — FutureTalent AI" }, { property: "og:description", content: "Every score linked to its evidence." }] }),
  component: Report,
});
const STATUSES = ["Strong alignment", "Promising transferable fit", "Requires further assessment", "Significant gaps identified"];

function Report() {
  const { appId } = Route.useParams();
  const qc = useQueryClient();
  const { data: app, isLoading } = useQuery(q.application(appId));
  const { data: jr } = useQuery({ ...q.job(app?.cand.jobId ?? ""), enabled: !!app });
  const [status, setStatus] = useState(STATUSES[0]!); const [why, setWhy] = useState(""); const [showCv, setShowCv] = useState(false);
  if (isLoading || (app && !jr)) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!app || !jr) return <p>Report not found. <Link to="/recruiter" className="underline">Back</Link></p>;
  const { cand: c } = app; const job = jr.job;
  const ev = evaluate(job, c);
  const gaps = COMPETENCIES.filter((x) => !c.competencies[x.id]);
  const record = async () => {
    const { error } = await supabase.from("applications").update({ override_status: status, override_rationale: why.trim(), override_at: new Date().toISOString() }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setWhy(""); qc.invalidateQueries({ queryKey: ["app", appId] }); qc.invalidateQueries({ queryKey: ["apps"] }); toast.success("Decision recorded");
  };
  return (
    <div className="space-y-6">
      <Link to="/recruiter/jobs/$jobId" params={{ jobId: job.id }} className="text-sm text-muted-foreground">← {job.title}</Link>
      <Card className="flex flex-wrap items-center justify-between gap-6">
        <div><h1 className="font-display text-3xl">{c.name}</h1><p className="text-muted-foreground">{c.role} · {c.years} yrs · {c.domain}</p>
          <div className="mt-2"><StatusBadge status={ev.status} />{c.override && <span className="ml-2 text-xs text-muted-foreground">your decision</span>}</div></div>
        <ScoreHeader job={job} c={c} />
      </Card>
      <ScoreDetails job={job} c={c} audience="recruiter" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="mb-2 font-display text-lg">Evidence gaps</h2><p className="text-sm text-muted-foreground">{gaps.length ? gaps.map((g) => g.name).join(", ") : "None"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Consider an interview question or practical task to gather evidence for these.</p>
          <button className="mt-3 text-xs underline" onClick={() => setShowCv(!showCv)}>{showCv ? "Hide" : "Show"} original resume</button>
          {showCv && <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded border p-2 text-xs">{app.resume}</pre>}</Card>
        <Card className="space-y-3">
          <h2 className="font-display text-lg">Your decision</h2>
          <p className="text-xs text-muted-foreground">System suggests: {ev.systemStatus}. Labels support, never replace, your judgement.</p>
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          <textarea rows={3} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Why? (required, kept for audit)" value={why} onChange={(e) => setWhy(e.target.value)} />
          <button disabled={!why.trim()} onClick={record} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Record decision</button>
          {c.override && <p className="text-xs text-muted-foreground">Recorded {new Date(c.override.at).toLocaleString()}: "{c.override.rationale}"</p>}
        </Card>
      </div>
    </div>
  );
}
