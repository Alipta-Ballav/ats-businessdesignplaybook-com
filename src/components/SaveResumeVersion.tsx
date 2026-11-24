import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { q } from "@/lib/db";
import { saveVersion } from "@/lib/career/db";
import { inferLevel, type Candidate, type Job, type Level } from "@/lib/scoring";
export function SaveResumeVersion({
  resume,
  candidate,
  job,
  scoredText,
  level,
}: {
  resume: string;
  candidate: Candidate;
  job: Job;
  scoredText: string;
  level?: Level;
}) {
  const { data: me } = useQuery(q.me());
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!me || !name.trim()) return;
    setBusy(true);
    try {
      await saveVersion(
        me.id,
        name,
        resume,
        candidate,
        job,
        scoredText,
        level ?? inferLevel(candidate.years, candidate.role),
      );
      await client.invalidateQueries({ queryKey: ["resume-versions", me.id] });
      setOpen(false);
      setName("");
      toast.success("Resume version saved");
      window.__lovableEvents?.track?.("project.resume_version_saved", {
        scored: resume === scoredText,
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
        <Save />
        Save version
      </Button>
      {open &&
        (me ? (
          <div className="space-y-2 border-t pt-3">
            <label className="block text-sm">
              Version name
              <input
                maxLength={120}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                placeholder="e.g. Staff designer · platform roles"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {resume !== scoredText && (
              <p className="text-xs text-warning">
                Saved as a draft. Rescore before comparing its score.
              </p>
            )}
            <Button size="sm" onClick={save} disabled={busy || !name.trim()}>
              {busy ? "Saving…" : "Save to my resumes"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>Keep versions in your account.</span>
            <Button asChild size="sm">
              <Link to="/auth" search={{ mode: "signup", as: "candidate", redirect: "/candidate" }}>
                Sign in to save
              </Link>
            </Button>
          </div>
        ))}
    </div>
  );
}
