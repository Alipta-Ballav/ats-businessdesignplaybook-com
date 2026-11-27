import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Lock,
  RotateCcw,
  Sparkles,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui-bits";
import { ResumePreview } from "@/components/ResumePreview";
import { PaywallModal } from "@/components/PaywallModal";
import { ResumeWorkspace } from "@/components/ResumeWorkspace";
import { readResumeGuest } from "@/lib/evaluate.functions";
import { suggestRewrite } from "@/lib/rewrite.functions";
import { applySuggestion, buildQueue, cleanLine, headlineScore, insertionLocations, TIERS, type Suggestion, type Tier } from "@/lib/fixer";
import { estimateCandidate, fixesUsed, proposalFlags, revertFix, type FixEntry } from "@/lib/editor";
import { downloadResumeDocx, resumeBlocks } from "@/lib/export-docx";
import { usePro, usePowerPass, passAllowance, recordPassScan } from "@/lib/pro";
import { FREE_FIXES, PLANS, planTerms, canApplyFix, canDownloadWord, canRescore } from "@/lib/plans";
import { numberSteps } from "@/lib/queue-steps";
import { inferLevel, type Candidate, type Job, type Level } from "@/lib/scoring";
import type { EditorSession } from "@/lib/editor-session";
import { createRewriteCache } from "@/lib/rewrite-cache";
import { downloadResumePdf } from "@/lib/export-pdf";
import { inspectBullets } from "@/lib/diagnostics";

type Fix = FixEntry & { title: string };
const EXAMPLES = {
  action: "e.g. Redesigned the 5-step checkout into 2 steps",
  constraint: "e.g. with no engineering budget for a rebuild",
  outcome: "e.g. conversion rose 18% in 6 weeks",
};
const blank = { action: "", constraint: "", outcome: "", text: "" };
/** Guide score for a strong match; shown as a goal, never claimed as an employer cutoff. */
const TARGET = 75;

type LiveEditorProps = {
  job: Job;
  cand: Candidate;
  resume: string;
  initialDraft?: string;
  scoringLevel?: Level;
  onRescored?: ((c: Candidate) => void) | undefined;
  initialSession?: EditorSession | undefined;
  onSessionChange?: ((session: EditorSession) => void) | undefined;
  versionId?: string | undefined;
  onActiveVersionChange?: ((id: string) => void) | undefined;
  onBackToList?: (() => void) | undefined;
};
export function LiveEditor(props: LiveEditorProps) {
  return <ResumeWorkspace seed={props} versionId={props.versionId} onSessionChange={props.onSessionChange} onActiveVersionChange={props.onActiveVersionChange} onBackToList={props.onBackToList}>
    {({ editorKey, toolbar, isOriginal, ...active }) => <EditorContent
      key={editorKey} {...active} toolbar={toolbar} onBackToList={props.onBackToList}
      onRescored={isOriginal ? props.onRescored : undefined}
    />}
  </ResumeWorkspace>;
}
function EditorContent({ job, cand, resume, initialDraft, scoringLevel, onRescored, initialSession, onSessionChange, onBackToList, toolbar }: LiveEditorProps & { toolbar: ReactNode }) {
  const read = useServerFn(readResumeGuest);
  const ai = useServerFn(suggestRewrite);
  const pro = usePro();
  const power = usePowerPass();
  const renewalPlan = power ? "power_60" : "job_hunt_30";
  const renewalTerms = planTerms(renewalPlan);
  const renewalPrice = power ? PLANS.find((plan) => plan.id === renewalPlan)?.inr : undefined;
  const renewalOffer = `${power ? "Power Searcher" : "Job Hunt"} Pass${renewalPrice === undefined ? "" : ` · ₹${renewalPrice}`} · ${renewalTerms.scans} verified scores for ${renewalTerms.days} days`;
  const [passLeft, setPassLeft] = useState<number | null>(null);
  useEffect(() => {
    if (pro) passAllowance().then(setPassLeft);
    const on = () => {
      void passAllowance().then(setPassLeft);
    };
    window.addEventListener("ft-pro-changed", on);
    return () => window.removeEventListener("ft-pro-changed", on);
  }, [pro]);
  const level = scoringLevel ?? inferLevel(cand.years, cand.role);
  const base = headlineScore(job, cand, level);
  const [draft, setDraft] = useState(initialSession?.draft ?? initialDraft ?? resume);
  const [history, setHistory] = useState<{ draft: string; fixes: Fix[]; skipped: string[] }[]>(initialSession?.history ?? []);
  const [typing, setTyping] = useState(false);
  const [official, setOfficial] = useState<{ cand: Candidate; score: number; text: string }>(initialSession?.official ?? {
    cand,
    score: base,
    text: resume,
  });
  const [fixes, setFixes] = useState<Fix[]>(initialSession?.fixes ?? []);
  const [skipped, setSkipped] = useState<string[]>(initialSession?.skipped ?? []);
  const [openId, setOpenId] = useState<string | null>(initialSession?.openId ?? null);
  const [fields, setFields] = useState(initialSession?.fields ?? blank);
  const [aiDraft, setAiDraft] = useState<{ text: string; sources: string[]; manualFacts: string } | null>(initialSession?.aiDraft ?? null);
  const [proposal, setProposal] = useState(initialSession?.proposal ?? "");
  const [writingManually, setWritingManually] = useState(initialSession?.writingManually ?? false);
  const [placement, setPlacement] = useState(initialSession?.placement ?? "");
  const [undoneId, setUndoneId] = useState<string | null>(null);
  const [showFacts, setShowFacts] = useState(false);
  const [busy, setBusy] = useState<"" | "ai" | "score">("");
  const [wall, setWall] = useState<string | null>(null);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  useEffect(() => {
    const openQueue = () => { setTier("critical"); setShowAll(true); };
    window.addEventListener("ft-open-priority-queue", openQueue);
    return () => window.removeEventListener("ft-open-priority-queue", openQueue);
  }, []);
  const [showAll, setShowAll] = useState(false);
  const [lastResult, setLastResult] = useState<{ from: number; to: number; fixes: number } | null>(null);
  const rewriteCache = useRef(createRewriteCache());
  const sessionCallback = useRef(onSessionChange);
  sessionCallback.current = onSessionChange;
  useEffect(() => {
    sessionCallback.current?.({ draft, history, official, fixes, skipped, openId, fields, aiDraft, proposal, writingManually, placement });
  }, [draft, history, official, fixes, skipped, openId, fields, aiDraft, proposal, writingManually, placement]);
  useEffect(() => {
    if (initialSession) onRescored?.(initialSession.official.cand);
  }, []);

  const queue = useMemo(() => buildQueue(job, official.cand, official.text, level), [job, official, level]);
  const doneIds = fixes.map((f) => f.id);
  // A saved draft may already have rewritten a line from the scored text; hide fixes whose line is gone.
  const open = queue.filter((s) => !doneIds.includes(s.id) && !skipped.includes(s.id) && (s.kind !== "rewrite" || !s.original || draft.includes(s.original)));
  const tierOf = (s: Suggestion) => s.tier ?? "polish";
  const counts = Object.fromEntries(
    TIERS.map((t) => [t.id, open.filter((s) => tierOf(s) === t.id).length]),
  ) as Record<Tier, number>;
  const tab: Tier = tier ?? TIERS.find((t) => counts[t.id] > 0)?.id ?? "critical";
  const tabOpen = open.filter((s) => tierOf(s) === tab);
  const visibleOpen = showAll ? tabOpen : tabOpen.slice(0, 3);
  const active =
    open.find((s) => s.id === openId) ?? (openId === null ? tabOpen[0] : undefined) ?? tabOpen[0];
  const pickLine = (line: string) => {
    const s = open.find((q) => q.original === line);
    if (!s) return;
    setTier(tierOf(s));
    if (!tabOpen.slice(0, 3).includes(s)) setShowAll(true);
    setOpenId(s.id);
    reset();
    setJustDone(null);
  };
  const estimate = headlineScore(job, estimateCandidate(official.cand, draft), level);
  const stale = draft !== official.text;
  const delta = official.score - base;
  const locations = useMemo(() => insertionLocations(draft), [draft]);
  const firstRole = resumeBlocks(draft).find((block) => block.kind === "role")?.lineIndices[0];
  const defaultPlacement = locations.find((l) => l.id === `section:${firstRole}`)?.id
    ?? locations.find((l) => l.id.startsWith("section:"))?.id ?? locations[0]?.id ?? "additional";
  const selectedPlacement = placement || defaultPlacement;
  const location = locations.find((l) => l.id === selectedPlacement);
  const placementReady = active?.kind !== "add" || !!location || selectedPlacement === "additional";
  const aiLabel = aiDraft ? "Regenerate with AI" : active?.original ? "Improve this line with AI" : "Write a new bullet with AI";
  const factsLabel = aiDraft ? "Regenerate using your facts" : "Generate using your facts";

  const commit = (next: string) => {
    setHistory((h) => [...h, { draft, fixes, skipped }]);
    setDraft(next);
    setTyping(false);
  };
  const onType = (v: string) => {
    if (!typing) {
      setHistory((h) => [...h, { draft, fixes, skipped }]);
      setTyping(true);
    }
    setDraft(v);
  };
  const reset = () => {
    setFields(blank);
    setAiDraft(null);
    setProposal("");
    setWritingManually(false);
    setPlacement("");
    setUndoneId(null);
  };
  const facts = [fields.action, fields.constraint, fields.outcome, fields.text]
    .filter(Boolean)
    .join("; ");

  const askAi = async () => {
    const manualFacts = aiDraft?.manualFacts ?? (writingManually ? proposal : "");
    const suppliedFacts = [facts, manualFacts].filter(Boolean).join("; ");
    if (!suppliedFacts.trim() && !active?.original) {
      setShowFacts(true);
      toast.error(
        "Fill in at least one question below — AI writes the new bullet only from your facts.",
      );
      return;
    }
    setBusy("ai");
    try {
      const input = { original: active?.original ?? "", facts: suppliedFacts };
      const text = await rewriteCache.current(input, async () => (await ai({ data: input })).text, !!aiDraft);
      if (active?.original && sameLine(text, active.original)) {
        setShowFacts(true);
        toast("AI can't make this line stronger without new facts.", {
          description: "Add what you did, what made it hard, or what changed below, then generate again.",
        });
        setBusy("");
        return;
      }
      setAiDraft({ text, sources: [active?.original ?? "", suppliedFacts], manualFacts });
      setProposal(text);
    } catch (e) {
      const m = (e as Error).message || "";
      toast.error(m || "AI suggestion failed. Try again.");
    }
    setBusy("");
  };

  const apply = (text: string, source: "manual" | "ai") => {
    if (!active) return;
    if (proposalFlags(text, [...(aiDraft?.sources ?? []), facts], source).length) {
      toast.error("Remove unsupported AI details or add them as true facts first.");
      return;
    }
    if (!placementReady) {
      toast.error("Choose where to add this bullet first.");
      return;
    }
    if (!canApplyFix(fixesUsed(fixes), pro)) {
      window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "fix" });
      setWall(
        `You've used your ${FREE_FIXES} free fixes. Unlock every suggestion and the Word download.`,
      );
      return;
    }
    const next = applySuggestion(draft, active, text, location?.insertAt);
    if (next === draft) {
      toast.error(active.kind === "rewrite" && active.original && !draft.includes(active.original) ? "This line was already changed in your draft. Edit it in the full resume text instead." : "Write or draft the improved line first.");
      return;
    }
    commit(next);
    setFixes([
      ...fixes,
      {
        id: active.id,
        source,
        title: active.title,
        added: cleanLine(text),
        edit: { before: draft, after: next, cleanupHeading: selectedPlacement === "additional" && !resume.split("\n").some((line) => line.trim() === "Additional evidence") },
        removed:
          active.kind === "rewrite" && active.original && draft.includes(active.original)
            ? active.original
            : "",
      },
    ]);
    reset();
    setOpenId(null);
    setJustDone(active.id);
    toast.success(`Step done: ${active.title}`, {
      description: "Highlighted in the preview. You can undo it any time.",
    });
    window.__lovableEvents?.track?.("project.suggestion_applied", { source });
  };

  const rescore = async () => {
    if (!canRescore(pro)) {
      window.__lovableEvents?.track?.("project.paywall_shown", { trigger: "rescore" });
      setWall(
        "Your estimated score is free. Choose a Job Hunt or Power Searcher Pass to unlock AI-verified rescoring and Word downloads.",
      );
      return;
    }
    const allowed = await passAllowance();
    setPassLeft(allowed);
    if (allowed === 0) {
      setWall(
        `You've used all verified scans in your active passes. Renew your ${renewalOffer}.`,
      );
      return;
    }
    setBusy("score");
    try {
      const ev = await read({
        data: {
          resume: draft,
          jobTitle: job.title,
          jobDescription: job.description,
          requirements: job.mandatory,
        },
      });
      const c: Candidate = {
        ...official.cand,
        name: ev.name,
        role: ev.role,
        years: ev.years,
        domain: ev.domain,
        mandatory: ev.mandatory,
        competencies: ev.competencies,
      };
      const score = headlineScore(job, c, level);
      toast.success(`Score updated: ${official.score} → ${score}`);
      setOfficial({ cand: c, score, text: draft });
      setLastResult({ from: official.score, to: score, fixes: fixes.length });
      onRescored?.(c);
      if (allowed !== null) {
        await recordPassScan();
        setPassLeft(allowed - 1);
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy("");
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (prev === undefined) return;
    setHistory(history.slice(0, -1));
    setDraft(prev.draft);
    setFixes(prev.fixes);
    setSkipped(prev.skipped);
    setTyping(false);
    setJustDone(null);
    reset();
    const reverted = fixes.find((f) => !prev.fixes.some((p) => p.id === f.id));
    if (reverted) reopen(reverted);
    toast.success("Last change undone");
  };
  const reopen = (f: Fix) => {
    const suggestion = queue.find((s) => s.id === f.id);
    if (suggestion) {
      setTier(tierOf(suggestion));
      setShowAll(true);
      setOpenId(f.id);
    }
    setUndoneId(f.id);
  };
  const undoFix = (f: Fix) => {
    const next = revertFix(draft, f);
    if (next === draft) {
      toast.error("This text has changed since it was applied. Use Undo last to restore the previous version.");
      return;
    }
    setJustDone(null);
    commit(next);
    setFixes(fixes.filter((x) => x !== f));
    reset();
    reopen(f);
    toast.success("Change undone");
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, [contenteditable='true']")) return;
      if (e.defaultPrevented || e.shiftKey || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || !history.length || busy) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const resetAll = () => {
    if (!window.confirm("Reset to your original CV? All changes will be removed.")) return;
    commit(resume);
    setFixes([]);
    setSkipped([]);
  };
  const total = fixes.length + open.length + skipped.length;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Resume copied");
    } catch {
      toast.error("Could not copy.");
    }
  };
  const word = async () => {
    if (!canDownloadWord(pro)) {
      setWall("Download your improved resume as an ATS-ready Word file.");
      return;
    }
    try {
      await downloadResumeDocx(draft);
      window.__lovableEvents?.track?.("project.resume_exported", { format: "docx" });
    } catch {
      toast.error("Could not create the Word file.");
    }
  };
  const pdf = async () => {
    if (!canDownloadWord(pro)) {
      setWall("Download your improved resume as a clean ATS PDF with your Job Hunt Pass.");
      return;
    }
    try {
      await downloadResumePdf(draft);
      window.__lovableEvents?.track?.("project.resume_exported", { format: "pdf" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the PDF file.");
    }
  };

  const pending = active && proposal.trim() && placementReady ? applySuggestion(draft, active, proposal, location?.insertAt) : draft;
  const flags = proposalFlags(proposal, [...(aiDraft?.sources ?? []), facts], aiDraft ? "ai" : "manual");
  const immediateFeedback = inspectBullets(proposal || active?.original || "")[0]?.issues ?? [];

  const left = (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <p className="font-display text-3xl font-semibold tabular-nums">{official.score}</p>
            <p className="text-xs text-muted-foreground">
              / 100 · target {TARGET}+ ·{" "}
              <span className={delta >= 0 ? "text-success" : "text-destructive"}>
                {delta >= 0 ? "+" : ""}
                {delta} from {base}
              </span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {stale ? (
              <>
                Estimated now <b className="text-foreground">~{estimate}</b>
              </>
            ) : official.score >= TARGET ? (
              <b className="text-success">Above target</b>
            ) : (
              <>{TARGET - official.score} pts to target</>
            )}
          </p>
        </div>
        <div className="relative h-2 rounded-full bg-muted" aria-hidden>
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${official.score >= TARGET ? "bg-success" : "bg-primary"}`}
            style={{ width: `${official.score}%` }}
          />
          {stale && estimate > official.score && (
            <div
              className="absolute inset-y-0 rounded-r-full bg-primary/30"
              style={{ left: `${official.score}%`, width: `${Math.min(estimate, 100) - official.score}%` }}
            />
          )}
          <div className="absolute -inset-y-1 w-0.5 bg-foreground" style={{ left: `${TARGET}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          {counts.critical > 0
            ? `${counts.critical} critical gap${counts.critical === 1 ? "" : "s"} in resume evidence${job.description.trim() ? " or job requirements" : ""} · fix these first`
            : `${open.length} recommendation${open.length === 1 ? "" : "s"} left · ${fixes.length} applied`}
          {" "}· target is a guide, not an employer cutoff
        </p>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 data-priority-queue tabIndex={-1} className="scroll-mt-24 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring">Priority queue</h3>
          <span className="text-xs text-muted-foreground">
            {fixes.length}/{total} done
          </span>
        </div>
        <div role="tablist" className="flex gap-1 border-b px-3 py-2">
          {TIERS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTier(t.id);
                setShowAll(false);
                setOpenId(null);
                reset();
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${t.id === "critical" ? "bg-destructive" : t.id === "impact" ? "bg-warning" : "bg-success"}`}
              />
              {t.label}
              <span className="tabular-nums opacity-80">{counts[t.id]}</span>
            </button>
          ))}
        </div>
        {total > 0 && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${(fixes.length / total) * 100}%` }}
            />
          </div>
        )}
        {open.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">All done. Rescore below to find more.</p>
        ) : (
          tabOpen.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Nothing left here. Pick another tab.</p>
          )
        )}
        <ul className="divide-y">
          {numberSteps(queue
            .filter(
              (q) =>
                !skipped.includes(q.id) &&
                tierOf(q) === tab &&
                (doneIds.includes(q.id) || visibleOpen.includes(q)),
            ))
            .map(({ item: s, step }) => {
              const f = fixes.find((x) => x.id === s.id);
              if (f)
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 border-l-4 border-success bg-success/10 px-4 py-3 transition-all ${justDone === f.id ? "ring-2 ring-inset ring-success/50" : ""}`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-background">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        <span className="mr-1 text-muted-foreground">{step}.</span>
                        {s.title}
                      </p>
                      <p className="text-xs text-success">
                        {justDone === f.id ? "Just applied ✓ · " : "Applied · "}
                        {f.source === "ai" ? "AI" : "Manual"} · highlighted in preview
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => undoFix(f)}>
                      <Undo2 />
                      Undo
                    </Button>
                  </li>
                );
              const isActive = s.id === active?.id;
              return (
                <li key={s.id} className={isActive ? "bg-primary/5" : ""}>
                  <button
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    onClick={() => {
                      setOpenId(s.id);
                      reset();
                      setJustDone(null);
                    }}
                  >
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {step}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.title}</p>
                      {!isActive && (
                        <p className="truncate text-xs text-muted-foreground">{s.detail}</p>
                      )}
                    </div>
                  </button>
                  {isActive && (
                    <div className="space-y-4 px-4 pb-5 pl-12">
                      {undoneId === s.id && <p role="status" className="text-xs font-medium text-primary">Undone · original text restored</p>}
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                      {immediateFeedback.length > 0 && <div className="border-l-2 border-warning pl-2 text-xs text-muted-foreground"><p className="font-medium">Text checks · not a score</p>{immediateFeedback.map(issue => <p key={issue}>{issue}</p>)}</div>}
                      {busy === "ai" && <p role="status" className="text-xs text-primary">{facts.trim() ? "Drafting from your original line and supplied facts…" : "Rephrasing your original line without adding facts…"}</p>}
                      {s.kind === "add" && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium">Add this bullet to</p>
                          <Select value={selectedPlacement} onValueChange={setPlacement}>
                            <SelectTrigger aria-label="Add this bullet to" className="max-w-full [&>span]:truncate">
                              <SelectValue placeholder="Choose a role, section, or line" />
                            </SelectTrigger>
                            <SelectContent className="max-w-[min(90vw,32rem)]">
                              {locations.map((l) => <SelectItem key={l.id} value={l.id} className="break-words whitespace-normal">{l.label}</SelectItem>)}
                              <SelectItem value="additional">New Additional evidence section</SelectItem>
                            </SelectContent>
                          </Select>
                          {!placementReady && <p role="status" className="text-xs text-destructive">Choose where this bullet belongs before applying it.</p>}
                        </div>
                      )}
                      {s.original && (
                        <div
                          className={`rounded-md border p-3 ${proposal.trim() ? "border-destructive/30 bg-destructive/5" : "bg-muted/40"}`}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            {proposal.trim() ? "Before" : "Your line now · highlighted in the preview"}
                          </p>
                          <p
                            className={`mt-1 text-sm ${proposal.trim() ? "text-muted-foreground line-through decoration-destructive/50" : ""}`}
                          >
                            {s.original}
                          </p>
                        </div>
                      )}
                      {!proposal.trim() && !writingManually ? (
                        <div className="space-y-2">
                          <Button className="w-full" onClick={askAi} disabled={busy === "ai"}>
                            <Wand2 />
                            {busy === "ai" ? "Writing…" : aiLabel}
                          </Button>
                          <Button variant="ghost"
                            className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
                            onClick={() => { setWritingManually(true); setAiDraft(null); setProposal(s.original ?? ""); }}
                          >
                            or write it myself
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                            After · edit freely · preview updates on the right
                          </p>
                          <textarea
                            aria-label="Suggested resume bullet"
                            autoFocus
                            rows={3}
                            className="w-full rounded-md border-2 border-success/50 bg-success/5 p-3 text-sm focus:border-success focus:outline-none"
                            value={proposal}
                            onChange={(e) => {
                              setProposal(e.target.value);
                              if (aiDraft && e.target.value !== aiDraft.text) { setAiDraft(null); setWritingManually(true); }
                            }}
                          />
                          {s.original && unchanged(proposal, s.original) && (
                            <p className="text-xs text-muted-foreground">
                              Edit the line above, then apply it.
                            </p>
                          )}
                          {flags.length > 0 && (
                            <p className="text-xs text-destructive">
                              “{flags.join("”, “")}” isn't in your resume. Remove it, or add it
                              below as a true fact.
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              disabled={!proposal.trim() || (!!s.original && unchanged(proposal, s.original)) || flags.length > 0 || !placementReady || !!busy}
                              onClick={() => apply(proposal, aiDraft ? "ai" : "manual")}
                            >
                              <Check />
                              Apply to resume
                            </Button>
                            <Button variant="outline" onClick={askAi} disabled={busy === "ai"}>
                              <Wand2 />
                              {busy === "ai" ? "Writing…" : aiLabel}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setProposal("");
                                setWritingManually(false);
                                setAiDraft(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                      {!s.original && (
                        <p className="rounded-md bg-muted/40 p-3 text-xs">
                          Your resume has no line for this yet. Write your own bullet, or provide true facts for AI.
                        </p>
                      )}
                      <details
                        open={showFacts || !s.original}
                        onToggle={(e) => setShowFacts((e.target as HTMLDetailsElement).open)}
                        className="rounded-md border border-dashed px-3 py-2 text-xs"
                      >
                        <summary className="cursor-pointer text-muted-foreground">
                          {s.original
                            ? "Want a stronger line? Add a real number or result (optional)"
                            : "Your facts for this bullet"}
                        </summary>
                        <div className="mt-2 grid gap-2">
                          {(
                            [
                              ["action", "What did you do?"],
                              ["constraint", "What made it hard?"],
                              ["outcome", "What changed?"],
                            ] as const
                          ).map(([k, l]) => (
                            <label key={k} className="text-muted-foreground">
                              {l}
                              <input
                                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60"
                                placeholder={EXAMPLES[k]}
                                value={fields[k]}
                                onChange={(e) => setFields({ ...fields, [k]: e.target.value })}
                              />
                            </label>
                          ))}
                          <p className="text-muted-foreground">
                            {aiDraft ? "AI uses your original line and the facts you provide." : "AI uses your original line, your manual draft, and the facts you provide."}
                          </p>
                          <Button variant="outline" className="w-full h-auto whitespace-normal" onClick={askAi} disabled={!!busy || (!facts.trim() && !s.original && !(writingManually && proposal.trim()))}>
                            <Wand2 />{busy === "ai" ? "Writing…" : factsLabel}
                          </Button>
                        </div>
                      </details>
                      <button
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => {
                          setSkipped([...skipped, s.id]);
                          reset();
                          setJustDone(null);
                          toast("Skipped — you can restore it under Steps");
                        }}
                      >
                        Skip this recommendation
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          {fixes
            .filter((f) => !queue.some((q) => q.id === f.id))
            .map((f, i) => (
              <li key={`done-${i}`} className="flex items-center gap-3 bg-success/5 px-4 py-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-background">
                  <Check className="h-3 w-3" />
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through decoration-success/60">
                  {f.title}
                </p>
                <span className="shrink-0 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">
                  Applied
                </span>
                <Button size="sm" variant="ghost" onClick={() => undoFix(f)}>
                  <Undo2 />
                  Undo
                </Button>
              </li>
            ))}
        </ul>
        {tabOpen.length > 3 && (
          <button
            className="w-full border-t px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show top 3 only" : `Show ${tabOpen.length - 3} more in ${TIERS.find((t) => t.id === tab)?.label}`}
          </button>
        )}
      </Card>

      {(history.length > 0 || fixes.length > 0 || skipped.length > 0) && (
        <Card className="space-y-1 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Steps
              {stale && (
                <span className="ml-2 font-normal text-xs text-muted-foreground">
                  · changes not rescored yet
                </span>
              )}
            </h3>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={undo} disabled={!history.length}>
                <Undo2 />
                Undo last
              </Button>
              <Button size="sm" variant="ghost" onClick={resetAll} disabled={draft === resume}>
                <RotateCcw />
                Reset
              </Button>
            </div>
          </div>
          {numberSteps(fixes).map(({ item: f, step }) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                <span className="truncate">
                  {step}.{" "}
                  {f.title}
                </span>
                <span className="shrink-0 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                  {f.source === "ai" ? "AI" : "Manual"}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => undoFix(f)}>
                <Undo2 />
                Undo
              </Button>
            </div>
          ))}
          {queue
            .filter((q) => skipped.includes(q.id))
            .map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-muted-foreground"
              >
                <span className="truncate">Skipped · {q.title}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSkipped(skipped.filter((x) => x !== q.id))}
                >
                  Restore
                </Button>
              </div>
            ))}
        </Card>
      )}

      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          Edit full resume text{" "}
          <span className="font-normal text-muted-foreground">
            — for typos or anything not covered above
          </span>
        </summary>
        <textarea
          rows={14}
          aria-label="Full resume text"
          className="w-full border-t bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none"
          value={draft}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => setTyping(false)}
        />
      </details>

      <Card className={`space-y-3 p-5 ${stale ? "border-2 border-primary/40 bg-primary/5" : ""}`}>
        <div>
          <h3 className="text-base font-semibold">
            {stale ? "Finished editing? Lock in your new score." : "Your score is up to date"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {stale ? (
              <>
                {fixes.length} change{fixes.length === 1 ? "" : "s"} applied · Estimated score{" "}
                <b className="text-foreground">~{estimate}</b> ({estimate - base >= 0 ? "+" : ""}
                {estimate - base} from {base})
              </>
            ) : (
              "Apply recommendations above, then rescore here."
            )}
          </p>
        </div>
        {lastResult && (
          <div role="status" className="rounded-lg border border-primary/40 bg-background p-4 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Verified score</p>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
              {lastResult.from} <span className="text-muted-foreground">→</span> {lastResult.to}
              <span className={`ml-2 text-base ${lastResult.to - lastResult.from >= 0 ? "text-primary" : "text-destructive"}`}>
                ({lastResult.to - lastResult.from >= 0 ? "+" : ""}
                {lastResult.to - lastResult.from} pts)
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lastResult.fixes} change{lastResult.fixes === 1 ? "" : "s"} checked by AI
              {passLeft !== null ? ` · ${passLeft} scan${passLeft === 1 ? "" : "s"} left in your pass` : ""}
              {" "}· the score at the top of the page is updated too
            </p>
            {lastResult.to === lastResult.from && (
              <p className="mt-2 text-xs text-muted-foreground">
                Score didn't move because no new measurable results or job requirements were found. Add real numbers or outcomes to gain points.
              </p>
            )}
          </div>
        )}
        <Button size="lg" className="w-full" onClick={rescore} disabled={!!busy || !stale}>
          <Sparkles />
          {!pro && <Lock />}
          {busy === "score"
            ? "Rescoring…"
            : pro
              ? passLeft === null
                ? "Verify final score"
                : passLeft === 0
                  ? "Verify final score · 0 scans left"
                  : `Verify final score · uses 1 of ${passLeft} left`
              : "Verify final score · choose a pass"}
        </Button>
        {pro && passLeft === 0 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            No scans left.{" "}
            <a
              href="/pass"
              target="_blank"
              rel="noopener"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Renew {renewalOffer}
            </a>
          </p>
        )}
      </Card>
    </div>
  );

  const right = (
    <div className="space-y-3 md:sticky md:top-20 md:self-start">
      <ResumePreview
        original={resume}
        draft={pending}
        withImages
        focus={active?.original}
        targets={open.flatMap((q) => (q.original ? [q.original] : []))}
        onPick={pickLine}
      />
      <p className="text-[11px] text-muted-foreground">
        Tip: click an underlined line in the resume to open its recommendation.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={pdf}>
          {pro ? <FileText /> : <Lock />}Download Clean ATS PDF
        </Button>
        <Button size="sm" onClick={word}>
          {pro ? <FileText /> : <Lock />}Download Word (.docx)
        </Button>
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy />
          Copy
        </Button>
      </div>
    </div>
  );

  return (
    <section className="space-y-4">
      {!onBackToList && <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Live editor · {job.description.trim() ? "job match score" : "generic resume score"}
        </p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Fix the biggest gaps first
        </h2>
        <p className="text-sm text-muted-foreground">
          Work through the priority queue on the left — each fix is spotlighted in your resume on the right. Undo any step.
        </p>
      </div>}
      {toolbar}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <p className="text-sm font-medium">{job.description.trim() ? "Role Fit score" : "Future Talent Index"}</p>
        <p className="font-mono text-xl">{official.score}<span className="text-xs text-muted-foreground"> / 100 · {stale ? "last verified · draft changed" : "verified resume"}</span></p>
      </div>
      <div className="hidden items-start gap-6 md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {left}
        {right}
      </div>
      <Tabs defaultValue="edit" className="md:hidden">
        <TabsList className="w-full">
          <TabsTrigger value="edit" className="flex-1">
            Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">
            Preview
          </TabsTrigger>
        </TabsList>
        <TabsContent value="edit">{left}</TabsContent>
        <TabsContent value="preview">{right}</TabsContent>
      </Tabs>
      <PaywallModal open={!!wall} onOpenChange={(o) => !o && setWall(null)} reason={wall ?? ""} />
    </section>
  );
}

function sameLine(a: string, b: string) {
  const n = (t: string) => t.toLowerCase().replace(/^[\s•\-*]+/, "").replace(/[^a-z0-9%]+/g, " ").trim();
  return n(a) === n(b);
}

function unchanged(a: string, b: string) {
  const n = (t: string) => t.replace(/\s+/g, " ").trim();
  return n(a) === n(b);
}
