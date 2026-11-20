import { JobDiagnostics } from "@/components/JobDiagnostics";
import { LiveEditor } from "@/components/LiveEditor";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { q } from "@/lib/db";
import { readResumeGuest } from "@/lib/evaluate.functions";
import { evaluate, type Candidate, type Job } from "@/lib/scoring";
import { resumeTips } from "@/lib/tips";
import { clearGuestScan, saveGuestScan, type GuestScan } from "@/lib/guest-scan";
import { ResumeInput } from "@/components/ResumeInput";
import { ScoreDetails, ScoreHeader } from "@/components/ScoreReport";
import { Card, StatusBadge } from "@/components/ui-bits";
import { AtsSimulator } from "@/components/AtsSimulator";
import { AtsTarget } from "@/components/AtsTarget";
import { FtiReport } from "@/components/FtiReport";
import { ReportTabs } from "@/components/ReportTabs";
import { BusinessPlaybook } from "@/components/BusinessPlaybook";
import { PaywallModal } from "@/components/PaywallModal";
import { usePro } from "@/lib/pro";
import { FREE_SCANS, canScan, countScan, scansUsed } from "@/lib/plans";

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
  const [busy, setBusy] = useState(false); const [mode, setMode] = useState<"profile" | "role">("profile"); const [result, setResult] = useState<GuestScan | null>(null);
  const read = useServerFn(readResumeGuest);
  const pro = usePro(); const [wall, setWall] = useState(false); const [used, setUsed] = useState(0);
  useEffect(() => { setUsed(scansUsed()); }, []);
  useEffect(() => { if (picked) { setMode("role"); setTitle(picked.job.title); setJd(picked.job.description); } }, [picked]);
  useEffect(() => { clearGuestScan(); }, []);

  const run = async () => {
    if (!canScan(scansUsed(), pro)) { window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "scan" }); setWall(true); return; }
    setBusy(true);
    try {
      const prof = mode === "profile";
      const jt = prof ? "Future Talent Index" : title, jdesc = prof ? "" : jd;
      window.__lovableEvents?.track?.("project.scan_started", { mode: prof ? "generic" : "job_target" });
      const ev = await read({ data: { resume, jobTitle: jt, jobDescription: jdesc, requirements: prof ? [] : picked?.job.mandatory ?? [] } });
      const g: GuestScan = { jobId: prof ? null : picked?.job.id ?? null, jobTitle: jt, jobDescription: jdesc, resume, evidence: ev, createdAt: new Date().toISOString() };
      saveGuestScan(g); countScan(); setUsed(scansUsed()); setResult(g); window.__lovableEvents?.track?.("project.report_opened", { mode: prof ? "generic" : "job_target", audience: "candidate", competencies: Object.keys(ev.competencies).length }); window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  if (result) {
    const { job, cand } = toPair(result); const ev = evaluate(job, cand); const tips = resumeTips(job, cand);
    const signup = { mode: "signup" as const, as: "candidate" as const, redirect: "/candidate" };
    if (!result.jobDescription.trim()) return (
      <div className="space-y-6">
        <button onClick={() => { clearGuestScan(); setResult(null); setResume(""); }} className="text-sm text-muted-foreground">← Check again</button>
        <FtiReport c={cand} />
        <BusinessPlaybook />
        <LiveEditor job={job} cand={cand} resume={result.resume} />
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary">
          <div><p className="font-display text-lg">Now test your fit for a specific role</p><p className="text-sm text-muted-foreground">Paste a job description to see must-haves and ATS scores.</p></div>
          <button onClick={() => { setResult(null); setMode("role"); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Check against a job</button>
        </Card>
      </div>
    );
    return (
      <div className="space-y-6">
        <button onClick={() => { clearGuestScan(); setResult(null); setResume(""); }} className="text-sm text-muted-foreground">← Check another role</button>
        <Card className="flex flex-wrap items-center justify-between gap-6">
          <div><p className="text-sm text-muted-foreground">Your fit for</p><h1 className="font-display text-3xl">{result.jobTitle}</h1>
            <div className="mt-2"><StatusBadge status={ev.status} /></div></div>
          <ScoreHeader job={job} c={cand} />
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary">
          <div><p className="font-display text-lg">Save this report and start fixing your resume</p>
            <p className="text-sm text-muted-foreground">Create a free account to keep this result, re-check after edits.</p></div>
          <div className="flex gap-2">
            <Link to="/auth" search={signup} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Sign up free</Link>
            <Link to="/auth" search={{ ...signup, mode: "signin" }} className="rounded-md border px-4 py-2 text-sm">Sign in</Link>
          </div>
        </Card>
        <BusinessPlaybook />
        <ReportTabs tabs={[
          { id: "fix", label: "Fix & rescore", content: <>
            <LiveEditor job={job} cand={cand} resume={result.resume} />
            <Card>
              <h2 className="mb-1 font-display text-lg">What to improve</h2>
              <p className="mb-4 text-xs text-muted-foreground">Ordered by impact.</p>
              {tips.length === 0 ? <p className="text-sm">Your resume shows strong evidence across the board.</p> : (
                <ol className="divide-y">{tips.slice(0, 6).map((t, i) => (
                  <li key={i} className="flex gap-4 py-3 text-sm"><span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span><div><p className="font-medium">{t.title}</p><p className="mt-0.5 text-muted-foreground">{t.detail}</p></div></li>))}</ol>)}
            </Card></> },
          { id: "profile", label: "Talent profile", content: <FtiReport c={cand} /> },
          { id: "ats", label: "8 ATS engines", content: <><AtsTarget job={job} c={cand} resume={result.resume ?? ""} /><AtsSimulator job={job} c={cand} /></> },
          { id: "role", label: "The role", content: <JobDiagnostics title={result.jobTitle} description={result.jobDescription} /> },
          { id: "evidence", label: "Evidence", content: <ScoreDetails job={job} c={cand} audience="candidate" /> },
        ]} />
      </div>
    );
  }
  const ready = resume.trim().length >= 80 && (mode === "profile" || (title.trim() && jd.trim().length >= 40));
  return (
    <div className="mx-auto max-w-5xl space-y-10 py-6">
      <header className="space-y-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Built for UX, product & design leaders</span>
        <h1 className="text-4xl md:text-5xl">Score your design resume</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">Every point is backed by a quote from your own resume. Choose how you want to be scored.</p>
      </header>

      <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
        {([["profile", "01", "Generic resume score", "Resume only — how strong is it overall?"], ["role", "02", "Score against a job", "Resume + job post — will you pass the ATS?"]] as const).map(([m, n, t, d]) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-xl border p-5 text-left transition ${mode === m ? "border-primary bg-card shadow-glow" : "bg-card/50 hover:border-primary/40"}`}>
            <span className={`font-mono text-xs ${mode === m ? "text-primary" : "text-muted-foreground"}`}>{n}</span>
            <span className="mt-2 block font-medium">{t}</span><span className="mt-1 block text-sm text-muted-foreground">{d}</span></button>))}
      </div>

      <div className={mode === "role" ? "grid gap-6 lg:grid-cols-2" : "mx-auto max-w-3xl"}>
        {mode === "role" && <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sheet">
          <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Step 1</p><h2 className="mt-1 text-lg">The target role</h2></div>
          <label className="block space-y-1.5 text-sm font-medium">Job title<input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Product Designer" /></label>
          <label className="block space-y-1.5 text-sm font-medium">Job description<textarea rows={10} className={input} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job posting you're targeting…" /></label>
          <JobDiagnostics title={title} description={jd} />
        </div>}
        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sheet">
          <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{mode === "role" ? "Step 2" : "Your resume"}</p><h2 className="mt-1 text-lg">Upload or paste your resume</h2></div>
          <ResumeInput value={resume} onChange={setResume} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button disabled={busy || !ready} onClick={run} className="w-full max-w-sm rounded-lg bg-gradient-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition disabled:opacity-40 disabled:shadow-none">{busy ? "Reading your resume… (about 30s)" : "Get my score →"}</button>
        {!pro && <p className="text-xs text-muted-foreground">{Math.max(0, FREE_SCANS - used)} of {FREE_SCANS} free scan left · then ₹49 once unlocks everything</p>}
      </div>
      <PaywallModal open={wall} onOpenChange={setWall} reason={"You have used your free scan. Pay ₹49 once to unlock unlimited scans, all fixes and the Word download."} />
    </div>
  );
}
