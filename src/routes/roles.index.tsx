import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/lib/db";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/roles/")({
  head: () => ({ meta: [{ title: "Open roles — FutureTalent AI" }, { name: "description", content: "Browse open roles and check your fit before you apply." }, { property: "og:title", content: "Open roles — FutureTalent AI" }, { property: "og:description", content: "Browse open roles and check your fit before you apply." }] }),
  component: Roles,
});
function Roles() {
  const { data: jobs = [], isLoading } = useQuery(q.openJobs());
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Open roles</h1>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : jobs.length === 0 ? <Card><p className="text-sm text-muted-foreground">No roles posted yet.</p></Card> :
        jobs.map((j) => (
          <Link key={j.id} to="/roles/$jobId" params={{ jobId: j.id }} className="block">
            <Card className="hover:border-primary"><h2 className="font-display text-xl">{j.title}</h2><p className="text-sm text-muted-foreground">{j.func} · {j.seniority}</p></Card>
          </Link>))}
    </div>
  );
}
