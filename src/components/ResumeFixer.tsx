import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui-bits";
import { readResumeGuest } from "@/lib/evaluate.functions";
import { buildEvidenceBullet } from "@/lib/diagnostics";
import { applySuggestion, buildQueue, headlineScore } from "@/lib/fixer";
import type { Candidate, Job } from "@/lib/scoring";

type Step = { resume: string; cand: Candidate; score: number; label: string };

export function ResumeFixer({ job, cand, resume }: { job: Job; cand: Candidate; resume: string }) {
  const read = useServerFn(readResumeGuest);
  const [history, setHistory] = useState<Step[]>([{ resume, cand, score: headlineScore(job, cand), label: "Original" }]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [fields, setFields] = useState({ action: "", constraint: "", outcome: "", text: "" });
  const [busy, setBusy] = useState(false);
  const cur = history[history.length - 1]!;
  const queue = useMemo(() => buildQueue(job, cur.cand, cur.resume).filter((s) => !skipped.includes(s.id) && !done.includes(s.id)), [job, cur, skipped, done]);
  const s = queue[0];
  const generic = !job.description.trim();
  const revised = s?.kind === "rewrite" ? buildEvidenceBullet(s.original!, fields) : fields.text;
  const reset = () => setFields({ action: "", constraint: "", outcome: "", text: "" });

  const apply = async () => {
    if (!s) return;
    const next = applySuggestion(cur.resume, s, revised);
    if (next === cur.resume) { toast.error("Add your own true details first."); return; }
    setBusy(true);
    try {
      const ev = await read({ data: { resume: next, jobTitle: job.title, jobDescription: job.description, requirements: job.mandatory } });
      const c: Candidate = { ...cur.cand, name: ev.name, role: ev.role, years: ev.years, domain: ev.domain, mandatory: ev.mandatory, competencies: ev.competencies };
      const score = headlineScore(job, c);
      setHistory([...history, { resume: next, cand: c, score, label: s.title }]);
      setDone([...done, s.id]); reset();
      const d = score - cur.score;
      toast.success(`Score updated: ${cur.score} → ${score} (${d >= 0 ? "+" : ""}${d})`);
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const undo = () => { if (history.length > 1) { setHistory(history.slice(0, -1)); setDone(done.slice(0, -1)); } };
  const copy = async () => { try { await navigator.clipboard.writeText(cur.resume); toast.success("Revised resume copied"); } catch { toast.error("Could not copy."); } };
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([cur.resume], { type: "text/plain" })); a.download = "resume-revised.txt"; a.click(); };
  const delta = cur.score - history[0]!.score;

  return <Card className="space-y-5 border-primary">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="font-mono text-xs uppercase text-muted-foreground">Fix &amp; rescore · {generic ? "generic resume score" : "job match score"}</p>
        <h2 className="mt-1 font-display text-2xl">Apply suggestions one by one</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add only true details. Each change re-reads your resume and recalculates the score.</p></div>
      <div className="text-right"><p className="font-display text-4xl">{cur.score}</p>
        <p className="text-xs text-muted-foreground">from {history[0]!.score} · {delta >= 0 ? "+" : ""}{delta} pts · {history.length - 1} applied</p></div>
    </div>

    {s ? <div className="space-y-3 rounded-md border p-4">
      <p className="text-xs text-muted-foreground">Suggestion {done.length + skipped.length + 1} of {done.length + skipped.length + queue.length}</p>
      <p className="font-medium">{s.title}</p><p className="text-sm text-muted-foreground">{s.detail}</p>
      {s.kind === "rewrite" ? <>
        <p className="border-l-2 pl-3 text-sm italic">“{s.original}”</p>
        <div className="grid gap-3 md:grid-cols-3">{([["action", "What you actually did"], ["constraint", "Real constraint or trade-off"], ["outcome", "Verified outcome"]] as const).map(([k, l]) =>
          <label key={k} className="text-xs font-medium">{l}<textarea rows={2} className="mt-1 w-full rounded-md border bg-background p-2 text-sm font-normal" value={fields[k]} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} /></label>)}</div>
      </> : <label className="block text-xs font-medium">New bullet (your own true example)<textarea rows={2} className="mt-1 w-full rounded-md border bg-background p-2 text-sm font-normal" placeholder="e.g. Ran 12 usability sessions that cut checkout drop-off 18%" value={fields.text} onChange={(e) => setFields({ ...fields, text: e.target.value })} /></label>}
      {revised.trim() && <div className="border-l-2 border-accent pl-3"><p className="text-xs text-muted-foreground">Will be {s.kind === "rewrite" ? "replaced with" : "added"}</p><p className="text-sm">{revised}</p></div>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={apply} disabled={busy}><Sparkles />{busy ? "Rescoring… (about 30s)" : "Apply & rescore"}</Button>
        <Button variant="outline" onClick={() => { setSkipped([...skipped, s.id]); reset(); }} disabled={busy}>Skip</Button>
      </div>
    </div> : <p className="text-sm text-muted-foreground">No more suggestions. Copy or download your revised resume below.</p>}

    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={undo} disabled={busy || history.length < 2}><RotateCcw />Undo last</Button>
      <Button variant="outline" size="sm" onClick={copy}><Copy />Copy resume</Button>
      <Button variant="outline" size="sm" onClick={download}><Download />Download .txt</Button>
    </div>
    {history.length > 1 && <details className="text-sm"><summary className="cursor-pointer">View revised resume</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">{cur.resume}</pre></details>}
  </Card>;
}
