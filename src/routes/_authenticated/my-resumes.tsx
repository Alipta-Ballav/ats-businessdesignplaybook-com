import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarPlus, FileStack, Trash2, ArrowUpRight, Copy, Layers } from "lucide-react";
import { canCreateVariant } from "@/lib/plans";
import { usePowerPass } from "@/lib/pro";
import { VariantUpsell } from "@/components/VariantUpsell";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CareerNav } from "@/components/CareerNav";
import { ResumePreview } from "@/components/ResumePreview";
import { LiveEditor } from "@/components/LiveEditor";
import { q, must } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { careerQueries, saveVersion } from "@/lib/career/db";
import { comparisonKey, reminderCalendar, versionScore } from "@/lib/career/logic";
import { careerHead } from "@/lib/career/meta";
export const Route = createFileRoute("/_authenticated/my-resumes")({
  head: () =>
    careerHead(
      "Multi-resume workspace · role variants",
      "Your private resume timeline, comparable score progression, and quarterly resume health reminders.",
    ),
  loader: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(q.me());
    if (!me) throw new Error("Please sign in.");
    await context.queryClient.ensureQueryData(careerQueries.versions(me.id));
    return { uid: me.id };
  },
  component: MyResumes,
});
function MyResumes() {
  const { uid } = Route.useLoaderData();
  const client = useQueryClient();
  const { data: versions } = useSuspenseQuery(careerQueries.versions(uid));
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [comparison, setComparison] = useState("");
  const [deleting, setDeleting] = useState("");
  const power = usePowerPass();
  const [upsell, setUpsell] = useState(false);
  const duplicate = async () => {
    if (!current) return;
    if (power === false && !canCreateVariant(false, versions.length)) return setUpsell(true);
    const name = window.prompt("Name this role variant", `${current.name} · variant`)?.trim();
    if (!name) return;
    try {
      const row = await saveVersion(
        uid,
        name,
        current.resume_text,
        current.candidate,
        current.job,
        current.scored_text,
        current.level,
      );
      await client.invalidateQueries({ queryKey: ["resume-versions", uid] });
      if (row) setSelected(row.id);
      setEditing(true);
      toast.success("Role variant created — your master copy is unchanged");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const current = versions.find((v) => v.id === selected) ?? versions[0];
  const comparable = current
    ? [...versions]
        .reverse()
        .filter((v) => comparisonKey(v) === comparisonKey(current) && versionScore(v) !== null)
    : [];
  const other = comparable.find((v) => v.id === comparison);
  const currentScore = current ? versionScore(current) : null;
  const otherScore = other ? versionScore(other) : null;
  const remove = async (id: string) => {
    if (!window.confirm("Delete this saved version? Your original scan is kept.")) return;
    setDeleting(id);
    try {
      must(await supabase.from("resume_versions").delete().eq("user_id", uid).eq("id", id));
      await client.invalidateQueries({ queryKey: ["resume-versions", uid] });
      setEditing(false);
      toast.success("Version deleted");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting("");
    }
  };
  const reminder = () => {
    const url = URL.createObjectURL(
      new Blob([reminderCalendar(new Date(), window.location.origin)], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "futuretalent-quarterly-review.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Quarterly reminder downloaded for your calendar");
  };
  return (
    <div className="space-y-8">
      <CareerNav />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">YOUR PRIVATE DESIGN WORKSPACE</p>
          <h1 className="text-4xl">Your work. A stronger story.</h1>
          <p className="text-muted-foreground">
            One master resume plus tailored role variants, each with its own target job and score.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {current && (
            <Button onClick={duplicate}>
              {power ? <Copy /> : <Layers />}
              Create role variant
            </Button>
          )}
          <Button asChild variant="outline">
            <Link to="/check">
              New resume check <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </header>
      {current && (
        <ol className="grid gap-3 rounded-lg border bg-card p-4 text-sm sm:grid-cols-3">
          <li><b>1. Master resume</b><span className="block text-muted-foreground">Your first saved resume is your master. It is never overwritten.</span></li>
          <li><b>2. Create role variant</b><span className="block text-muted-foreground">Pick a resume on the left, then press "Create role variant" to copy it.</span></li>
          <li><b>3. Tailor and score</b><span className="block text-muted-foreground">Open the variant, press "Edit a new revision", and match it to a job.</span></li>
        </ol>
      )}
      {upsell && <VariantUpsell />}
      <section className="flex flex-wrap items-center justify-between gap-4 border-y py-5">
        <div>
          <h2 className="text-base">Your quarterly check-in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An optional calendar reminder every 90 days. No email subscription.
          </p>
        </div>
        <Button variant="outline" onClick={reminder}>
          <CalendarPlus />
          Add quarterly reminder
        </Button>
      </section>
      {!versions.length ? (
        <div className="py-16 text-center">
          <FileStack className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-2xl">Your first version is a starting point.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Save a named version from your resume report or live editor.
          </p>
          <Button asChild className="mt-6">
            <Link to="/candidate">Open my resume checks</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-2">
              <h2 className="mb-4 text-sm font-medium">
                {versions.length} resume{versions.length !== 1 && "s"} ·{" "}
                {power ? "Power Searcher workspace" : "1 master resume on your plan"}
              </h2>
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={`flex items-center rounded-lg border ${current?.id === v.id ? "border-primary bg-accent" : "bg-card"}`}
                >
                  <Button
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-4 text-left"
                    onClick={() => {
                      setSelected(v.id);
                      setEditing(false);
                      setComparison("");
                    }}
                  >
                    <span>
                      <span className="block break-words font-medium">{v.name}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-primary">
                        {v.id === versions[versions.length - 1]?.id ? "Master" : "Role variant"}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()} ·{" "}
                        {versionScore(v) === null
                          ? "Draft · not rescored"
                          : `${versionScore(v)} / 100`}
                      </span>
                    </span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Delete version"
                    aria-label={`Delete ${v.name}`}
                    disabled={deleting === v.id}
                    onClick={() => remove(v.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </aside>
            {current && (
              <section className="min-w-0 space-y-5">
                <div>
                  <h2 className="text-2xl">{current.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {current.level} ·{" "}
                    {current.job.description.trim() ? current.job.title : "Generic design rubric"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 border-y py-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {currentScore === null ? "Unrescored revision" : "Verified score"}
                    </p>
                    <p className="mt-1 font-mono text-3xl">
                      {currentScore ?? "—"}
                      {currentScore !== null && (
                        <span className="text-sm text-muted-foreground"> / 100</span>
                      )}
                    </p>
                  </div>
                  <label className="max-w-full text-xs text-muted-foreground">
                    Compare with
                    <select
                      aria-label="Compare with"
                      className="mt-1 block max-w-full rounded-md border bg-card p-2 text-sm text-foreground"
                      value={comparison}
                      onChange={(e) => setComparison(e.target.value)}
                    >
                      <option value="">Choose comparable version</option>
                      {comparable
                        .filter((v) => v.id !== current.id)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </label>
                </div>
                {currentScore !== null && otherScore !== null && (
                  <p className="text-sm">
                    Score change from {other?.name}:{" "}
                    <b className={currentScore >= otherScore ? "text-success" : "text-destructive"}>
                      {currentScore - otherScore >= 0 ? "+" : ""}
                      {currentScore - otherScore}
                    </b>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Only rescored versions with the same target level and job settings are comparable.
                </p>
                {comparable.length > 0 && (
                  <div
                    className="flex items-end gap-2 overflow-x-auto border-b pt-4"
                    aria-label="Score progression"
                  >
                    {comparable.map((v) => (
                      <div key={v.id} className="min-w-20 flex-1 text-center">
                        <span className="font-mono text-xs">{versionScore(v)}</span>
                        <meter
                          aria-label={`${v.name} score`}
                          min={0}
                          max={100}
                          value={versionScore(v) ?? 0}
                          className="mt-2 block h-5 w-full accent-primary"
                        />
                        <p className="max-w-full truncate py-2 text-[10px] text-muted-foreground">
                          {v.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setEditing(!editing)}>
                    {editing ? "Close editor" : "Edit a new revision"}
                  </Button>
                  <Button variant="outline" onClick={duplicate}>
                    {power ? <Copy /> : <Layers />}
                    Duplicate as role variant
                  </Button>
                </div>
                {!editing && (
                  <ResumePreview original={current.scored_text} draft={current.resume_text} />
                )}
              </section>
            )}
          </div>
          {editing && current && (
            <LiveEditor
              key={current.id}
              job={current.job}
              cand={current.candidate}
              resume={current.scored_text}
              initialDraft={current.resume_text}
              scoringLevel={current.level}
            />
          )}
        </>
      )}
    </div>
  );
}
