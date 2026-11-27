import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { EditorSession } from "@/lib/editor-session";
import { CalendarPlus, FileStack, Trash2, ArrowUpRight, Copy, Pencil, MoreHorizontal, FileText } from "lucide-react";
import { canCreateVariant } from "@/lib/plans";
import { usePowerPass } from "@/lib/pro";
import { VariantUpsell } from "@/components/VariantUpsell";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ResumeNameDialog } from "@/components/ResumeNameDialog";
import { ResumePreview } from "@/components/ResumePreview";
import { LiveEditor } from "@/components/LiveEditor";
import { FtiReport } from "@/components/FtiReport";
import { openPriorityQueue } from "@/components/ReportTabs";
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
  const [naming, setNaming] = useState(false);
  // Latest in-memory editor session per saved resume, so a new variant copies what the user sees.
  const drafts = useRef<Record<string, EditorSession>>({});
  const duplicate = (id = current?.id) => {
    if (!id) return;
    if (power !== true && !canCreateVariant(false, versions.length)) return setUpsell(true);
    setSelected(id);
    setNaming(true);
  };
  const createVariant = async (name: string) => {
    if (!current) return;
    try {
      const live = drafts.current[current.id];
      const row = await saveVersion(uid, name, live?.draft ?? current.resume_text, live?.official.cand ?? current.candidate, current.job, live?.official.text ?? current.scored_text, current.level);
      if (!row) throw new Error("The role variant could not be saved.");
      await client.invalidateQueries({ queryKey: ["resume-versions", uid] });
      setSelected(row.id);
      setEditing(true);
      toast.success("Role variant created — your master copy is unchanged");
    } catch (error) { toast.error((error as Error).message); throw error; }
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
  const master = versions[versions.length - 1];
  const variants = versions.filter((v) => v.id !== master?.id);
  const resumeRow = (v: (typeof versions)[number]) => (
    <div key={v.id} className={`flex min-w-0 items-center rounded-md border ${current?.id === v.id ? "border-primary bg-accent" : "border-border bg-card"}`}>
      <Button variant="ghost" aria-pressed={current?.id === v.id} className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-3 py-4 text-left" onClick={() => { setSelected(v.id); setComparison(""); }}>
        <FileText className="shrink-0 text-muted-foreground" />
        <span className="min-w-0">
          <span className="block break-words font-medium">{v.name}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{versionScore(v) === null ? "Draft" : `${versionScore(v)} / 100`} · {new Date(v.created_at).toLocaleDateString()}</span>
        </span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="mr-1 shrink-0" aria-label={`Actions for ${v.name}`} title={`Actions for ${v.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={power === null} onSelect={() => duplicate(v.id)}><Copy />Create role variant</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={deleting === v.id} onSelect={() => void remove(v.id)}><Trash2 />Delete resume</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
  return (
    <div className="space-y-6">
      <ResumeNameDialog open={naming} onOpenChange={setNaming} title="Create role variant" sourceName={current?.name ?? ""} takenNames={versions.map((v) => v.name)} onSave={createVariant} />
      {!editing && <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div><h1 className="text-3xl">My resumes</h1><p className="mt-1 text-sm text-muted-foreground">{versions.length} saved · {power ? "Power Searcher" : "Your private workspace"}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline"><Link to="/check">New resume check<ArrowUpRight /></Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Workspace options" title="Workspace options"><MoreHorizontal /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onSelect={reminder}><CalendarPlus />Add quarterly reminder</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>}
      {upsell && <VariantUpsell />}
      {!versions.length ? (
        <div className="py-16 text-center">
          <FileStack className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-2xl">Your master resume starts here.</h2>
          <p className="mt-2 text-sm text-muted-foreground">Check your resume, then save your master from the editor.</p>
          <Button asChild className="mt-6"><Link to="/candidate">Open my resume checks</Link></Button>
        </div>
      ) : <>
        <div className={`grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] ${editing ? "hidden" : ""}`}>
          <aside className="min-w-0 space-y-6" aria-label="Saved resumes">
            <section className="space-y-2"><h2 className="text-xs font-medium uppercase text-muted-foreground">Master resume</h2>{master && resumeRow(master)}</section>
            <section className="space-y-2"><h2 className="text-xs font-medium uppercase text-muted-foreground">Role variants · {variants.length}</h2>{variants.map(resumeRow)}{!variants.length && <p className="py-2 text-sm text-muted-foreground">No role variants yet.</p>}</section>
          </aside>
          {current && <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-48">
                <h2 className="break-words text-2xl">{current.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{current.level} · {current.job.description.trim() ? current.job.title : "Generic design rubric"}</p>
                <p className="mt-2 text-sm text-muted-foreground">{currentScore === null ? "Draft · not rescored" : <><span className="font-mono font-semibold text-foreground">{currentScore} / 100</span> · Verified score</>}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setEditing(true)}><Pencil />Edit resume</Button>
                <Button variant="outline" onClick={() => duplicate()} disabled={power === null}><Copy />Create role variant</Button>
              </div>
            </div>
            <Tabs key={current.id} defaultValue="preview">
              <TabsList aria-label="Resume inspection"><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="focus">Target role</TabsTrigger><TabsTrigger value="compare">Compare</TabsTrigger></TabsList>
              <TabsContent value="preview" className="pt-3"><ResumePreview original={current.scored_text} draft={current.resume_text} /></TabsContent>
              <TabsContent value="focus" className="space-y-3 pt-3">
                {current.resume_text !== current.scored_text && <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">Showing the last scored version. Rescore your edits in the editor to update these dimensions.</p>}
                <FtiReport c={current.candidate} onFix={() => { setEditing(true); openPriorityQueue(); }} />
              </TabsContent>
              <TabsContent value="compare" className="space-y-5 border-t pt-5">
                <label className="block text-sm font-medium">Compare with
                  <select aria-label="Compare with" className="mt-2 block w-full rounded-md border bg-card p-2 text-sm text-foreground" value={comparison} onChange={(e) => setComparison(e.target.value)}>
                    <option value="">Choose comparable version</option>
                    {comparable.filter((v) => v.id !== current.id).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </label>
                {currentScore !== null && otherScore !== null && <p className="text-sm">Score change from {other?.name}: <b className={currentScore >= otherScore ? "text-success" : "text-destructive"}>{currentScore - otherScore >= 0 ? "+" : ""}{currentScore - otherScore}</b></p>}
                <p className="text-sm text-muted-foreground">Only rescored versions with the same target level and job settings are comparable.</p>
                {!comparable.some((v) => v.id !== current.id) && <p className="text-sm text-muted-foreground">No comparable saved resumes yet.</p>}
                {comparable.length > 0 && <div className="flex items-end gap-2 overflow-x-auto border-b pt-4" aria-label="Score progression">
                  {comparable.map((v) => <div key={v.id} className="min-w-20 flex-1 text-center"><span className="font-mono text-xs">{versionScore(v)}</span><meter aria-label={`${v.name} score`} min={0} max={100} value={versionScore(v) ?? 0} className="mt-2 block h-5 w-full accent-primary" /><p className="max-w-full truncate py-2 text-xs text-muted-foreground">{v.name}</p></div>)}
                </div>}
              </TabsContent>
            </Tabs>
          </section>}
        </div>
        {current && <div className={editing ? "space-y-4" : "hidden"}>
          <LiveEditor versionId={current.id} onSessionChange={(session) => { drafts.current[current.id] = session; }} onActiveVersionChange={setSelected} onBackToList={() => setEditing(false)} job={current.job} cand={current.candidate} resume={current.scored_text} initialDraft={current.resume_text} scoringLevel={current.level} />
        </div>}
      </>}
    </div>
  );
}
