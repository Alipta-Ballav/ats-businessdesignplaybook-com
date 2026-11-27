import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Save, Layers, Target, ArrowLeft, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResumeNameDialog } from "@/components/ResumeNameDialog";
import { VariantUpsell } from "@/components/VariantUpsell";
import { careerQueries, saveVersion, updateVersion } from "@/lib/career/db";
import { q } from "@/lib/db";
import { usePowerPass } from "@/lib/pro";
import { canCreateVariant } from "@/lib/plans";
import { inferLevel, type Candidate, type Job, type Level } from "@/lib/scoring";
import type { EditorSession } from "@/lib/editor-session";

export type WorkspaceSeed = { resume: string; cand: Candidate; job: Job; initialDraft?: string; scoringLevel?: Level; initialSession?: EditorSession | undefined };
export function ResumeWorkspace({ seed, versionId, onSessionChange, onActiveVersionChange, onBackToList, children }: {
  seed: WorkspaceSeed;
  versionId?: string | undefined;
  onSessionChange?: ((session: EditorSession) => void) | undefined;
  onActiveVersionChange?: ((id: string) => void) | undefined;
  onBackToList?: (() => void) | undefined;
  children: (value: WorkspaceSeed & { editorKey: string; onSessionChange: (session: EditorSession) => void; toolbar: ReactNode; isOriginal: boolean }) => ReactNode;
}) {
  const { data: me } = useQuery(q.me());
  const { data: versions = [], isPending } = useQuery({ ...careerQueries.versions(me?.id ?? ""), enabled: !!me });
  const client = useQueryClient();
  const navigate = useNavigate();
  const backToList = () => {
    if (onBackToList) onBackToList();
    else void navigate({ to: "/my-resumes" });
  };
  const power = usePowerPass();
  const [selected, setSelected] = useState(versionId ?? "current");
  useEffect(() => { if (versionId) setSelected(versionId); }, [versionId]);
  const sessions = useRef<Record<string, EditorSession>>({});
  const [dialog, setDialog] = useState<"" | "master" | "variant">("");
  const [saving, setSaving] = useState(false);
  const [upsell, setUpsell] = useState(false);
  const current = versions.find((version) => version.id === selected);
  const value: WorkspaceSeed = current ? {
    resume: current.scored_text, initialDraft: current.resume_text, cand: current.candidate,
    job: current.job, scoringLevel: current.level,
  } : seed;
  const label = current?.name ?? "Current resume";
  const master = versions[versions.length - 1];
  const sessionChanged = (session: EditorSession) => {
    sessions.current[selected] = session;
    if (selected === "current" || selected === versionId) onSessionChange?.(session);
  };
  const saveChanges = async (returnToList = false) => {
    if (!me || !current) return;
    const active = sessions.current[selected];
    setSaving(true);
    try {
      await updateVersion(current.id, active?.draft ?? current.resume_text, active?.official.cand ?? current.candidate, active?.official.text ?? current.scored_text);
      await client.invalidateQueries({ queryKey: ["resume-versions", me.id] });
      toast.success(`Saved changes to “${current.name}”`);
      if (returnToList) backToList();
    } catch (error) { toast.error((error as Error).message || "Changes could not be saved. Try again."); }
    setSaving(false);
  };
  const openSave = (mode: "master" | "variant") => {
    if (me && !canCreateVariant(power === true, versions.length)) { setUpsell(true); return; }
    setUpsell(false);
    setDialog(mode);
  };
  const saveNew = async (name: string) => {
      if (!me) return;
      const active = sessions.current[selected];
      try {
        const row = await saveVersion(me.id, name, active?.draft ?? value.initialDraft ?? value.resume, active?.official.cand ?? value.cand, value.job, active?.official.text ?? value.resume, value.scoringLevel ?? inferLevel(value.cand.years, value.cand.role));
        if (!row) throw new Error("Resume could not be saved. Try again.");
        if (active) sessions.current[row.id] = active;
        await client.invalidateQueries({ queryKey: ["resume-versions", me.id] });
        setSelected(row.id);
        onActiveVersionChange?.(row.id);
        toast.success(dialog === "master" ? "Master resume saved" : `New role variant saved — ${label} unchanged`);
      } catch (error) { toast.error((error as Error).message); throw error; }
    };
  const scanMode = !versionId && !onBackToList;
  const scanBar = <div className="space-y-3 border-y py-4">
    {!me
      ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="min-w-0 text-muted-foreground">Want to keep this resume? Saving one master resume is free with an account.</span><Button asChild variant="outline"><Link to="/auth" search={{ mode: "signup", as: "candidate", redirect: "/candidate" }}><Save />Sign up to save</Link></Button></div>
      : isPending || power === null
        ? <p className="text-sm text-muted-foreground">Checking your plan…</p>
        : !versions.length
          ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="min-w-0 text-muted-foreground">Save this as your master resume. It's free and stays in My resumes.</span><Button onClick={() => openSave("master")}><Save />Save master resume</Button></div>
          : power
            ? <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="min-w-0 text-muted-foreground">Save this as a role variant. Your master resume stays unchanged.</span><div className="flex gap-2"><Button onClick={() => openSave("variant")}><Copy />Save as role variant</Button><Button asChild variant="ghost"><Link to="/my-resumes"><Layers />My resumes</Link></Button></div></div>
            : <VariantUpsell saved />}
    <ResumeNameDialog takenNames={versions.map((version) => version.name)} open={!!me && !!dialog} onOpenChange={(open) => { if (!open) setDialog(""); }} title={dialog === "master" ? "Save master resume" : "Save as new role variant"} sourceName={dialog === "master" ? "" : label} onSave={(name) => saveNew(name)} />
  </div>;
  const toolbar = scanMode ? scanBar : <div className="space-y-3 border-y py-4">
    {onBackToList && <Button variant="ghost" className="px-0" disabled={saving} onClick={onBackToList}><ArrowLeft />Back to resumes</Button>}
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 basis-60 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Active resume</p>
        <Select value={selected} onValueChange={(id) => { setSelected(id); onActiveVersionChange?.(id); }}>
          <SelectTrigger aria-label="Active resume" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {!versionId && <SelectItem value="current">Current resume · {versions.length ? "unsaved" : "master draft"}</SelectItem>}
            {versions.map((version) => <SelectItem key={version.id} value={version.id}>{version.name} · {version.id === master?.id ? "Master" : "Role variant"}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {current
        ? <Button disabled={saving} onClick={() => void saveChanges()}><Save />{saving ? "Saving…" : "Save changes"}</Button>
        : <Button disabled={!!me && (isPending || power === null)} onClick={() => openSave(versions.length ? "variant" : "master")}><Save />{!!me && (isPending || power === null) ? "Checking your plan…" : versions.length ? "Save as role variant" : "Save master resume"}</Button>}
      {current && <Button variant="outline" disabled={saving} onClick={() => void saveChanges(true)}><Save />Save & back to list</Button>}
      {current && (onBackToList ? <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" disabled={saving} aria-label="Resume actions" title="Resume actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuItem disabled={power === null} onSelect={() => openSave("variant")}><Copy />Save as new variant</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu> : <Button variant="outline" disabled={power === null} onClick={() => openSave("variant")}><Copy />Save as new variant</Button>)}
      {!onBackToList && <Button asChild variant="ghost"><Link to="/my-resumes"><Layers />My resumes</Link></Button>}
    </div>
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Target className="h-4 w-4" />
      <span className="break-words">{value.job.description.trim() ? `Target job: ${value.job.title}` : "General design resume · no target job"}</span>
      <span className="ml-auto">{current ? (current.id === master?.id ? "Master resume" : "Role variant") : "Unsaved draft"}</span>
    </div>
    {upsell && <VariantUpsell />}
    <ResumeNameDialog takenNames={versions.map((version) => version.name)} open={!!me && !!dialog} onOpenChange={(open) => { if (!open) setDialog(""); }} title={dialog === "master" ? "Save master resume" : "Save as new role variant"} sourceName={dialog === "master" ? "" : label} onSave={(name) => saveNew(name)} />
    {!me && dialog && <div className="flex flex-wrap items-center gap-2 text-sm">Sign in to keep your resumes.<Button asChild size="sm"><Link to="/auth" search={{ mode: "signup", as: "candidate", redirect: "/candidate" }}>Sign in to save</Link></Button></div>}
  </div>;
  return children({ ...value, initialSession: sessions.current[selected] ?? value.initialSession, editorKey: selected, onSessionChange: sessionChanged, toolbar, isOriginal: selected === "current" || selected === versionId });
}