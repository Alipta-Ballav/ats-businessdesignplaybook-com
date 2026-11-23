import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CheckCircle2, Copy, FileText, Lock, RotateCcw, Sparkles, Undo2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui-bits";
import { ResumePreview } from "@/components/ResumePreview";
import { PaywallModal } from "@/components/PaywallModal";
import { SaveResumeVersion } from "@/components/SaveResumeVersion";
import { readResumeGuest } from "@/lib/evaluate.functions";
import { suggestRewrite } from "@/lib/rewrite.functions";
import { applySuggestion, buildQueue, cleanLine, headlineScore } from "@/lib/fixer";
import { estimateCandidate, fixesUsed, newFacts, revertFix, type FixEntry } from "@/lib/editor";
import { downloadResumeDocx } from "@/lib/export-docx";
import { usePro } from "@/lib/pro";
import { FREE_FIXES, canApplyFix, canDownloadWord, canRescore } from "@/lib/plans";
import { inferLevel, type Candidate, type Job, type Level } from "@/lib/scoring";

type Fix = FixEntry & { title: string };
const EXAMPLES = {
  action: "e.g. Redesigned the 5-step checkout into 2 steps",
  constraint: "e.g. with no engineering budget for a rebuild",
  outcome: "e.g. conversion rose 18% in 6 weeks",
};
const blank = { action: "", constraint: "", outcome: "", text: "" };

export function LiveEditor({ job, cand, resume, initialDraft, scoringLevel }: { job: Job; cand: Candidate; resume: string; initialDraft?: string; scoringLevel?: Level }) {
  const read = useServerFn(readResumeGuest);
  const ai = useServerFn(suggestRewrite);
  const pro = usePro();
  const level = scoringLevel ?? inferLevel(cand.years, cand.role);
  const base = headlineScore(job, cand, level);
  const [draft, setDraft] = useState(initialDraft ?? resume);
  const [history, setHistory] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [official, setOfficial] = useState<{ cand: Candidate; score: number; text: string }>({ cand, score: base, text: resume });
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fields, setFields] = useState(blank);
  const [aiDraft, setAiDraft] = useState<{ text: string; flags: string[] } | null>(null);
  const [proposal, setProposal] = useState("");
  const [showFacts, setShowFacts] = useState(false);
  const [busy, setBusy] = useState<"" | "ai" | "score">("");
  const [wall, setWall] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);

  const queue = useMemo(() => buildQueue(job, official.cand, official.text), [job, official]);
  const doneIds = fixes.map((f) => f.id);
  const open = queue.filter((s) => !doneIds.includes(s.id) && !skipped.includes(s.id));
  const active = open.find((s) => s.id === openId) ?? open[0];
  const estimate = headlineScore(job, estimateCandidate(official.cand, draft), level);
  const stale = draft !== official.text;
  const delta = official.score - base;

  const commit = (next: string) => { setHistory((h) => [...h, draft]); setDraft(next); setTyping(false); };
  const onType = (v: string) => { if (!typing) { setHistory((h) => [...h, draft]); setTyping(true); } setDraft(v); };
  const reset = () => { setFields(blank); setAiDraft(null); setProposal(""); };
  const facts = [fields.action, fields.constraint, fields.outcome, fields.text].filter(Boolean).join("; ");

  const askAi = async () => {
    if (!facts.trim() && !active?.original) { setShowFacts(true); toast.error("Fill in at least one question below — AI writes the new bullet only from your facts."); return; }
    setBusy("ai");
    try {
      const { text } = await ai({ data: { original: active?.original ?? "", facts } });
      setAiDraft({ text, flags: [] }); setProposal(text);
    } catch (e) { const m = (e as Error).message || ""; toast.error(m || "AI suggestion failed. Try again."); }
    setBusy("");
  };

  const apply = (text: string, source: "manual" | "ai") => {
    if (!active) return;
    if (!canApplyFix(fixesUsed(fixes), pro)) { window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "fix" }); setWall(`You've used your ${FREE_FIXES} free fixes. Unlock every suggestion and the Word download.`); return; }
    const next = applySuggestion(draft, active, text);
    if (next === draft) { toast.error("Write or draft the improved line first."); return; }
    commit(next); setFixes([...fixes, { id: active.id, source, title: active.title, added: cleanLine(text), removed: active.kind === "rewrite" && active.original && draft.includes(active.original) ? active.original : "" }]); reset(); setOpenId(null); setJustDone(active.title);
    toast.success(`Step done: ${active.title}`, { description: "Highlighted in the preview. You can undo it any time." });
    window.__lovableEvents?.track?.("project.suggestion_applied", { source });
  };

  const rescore = async () => {
    if (!canRescore(pro)) { window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "rescore" }); setWall("Your estimated score is free. The ₹99 Job Hunt Pass unlocks your official AI-verified rescore and Word downloads for 30 days."); return; }
    setBusy("score");
    try {
      const ev = await read({ data: { resume: draft, jobTitle: job.title, jobDescription: job.description, requirements: job.mandatory } });
      const c: Candidate = { ...official.cand, name: ev.name, role: ev.role, years: ev.years, domain: ev.domain, mandatory: ev.mandatory, competencies: ev.competencies };
      const score = headlineScore(job, c, level);
      toast.success(`Score updated: ${official.score} → ${score}`);
      setOfficial({ cand: c, score, text: draft });
    } catch (e) { toast.error((e as Error).message); }
    setBusy("");
  };
  const undo = () => {
    const prev = history[history.length - 1]; if (prev === undefined) return;
    setHistory(history.slice(0, -1)); setDraft(prev); setTyping(false); setJustDone(null); toast.success("Last change undone");
    setFixes(fixes.filter((f) => prev.includes(f.removed ? f.added : `- ${f.added}`)));
  };
  const undoFix = (f: Fix) => { setJustDone(null); commit(revertFix(draft, f)); setFixes(fixes.filter((x) => x !== f)); toast.success("Change undone"); };
  const resetAll = () => { if (!window.confirm("Reset to your original CV? All changes will be removed.")) return; commit(resume); setFixes([]); setSkipped([]); };
  const total = fixes.length + open.length + skipped.length;
  const copy = async () => { try { await navigator.clipboard.writeText(draft); toast.success("Resume copied"); } catch { toast.error("Could not copy."); } };
  const word = async () => { if (!canDownloadWord(pro)) { setWall("Download your improved resume as an ATS-ready Word file."); return; } try { await downloadResumeDocx(draft); window.__lovableEvents?.track?.("project.resume_exported", { format: "docx" }); } catch { toast.error("Could not create the Word file."); } };

  const pending = active && proposal.trim() ? applySuggestion(draft, active, proposal) : draft;
  const flags = proposal.trim() ? newFacts(proposal, [active?.original ?? "", facts]) : [];

  const left = (
    <div className="space-y-4">
      <Card className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-baseline gap-3">
          <p className="font-display text-3xl font-semibold tabular-nums">{official.score}</p>
          <p className="text-xs text-muted-foreground">from {base} · <span className={delta >= 0 ? "text-success" : "text-destructive"}>{delta >= 0 ? "+" : ""}{delta}</span>{stale && <> · <b className="text-foreground">Estimated: ~{estimate}</b></>}</p>
        </div>
        <span className="text-xs text-muted-foreground">{fixes.length} of {total} applied</span>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Recommendations</h3>
          <span className="text-xs text-muted-foreground">{fixes.length}/{total} done</span>
        </div>
        {total > 0 && <div className="h-1 bg-muted"><div className="h-full bg-success transition-all" style={{ width: `${(fixes.length / total) * 100}%` }} /></div>}
        {justDone && (
          <div className="flex items-center gap-3 border-b bg-success/10 px-4 py-3 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
            <div className="min-w-0 flex-1"><p className="font-medium">Done: {justDone}</p><p className="text-xs text-muted-foreground">{open.length ? <>Next up: <b className="text-foreground">{open[0]?.title}</b></> : "All recommendations applied — rescore at the bottom."}</p></div>
            <Button size="sm" variant="ghost" onClick={() => { const f = fixes[fixes.length - 1]; if (f) undoFix(f); setJustDone(null); }}><Undo2 />Undo</Button>
          </div>
        )}
        {open.length === 0 && <p className="p-4 text-sm text-muted-foreground">All done. Rescore below to find more.</p>}
        <ul className="divide-y">
          {queue.filter((q) => !skipped.includes(q.id) && (doneIds.includes(q.id) || open.slice(0, 8).includes(q))).map((s) => {
            const n = queue.indexOf(s);
            const f = fixes.find((x) => x.id === s.id);
            if (f) return (
              <li key={s.id} className={`flex items-center gap-3 border-l-4 border-success bg-success/10 px-4 py-3 transition-all ${justDone === f.title ? "ring-2 ring-inset ring-success/50" : ""}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-background"><Check className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium"><span className="mr-1 text-muted-foreground">{n + 1}.</span>{s.title}</p><p className="text-xs text-success">Applied · {f.source === "ai" ? "AI" : "Manual"} · highlighted in preview</p></div>
                <Button size="sm" variant="ghost" onClick={() => undoFix(f)}><Undo2 />Undo</Button>
              </li>
            );
            const isActive = s.id === active?.id;
            return (
              <li key={s.id} className={isActive ? "bg-primary/5" : ""}>
                <button className="flex w-full items-start gap-3 px-4 py-3 text-left" onClick={() => { setOpenId(s.id); reset(); setJustDone(null); }}>
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n + 1}</span>
                  <div className="min-w-0"><p className="text-sm font-medium">{s.title}</p>{!isActive && <p className="truncate text-xs text-muted-foreground">{s.detail}</p>}</div>
                </button>
                {isActive && (
                  <div className="space-y-4 px-4 pb-5 pl-12">
                    <p className="text-xs text-muted-foreground">{s.detail}</p>
                    {s.original && <div className="rounded-md border bg-muted/40 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your line now</p><p className="mt-1 text-sm">{s.original}</p></div>}
                    {!proposal.trim() ? (
                      <div className="space-y-2">
                        <Button className="w-full" onClick={askAi} disabled={busy === "ai"}><Wand2 />{busy === "ai" ? "Writing…" : s.original ? "Improve this line with AI" : "Write a new bullet with AI"}</Button>
                        <button className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline" onClick={() => setProposal(s.original ?? " ")}>or write it myself</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-primary">New line · edit freely · preview updates on the right</p>
                        <textarea autoFocus rows={3} className="w-full rounded-md border-2 border-primary/40 bg-background p-3 text-sm focus:border-primary focus:outline-none" value={proposal} onChange={(e) => setProposal(e.target.value)} />
                        {flags.length > 0 && <p className="text-xs text-destructive">“{flags.join("”, “")}” isn't in your resume. Remove it, or add it below as a true fact.</p>}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button disabled={!proposal.trim() || flags.length > 0} onClick={() => apply(proposal, aiDraft ? "ai" : "manual")}><Check />Apply to resume</Button>
                          <Button variant="outline" onClick={askAi} disabled={busy === "ai"}><Wand2 />{busy === "ai" ? "Writing…" : "Try again"}</Button>
                          <Button variant="ghost" onClick={() => { setProposal(""); setAiDraft(null); }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                    {!s.original && <p className="rounded-md bg-muted/40 p-3 text-xs">Your resume has no line for this yet. Answer one question below with something true, then let AI write a new bullet — it's added under “Additional evidence”.</p>}
                    <details open={showFacts || !s.original} onToggle={(e) => setShowFacts((e.target as HTMLDetailsElement).open)} className="rounded-md border border-dashed px-3 py-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">{s.original ? "Want a stronger line? Add a real number or result (optional)" : "Your facts for this bullet"}</summary>
                      <div className="mt-2 grid gap-2">
                        {([["action", "What did you do?"], ["constraint", "What made it hard?"], ["outcome", "What changed?"]] as const).map(([k, l]) => <label key={k} className="text-muted-foreground">{l}<input className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60" placeholder={EXAMPLES[k]} value={fields[k]} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} /></label>)}
                        <p className="text-muted-foreground">Then press “Try again” — AI will use only these facts.</p>
                      </div>
                    </details>
                    <button className="text-xs text-muted-foreground hover:underline" onClick={() => { setSkipped([...skipped, s.id]); reset(); setJustDone(null); toast("Skipped — you can restore it under Steps"); }}>Skip this recommendation</button>
                  </div>
                )}
              </li>
            );
          })}
          {fixes.filter((f) => !queue.some((q) => q.id === f.id)).map((f, i) => (
            <li key={`done-${i}`} className="flex items-center gap-3 bg-success/5 px-4 py-2.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-background"><Check className="h-3 w-3" /></span>
              <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through decoration-success/60">{f.title}</p>
              <span className="shrink-0 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">Applied</span>
              <Button size="sm" variant="ghost" onClick={() => undoFix(f)}><Undo2 />Undo</Button>
            </li>
          ))}
        </ul>
      </Card>

      {(fixes.length > 0 || skipped.length > 0) && (
        <Card className="space-y-1 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Steps{stale && <span className="ml-2 font-normal text-xs text-muted-foreground">· changes not rescored yet</span>}</h3>
            <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={undo} disabled={!history.length}><Undo2 />Undo last</Button><Button size="sm" variant="ghost" onClick={resetAll} disabled={draft === resume}><RotateCcw />Reset</Button></div>
          </div>
          {fixes.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
              <span className="flex min-w-0 items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span className="truncate">{i + 1}. {f.title}</span><span className="shrink-0 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">{f.source === "ai" ? "AI" : "Manual"}</span></span>
              <Button size="sm" variant="ghost" onClick={() => undoFix(f)}><Undo2 />Undo</Button>
            </div>
          ))}
          {queue.filter((q) => skipped.includes(q.id)).map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <span className="truncate">Skipped · {q.title}</span>
              <Button size="sm" variant="ghost" onClick={() => setSkipped(skipped.filter((x) => x !== q.id))}>Restore</Button>
            </div>
          ))}
        </Card>
      )}

      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Edit full resume text <span className="font-normal text-muted-foreground">— for typos or anything not covered above</span></summary>
        <textarea rows={14} className="w-full border-t bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none" value={draft} onChange={(e) => onType(e.target.value)} onBlur={() => setTyping(false)} />
      </details>

      <Card className={`space-y-3 p-5 ${stale ? "border-2 border-primary/40 bg-primary/5" : ""}`}>
        <div>
          <h3 className="text-base font-semibold">{stale ? "Finished editing? Lock in your new score." : "Your score is up to date"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{stale ? <>{fixes.length} change{fixes.length === 1 ? "" : "s"} applied · Estimated score <b className="text-foreground">~{estimate}</b> ({estimate - base >= 0 ? "+" : ""}{estimate - base} from {base})</> : "Apply recommendations above, then rescore here."}</p>
        </div>
        <Button size="lg" className="w-full" onClick={rescore} disabled={!!busy || !stale}><Sparkles />{!pro && <Lock />}{busy === "score" ? "Rescoring…" : pro ? "Rescore my resume" : "Verify final score · ₹99 pass"}</Button>
      </Card>
    </div>
  );

  const right = (
    <div className="space-y-3 md:sticky md:top-20 md:self-start">
      <ResumePreview original={resume} draft={pending} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={word}>{pro ? <FileText /> : <Lock />}Download Word (.docx)</Button>
        <Button size="sm" variant="outline" onClick={copy}><Copy />Copy</Button>
      </div>
      <SaveResumeVersion resume={draft} candidate={official.cand} job={job} scoredText={official.text} level={level} />
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Live editor · {job.description.trim() ? "job match score" : "generic resume score"}</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Improve your resume, step by step</h2>
        <p className="text-sm text-muted-foreground">Draft with AI, edit it, apply — the preview updates as you type. Undo any step.</p>
      </div>
      <div className="hidden items-start gap-6 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">{left}{right}</div>
      <Tabs defaultValue="edit" className="md:hidden">
        <TabsList className="w-full"><TabsTrigger value="edit" className="flex-1">Edit</TabsTrigger><TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger></TabsList>
        <TabsContent value="edit">{left}</TabsContent>
        <TabsContent value="preview">{right}</TabsContent>
      </Tabs>
      <PaywallModal open={!!wall} onOpenChange={(o) => !o && setWall(null)} reason={wall ?? ""} />
    </section>
  );
}
