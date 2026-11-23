import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CareerNav } from '@/components/CareerNav';
import { ResumeInput } from '@/components/ResumeInput';
import { SaveResumeVersion } from '@/components/SaveResumeVersion';
import { PaywallModal } from '@/components/PaywallModal';
import { q, scanToPair } from '@/lib/db';
import { careerQueries } from '@/lib/career/db';
import { promotionAudit } from '@/lib/career/logic';
import { careerHead } from '@/lib/career/meta';
import { readResumeGuest } from '@/lib/evaluate.functions';
import { LEVELS, inferLevel, type Candidate, type Job, type Level } from '@/lib/scoring';
import { canScan, countScan, scansUsed } from '@/lib/plans';
import { usePro } from '@/lib/pro';
export const Route = createFileRoute('/promotion')({ head: () => careerHead('Design promotion audit', 'Compare your resume evidence against Senior, Staff, Manager or Director expectations using the published eight-dimension rubric.'), component: Promotion });
function Promotion() {
  const { data: me } = useQuery(q.me());
  const { data: scans = [] } = useQuery({ ...q.scans(me?.id ?? ''), enabled: !!me });
  const { data: versions = [] } = useQuery({ ...careerQueries.versions(me?.id ?? ''), enabled: !!me });
  const [resume, setResume] = useState(''); const [pair, setPair] = useState<{ candidate: Candidate; job: Job; text: string } | null>(null); const [level, setLevel] = useState<Level>('Staff / Principal Designer'); const [busy, setBusy] = useState(false); const [wall, setWall] = useState(false);
  const read = useServerFn(readResumeGuest); const pro = usePro();
  const loadSaved = (id: string) => {
    if (!id) { setPair(null); setResume(''); return; }
    const version = versions.find(v => v.id === id);
    if (version) { setResume(version.resume_text); setPair(version.resume_text === version.scored_text ? { candidate: version.candidate, job: version.job, text: version.scored_text } : null); return; }
    const scan = scans.find(s => s.id === id); if (!scan) return;
    const p = scanToPair(scan); setResume(scan.resume_text); setPair({ candidate: p.cand, job: p.job, text: scan.resume_text });
  };
  const audit = async () => {
    if (!canScan(scansUsed(), pro)) { setWall(true); return; }
    setBusy(true);
    try {
      const evidence = await read({ data: { resume, jobTitle: 'Future Talent Index', jobDescription: '', requirements: [] } });
      const job: Job = { id: 'promotion', title: 'Future Talent Index', func: '', seniority: '', description: '', flexibility: 50, preset: 'Balanced Match', weights: { JR: 30, FR: 40, HP: 30 }, mandatory: [], preferred: [], createdAt: new Date().toISOString() };
      setPair({ candidate: { ...evidence, id: 'promotion', jobId: job.id }, job, text: resume }); countScan(); window.__lovableEvents?.track?.('project.promotion_audited', { level });
    } catch(e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  const report = pair ? promotionAudit(pair.candidate, level) : null;
  return <div className="space-y-8"><CareerNav /><header className="space-y-3"><p className="flex items-center gap-2 text-sm font-medium text-primary"><TrendingUp className="h-4 w-4" />YOUR NEXT DESIGN CHAPTER</p><h1 className="text-4xl">What’s missing at the next level?</h1><p className="max-w-2xl text-muted-foreground">Compare the evidence in your resume with the scope you’re aiming for. No new scan needed when you change the target level.</p></header>
    <div className="grid gap-8 md:grid-cols-[1fr_1fr]"><section className="space-y-4"><h2 className="text-xl">Your evidence</h2>{me && <label className="block text-sm">Use a saved resume<select aria-label="Use a saved resume" className="mt-2 w-full rounded-md border bg-card p-3 text-sm" defaultValue="" onChange={e => loadSaved(e.target.value)}><option value="">Upload or paste a resume</option><optgroup label="Saved versions">{versions.map(v => <option key={v.id} value={v.id}>{v.name}{v.resume_text !== v.scored_text ? ' · draft' : ''}</option>)}</optgroup><optgroup label="Past scans">{scans.map(s => <option key={s.id} value={s.id}>{s.job_title} · {new Date(s.created_at).toLocaleDateString()}</option>)}</optgroup></select></label>}
      <ResumeInput value={resume} onChange={value => { setResume(value); setPair(null); }} /><Button onClick={audit} disabled={busy || resume.trim().length < 80}>{busy ? 'Reading your evidence…' : 'Audit my next level'}<ArrowRight /></Button><p className="text-xs text-muted-foreground">New resume analysis uses your scan allowance. Saved, scored evidence is free to compare.</p></section>
      <section className="space-y-4"><h2 className="text-xl">Your target scope</h2><label className="block text-sm">Target level<select aria-label="Target level" className="mt-2 w-full rounded-md border bg-card p-3" value={level} onChange={e => setLevel(e.target.value as Level)}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></label><div className="border-l-2 border-primary pl-4"><p className="text-sm font-medium">Not a promotion verdict</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">This measures written evidence, not your ability or your employer’s promotion criteria. Use gaps to plan projects, collect proof and prepare your next review.</p></div>{!me && <Button asChild variant="outline"><Link to="/auth" search={{ mode: 'signup', as: 'candidate', redirect: '/promotion' }}>Keep my audit in an account</Link></Button>}</section></div>
    {pair && report && <div className="space-y-8"><div className="flex flex-wrap items-center justify-between gap-6 border-y py-6"><div><p className="text-xs text-muted-foreground">Current title suggests {inferLevel(pair.candidate.years, pair.candidate.role)}</p><h2 className="mt-2 text-2xl">Evidence for {level}</h2><p className="mt-1 text-sm text-muted-foreground">{pair.candidate.name} · {report.dims.filter(d => d.quotes.length).length} of 8 dimensions evidenced</p></div><p className="font-mono text-5xl">{report.total}<span className="text-base text-muted-foreground"> / 100</span></p></div>
      <section><h2 className="text-xl">Build evidence here next</h2><ol className="mt-4 grid gap-4 md:grid-cols-3">{report.priorities.map((d, i) => <li key={d.id} className="rounded-lg border bg-card p-5"><p className="font-mono text-xs text-primary">0{i + 1} · {d.weight}% of this level’s score</p><h3 className="mt-2 text-base">{d.name}</h3><p className="mt-3 text-sm text-muted-foreground">{d.tip}</p><p className="mt-4 font-mono text-sm">{d.score} / 100</p></li>)}</ol></section>
      <div className="divide-y">{report.dims.map(d => <div key={d.id} className="grid gap-3 py-4 md:grid-cols-[1fr_80px_2fr]"><p className="text-sm font-medium">{d.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">Weight {d.weight}%</span></p><p className="font-mono text-lg">{d.score}</p><p className="text-sm text-muted-foreground">{d.quotes[0] ? `“${d.quotes[0]}”` : 'No evidence found in this resume.'}</p></div>)}</div>
      <SaveResumeVersion resume={pair.text} candidate={pair.candidate} job={{ ...pair.job, description: '', mandatory: [] }} scoredText={pair.text} level={level} />
    </div>}<PaywallModal open={wall} onOpenChange={setWall} reason="Your free scan is used. Get unlimited scans and all features for 30 days with the ₹99 Job Hunt Pass." />
  </div>;
}
