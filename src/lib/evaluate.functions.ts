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
