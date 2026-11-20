import { ScanSearch, AlertTriangle, Quote } from "lucide-react";
import { decodeJob } from "@/lib/diagnostics";

export function JobDiagnostics({ title, description }: { title: string; description: string }) {
  if (description.trim().length < 40) return null;
  const report = decodeJob(title, description);
  return <section className="space-y-5 border-y py-6">
    <div className="flex items-start gap-3"><ScanSearch className="mt-1 size-5 shrink-0 text-primary" /><div><p className="font-mono text-xs uppercase text-muted-foreground">Reverse job-description diagnostic</p><h2 className="mt-1 font-display text-2xl">What this role is really asking for</h2><p className="mt-2 text-sm text-muted-foreground">Text-based hypotheses, not verified facts about the employer. Missing language is not proof of low maturity.</p></div></div>
    <div className="grid gap-6 md:grid-cols-2">
      <div><h3 className="text-sm font-medium">Design maturity signals</h3><p className="mt-2 font-display text-xl">{report.level ? `Level ${report.level} / 5 · ` : ""}{report.label}</p><div className="mt-3 space-y-3">{report.signals.map(s => <div key={s.level} className="border-l-2 border-accent pl-3"><p className="text-xs font-medium">{s.label}</p><blockquote className="mt-1 break-words text-sm text-muted-foreground">“{s.quote}”</blockquote></div>)}</div></div>
      <div className="space-y-4"><div><h3 className="flex items-center gap-2 text-sm font-medium"><AlertTriangle className="size-4 text-warning" />Title vs. scope</h3>{report.scopeWarnings.length ? report.scopeWarnings.map(q => <div key={q} className="mt-2 text-sm"><p className="font-medium">Confirm whether this is a people-leadership role.</p><blockquote className="mt-1 break-words text-muted-foreground">“{q}”</blockquote></div>) : <p className="mt-2 text-sm text-muted-foreground">No explicit title/scope conflict found by these checks.</p>}</div><div><h3 className="text-sm font-medium">Explicit context to prepare for</h3>{report.expectations.length ? report.expectations.map(s => <div key={s.label} className="mt-3"><p className="text-sm font-medium">{s.label}</p><p className="mt-1 break-words text-sm text-muted-foreground"><Quote className="mr-1 inline size-3" />{s.quote}</p></div>) : <p className="mt-2 text-sm text-muted-foreground">No additional context signals found.</p>}</div></div>
    </div>
  </section>;
}