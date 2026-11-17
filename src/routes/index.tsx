import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "FutureTalent AI — Evidence-based resume scoring for candidates and recruiters" },
    { name: "description", content: "Candidates see exactly how their resume scores and how to fix it. Recruiters evaluate applicants with evidence, not keyword spam." },
    { property: "og:title", content: "FutureTalent AI — Hire for today. Discover the talent for tomorrow." },
    { property: "og:description", content: "Explainable resume scores for job seekers and recruiters." },
  ] }),
  component: Landing,
});

function Landing() {
  return (
    <div className="space-y-14">
      <section className="max-w-3xl space-y-4 pt-6">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hire for today. Discover the talent for tomorrow.</p>
        <h1 className="font-display text-5xl leading-tight">Resume scores you can actually see inside.</h1>
        <p className="text-lg text-muted-foreground">Every score points to a line in the resume. No black-box rejections, no keyword games — for job seekers and for the people hiring them.</p>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <p className="font-mono text-xs uppercase text-muted-foreground">For job seekers</p>
          <h2 className="font-display text-2xl">Know your score before you apply</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Scores for today's fit, future readiness and potential</li>
            <li>See which must-haves your resume is missing</li>
            <li>Bullet-level tips: turn "claimed" into "proven impact"</li>
            <li>Apply to posted roles with your evidence report</li>
          </ul>
          <Link to="/check" search={{ job: undefined }} className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Check my resume — free</Link>
        </Card>
        <Card className="space-y-3">
          <p className="font-mono text-xs uppercase text-muted-foreground">For recruiters</p>
          <h2 className="font-display text-2xl">Evaluate eligibility with evidence</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Strict-to-flexible slider: exact match or transferable talent</li>
            <li>Essential requirements are never waived</li>
            <li>Every score linked to a verbatim resume quote</li>
            <li>Recorded decisions with reasons, for audit</li>
          </ul>
          <Link to="/auth" search={{ mode: "signup", as: "recruiter" }} className="inline-block rounded-md border px-4 py-2 text-sm font-medium">Start hiring</Link>
        </Card>
      </section>
      <section className="text-sm text-muted-foreground">Just browsing? <Link to="/roles" className="underline">See open roles</Link></section>
    </div>
  );
}
