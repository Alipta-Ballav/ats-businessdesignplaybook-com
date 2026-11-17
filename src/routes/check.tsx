import { JobUrlImport } from "@/components/JobUrlImport";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { q } from "@/lib/db";
import { readResumeGuest } from "@/lib/evaluate.functions";
import { evaluate, type Candidate, type Job } from "@/lib/scoring";
import { resumeTips } from "@/lib/tips";
import { loadGuestScan, saveGuestScan, type GuestScan } from "@/lib/guest-scan";
import { ResumeInput } from "@/components/ResumeInput";
import { ScoreDetails, ScoreHeader } from "@/components/ScoreReport";
import { Card, StatusBadge } from "@/components/ui-bits";
import { AtsSimulator } from "@/components/AtsSimulator";

export const Route = createFileRoute("/check")({
  validateSearch: (s: Record<string, unknown>): { job?: string | undefined } => ({ job: typeof s["job"] === "string" ? s["job"] : undefined }),
  head: () => ({ meta: [
    { title: "Free resume score check — FutureTalent AI" },
    { name: "description", content: "Paste your resume and a job posting to get an evidence-based fit report. No sign-up needed." },
    { property: "og:title", content: "Free resume score check — FutureTalent AI" },
    { property: "og:description", content: "See your fit score and what to fix — no account required." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CheckPage,
});
const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function toPair(g: GuestScan): { job: Job; cand: Candidate } {
  const e = g.evidence;
  const job: Job = { id: g.jobId ?? "guest", title: g.jobTitle, func: "", seniority: "", description: g.jobDescription, flexibility: 50, preset: "Balanced Match", weights: { JR: 30, FR: 40, HP: 30 }, mandatory: e.requirements, preferred: [], createdAt: g.createdAt };
  return { job, cand: { id: "guest", jobId: job.id, name: e.name, role: e.role, years: e.years, domain: e.domain, mandatory: e.mandatory, competencies: e.competencies } };
}

function CheckPage() {
  const { job: jobParam } = Route.useSearch();
  const { data: picked } = useQuery({ ...q.job(jobParam ?? ""), enabled: !!jobParam });
  const [title, setTitle] = useState(""); const [jd, setJd] = useState(""); const [resume, setResume] = useState("");
  const [busy, setBusy] = useState(false); const [result, setResult] = useState<GuestScan | null>(null);
  const read = useServerFn(readResumeGuest);
  useEffect(() => { if (picked) { setTitle(picked.job.title); setJd(picked.job.description); } }, [picked]);
  useEffect(() => { const g = loadGuestScan(); if (g && !jobParam) { setResult(g); setTitle(g.jobTitle); setJd(g.jobDescription); setResume(g.resume); } }, [jobParam]);

  const run = async () => {
    setBusy(true);
    try {
      const ev = await read({ data: { resume, jobTitle: title, jobDescription: jd, requirements: picked?.job.mandatory ?? [] } });
      const g: GuestScan = { jobId: picked?.job.id ?? null, jobTitle: title, jobDescription: jd, resume, evidence: ev, createdAt: new Date().toISOString() };
      saveGuestScan(g); setResult(g); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  if (result) {
    const { job, cand } = toPair(result); const ev = evaluate(job, cand); const tips = resumeTips(job, cand);
    const signup = { mode: "signup" as const, as: "candidate" as const, redirect: "/candidate" };
    return (
      <div className="space-y-6">
        <button onClick={() => setResult(null)} className="text-sm text-muted-foreground">← Check another role</button>
        <Card className="flex flex-wrap items-center justify-between gap-6">
          <div><p className="text-sm text-muted-foreground">Your fit for</p><h1 className="font-display text-3xl">{result.jobTitle}</h1>
            <div className="mt-2"><StatusBadge status={ev.status} /></div></div>
          <ScoreHeader job={job} c={cand} />
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary">
          <div><p className="font-display text-lg">Save this report and start fixing your resume</p>
            <p className="text-sm text-muted-foreground">Create a free account to keep this result, re-check after edits{result.jobId ? " and apply with your evidence report" : ""}.</p></div>
          <div className="flex gap-2">
            <Link to="/auth" search={signup} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign up free</Link>
            <Link to="/auth" search={{ ...signup, mode: "signin" }} className="rounded-md border px-4 py-2 text-sm">Sign in</Link>
          </div>
        </Card>
        <Card>
          <h2 className="mb-1 font-display text-lg">What to improve</h2>
          <p className="mb-4 text-xs text-muted-foreground">Ordered by impact.</p>
          {tips.length === 0 ? <p className="text-sm">Your resume shows strong evidence across the board.</p> : (
            <ul className="space-y-3">{tips.slice(0, 10).map((t, i) => (
              <li key={i} className="rounded border p-3 text-sm"><span className="font-medium">{t.title}</span><p className="mt-1 text-muted-foreground">{t.detail}</p></li>))}</ul>)}
        </Card>
        <AtsSimulator job={job} c={cand} />
        <ScoreDetails job={job} c={cand} audience="candidate" />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Free · no sign-up needed</p>
        <h1 className="mt-2 font-display text-4xl">Check your resume against a role</h1></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-display text-lg">The role</h2><Link to="/roles" className="text-xs underline">Pick from open roles</Link></div>
          <JobUrlImport onImport={(t, d) => { setTitle(t); setJd(d); }} />
          <label className="block text-sm">Job title<input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Designer" /></label>
          <label className="block text-sm">Job description<textarea rows={10} className={input} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job posting you're targeting…" /></label>
        </Card>
        <Card><ResumeInput value={resume} onChange={setResume} /></Card>
      </div>
      <button disabled={busy || !title.trim() || jd.trim().length < 40 || resume.trim().length < 80} onClick={run} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">{busy ? "Reading your resume… (about 30s)" : "Get my score"}</button>
    </div>
  );
}
