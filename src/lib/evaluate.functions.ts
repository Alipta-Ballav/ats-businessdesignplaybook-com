import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeExtraction } from "./evidence";
import type { Requirement } from "./scoring";

type Input = { resume: string; jobTitle: string; jobDescription: string; requirements: Requirement[] };

/** AI reads the resume and returns grounded evidence only. All scores are computed in scoring.ts. */
export const readResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    if (typeof d?.resume !== "string" || d.resume.trim().length < 80) throw new Error("Paste the full resume text (at least a few lines).");
    if (typeof d.jobDescription !== "string" || typeof d.jobTitle !== "string") throw new Error("Missing job details.");
    return { ...d, requirements: Array.isArray(d.requirements) ? d.requirements : [] };
  })
  .handler(async ({ data }) => {
    const { extractEvidence } = await import("./ai/extract.server");
    const raw = await extractEvidence(data);
    if (data.requirements.length) raw.requirements = data.requirements;
    return normalizeExtraction(raw, data.resume);
  });

/** Guest version: no sign-in needed so job seekers see their report first. Size-capped to limit abuse. */
export const readResumeGuest = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (typeof d?.resume !== "string" || d.resume.trim().length < 80) throw new Error("Paste the full resume text (at least a few lines).");
    if (d.resume.length > 30000 || typeof d.jobDescription !== "string" || d.jobDescription.length > 10000 || typeof d.jobTitle !== "string" || d.jobTitle.length > 200) throw new Error("Resume or job details are too long.");
    return { resume: d.resume, jobTitle: d.jobTitle, jobDescription: d.jobDescription, requirements: Array.isArray(d.requirements) ? d.requirements.slice(0, 12) : [] };
  })
  .handler(async ({ data }) => {
    const { extractEvidence } = await import("./ai/extract.server");
    const raw = await extractEvidence(data);
    if (data.requirements.length) raw.requirements = data.requirements;
    return normalizeExtraction(raw, data.resume);
  });
