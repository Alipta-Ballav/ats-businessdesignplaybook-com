import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Candidate, Dimension, Job, Requirement } from "./scoring";
import type { Extracted } from "./evidence";
import type { Tables } from "@/integrations/supabase/types";

export type Role = "candidate" | "recruiter";

export function toJob(r: Tables<"jobs">): Job {
  return {
    id: r.id, title: r.title, func: r.func, seniority: r.seniority, description: r.description,
    flexibility: r.flexibility, preset: r.preset,
    mandatory: (r.mandatory as unknown as Requirement[]) ?? [],
    preferred: (r.preferred as unknown as string[]) ?? [],
    weights: r.weights as unknown as Record<Dimension, number>, createdAt: r.created_at,
  };
}
export function toCandidate(r: Tables<"applications">): Candidate {
  const e = r.evidence as unknown as Pick<Extracted, "mandatory" | "competencies">;
  const c: Candidate = {
    id: r.id, jobId: r.job_id, name: r.name, role: r.job_role, years: r.years, domain: r.domain,
    mandatory: e.mandatory ?? {}, competencies: e.competencies ?? {},
    };
  return r.override_status ? { ...c, override: { status: r.override_status, rationale: r.override_rationale ?? "", at: r.override_at ?? "" } } : c;
}
/** A candidate's self-check uses a balanced policy so the score is comparable across scans. */
export function scanToPair(s: Tables<"scans">): { job: Job; cand: Candidate } {
  const e = s.evidence as unknown as Extracted;
  const job: Job = {
    id: s.job_id ?? s.id, title: s.job_title, func: "", seniority: "", description: s.job_description,
    flexibility: 50, preset: "Balanced Match", weights: { JR: 30, FR: 40, HP: 30 },
    mandatory: (s.mandatory as unknown as Requirement[]) ?? [], preferred: [], createdAt: s.created_at,
  };
  return { job, cand: { id: s.id, jobId: job.id, name: e.name, role: e.role, years: e.years, domain: e.domain, mandatory: e.mandatory, competencies: e.competencies } };
}

function must<T>(r: { data: T; error: { message: string } | null }): T { if (r.error) throw new Error(r.error.message); return r.data; }

export const q = {
  me: () => queryOptions({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const [roles, profile] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      ]);
      return { id: user.id, email: user.email ?? "", name: profile.data?.full_name ?? "", role: (roles.data?.[0]?.role ?? null) as Role | null };
    },
  }),
  myJobs: (uid: string) => queryOptions({ queryKey: ["jobs", "mine", uid], queryFn: async () => list(await supabase.from("jobs").select("*").eq("recruiter_id", uid).order("created_at", { ascending: false })).map(toJob) }),
  openJobs: () => queryOptions({ queryKey: ["jobs", "open"], queryFn: async () => list(await supabase.from("jobs").select("*").eq("is_open", true).order("created_at", { ascending: false })).map(toJob) }),
  job: (id: string) => queryOptions({ queryKey: ["job", id], queryFn: async () => { const r = must(await supabase.from("jobs").select("*").eq("id", id).maybeSingle()); return r ? { job: toJob(r), recruiterId: r.recruiter_id, isOpen: r.is_open } : null; } }),
  applicants: (jobId: string) => queryOptions({ queryKey: ["apps", jobId], queryFn: async () => list(await supabase.from("applications").select("*").eq("job_id", jobId).order("created_at")).map(toCandidate) }),
  applicantCounts: () => queryOptions({ queryKey: ["apps", "counts"], queryFn: async () => list(await supabase.from("applications").select("id, job_id, evidence, override_status")) }),
  application: (id: string) => queryOptions({ queryKey: ["app", id], queryFn: async () => { const r = must(await supabase.from("applications").select("*").eq("id", id).maybeSingle()); return r ? { cand: toCandidate(r), resume: r.resume_text } : null; } }),
  myApplications: (uid: string) => queryOptions({ queryKey: ["apps", "mine", uid], queryFn: async () => list(await supabase.from("applications").select("id, job_id, created_at, jobs(title)").eq("candidate_user_id", uid)) }),
  scans: (uid: string) => queryOptions({ queryKey: ["scans", uid], queryFn: async () => list(await supabase.from("scans").select("*").eq("user_id", uid).order("created_at", { ascending: false })) }),
  scan: (id: string) => queryOptions({ queryKey: ["scan", id], queryFn: async () => must(await supabase.from("scans").select("*").eq("id", id).maybeSingle()) }),
};
export { must };
function list<T>(r: { data: T[] | null; error: { message: string } | null }): T[] { if (r.error) throw new Error(r.error.message); return r.data ?? []; }
