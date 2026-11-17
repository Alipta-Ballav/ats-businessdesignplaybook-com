import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { actions } from "@/lib/store";
import { PRESETS, type Job } from "@/lib/scoring";
import { EvalConfig } from "@/components/EvalConfig";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/jobs/new")({
  head: () => ({ meta: [
    { title: "New hiring requirement — FutureTalent AI" },
    { name: "description", content: "Define a role, its requirements and how strictly candidates should be evaluated." },
    { property: "og:title", content: "New hiring requirement — FutureTalent AI" },
    { property: "og:description", content: "Configure adaptive strict-to-flexible talent matching." },
  ] }),
  component: NewJob,
});

const input = "w-full rounded-md border bg-background px-3 py-2 text-sm";

function NewJob() {
  const nav = useNavigate();
  const [job, setJob] = useState<Job>({
    id: "", title: "", func: "UX and Product Design", seniority: "Mid-level", description: "",
    preset: "Balanced Match", ...PRESETS["Balanced Match"], mandatory: [], preferred: [], createdAt: "",
  });
  const [mand, setMand] = useState("");
  const [pref, setPref] = useState("");
  const total = job.weights.JR + job.weights.FR + job.weights.HP;
  const save = () => {
    const id = `job-${Date.now()}`;
    actions.addJob({ ...job, id, createdAt: new Date().toISOString(),
      preferred: pref.split(",").map((s) => s.trim()).filter(Boolean) });
    nav({ to: "/jobs/$jobId", params: { jobId: id } });
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">New hiring requirement</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="font-display text-lg">The role</h2>
          <label className="block text-sm">Job title<input className={input} value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} placeholder="Senior AI Product Designer" /></label>
          <label className="block text-sm">Job description<textarea rows={6} className={input} value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} placeholder="Paste the job description…" /></label>
          <div className="text-sm">
            <p>Mandatory requirements</p>
            <div className="mt-1 flex gap-2">
              <input className={input} value={mand} onChange={(e) => setMand(e.target.value)} placeholder="e.g. Interaction design" />
              <button type="button" className="rounded-md border px-3 text-sm" onClick={() => { if (mand.trim()) { setJob({ ...job, mandatory: [...job.mandatory, { name: mand.trim(), essential: false }] }); setMand(""); } }}>Add</button>
            </div>
            <ul className="mt-2 space-y-1">
              {job.mandatory.map((m, i) => (
                <li key={i} className="flex items-center justify-between rounded border px-2 py-1">
                  <span>{m.name}</span>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    <input type="checkbox" checked={m.essential} onChange={(e) => setJob({ ...job, mandatory: job.mandatory.map((x, k) => k === i ? { ...x, essential: e.target.checked } : x) })} />
                    Essential (certification / legal / safety)
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <label className="block text-sm">Preferred skills (comma separated)<input className={input} value={pref} onChange={(e) => setPref(e.target.value)} placeholder="Enterprise SaaS, AI product experience" /></label>
        </Card>
        <Card><h2 className="mb-4 font-display text-lg">How to evaluate</h2><EvalConfig job={job} onChange={setJob} /></Card>
      </div>
      <button disabled={!job.title || total !== 100} onClick={save} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">Save hiring requirement</button>
    </div>
  );
}
