import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Gauge, Quote, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FTI_DIMENSIONS, DESIGN_LEVELS } from "@/lib/scoring";

const TITLE = "UX Design ATS Checker — FutureTalent AI";
const DESC = "Get a free, explainable ATS score for your design resume. Every point is tied to a verbatim quote, calibrated for Workday, Greenhouse and Ashby.";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: TITLE }, { name: "description", content: DESC },
    { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Landing,
});

const pillars = [
  { icon: Quote, t: "Verbatim evidence, not keyword spam", d: "Every score links to an exact line in your resume. Anything we can't quote doesn't count." },
  { icon: Gauge, t: "Calibrated per ATS engine", d: "See how strict Workday parsing compares with Greenhouse and Ashby matching — before you apply." },
  { icon: Wand2, t: "Fix and rescore, line by line", d: "Turn vague bullets into proven impact with your own true details, then watch the score move." },
];

const compare = [
  ["Audience", "Every job under the sun", "Built only for UX, product & design leaders"],
  ["Scoring", "Black-box AI score", "Every point tied to a verbatim quote from your resume"],
  ["ATS engines", "One generic checklist", "Workday, Greenhouse & Ashby simulated separately"],
  ["Fixes", "\"Add more metrics\"", "Rewrite a bullet with your real numbers, rescore live"],
  ["Export", "Broken layouts", "ATS-safe single-column Word file"],
  ["Price", "$29–49 / month", "1 free scan, then ₹49 once — for life"],
];

const examples = [
  { before: "Designed seamless wireframes and conducted user testing for the checkout flow.", after: "Redesigned checkout from 5 steps to 2 after testing with 24 users, lifting conversion 18% (₹2.1Cr annualised).", from: 54, to: 79, tag: "Business impact" },
  { before: "Responsible for the design system and helped teams stay consistent.", after: "Led design system adoption across 4 product squads, cutting UI defects 32% and shipping features 2 weeks faster.", from: 61, to: 84, tag: "Systems thinking" },
  { before: "Collaborated with stakeholders to deliver great user experiences.", after: "Partnered with PM and Eng leads to reprioritise the roadmap on research insights, reducing support tickets 40%.", from: 49, to: 76, tag: "Influence" },
];

function BeforeAfter() {
  const [i, setI] = useState(0);
  const [fixed, setFixed] = useState(false);
  const ex = examples[i]!;
  return (
    <section className="mx-auto max-w-6xl px-6">
      <p className="text-sm font-medium text-primary">See the difference</p>
      <h2 className="mt-2 max-w-2xl text-3xl">From craft-speak to commercial impact</h2>
      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border bg-secondary p-1">{examples.map((e, k) =>
        <button key={k} onClick={() => { setI(k); setFixed(false); }} className={`rounded-md px-3 py-1.5 text-sm transition ${k === i ? "bg-card shadow-sheet" : "text-muted-foreground hover:text-foreground"}`}>{e.tag}</button>)}</div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sheet">
          <div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-destructive">Before · vanity bullet</span><span className="font-mono text-sm text-muted-foreground">{ex.from}</span></div>
          <p className="mt-4 text-muted-foreground line-through decoration-destructive/40">{ex.before}</p>
          <p className="mt-4 text-xs text-muted-foreground">Flagged: describes activity, not outcome. A recruiter reads this as junior.</p>
        </div>
        <div className={`rounded-xl border p-6 shadow-sheet transition ${fixed ? "border-primary/50 bg-card" : "bg-secondary"}`}>
          <div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-success">After · evidence bullet</span><span className="font-mono text-sm">{fixed ? <span className="text-success">{ex.to} (+{ex.to - ex.from})</span> : "—"}</span></div>
          {fixed ? <p className="mt-4">{ex.after}</p> : <p className="mt-4 text-sm text-muted-foreground">Add your real numbers, we rewrite the line and rescore it instantly.</p>}
          <Button size="sm" className="mt-5" variant={fixed ? "outline" : "default"} onClick={() => setFixed(!fixed)}>{fixed ? "Show original" : <>Apply & rescore <Wand2 /></>}</Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Illustrative example. In the tool, rewrites only use facts you supply.</p>
    </section>
  );
}

function Landing() {
  const [lvl, setLvl] = useState(0);
  const levels = Object.entries(DESIGN_LEVELS).map(([label, v]) => ({ label, ...v }));
  const cur = levels[lvl];
  return (
    <div className="-mx-6 -mt-8 space-y-28 pb-16">
      <section className="bg-hero px-6 pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
              The ATS checker built only for the UX design community
            </span>
            <h1 className="text-5xl leading-[1.05] md:text-6xl">Stop being graded like a sales rep. <span className="text-gradient">Get read like a Design Director would.</span></h1>
            <p className="max-w-xl text-lg text-muted-foreground">8 years of solid UX, still auto-rejected before a human sees your portfolio? Generic scanners count "Figma" mentions. We score systems thinking, cross-functional influence and business impact. Made for UX, product and design leadership roles — from Senior to Director. Not a generic keyword scanner: an 8-dimension Future Talent Index, ATS engine calibration and quote-verified scoring — for job seekers and the people hiring them.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow"><Link to="/check" search={{ job: undefined }}>Run free resume audit <ArrowRight /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/check" search={{ job: undefined }}>Score against a job</Link></Button>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" />1 free scan, no signup · then ₹49 once unlocks everything</p>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-glow">
            <div className="flex items-center justify-between"><p className="text-sm font-medium">Future Talent Index</p><span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">Strong alignment</span></div>
            <div className="mt-5 flex items-center gap-6">
              <div className="grid h-28 w-28 place-items-center rounded-full" style={{ background: "conic-gradient(var(--primary) 295deg, var(--muted) 0)" }}>
                <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-card"><span className="font-mono text-2xl">82</span></div>
              </div>
              <div className="flex-1 space-y-2">{[["Systems thinking", 88], ["AI fluency", 74], ["Influence", 81]].map(([n, v]) =>
                <div key={n}><div className="flex justify-between text-xs"><span>{n}</span><span className="font-mono text-muted-foreground">{v}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-gradient-primary" style={{ width: `${v}%` }} /></div></div>)}</div>
            </div>
            <div className="mt-5 flex gap-2">{["Workday 71", "Greenhouse 80", "Ashby 84"].map((a) => <span key={a} className="rounded-md border bg-secondary px-2 py-1 font-mono text-xs">{a}</span>)}</div>
            <blockquote className="mt-5 border-l-2 border-primary pl-3 text-sm text-muted-foreground">“Led the design system migration across 4 product teams, cutting UI defects 32%.”<span className="mt-1 block text-xs text-success">✓ Verified verbatim in resume</span></blockquote>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">Why standard ATS fails designers</p>
        <h2 className="mt-2 max-w-2xl text-3xl">Three things no keyword scanner does</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">{pillars.map(({ icon: I, t, d }) =>
          <div key={t} className="rounded-xl border bg-card p-6 shadow-sheet transition hover:-translate-y-0.5 hover:border-primary/40">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground"><I className="h-5 w-5" /></div>
            <h3 className="mt-4 text-lg">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>)}</div>
      </section>


      <BeforeAfter />

      <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">How we compare</p>
        <h2 className="mt-2 text-3xl">Generic scanners vs. FutureTalent</h2>
        <div className="mt-8 overflow-x-auto rounded-xl border bg-card shadow-sheet">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left"><tr><th className="p-4 font-medium"></th><th className="p-4 font-medium text-muted-foreground">Generic tools</th><th className="p-4 font-medium text-primary">FutureTalent</th></tr></thead>
            <tbody>{compare.map(([k, a, b]) => <tr key={k} className="border-t"><td className="p-4 font-medium">{k}</td><td className="p-4 text-muted-foreground">{a}</td><td className="p-4"><CheckCircle2 className="mr-2 inline h-4 w-4 text-success" />{b}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">The Future Talent Index</p>
        <h2 className="mt-2 text-3xl">Eight dimensions of design leadership</h2>
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">{FTI_DIMENSIONS.map((d, i) =>
          <div key={d.id} className="bg-card p-5"><p className="font-mono text-xs text-muted-foreground">0{i + 1} · {d.weight}%</p><p className="mt-2 font-medium">{d.name}</p></div>)}</div>
      </section>

      {levels.length > 0 && <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">Seniority archetypes</p>
        <h2 className="mt-2 text-3xl">The bar moves with the level</h2>
        <div className="mt-8 inline-flex flex-wrap gap-1 rounded-lg border bg-secondary p-1">{levels.map((l, i) =>
          <button key={i} onClick={() => setLvl(i)} className={`rounded-md px-3 py-1.5 text-sm transition ${i === lvl ? "bg-card shadow-sheet" : "text-muted-foreground hover:text-foreground"}`}>{l.label}</button>)}</div>
        {cur && <div className="mt-5 rounded-xl border bg-card p-6 shadow-sheet"><p className="text-lg font-medium">{cur.label} · <span className="text-muted-foreground">{cur.focus}</span></p>
          <p className="mt-1 text-sm text-muted-foreground">Evaluated with {cur.flexibility}/100 flexibility and weights tuned for this scope — so a Director isn't judged like an IC, and vice versa.</p></div>}
      </section>}

      <section className="mx-auto grid max-w-6xl gap-5 px-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-8 shadow-sheet"><Sparkles className="h-5 w-5 text-primary" /><h3 className="mt-4 text-2xl">For job seekers</h3>
          <p className="mt-2 text-sm text-muted-foreground">Generic score or score against a job, ATS engine previews, and a fix-and-rescore workflow that exports to Word.</p>
          <Button asChild className="mt-6"><Link to="/check" search={{ job: undefined }}>Check my resume</Link></Button></div>
        <div className="rounded-xl border bg-card p-8 shadow-sheet"><ShieldCheck className="h-5 w-5 text-primary" /><h3 className="mt-4 text-2xl">For recruiters</h3>
          <p className="mt-2 text-sm text-muted-foreground">Strict-to-flexible screening, essentials never waived, every score backed by a quote, decisions recorded for audit.</p>
          <Button asChild variant="outline" className="mt-6"><Link to="/auth" search={{ mode: "signup", as: "recruiter" }}>Start evaluating</Link></Button></div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl bg-gradient-primary p-12 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl md:text-4xl">Audit your UX resume in 60 seconds</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-90">Free, explainable and grounded in your own words.</p>
          <Button asChild size="lg" variant="secondary" className="mt-6"><Link to="/check" search={{ job: undefined }}>Start free audit <ArrowRight /></Link></Button>
        </div>
      </section>
    </div>
  );
}
