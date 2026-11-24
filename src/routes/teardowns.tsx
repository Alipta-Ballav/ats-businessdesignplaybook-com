import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CareerNav } from "@/components/CareerNav";
import { weeklyRolesQuery } from "@/lib/career/roles.functions";
import { teardown } from "@/lib/career/logic";
import { careerHead } from "@/lib/career/meta";
export const Route = createFileRoute("/teardowns")({
  head: () =>
    careerHead(
      "Weekly design role teardowns",
      "Read real design job descriptions through eight Product & UX dimensions, with source quotes and resume evidence prompts.",
    ),
  loader: ({ context }) => context.queryClient.ensureQueryData(weeklyRolesQuery()),
  component: Teardowns,
});
function Teardowns() {
  const { data, refetch, isFetching } = useSuspenseQuery(weeklyRolesQuery());
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const [personal, setPersonal] = useState(false);
  const role = data.roles.find((r) => r.id === selected) ?? data.roles[0];
  const dims = teardown(personal ? custom : (role?.description ?? ""));
  return (
    <div className="space-y-8">
      <CareerNav />
      <header className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <CalendarDays className="h-4 w-4" />
          THIS WEEK IN DESIGN HIRING
        </p>
        <h1 className="text-4xl">Read between the requirements.</h1>
        <p className="max-w-2xl text-muted-foreground">
          Real public job descriptions. Eight design dimensions. The evidence to bring to your next
          application.
        </p>
        <p className="text-xs text-muted-foreground">
          Sources checked {new Date(data.checkedAt).toLocaleDateString("en-GB")} · selections rotate
          weekly from available roles
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Button variant={!personal ? "default" : "outline"} onClick={() => setPersonal(false)}>
          This week’s roles
        </Button>
        <Button variant={personal ? "default" : "outline"} onClick={() => setPersonal(true)}>
          My job description
        </Button>
        <Button variant="ghost" disabled={isFetching} onClick={() => refetch()}>
          {isFetching ? "Refreshing…" : "Refresh sources"}
        </Button>
      </div>
      {personal ? (
        <label className="block space-y-2 text-sm font-medium">
          Your target job description
          <textarea
            rows={8}
            className="w-full rounded-md border bg-card p-4 text-sm font-normal"
            placeholder="Paste the role requirements…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {data.roles.map((r) => (
            <Button
              key={r.id}
              variant="outline"
              className={`h-auto items-start whitespace-normal p-4 text-left ${role?.id === r.id ? "border-primary bg-accent" : ""}`}
              onClick={() => setSelected(r.id)}
            >
              <span>
                <span className="block text-xs text-primary">{r.company}</span>
                <span className="mt-2 block font-medium">{r.title}</span>
                <span className="mt-2 block text-xs text-muted-foreground">{r.location}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
      {!personal && !role && (
        <p role="status" className="border-y py-6 text-sm text-muted-foreground">
          Public job feeds are unavailable. Refresh or analyze your own job description.
        </p>
      )}
      {data.unavailableFeeds > 0 && (
        <p className="text-xs text-warning">
          Some sources could not be refreshed. Only successfully retrieved roles are shown.
        </p>
      )}
      {!personal && role && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div>
            <h2 className="text-2xl">
              {role.company} · {role.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Public posting snapshot · availability can change
            </p>
          </div>
          <Button asChild variant="outline">
            <a href={role.url} target="_blank" rel="noopener noreferrer">
              Read source <ArrowUpRight />
            </a>
          </Button>
        </div>
      )}
      {(personal ? custom.trim() : role) && (
        <>
          <p className="text-xs text-muted-foreground">
            Keyword-linked reading of the posting, not the employer’s scorecard or an ATS
            prediction.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {dims.map((d) => (
              <article key={d.id} className="rounded-lg border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base">{d.name}</h3>
                  <span
                    className={`shrink-0 text-xs ${d.quote ? "text-success" : "text-muted-foreground"}`}
                  >
                    {d.quote ? "Mentioned" : "Not explicit"}
                  </span>
                </div>
                {d.quote ? (
                  <blockquote className="mt-4 border-l-2 border-primary pl-3 text-sm leading-relaxed">
                    “{d.quote}”
                  </blockquote>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No explicit signal found in this description.
                  </p>
                )}
                <p className="mt-4 border-t pt-3 text-xs leading-relaxed text-muted-foreground">
                  Resume evidence: {d.tip}
                </p>
                <Button asChild size="sm" variant="ghost" className="mt-2">
                  <Link to="/swipe-file">Find a bullet formula</Link>
                </Button>
              </article>
            ))}
          </div>
        </>
      )}
      <Button asChild>
        <Link to="/check">Score my resume against a job</Link>
      </Button>
    </div>
  );
}
