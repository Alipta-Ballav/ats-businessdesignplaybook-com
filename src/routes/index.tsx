import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { evaluate, matchMode } from "@/lib/scoring";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Dashboard — FutureTalent AI" },
    { name: "description", content: "Your open roles and candidate evaluations across job readiness, future readiness and human potential." },
    { property: "og:title", content: "FutureTalent AI — Recruiter dashboard" },
    { property: "og:description", content: "Hire for today. Discover the talent for tomorrow." },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const { jobs, candidates } = useStore();
  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hire for today. Discover the talent for tomorrow.</p>
          <h1 className="mt-2 font-display text-4xl">Open roles</h1>
        </div>
        <Link to="/jobs/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">+ New hiring requirement</Link>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Open roles</p><p className="font-mono text-3xl">{jobs.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Candidates evaluated</p><p className="font-mono text-3xl">{candidates.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Needing your review</p><p className="font-mono text-3xl">{candidates.filter((c) => { const j = jobs.find((x) => x.id === c.jobId); return j && !evaluate(j, c).mandatoryOk; }).length}</p></Card>
      </div>
      <div className="space-y-3">
        {jobs.map((j) => {
          const cs = candidates.filter((c) => c.jobId === j.id);
          return (
            <Link key={j.id} to="/jobs/$jobId" params={{ jobId: j.id }} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-4 transition-colors hover:border-primary">
                <div>
                  <h2 className="font-display text-xl">{j.title}</h2>
                  <p className="text-sm text-muted-foreground">{j.func} · {j.seniority} · {matchMode(j.flexibility)}</p>
                </div>
                <span className="text-sm">{cs.length} candidate{cs.length === 1 ? "" : "s"} →</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
