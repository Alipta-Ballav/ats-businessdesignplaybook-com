import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/lib/db";
import { Card } from "@/components/ui-bits";

export const Route = createFileRoute("/roles/$jobId")({
  head: () => ({ meta: [{ title: "Role details — FutureTalent AI" }, { name: "description", content: "See the role, check your resume score, and apply with an evidence report." }, { property: "og:title", content: "Role details — FutureTalent AI" }, { property: "og:description", content: "Check your fit, then apply." }] }),
  component: Role,
});
function Role() {
  const { jobId } = Route.useParams();
  const { data, isLoading } = useQuery(q.job(jobId));
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p>Role not found. <Link to="/roles" className="underline">All roles</Link></p>;
  const { job } = data;
  return (
    <div className="space-y-6">
      <Link to="/roles" className="text-sm text-muted-foreground">← All roles</Link>
      <h1 className="font-display text-4xl">{job.title}</h1>
      <p className="text-muted-foreground">{job.func} · {job.seniority}</p>
      <Card className="space-y-4">
        <p className="whitespace-pre-wrap text-sm">{job.description || "No description provided."}</p>
        {job.mandatory.length > 0 && <div><p className="text-sm font-medium">Must-haves</p><ul className="list-disc pl-5 text-sm text-muted-foreground">{job.mandatory.map((m) => <li key={m.name}>{m.name}</li>)}</ul></div>}
      </Card>
      <Link to="/candidate" search={{ job: job.id }} className="inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Check my fit & apply</Link>
    </div>
  );
}
