import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Gauge, Quote, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustPillars } from "@/components/trust/Trust";
import { ATS_SYSTEMS, FTI_DIMENSIONS, LEVELS, LEVEL_WEIGHTS, LEVEL_EXAMPLES } from "@/lib/scoring";

const TITLE = "Trusted UX Design ATS Checker — FutureTalent AI";
const DESC =
  "The design ATS score you can trust: no AI training on your resume, no auto-debit. Get a free, explainable ATS score for your design resume. Every point is tied to a verbatim quote, calibrated across 8 ATS engines: Workday, Greenhouse, Ashby, Taleo, iCIMS, SuccessFactors, Lever and BambooHR.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: Quote,
    t: "Verbatim evidence, not keyword spam",
    d: "Every score links to an exact line in your resume. Anything we can't quote doesn't count.",
  },
  {
    icon: Gauge,
    t: "Calibrated per ATS engine",
    d: "Eight engines simulated separately — from rigid Workday and Taleo parsing to Greenhouse and Ashby context matching — before you apply.",
  },
  {
    icon: Wand2,
    t: "Fix and rescore, line by line",
    d: "Turn vague bullets into proven impact with your own true details, then watch the score move.",
  },
];

const compare = [
  ["Audience", "Every job under the sun", "Built only for UX, product & design leaders"],
  ["Scoring", "Black-box AI score", "Every point tied to a verbatim quote from your resume"],
  [
    "ATS engines",
    "One generic checklist",
    "8 engines simulated separately — Workday, Greenhouse, Ashby, Taleo, iCIMS, SuccessFactors, Lever, BambooHR",
  ],
  ["Fixes", '"Add more metrics"', "Rewrite a bullet with your real numbers, rescore live"],
  ["Export", "Broken layouts", "ATS-safe single-column Word file"],
  ["Price", "$29–49 / month", "1 free scan, then ₹99 for 30 days · no auto-renewal"],
  ["Your data", "May train their AI", "Never stored or used for AI training"],
];

const examples = [
  {
    before: "Designed seamless wireframes and conducted user testing for the checkout flow.",
    after:
      "Redesigned checkout from 5 steps to 2 after testing with 24 users, lifting conversion 18% (₹2.1Cr annualised).",
    from: 54,
    to: 79,
    tag: "Business impact",
  },
  {
    before: "Responsible for the design system and helped teams stay consistent.",
    after:
      "Led design system adoption across 4 product squads, cutting UI defects 32% and shipping features 2 weeks faster.",
    from: 61,
    to: 84,
    tag: "Systems thinking",
  },
  {
    before: "Collaborated with stakeholders to deliver great user experiences.",
    after:
      "Partnered with PM and Eng leads to reprioritise the roadmap on research insights, reducing support tickets 40%.",
    from: 49,
    to: 76,
    tag: "Influence",
  },
];

function BeforeAfter() {
  const [i, setI] = useState(0);
  const [fixed, setFixed] = useState(false);
  const ex = examples[i] ?? examples[0];
  if (!ex) return null;
  return (
    <section className="mx-auto max-w-6xl px-6">
      <p className="text-sm font-medium text-primary">See the difference</p>
      <h2 className="mt-2 max-w-2xl text-3xl">From craft-speak to commercial impact</h2>
      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border bg-secondary p-1">
        {examples.map((e, k) => (
          <button
            key={k}
            onClick={() => {
              setI(k);
              setFixed(false);
            }}
            className={`rounded-md px-3 py-1.5 text-sm transition ${k === i ? "bg-card shadow-sheet" : "text-muted-foreground hover:text-foreground"}`}
          >
            {e.tag}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sheet">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-destructive">
              Before · vanity bullet
            </span>
            <span className="font-mono text-sm text-muted-foreground">{ex.from}</span>
          </div>
          <p className="mt-4 text-muted-foreground line-through decoration-destructive/40">
            {ex.before}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Flagged: describes activity, not outcome. A recruiter reads this as junior.
          </p>
        </div>
        <div
          className={`rounded-xl border p-6 shadow-sheet transition ${fixed ? "border-primary/50 bg-card" : "bg-secondary"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-success">
              After · evidence bullet
            </span>
            <span className="font-mono text-sm">
              {fixed ? (
                <span className="text-success">
                  {ex.to} (+{ex.to - ex.from})
                </span>
              ) : (
                "—"
              )}
            </span>
          </div>
          {fixed ? (
            <p className="mt-4">{ex.after}</p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Add your real numbers, we rewrite the line and rescore it instantly.
            </p>
          )}
          <Button
            size="sm"
            className="mt-5"
            variant={fixed ? "outline" : "default"}
            onClick={() => setFixed(!fixed)}
          >
            {fixed ? (
              "Show original"
            ) : (
              <>
                Apply & rescore <Wand2 />
              </>
            )}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Illustrative example. In the tool, rewrites only use facts you supply.
      </p>
    </section>
  );
}

const ENGINE_GROUPS = [
  {
    style: "legacy" as const,
    label: "Strict parsers",
    who: "Oracle, SAP, enterprise and large corporates",
    note: "Literal keyword matching. A missing exact term can knock you out before a human sees the file.",
  },
  {
    style: "semantic" as const,
    label: "Semantic readers",
    who: "Startups, scale-ups, agencies and product teams",
    note: "Read context and transferable skills. Craft evidence counts even when the wording differs.",
  },
];

function Engines() {
  return (
    <div>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        The same resume scores differently depending on which system parses it. We simulate all
        eight and show you the spread — so you fix the resume that's actually reading you.
      </p>
      <div className="mt-6 space-y-8">
        {ENGINE_GROUPS.map((g) => {
          const items = Object.entries(ATS_SYSTEMS).filter(([, s]) => s.style === g.style);
          return (
            <div key={g.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${g.style === "legacy" ? "bg-destructive" : "bg-success"}`}
                  />
                  <h3 className="text-lg">{g.label}</h3>
                  <span className="font-mono text-xs text-muted-foreground">
                    {items.length} engines
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{g.who}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{g.note}</p>
              <div className="mt-4 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
                {items.map(([name, s]) => (
                  <div key={name} className="bg-card p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{name}</p>
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                        {s.flexibility}/100
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-muted">
                      <div
                        className={`h-1.5 rounded-full ${g.style === "legacy" ? "bg-destructive/70" : "bg-success/70"}`}
                        style={{ width: `${s.flexibility}%` }}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{s.how}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Flexibility is the published strictness we apply per engine: 0 is exact-term matching, 100
        gives full credit to transferable evidence.
      </p>
    </div>
  );
}

function Landing() {
  const [lvl, setLvl] = useState(0);
  const [tab, setTab] = useState<"dims" | "level" | "ats">("dims");
  const cur = LEVELS[lvl] ?? "Senior Product Designer";
  const top = Object.entries(LEVEL_WEIGHTS[cur])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, w]) => ({ name: FTI_DIMENSIONS.find((d) => d.id === id)?.name ?? id, w }));
  const SHORT: Record<string, string> = {
    craft: "Design Craft",
    research: "Research",
    product: "Product Thinking",
    systems: "Systems Thinking",
    ai: "AI Fluency",
    critical: "Critical Thinking",
    leadership: "Design Leadership",
    learning: "Learning Agility",
  };
  const SAMPLE: Record<string, number> = {
    craft: 88,
    research: 76,
    product: 84,
    systems: 88,
    ai: 77,
    critical: 82,
    leadership: 81,
    learning: 78,
  };
  return (
    <div className="full-bleed -mt-8 space-y-20 pb-16">
      <section className="bg-hero px-6 pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Built only for Product & UX designers
            </span>
            <h1 className="text-5xl leading-[1.05] md:text-6xl">
              Audit your UX resume <span className="text-gradient">in 60 seconds.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              See exactly what Workday, Greenhouse and 6 other ATS engines read — scored like a
              Design Director would. Every point backed by your own words. No AI training. No
              subscription.
            </p>
            <ul className="flex flex-wrap gap-2">
              {[
                ["100%", "Scores backed by your own words"],
                ["0", "Resumes used for AI training"],
                ["₹0", "Auto-debit, ever"],
              ].map(([n, t]) => (
                <li
                  key={t}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sheet"
                >
                  <span className="font-mono font-semibold text-primary">{n}</span>
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
                <Link to="/check" search={{ job: undefined }}>
                  Try your free audit <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/check" search={{ job: undefined }}>
                  Score against a job
                </Link>
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-sheet">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <b>1st audit free</b>
                <span className="text-muted-foreground">· no signup</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                  ₹99
                </span>
                <span className="text-muted-foreground">
                  to rescore edits & download Word · 30 days · no auto-debit
                </span>
              </span>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Sample UX Resume Audit</p>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                Strong alignment
              </span>
            </div>
            <div className="mt-5 flex items-center gap-6">
              <div
                className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                style={{ background: "conic-gradient(var(--primary) 295deg, var(--muted) 0)" }}
              >
                <div className="grid h-[92px] w-[92px] place-items-center rounded-full bg-card">
                  <span className="font-mono text-2xl">82</span>
                </div>
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">Overall design score</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Weighted across all 8 dimensions, then re-scored on every ATS engine below.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {FTI_DIMENSIONS.map((d) => {
                const v = SAMPLE[d.id] ?? 0;
                return (
                  <div key={d.id}>
                    <div className="flex justify-between text-xs">
                      <span>{SHORT[d.id] ?? d.name}</span>
                      <span className="font-mono text-muted-foreground">{v}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-gradient-primary"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {[
                ["Taleo", 62],
                ["Workday", 71],
                ["iCIMS", 69],
                ["SuccessFactors", 68],
                ["Lever", 77],
                ["Greenhouse", 80],
                ["BambooHR", 79],
                ["Ashby", 84],
              ].map(([a, v]) => (
                <span
                  key={a}
                  className="rounded-md border bg-secondary px-2 py-1 font-mono text-[11px]"
                >
                  {a} {v}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              All 8 engines, scored separately on one resume.
            </p>
            <blockquote className="mt-5 border-l-2 border-primary pl-3 text-sm text-muted-foreground">
              “Led the design system migration across 4 product teams, cutting UI defects 32%.”
              <span className="mt-1 block text-xs text-success">✓ Verified verbatim in resume</span>
            </blockquote>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Drop your resume", "PDF or Word. Read in seconds."],
            ["2", "See your 8-dimension score", "Find which ATS engine knocks you out, and why."],
            [
              "3",
              "Fix weak bullets",
              "AI turns task-based bullets into measurable business impact.",
            ],
          ].map(([n, t, d]) => (
            <li key={n} className="flex gap-3 rounded-xl border bg-card p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary font-mono text-sm text-primary-foreground">
                {n}
              </span>
              <div>
                <p className="font-medium">{t}</p>
                <p className="text-sm text-muted-foreground">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <TrustPillars />

      <section className="mx-auto max-w-5xl px-6">
        <p className="text-center text-sm font-medium text-primary">Honest pricing</p>
        <h2 className="mt-2 text-center text-3xl md:text-4xl">Know what's free before you start</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">Free audit</p>
            <p className="mt-1 font-mono text-4xl">₹0</p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Full 8-dimension design score",
                "Scores across all 8 ATS engines",
                "Seniority level check",
                "All recommendations + free AI rewrites",
                "Live estimated score as you edit",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">No account or card needed.</p>
          </div>
          <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">30-Day Job Hunt Pass</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                Pay only when ready
              </span>
            </div>
            <p className="mt-1 font-mono text-4xl">
              ₹99 <span className="text-lg text-muted-foreground line-through">₹149</span>{" "}
              <span className="text-sm text-muted-foreground">one-time</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-primary">
              Launch offer: ₹99 for the first 50 users (then ₹149)
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "5 verified scores in 30 days (new resumes or after edits)",
                "Download ATS-clean Word (.docx)",
                "Free live estimated score while you edit",
                "UPI or card · no auto-renewal, ever",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-muted-foreground">
              You'll only be asked to pay when you rescore, download Word or run a 2nd scan.
            </p>
          </div>
        </div>
        <div className="mt-10 overflow-hidden rounded-2xl border bg-card">
          <div className="border-b bg-muted/40 px-6 py-4">
            <h3 className="text-lg font-semibold">Free vs ₹99 pass, side by side</h3>
            <p className="text-sm text-muted-foreground">
              Start free. Pay ₹99 once only if you want more. The pass ends after 30 days and never
              charges you again.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="px-6 py-2 font-medium">What you can do</th>
                <th className="px-4 py-2 font-medium">Free</th>
                <th className="px-4 py-2 font-medium text-primary">With ₹99 pass</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["First resume score", "1 free", "Included"],
                ["Verified scores (new resume or after edits)", "No", "5 in 30 days"],
                ["Live estimated score while editing", "Yes", "Yes"],
                ["AI help to rewrite lines", "Yes", "Yes"],
                ["Download your resume as Word", "No", "Yes"],
                ["Charged again automatically", "Never", "Never"],
              ].map(([b, f, p]) => (
                <tr key={b} className="border-b last:border-0">
                  <td className="px-6 py-3">{b}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f}</td>
                  <td className="px-4 py-3 font-medium">{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center">
          <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
            <Link to="/check" search={{ job: undefined }}>
              Try your free audit <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">Why standard ATS fails designers</p>
        <h2 className="mt-2 max-w-2xl text-3xl">Three things no keyword scanner does</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: I, t, d }) => (
            <div
              key={t}
              className="rounded-xl border bg-card p-6 shadow-sheet transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <I className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <BeforeAfter />

      <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">How we score · fully transparent</p>
        <h2 className="mt-2 max-w-2xl text-3xl">No black box. Here's the exact rubric.</h2>
        <div className="mt-6 inline-flex flex-wrap gap-1 rounded-lg border bg-secondary p-1">
          {(
            [
              ["dims", "8 design dimensions"],
              ["level", "Weighted for your level"],
              ["ats", "8 ATS engines"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${tab === k ? "bg-card shadow-sheet" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {tab === "dims" && (
          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {FTI_DIMENSIONS.map((d, i) => (
              <div key={d.id} className="bg-card p-5">
                <p className="font-mono text-xs text-muted-foreground">
                  0{i + 1} · {d.weight}%
                </p>
                <p className="mt-2 font-medium">{d.name}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {d.skills.slice(0, 4).join(" · ")} +{d.skills.length - 4} more
                </p>
              </div>
            ))}
          </div>
        )}
        {tab === "level" && (
          <div>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              We read your years and latest title from the CV — no form to fill. Then the 8
              dimensions are weighted for that level. You can switch to the level you're aiming for.
            </p>
            <div className="mt-8 inline-flex flex-wrap gap-1 rounded-lg border bg-secondary p-1">
              {LEVELS.map((l, i) => (
                <button
                  key={l}
                  onClick={() => setLvl(i)}
                  className={`rounded-md px-3 py-1.5 text-sm transition ${i === lvl ? "bg-card shadow-sheet" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="mt-5 grid gap-5 rounded-xl border bg-card p-6 shadow-sheet md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">What matters most at this level</p>
                <div className="mt-3 space-y-2">
                  {top.map((t) => (
                    <div key={t.name}>
                      <div className="flex justify-between text-sm">
                        <span>{t.name}</span>
                        <span className="font-mono text-muted-foreground">{t.w}%</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-gradient-primary"
                          style={{ width: `${t.w * 3}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">A line recruiters expect to see</p>
                <blockquote className="mt-3 border-l-2 border-primary pl-3 text-sm text-muted-foreground">
                  “{LEVEL_EXAMPLES[cur]}”
                </blockquote>
              </div>
            </div>
          </div>
        )}
        {tab === "ats" && <Engines />}
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <p className="text-sm font-medium text-primary">How we compare</p>
        <h2 className="mt-2 text-3xl">Generic scanners vs. FutureTalent</h2>
        <div className="mt-8 overflow-x-auto rounded-xl border bg-card shadow-sheet">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="p-4 font-medium"></th>
                <th className="p-4 font-medium text-muted-foreground">Generic tools</th>
                <th className="p-4 font-medium text-primary">FutureTalent</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(([k, a, b]) => (
                <tr key={k} className="border-t">
                  <td className="p-4 font-medium">{k}</td>
                  <td className="p-4 text-muted-foreground">{a}</td>
                  <td className="p-4">
                    <CheckCircle2 className="mr-2 inline h-4 w-4 text-success" />
                    {b}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-6 shadow-sheet">
          <div>
            <p className="text-sm font-medium text-primary">Keep coming back</p>
            <p className="mt-1 text-muted-foreground">
              Swipe file, next-level audit, weekly role teardowns and saved resume versions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["/swipe-file", "Swipe file"],
                ["/promotion", "Next-level audit"],
                ["/teardowns", "Teardowns"],
              ] as const
            ).map(([to, l]) => (
              <Button key={to} asChild variant="outline" size="sm">
                <Link to={to}>{l}</Link>
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl bg-gradient-primary p-12 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl md:text-4xl">Audit your UX resume in 60 seconds</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-90">
            Private, explainable and grounded in your own words.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/check" search={{ job: undefined }}>
              Start free audit <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
