import { ArrowUpRight, Briefcase, AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { Card } from "@/components/ui-bits";
import { playbookAudit } from "@/lib/playbook";

export function BusinessPlaybook({ resume }: { resume: string }) {
  const a = playbookAudit(resume);
  return <Card className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary"><Briefcase className="h-3.5 w-3.5" />Business Design Playbook</p>
        <h2 className="mt-1 font-display text-xl">Commercial impact audit</h2>
        <p className="text-sm text-muted-foreground">Design leaders are hired for business outcomes. We check your resume against the 3 playbook formulas.</p></div>
      <span className="rounded-full border px-3 py-1 font-mono text-sm">{a.covered} / 3 proven</span>
    </div>
    <div className="grid gap-3 md:grid-cols-3">{a.formulas.map((f) => <div key={f.id} className="space-y-2 rounded-lg border p-4">
      <p className="flex items-center gap-2 text-sm font-medium">{f.quantified ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}{f.name}</p>
      <p className="text-xs text-muted-foreground">{f.formula}</p>
      {f.quotes.length ? <ul className="space-y-1">{f.quotes.map((q) => <li key={q} className="border-l-2 pl-2 text-xs italic">“{q}”</li>)}</ul>
        : <p className="text-xs text-warning">No evidence yet. Add a bullet using this formula with your real numbers.</p>}
      {f.quotes.length > 0 && !f.quantified && <p className="text-xs text-warning">Mentioned, but no number. Add the metric.</p>}
    </div>)}</div>
    {a.vanity.length > 0 && <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="h-4 w-4 text-warning" />Vanity vs value: {a.vanity.length} line{a.vanity.length > 1 ? "s" : ""} sound good but prove nothing</p>
      <ul className="mt-2 space-y-1">{a.vanity.map((v) => <li key={v} className="text-xs italic text-muted-foreground">“{v}”</li>)}</ul>
      <p className="mt-2 text-xs">Rewrite each with a formula above: what changed, for whom, and by how much.</p>
    </div>}
    <a href="https://businessdesignplaybook.com/" target="_blank" rel="noopener noreferrer"
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary">The course behind this audit · by The Finishing School</p>
        <p className="font-medium">Business Design Playbook</p>
        <p className="max-w-xl text-xs text-muted-foreground">Learn pricing, cash and growth so you can present design impact with numbers. 8 modules, under 2 hours. Module 01 is free, full course ₹999.</p>
      </div>
      <span className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start Module 01 free <ArrowUpRight className="h-4 w-4" /></span>
    </a>
  </Card>;
}
