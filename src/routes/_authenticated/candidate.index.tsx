import { JobDiagnostics } from "@/components/JobDiagnostics";
import { CareerNav } from "@/components/CareerNav";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { clearGuestScan, loadGuestScan } from "@/lib/guest-scan";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { q, must, scanToPair } from "@/lib/db";
import { readResume } from "@/lib/evaluate.functions";
import { evaluate } from "@/lib/scoring";
import { ResumeInput } from "@/components/ResumeInput";
import { Card, StatusBadge } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/candidate/")({
  validateSearch: (s: Record<string, unknown>): { job?: string | undefined } => ({ job: typeof s["job"] === "string" ? s["job"] : undefined }),
  head: () => ({ meta: [{ title: "Check my resume — FutureTalent AI" }, { name: "description", content: "See how your resume scores for a role and exactly what to improve." }, { property: "og:title", content: "Check my resume — FutureTalent AI" }, { property: "og:description", content: "Evidence-based resume scoring with fix-it tips." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: CandidateHome,
});
const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function CandidateHome() {
  const { job: jobParam } = Route.useSearch();
  const nav = useNavigate();
  const { data: me } = useQuery(q.me());
  const { data: scans = [] } = useQuery({ ...q.scans(me?.id ?? ""), enabled: !!me });
  const { data: picked } = useQuery({ ...q.job(jobParam ?? ""), enabled: !!jobParam });
  const [mode, setMode] = useState<"profile" | "role">("profile");
  const [title, setTitle] = useState(""); const [jd, setJd] = useState(""); const [resume, setResume] = useState(""); const [busy, setBusy] = useState(false);
  const read = useServerFn(readResume);
  const imported = useRef(false);
  useEffect(() => {
    const g = loadGuestScan();
    if (!me || !g || imported.current) return; imported.current = true;
    supabase.from("scans").insert({ user_id: me.id, job_id: g.jobId, job_title: g.jobTitle, job_description: g.jobDescription, mandatory: g.evidence.requirements, resume_text: g.resume, evidence: g.evidence as never }).select("id").single()
      .then(({ data, error }) => { if (error || !data) { toast.error("Couldn't save your earlier report"); return; } clearGuestScan(); toast.success("Your report was saved to your account"); nav({ to: "/candidate/scans/$scanId", params: { scanId: data.id } }); });
  }, [me]);
  useEffect(() => { if (picked) { setMode("role"); setTitle(picked.job.title); setJd(picked.job.description); } }, [picked]);
  useEffect(() => { if (!resume && scans[0]) setResume(scans[0].resume_text); }, [scans]);

  const run = async () => {
    if (!me) return; setBusy(true);
    try {
      const reqs = mode === "profile" ? [] : picked?.job.mandatory ?? [];
      const jobTitle = mode === "profile" ? "Future Talent Index" : title;
      const jobDescription = mode === "profile" ? "" : jd;
      const ex = await read({ data: { resume, jobTitle, jobDescription, requirements: reqs } });
      const r = must(await supabase.from("scans").insert({ user_id: me.id, job_id: mode === "profile" ? null : picked?.job.id ?? null, job_title: jobTitle, job_description: jobDescription, mandatory: ex.requirements, resume_text: resume, evidence: ex }).select("id").single());
      if (!r) throw new Error("The report could not be saved. Please try again.");
      nav({ to: "/candidate/scans/$scanId", params: { scanId: r.id } });
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  };
  return (
    <div className="space-y-8">
      <CareerNav />
      <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Know your score before you apply</p>
        <h1 className="mt-2 font-display text-4xl">Check your resume against a role</h1></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Resume check mode">
        <Button variant={mode === "profile" ? "default" : "outline"} onClick={() => setMode("profile")}>Generic resume score</Button>
        <Button variant={mode === "role" ? "default" : "outline"} onClick={() => setMode("role")}>Score against a job</Button>
      </div>
      <div className={mode === "role" ? "grid gap-6 lg:grid-cols-2" : "max-w-2xl"}>
        {mode === "role" && <Card className="space-y-3">
          <h2 className="font-display text-lg">The target role</h2>
          <label className="block text-sm">Job title<input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product Designer" /></label>
          <label className="block text-sm">Job description<textarea rows={10} className={input} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job posting you're targeting…" /></label>
          <JobDiagnostics title={title} description={jd} />
        </Card>}
        <Card><ResumeInput value={resume} onChange={setResume} /></Card>
      </div>
      <button disabled={busy || resume.trim().length < 80 || (mode === "role" && (!title.trim() || jd.trim().length < 40))} onClick={run} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">{busy ? "Reading your resume… (about 30s)" : "Get my score"}</button>
      {scans.length > 0 && (
        <section className="space-y-3"><h2 className="font-display text-xl">Your past checks</h2>
          {scans.map((s) => { const { job, cand } = scanToPair(s); const ev = evaluate(job, cand); return (
            <Link key={s.id} to="/candidate/scans/$scanId" params={{ scanId: s.id }} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-primary">
                <div><p className="font-medium">{s.job_title}</p><p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p></div>
                <div className="flex items-center gap-3"><StatusBadge status={ev.status} /><span className="font-mono text-xl">{ev.composite ?? "—"}</span></div>
              </Card>
            </Link>); })}
        </section>
      )}
    </div>
  );
}
