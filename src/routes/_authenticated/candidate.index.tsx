import { JobDiagnostics } from "@/components/JobDiagnostics";
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
import { useQueryClient } from "@tanstack/react-query";
import { Trash2, ArrowRight, CheckCircle2, Loader2, ScanText, Target } from "lucide-react";
import { PaywallModal } from "@/components/PaywallModal";
import { usePro, passAllowance, recordPassScan } from "@/lib/pro";
import { FREE_SCANS, canScan, countScan, scansUsed } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/candidate/")({
  validateSearch: (s: Record<string, unknown>): { job?: string | undefined } => ({ job: typeof s["job"] === "string" ? s["job"] : undefined }),
  head: () => ({ meta: [{ title: "Score your design resume — FutureTalent AI" }, { name: "description", content: "See how your resume scores for a role and exactly what to improve." }, { property: "og:title", content: "Check my resume — FutureTalent AI" }, { property: "og:description", content: "Evidence-based resume scoring with fix-it tips." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
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
  const qc = useQueryClient();
  const removeScan = async (id: string) => {
    if (!confirm("Delete this check permanently?")) return;
    const { error } = await supabase.from("scans").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete this check"); return; }
    toast.success("Check deleted"); qc.invalidateQueries({ queryKey: ["scans"] });
  };
  const imported = useRef(false);
  useEffect(() => {
    const g = loadGuestScan();
    if (!me || !g || imported.current) return; imported.current = true;
    supabase.from("scans").insert({ user_id: me.id, job_id: g.jobId, job_title: g.jobTitle, job_description: g.jobDescription, mandatory: g.evidence.requirements, resume_text: g.resume, evidence: g.evidence as never }).select("id").single()
      .then(({ data, error }) => { if (error || !data) { toast.error("Couldn't save your earlier report"); return; } clearGuestScan(); toast.success("Your report was saved to your account"); nav({ to: "/candidate/scans/$scanId", params: { scanId: data.id } }); });
  }, [me]);
  useEffect(() => { if (picked) { setMode("role"); setTitle(picked.job.title); setJd(picked.job.description); } }, [picked]);
  useEffect(() => { if (!resume && scans[0]) setResume(scans[0].resume_text); }, [scans]);

  const pro = usePro(); const [wall, setWall] = useState(false); const [used, setUsed] = useState(0);
  const [left, setLeft] = useState<number | null>(0); const [renew, setRenew] = useState(false);
  useEffect(() => { const on = () => { void passAllowance().then(setLeft); }; window.addEventListener("ft-pro-changed", on); return () => window.removeEventListener("ft-pro-changed", on); }, []);
  useEffect(() => { setUsed(scansUsed()); }, []);
  useEffect(() => { if (pro) void passAllowance().then(setLeft); }, [pro]);
  const run = async () => {
    if (!me) return;
    const allowance = pro ? await passAllowance() : 0;
    const freeLeft = scansUsed() < FREE_SCANS;
    if (pro && !(allowance === null || allowance > 0) && !freeLeft) { setRenew(true); setWall(true); return; }
    if (!canScan(scansUsed(), pro)) { setWall(true); return; }
    setBusy(true);
    try {
      const reqs = mode === "profile" ? [] : picked?.job.mandatory ?? [];
      const jobTitle = mode === "profile" ? "Future Talent Index" : title;
      const jobDescription = mode === "profile" ? "" : jd;
      const ex = await read({ data: { resume, jobTitle, jobDescription, requirements: reqs } });
      const r = must(await supabase.from("scans").insert({ user_id: me.id, job_id: mode === "profile" ? null : picked?.job.id ?? null, job_title: jobTitle, job_description: jobDescription, mandatory: ex.requirements, resume_text: resume, evidence: ex }).select("id").single());
      if (!r) throw new Error("The report could not be saved. Please try again.");
      if (pro && !freeLeft && allowance !== null) await recordPassScan();
      countScan();
      nav({ to: "/candidate/scans/$scanId", params: { scanId: r.id } });
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  };
  return (
    <div className="space-y-8">
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
          <textarea aria-label="Job description" className={`${input} h-24 resize-none sm:h-28`} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="Paste the job description…" />
          <JobDiagnostics title={title} description={jd} />
        </section>}
      </div>
      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <p className="text-xs font-medium">{pro ? left === null ? "No score limit on this account" : left === 0 ? <>Pass used up · <Link to="/pass" className="font-semibold text-primary underline underline-offset-2">Renew pass · ₹99 for 5 more scans</Link></> : `${left} verified scores left` : used < FREE_SCANS ? "1 free scan · No credit card required" : <>₹99 Job Hunt Pass · All features for 30 days · <Link to="/pass" className="font-semibold text-primary underline underline-offset-2">Buy or renew</Link></>}</p>
          <p className="text-xs text-muted-foreground">{pro ? "AI rewrites, verified rescoring and Word exports included" : "Then ₹99 for 30 days · No auto-renewal"}</p>
        </div>
        <Button size="lg" disabled={busy || !(resume.trim().length >= 80 && (mode === "profile" || (title.trim() && jd.trim().length >= 40)))} onClick={run} className="w-full shrink-0 sm:w-auto">{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}{busy ? "Reading your resume…" : pro && left === 0 ? "Get my score · 0 scans left" : pro || used < FREE_SCANS ? "Get my score" : "Get my score · ₹99 pass"}</Button>
      </div>
      {busy && <p role="status" className="text-xs text-muted-foreground">Checking your evidence. This usually takes about 30 seconds.</p>}
      <PaywallModal open={wall} onOpenChange={(o) => { setWall(o); if (!o) setRenew(false); }} reason={renew ? "You've used all 5 scans in your pass. Renew for ₹99 to add 5 more verified scores and 30 days of access." : "You have used your free scan. The ₹99 Job Hunt Pass unlocks 5 scans, verified rescoring and Word downloads for 30 days."} />
      </div>
      {scans.length > 0 && (
        <section className="space-y-3"><h2 className="font-display text-xl">Your past checks</h2>
          {scans.map((s) => { const { job, cand } = scanToPair(s); const ev = evaluate(job, cand); return (
            <div key={s.id} className="flex items-center gap-2"><Link to="/candidate/scans/$scanId" params={{ scanId: s.id }} className="block flex-1">
              <Card className="flex flex-wrap items-center justify-between gap-3 hover:border-primary">
                <div><p className="font-medium">{s.job_title}</p><p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p></div>
                <div className="flex items-center gap-3"><StatusBadge status={ev.status} /><span className="font-mono text-xl">{ev.composite ?? "—"}</span></div>
              </Card>
            </Link><button aria-label={`Delete check ${s.job_title}`} onClick={() => removeScan(s.id)} className="rounded-md border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></div>); })}
        </section>
      )}
    </div>
  );
}
