import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/lib/db";
import { matchMode } from "@/lib/scoring";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/recruiter/")({
  head: () => ({ meta: [{ title: "Recruiter dashboard — FutureTalent AI" }, { name: "description", content: "Your open roles and applicant evaluations." }, { property: "og:title", content: "Recruiter dashboard — FutureTalent AI" }, { property: "og:description", content: "Your open roles and applicant evaluations." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useQuery(q.me());
  const { data: jobs = [] } = useQuery({ ...q.myJobs(me?.id ?? ""), enabled: !!me });
  const { data: apps = [] } = useQuery(q.applicantCounts());
  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hire for today. Discover the talent for tomorrow.</p>
          <h1 className="mt-2 font-display text-4xl">Your roles</h1></div>
        <Link to="/recruiter/jobs/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">+ New hiring requirement</Link>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-muted-foreground">Roles</p><p className="font-mono text-3xl">{jobs.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Applicants evaluated</p><p className="font-mono text-3xl">{apps.length}</p></Card>
        <Card><p className="text-sm text-muted-foreground">Decisions recorded</p><p className="font-mono text-3xl">{apps.filter((a) => a.override_status).length}</p></Card>
      </div>
      {jobs.length === 0 ? <Card><p className="text-sm text-muted-foreground">No roles yet. Create your first hiring requirement to start evaluating applicants.</p></Card> : (
        <div className="space-y-3">{jobs.map((j) => {
          const n = apps.filter((a) => a.job_id === j.id).length;
          return (
            <Link key={j.id} to="/recruiter/jobs/$jobId" params={{ jobId: j.id }} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-4 transition-colors hover:border-primary">
                <div><h2 className="font-display text-xl">{j.title}</h2><p className="text-sm text-muted-foreground">{j.func} · {j.seniority} · {matchMode(j.flexibility)}</p></div>
                <span className="text-sm">{n} applicant{n === 1 ? "" : "s"} →</span>
              </Card>
            </Link>);
        })}</div>
      )}
    </div>
  );
}
