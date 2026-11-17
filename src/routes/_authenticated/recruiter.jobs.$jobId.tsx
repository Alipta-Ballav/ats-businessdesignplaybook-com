import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { q, must } from "@/lib/db";
import { readResume } from "@/lib/evaluate.functions";
import { competencyScore, evaluate, type Job } from "@/lib/scoring";
import { EvalConfig } from "@/components/EvalConfig";
import { ResumeInput } from "@/components/ResumeInput";
import { Card, StatusBadge } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Applicant comparison — FutureTalent AI" }, { name: "description", content: "Compare applicants on job readiness, future readiness and human potential." }, { property: "og:title", content: "Applicant comparison — FutureTalent AI" }, { property: "og:description", content: "Rank and compare applicants with explainable evidence." }] }),
  component: JobPage,
});
type Rank = "composite" | "JR" | "FR";

function JobPage() {
  const { jobId } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(q.job(jobId));
  const { data: cands = [] } = useQuery(q.applicants(jobId));
  const [job, setJob] = useState<Job | null>(null);
  const [rank, setRank] = useState<Rank>("composite");
  const [adding, setAdding] = useState(false);
  const [resume, setResume] = useState(""); const [busy, setBusy] = useState(false);
  const read = useServerFn(readResume);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { if (data) setJob(data.job); }, [data]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || !job) return <p>Role not found. <Link to="/recruiter" className="underline">Back to dashboard</Link></p>;

  const update = (j: Job) => {
    setJob(j);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await supabase.from("jobs").update({ flexibility: j.flexibility, preset: j.preset, weights: j.weights, func: j.func, seniority: j.seniority }).eq("id", j.id);
      if (error) toast.error(error.message);
    }, 500);
  };
  const addApplicant = async () => {
    setBusy(true);
    try {
      const ex = await read({ data: { resume, jobTitle: job.title, jobDescription: job.description, requirements: job.mandatory } });
      must(await supabase.from("applications").insert({ job_id: job.id, name: ex.name, job_role: ex.role, years: ex.years, domain: ex.domain, resume_text: resume, evidence: { mandatory: ex.mandatory, competencies: ex.competencies } }));
      await qc.invalidateQueries({ queryKey: ["apps"] });
      setResume(""); setAdding(false); toast.success(`${ex.name} evaluated`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const rows = cands.map((c) => ({ c, ev: evaluate(job, c) }));
  const key = (r: (typeof rows)[number]) => (rank === "composite" ? r.ev.composite : r.ev[rank].score) ?? -1;
  rows.sort((a, b) => key(b) - key(a));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Link to="/recruiter" className="text-sm text-muted-foreground">← Your roles</Link>
          <h1 className="font-display text-3xl">{job.title}</h1>
          <p className="text-sm text-muted-foreground">{job.func} · {job.seniority} · public link: <Link to="/roles/$jobId" params={{ jobId }} className="underline">candidate page</Link></p></div>
        <button onClick={() => setAdding(!adding)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">+ Add applicant</button>
      </div>
      {adding && (
        <Card className="space-y-3">
          <ResumeInput value={resume} onChange={setResume} />
          <button disabled={busy || resume.trim().length < 80} onClick={addApplicant} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">{busy ? "Reading resume… (about 30s)" : "Evaluate applicant"}</button>
          <p className="text-xs text-muted-foreground">AI only finds evidence quotes in the resume. All scores are calculated by fixed, transparent rules.</p>
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <h2 className="mb-4 font-display text-lg">Evaluation policy</h2>
          <EvalConfig job={job} onChange={update} />
          <div className="mt-5 text-sm">
            <p className="font-medium">Must-haves</p>
            <ul className="list-disc pl-5 text-muted-foreground">{job.mandatory.map((m) => <li key={m.name}>{m.name}{m.essential && " (essential)"}</li>)}</ul>
            {job.preferred.length > 0 && <><p className="mt-3 font-medium">Preferred</p><p className="text-muted-foreground">{job.preferred.join(", ")}</p></>}
          </div>
        </Card>
        <Card className="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg">Applicant comparison</h2>
            <div className="flex gap-1 text-xs">{([["composite", "Best overall"], ["JR", "Best current fit"], ["FR", "Best future-ready"]] as [Rank, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setRank(k)} className={`rounded px-2 py-1 ${rank === k ? "bg-primary text-primary-foreground" : "border"}`}>{l}</button>))}</div>
          </div>
          {rows.length === 0 ? <p className="text-sm text-muted-foreground">No applicants yet. Add a resume, or share the candidate page so people can apply.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="pb-2">Applicant</th><th>Job</th><th>Future</th><th>Potential</th><th>AI</th><th>Learning</th><th>Coverage</th><th>Must-haves</th><th>Overall</th></tr></thead>
              <tbody>{rows.map(({ c, ev }) => (
                <tr key={c.id} className="border-t align-top">
                  <td className="py-3 pr-2"><Link to="/recruiter/applicants/$appId" params={{ appId: c.id }} className="font-medium hover:underline">{c.name}</Link>
                    <div className="text-xs text-muted-foreground">{c.role}</div><div className="mt-1"><StatusBadge status={ev.status} /></div></td>
                  {[ev.JR.score, ev.FR.score, ev.HP.score, competencyScore(c.competencies["ai"], job.flexibility), competencyScore(c.competencies["learning"], job.flexibility)].map((v, i) => <td key={i} className="py-3 font-mono">{v ?? "—"}</td>)}
                  <td className="py-3 font-mono">{ev.coverage}%</td>
                  <td className="py-3">{ev.mandatoryOk ? <span className="text-success">Met</span> : <span className="text-destructive">Review</span>}</td>
                  <td className="py-3 font-mono font-semibold">{ev.composite ?? "—"}</td>
                </tr>))}</tbody>
            </table>)}
          <p className="mt-4 text-xs text-muted-foreground">"—" means not enough evidence to score. Rankings support your decision; open a report to check the evidence.</p>
        </Card>
      </div>
    </div>
  );
}
