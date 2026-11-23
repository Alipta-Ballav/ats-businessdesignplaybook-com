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
import { usePro, passAllowance, recordPassScan } from "@/lib/pro";
import { FREE_SCANS, canScan, countScan, scansUsed } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Loader2, ScanText, Target } from "lucide-react";

export const Route = createFileRoute("/check")({
  validateSearch: (s: Record<string, unknown>): { job?: string | undefined } => ({ job: typeof s["job"] === "string" ? s["job"] : undefined }),
  head: () => ({ meta: [
    { title: "Free resume score check — FutureTalent AI" },
    { name: "description", content: "Upload a PDF or Word design resume for your free evidence-based ATS score. Continue with a ₹99, 30-day Job Hunt Pass." },
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
  const [left, setLeft] = useState<number | null>(0);
  useEffect(() => { setUsed(scansUsed()); }, []);
  useEffect(() => { if (pro) void passAllowance().then(setLeft); }, [pro]);
  useEffect(() => { if (picked) { setMode("role"); setTitle(picked.job.title); setJd(picked.job.description); } }, [picked]);
  useEffect(() => { clearGuestScan(); }, []);

  const run = async () => {
    const allowance = pro ? await passAllowance() : 0;
    const freeLeft = scansUsed() < FREE_SCANS;
    const paidOk = pro && (allowance === null || allowance > 0);
    if (pro && !paidOk && !freeLeft) { toast.error("You've used all 5 scans in your Job Hunt Pass. Your pass still covers rescoring and Word downloads."); return; }
    if (!canScan(scansUsed(), pro)) { window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "scan" }); setWall(true); return; }
    setBusy(true);
    try {
      const prof = mode === "profile";
      const jt = prof ? "Future Talent Index" : title, jdesc = prof ? "" : jd;
      window.__lovableEvents?.track?.("project.scan_started", { mode: prof ? "generic" : "job_target" });
      const ev = await read({ data: { resume, jobTitle: jt, jobDescription: jdesc, requirements: prof ? [] : picked?.job.mandatory ?? [] } });
      const g: GuestScan = { jobId: prof ? null : picked?.job.id ?? null, jobTitle: jt, jobDescription: jdesc, resume, evidence: ev, createdAt: new Date().toISOString() };
      saveGuestScan(g); if (pro && !freeLeft && allowance !== null) { await recordPassScan(); setLeft(await passAllowance()); } countScan(); setUsed(scansUsed()); setResult(g); window.__lovableEvents?.track?.("project.report_opened", { mode: prof ? "generic" : "job_target", audience: "candidate", competencies: Object.keys(ev.competencies).length }); window.scrollTo({ top: 0, behavior: "smooth" });
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
    <div className="mx-auto max-w-4xl space-y-3 sm:space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl sm:text-3xl">Score your design resume</h1><span className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" />Every score backed by your own words</span></div>
        <p className="text-sm text-muted-foreground">Your craft, research and impact — evaluated across 8 design dimensions.</p>
      </header>

      <div role="group" aria-label="Scoring mode" className="inline-flex max-w-full gap-1 rounded-lg border bg-secondary p-1">
        <Button size="sm" variant={mode === "profile" ? "outline" : "ghost"} aria-pressed={mode === "profile"} onClick={() => setMode("profile")} className="text-xs sm:text-sm"><ScanText />Profile audit</Button>
        <Button size="sm" variant={mode === "role" ? "outline" : "ghost"} aria-pressed={mode === "role"} onClick={() => setMode("role")} className="text-xs sm:text-sm"><Target />Match to a job</Button>
      </div>

      <div className={`grid gap-3 border-y py-3 sm:gap-5 sm:py-5 ${mode === "role" ? "sm:grid-cols-2" : ""}`}>
        <section className="min-w-0 space-y-3">
          <div className="flex items-baseline justify-between gap-2"><h2 className="text-sm font-semibold">Your resume</h2><span className="text-xs text-muted-foreground">{mode === "profile" ? "Profile audit" : "1 of 2"}</span></div>
          <ResumeInput value={resume} onChange={setResume} compact />
        </section>
        {mode === "role" && <section className="min-w-0 space-y-3 sm:border-l sm:pl-5">
          <div className="flex items-baseline justify-between gap-2"><h2 className="text-sm font-semibold">Target job</h2><span className="text-xs text-muted-foreground">2 of 2</span></div>
          <input aria-label="Job title" className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title · e.g. Senior Product Designer" />
          <textarea aria-label="Job description" className={`${input} h-24 resize-none focus:outline-none focus:ring-1 focus:ring-ring sm:h-28`} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description…" />
        </section>}
      </div>

      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-xs font-medium">{pro ? left === null ? "No score limit on this account" : `${left} of 5 verified scores left` : used < FREE_SCANS ? "1 free scan · No credit card required" : "₹99 Job Hunt Pass · All features for 30 days"}</p>
          <p className="text-xs text-muted-foreground">{pro ? "5 verified scores (new resumes or rescores) · AI rewrites · Word exports" : "Then ₹99: 5 verified scores (new resumes or rescores) for 30 days · No auto-renewal"}</p>
        </div>
        <Button size="lg" disabled={busy || !ready} onClick={run} className="w-full shrink-0 sm:w-auto">{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}{busy ? "Reading your resume…" : pro ? (left === null ? "Get my score" : `Get my score · ${left} of 5 scans left`) : used < FREE_SCANS ? "Get my free score" : "Get my score · ₹99 pass"}</Button>
      </div>
      {busy && <p role="status" className="text-xs text-muted-foreground">Checking your evidence. This usually takes about 30 seconds.</p>}
      <PaywallModal open={wall} onOpenChange={setWall} reason="You have used your free scan. The ₹99 Job Hunt Pass unlocks 5 scans, AI rewrites, verified rescoring and Word downloads for 30 days." />
    </div>
  );
}
