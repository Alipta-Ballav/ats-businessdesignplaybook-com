import { JobDiagnostics } from "@/components/JobDiagnostics";
import { JobUrlImport } from "@/components/JobUrlImport";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { q, must } from "@/lib/db";
import { type Job } from "@/lib/scoring";
import { EvalConfig } from "@/components/EvalConfig";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/recruiter/jobs/new")({
  head: () => ({ meta: [{ title: "New screening evaluation — FutureTalent AI" }, { name: "description", content: "Define a role, its requirements and how strictly candidates should be evaluated." }, { property: "og:title", content: "New screening evaluation — FutureTalent AI" }, { property: "og:description", content: "Configure adaptive strict-to-flexible talent matching." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewJob,
});
const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function NewJob() {
  const nav = useNavigate();
  const { data: me } = useQuery(q.me());
  const [job, setJob] = useState<Job>({ id: "", title: "", func: "Product Design", seniority: "Senior Product Designer", description: "", preset: "Balanced Match", flexibility: 50, weights: { JR: 30, FR: 40, HP: 30 }, mandatory: [], preferred: [], createdAt: "" });
  const [mand, setMand] = useState(""); const [pref, setPref] = useState(""); const [busy, setBusy] = useState(false);
  const total = job.weights.JR + job.weights.FR + job.weights.HP;
  const save = async () => {
    if (!me) return; setBusy(true);
    try {
      const r = must(await supabase.from("jobs").insert({
        recruiter_id: me.id, title: job.title, func: job.func, seniority: job.seniority, description: job.description,
        flexibility: job.flexibility, preset: job.preset, mandatory: job.mandatory, weights: job.weights,
        preferred: pref.split(",").map((s) => s.trim()).filter(Boolean),
      }).select("id").single());
      if (!r) throw new Error("The report could not be saved. Please try again.");
      nav({ to: "/recruiter/jobs/$jobId", params: { jobId: r.id } });
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">New screening evaluation</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-lg">The role</h2>
          <JobUrlImport onImport={(title, description) => setJob({ ...job, title, description })} />
          <label className="block text-sm">Job title<input className={input} value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} placeholder="Senior AI Product Designer" /></label>
          <label className="block text-sm">Job description<textarea rows={6} className={input} value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} placeholder="Paste the job description…" /></label>
          <div className="text-sm">
            <p>Must-have requirements</p>
            <div className="mt-1 flex gap-2">
              <input className={input} value={mand} onChange={(e) => setMand(e.target.value)} placeholder="e.g. Interaction design" />
              <button type="button" className="rounded-md border px-3 text-sm" onClick={() => { if (mand.trim()) { setJob({ ...job, mandatory: [...job.mandatory, { name: mand.trim(), essential: false }] }); setMand(""); } }}>Add</button>
            </div>
            <ul className="mt-2 space-y-1">{job.mandatory.map((m, i) => (
              <li key={i} className="flex items-center justify-between rounded border px-2 py-1"><span>{m.name}</span>
                <label className="flex items-center gap-1 text-xs text-muted-foreground"><input type="checkbox" checked={m.essential} onChange={(e) => setJob({ ...job, mandatory: job.mandatory.map((x, k) => k === i ? { ...x, essential: e.target.checked } : x) })} />Essential (certification / legal / safety)</label>
              </li>))}</ul>
          </div>
          <label className="block text-sm">Preferred skills (comma separated)<input className={input} value={pref} onChange={(e) => setPref(e.target.value)} placeholder="Enterprise SaaS, AI product experience" /></label>
        </Card>
        <Card><h2 className="mb-4 font-display text-lg">How to evaluate</h2><EvalConfig job={job} onChange={setJob} /></Card>
      </div>
      <JobDiagnostics title={job.title} description={job.description} />
      <button disabled={!job.title || total !== 100 || busy} onClick={save} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">{busy ? "Saving…" : "Save evaluation"}</button>
    </div>
  );
}
