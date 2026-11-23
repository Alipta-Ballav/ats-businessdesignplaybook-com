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
import { buildEvidenceBullet } from "@/lib/diagnostics";
import { applySuggestion, buildQueue, headlineScore } from "@/lib/fixer";
import { estimateCandidate, fixesUsed, newFacts, revertFix, type FixEntry } from "@/lib/editor";
import { downloadResumeDocx } from "@/lib/export-docx";
import { usePro } from "@/lib/pro";
import { FREE_FIXES, canApplyFix, canDownloadWord } from "@/lib/plans";
import type { Candidate, Job } from "@/lib/scoring";

type Fix = FixEntry & { title: string };
const EXAMPLES = {
  action: "e.g. Redesigned the 5-step checkout into 2 steps",
  constraint: "e.g. with no engineering budget for a rebuild",
  outcome: "e.g. conversion rose 18% in 6 weeks",
};
const blank = { action: "", constraint: "", outcome: "", text: "" };

export function LiveEditor({ job, cand, resume, initialDraft }: { job: Job; cand: Candidate; resume: string; initialDraft?: string }) {
  const read = useServerFn(readResumeGuest);
  const ai = useServerFn(suggestRewrite);
  const pro = usePro();
  const base = headlineScore(job, cand);
  const [draft, setDraft] = useState(initialDraft ?? resume);
  const [history, setHistory] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [official, setOfficial] = useState<{ cand: Candidate; score: number; text: string }>({ cand, score: base, text: resume });
  const [fixes, setFixes] = useState<Fix[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [fields, setFields] = useState(blank);
  const [aiDraft, setAiDraft] = useState<{ text: string; flags: string[] } | null>(null);
  const [busy, setBusy] = useState<"" | "ai" | "score">("");
  const [wall, setWall] = useState<string | null>(null);

  const queue = useMemo(() => buildQueue(job, official.cand, official.text), [job, official]);
  const doneIds = fixes.map((f) => f.id);
  const open = queue.filter((s) => !doneIds.includes(s.id) && !skipped.includes(s.id));
  const active = open.find((s) => s.id === openId) ?? open[0];
  const estimate = headlineScore(job, estimateCandidate(official.cand, draft));
  const stale = draft !== official.text;
  const delta = official.score - base;

  const commit = (next: string) => { setHistory((h) => [...h, draft]); setDraft(next); setTyping(false); };
  const onType = (v: string) => { if (!typing) { setHistory((h) => [...h, draft]); setTyping(true); } setDraft(v); };
  const reset = () => { setFields(blank); setAiDraft(null); };
  const manualText = active?.kind === "rewrite" && active.original ? buildEvidenceBullet(active.original, fields) : fields.text;
  const facts = [fields.action, fields.constraint, fields.outcome, fields.text].filter(Boolean).join("; ");

  const askAi = async () => {
    if (!pro) { window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "ai_rewrite" }); setWall("AI suggestions are part of the ₹49 unlock."); return; }
    if (!facts.trim() && !active?.original) { toast.error("Type your true example first — AI only rephrases what you give it."); return; }
    setBusy("ai");
    try {
      const { text } = await ai({ data: { original: active?.original ?? "", facts } });
      setAiDraft({ text, flags: newFacts(text, [active?.original ?? "", facts]) });
    } catch (e) { const m = (e as Error).message || ""; toast.error(/unauthori|401|auth/i.test(m) ? "Please sign in to use AI suggestions." : m || "AI suggestion failed. Try again."); }
    setBusy("");
  };

  const apply = (text: string, source: "manual" | "ai") => {
    if (!active) return;
    if (!canApplyFix(fixesUsed(fixes), pro)) { window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "fix" }); setWall(`You've used your ${FREE_FIXES} free fixes. Unlock every suggestion and the Word download.`); return; }
    const next = applySuggestion(draft, active, text);
    if (next === draft) { toast.error("Add your own true details first."); return; }
    commit(next); setFixes([...fixes, { id: active.id, source, title: active.title, added: text.trim(), removed: active.kind === "rewrite" && active.original && draft.includes(active.original) ? active.original : "" }]); reset(); setOpenId(null);
    window.__lovableEvents?.track?.("project.suggestion_applied", { source });
  };

  const rescore = async () => {
    setBusy("score");
    try {
      const ev = await read({ data: { resume: draft, jobTitle: job.title, jobDescription: job.description, requirements: job.mandatory } });
      const c: Candidate = { ...official.cand, name: ev.name, role: ev.role, years: ev.years, domain: ev.domain, mandatory: ev.mandatory, competencies: ev.competencies };
      const score = headlineScore(job, c);
      toast.success(`Score updated: ${official.score} → ${score}`);
      setOfficial({ cand: c, score, text: draft });
    } catch (e) { toast.error((e as Error).message); }
    setBusy("");
  };
  const undo = () => {
    const prev = history[history.length - 1]; if (prev === undefined) return;
    setHistory(history.slice(0, -1)); setDraft(prev); setTyping(false);
    setFixes(fixes.filter((f) => prev.includes(f.removed ? f.added : `- ${f.added}`)));
  };
  const undoFix = (f: Fix) => { commit(revertFix(draft, f)); setFixes(fixes.filter((x) => x !== f)); toast.success("Change undone"); };
  const resetAll = () => { if (!window.confirm("Reset to your original CV? All changes will be removed.")) return; commit(resume); setFixes([]); setSkipped([]); };
  const total = fixes.length + open.length + skipped.length;
  const copy = async () => { try { await navigator.clipboard.writeText(draft); toast.success("Resume copied"); } catch { toast.error("Could not copy."); } };
  const word = async () => { if (!canDownloadWord(pro)) { setWall("Download your improved resume as an ATS-ready Word file."); return; } try { await downloadResumeDocx(draft); window.__lovableEvents?.track?.("project.resume_exported", { format: "docx" }); } catch { toast.error("Could not create the Word file."); } };

  const left = (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Score</p>
          <p className="font-display text-3xl font-semibold">{official.score}<span className="ml-2 text-sm font-normal text-muted-foreground">from {base} · {delta >= 0 ? "+" : ""}{delta}</span></p>
          {stale && <p className="text-xs text-muted-foreground">Estimate while editing: {estimate} — rescore for the official number</p>}
        </div>
        <Button onClick={rescore} disabled={!!busy || !stale}><Sparkles />{busy === "score" ? "Rescoring… (~30s)" : "Rescore"}</Button>
      </Card>

      <Card className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">Recommendations</h3>
          <span className="text-xs text-muted-foreground"><b className="text-foreground">{fixes.length} of {total} fixed</b> · {open.length} open{!pro && ` · ${Math.max(0, FREE_FIXES - fixesUsed(fixes))} free fixes left`}</span>
        </div>
        {open.length === 0 && <p className="text-sm text-muted-foreground">No open recommendations. Rescore to find more, or edit the text below.</p>}
        {total > 0 && <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${(fixes.length / total) * 100}%` }} /></div>}
        <ul className="space-y-2">
          {open.slice(0, 8).map((s) => {
            const isActive = s.id === active?.id;
            return (
              <li key={s.id} className={`rounded-md border ${isActive ? "border-primary bg-primary/5" : ""}`}>
                <button className="flex w-full items-start justify-between gap-3 p-3 text-left" onClick={() => { setOpenId(s.id); reset(); }}>
                  <div><p className="text-sm font-medium">{s.title}</p><p className="text-xs text-muted-foreground">{s.detail}</p></div>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase">{s.kind === "rewrite" ? "Rewrite" : "Add"}</span>
                </button>
                {isActive && (
                  <div className="space-y-3 border-t p-3">
                    {s.original && <p className="border-l-2 pl-3 text-xs italic text-muted-foreground">“{s.original}”</p>}
                    <div className="inline-flex rounded-md border p-0.5 text-xs">
                      {(["manual", "ai"] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded px-3 py-1 ${mode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>{m === "manual" ? "Manual" : <span className="inline-flex items-center gap-1">{!pro && <Lock className="h-3 w-3" />}AI suggest</span>}</button>)}
                    </div>
                    {s.kind === "rewrite" ? (
                      <div className="space-y-2">
                        <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs">
                          <p className="font-medium">How it works: answer 3 short questions, we join them into one strong line.</p>
                          <p className="mt-1.5 text-muted-foreground line-through">Designed seamless wireframes for the checkout flow.</p>
                          <p className="mt-0.5"><span className="text-success">→</span> Redesigned the 5-step checkout into 2 steps; with no engineering budget for a rebuild; conversion rose 18% in 6 weeks.</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {([["action", "1. What did you actually do?", "The change you made"], ["constraint", "2. What made it hard?", "Deadline, legacy tech, small team, budget"], ["outcome", "3. What changed because of it?", "A number or a real result"]] as const).map(([k, l, h]) => <label key={k} className="text-xs font-medium">{l}<span className="block font-normal text-muted-foreground">{h}</span><textarea rows={3} className="mt-1 w-full rounded-md border bg-background p-2 text-sm font-normal placeholder:text-muted-foreground/60" placeholder={EXAMPLES[k]} value={fields[k]} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} /></label>)}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Only add true facts. Leave a box empty if you don't know.</p>
                      </div>
                    ) : (
                      <label className="block text-xs font-medium">Your true example<textarea rows={2} className="mt-1 w-full rounded-md border bg-background p-2 text-sm font-normal" placeholder="e.g. Ran 12 usability sessions that cut checkout drop-off 18%" value={fields.text} onChange={(e) => setFields({ ...fields, text: e.target.value })} /></label>
                    )}
                    {mode === "manual" ? (
                      <>
                        {manualText.trim() && <p className="border-l-2 border-primary pl-3 text-sm">{manualText}</p>}
                        <div className="flex gap-2"><Button size="sm" onClick={() => apply(manualText, "manual")}><Check />Apply to resume</Button><Button size="sm" variant="ghost" onClick={() => { setSkipped([...skipped, s.id]); reset(); }}>Skip</Button></div>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={askAi} disabled={busy === "ai"}><Wand2 />{busy === "ai" ? "Drafting…" : "Draft with AI"}</Button>
                        <p className="text-xs text-muted-foreground">Optional: fill the boxes above with true numbers for a stronger draft.</p>
                        {aiDraft && (
                          <div className="space-y-2">
                            <textarea rows={2} className="w-full rounded-md border bg-background p-2 text-sm" value={aiDraft.text} onChange={(e) => setAiDraft({ text: e.target.value, flags: newFacts(e.target.value, [s.original ?? "", facts]) })} />
                            {aiDraft.flags.length > 0 && <p className="text-xs text-destructive">Needs your confirmation: “{aiDraft.flags.join("”, “")}” isn't in your facts. Edit it out or add it to your facts.</p>}
                            <Button size="sm" disabled={aiDraft.flags.length > 0} onClick={() => apply(aiDraft.text, "ai")}><Check />Apply AI draft</Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {(fixes.length > 0 || skipped.length > 0) && (
          <div className="space-y-1.5 border-t pt-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Done</p>
            {fixes.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-md bg-success/10 px-3 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success" /><span className="truncate">{f.title}</span><span className="shrink-0 text-[10px] uppercase text-muted-foreground">{f.source === "ai" ? "AI" : "Manual"}</span></span>
                <Button size="sm" variant="ghost" onClick={() => undoFix(f)}><Undo2 />Undo</Button>
              </div>
            ))}
            {queue.filter((q) => skipped.includes(q.id)).map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                <span className="truncate">Skipped · {q.title}</span>
                <Button size="sm" variant="ghost" onClick={() => setSkipped(skipped.filter((x) => x !== q.id))}>Restore</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-semibold">Edit resume text</h3>
          <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={undo} disabled={!history.length}><RotateCcw />Undo last</Button>
          <Button size="sm" variant="ghost" onClick={resetAll} disabled={draft === resume}>Reset to original</Button></div></div>
        <textarea rows={14} className="w-full rounded-md border bg-background p-3 font-mono text-xs leading-relaxed" value={draft} onChange={(e) => onType(e.target.value)} onBlur={() => setTyping(false)} />
      </Card>
    </div>
  );

  const right = (
    <div className="space-y-3 md:sticky md:top-4">
      <ResumePreview original={resume} draft={draft} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={word}>{pro ? <FileText /> : <Lock />}Download Word (.docx)</Button>
        <Button size="sm" variant="outline" onClick={copy}><Copy />Copy</Button>
      </div>
      <SaveResumeVersion resume={draft} candidate={official.cand} job={job} scoredText={official.text} />
    </div>
  );

  return (
    <section className="space-y-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Live editor · {job.description.trim() ? "job match score" : "generic resume score"}</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Edit on the left, see your resume on the right</h2>
        <p className="text-sm text-muted-foreground">Add only true details. AI only rephrases facts you give it; your saved resume is never changed.</p>
      </div>
      <div className="hidden gap-6 md:grid md:grid-cols-2">{left}{right}</div>
      <Tabs defaultValue="edit" className="md:hidden">
        <TabsList className="w-full"><TabsTrigger value="edit" className="flex-1">Edit</TabsTrigger><TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger></TabsList>
        <TabsContent value="edit">{left}</TabsContent>
        <TabsContent value="preview">{right}</TabsContent>
      </Tabs>
      <PaywallModal open={!!wall} onOpenChange={(o) => !o && setWall(null)} reason={wall ?? ""} />
    </section>
  );
}
