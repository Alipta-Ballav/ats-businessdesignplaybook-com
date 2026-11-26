import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { must } from "@/lib/db";
import type { Candidate, Job, Level } from "@/lib/scoring";
import type { Json, Tables } from "@/integrations/supabase/types";
export type ResumeVersion = Omit<Tables<"resume_versions">, "candidate" | "job" | "level"> & {
  candidate: Candidate;
  job: Job;
  level: Level;
};
export const careerQueries = {
  bookmarks: (uid: string) =>
    queryOptions({
      queryKey: ["career-bookmarks", uid],
      queryFn: async () =>
        (
          must(await supabase.from("design_bookmarks").select("bullet_id").eq("user_id", uid)) ?? []
        ).map((r) => r.bullet_id),
    }),
  versions: (uid: string) =>
    queryOptions({
      queryKey: ["resume-versions", uid],
      queryFn: async () =>
        (must(
          await supabase
            .from("resume_versions")
            .select("*")
            .eq("user_id", uid)
            .order("created_at", { ascending: false }),
        ) ?? []) as unknown as ResumeVersion[],
    }),
};
export async function saveVersion(
  uid: string,
  name: string,
  resume: string,
  candidate: Candidate,
  job: Job,
  scoredText: string,
  level: Level,
) {
  return must(
    await supabase
      .from("resume_versions")
      .insert({
        user_id: uid,
        name: name.trim(),
        resume_text: resume,
        candidate: candidate as unknown as Json,
        job: job as unknown as Json,
        scored_text: scoredText,
        level,
      })
      .select("id")
      .single(),
  );
}
export async function updateVersion(
  id: string,
  resume: string,
  candidate: Candidate,
  scoredText: string,
) {
  return must(
    await supabase
      .from("resume_versions")
      .update({ resume_text: resume, candidate: candidate as unknown as Json, scored_text: scoredText })
      .eq("id", id)
      .select("id")
      .single(),
  );
}
