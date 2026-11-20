import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { COMPETENCIES, FTI_DIMENSIONS, type Requirement } from "../scoring";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const schema = z.object({
  name: z.string(), role: z.string(), years: z.number(), domain: z.string(),
  requirements: z.array(z.object({ name: z.string(), essential: z.boolean() })),
  mandatory: z.array(z.object({ name: z.string(), value: z.enum(["met", "transferable", "missing"]) })),
  competencies: z.array(z.object({
    id: z.enum(COMPETENCIES.map((c) => c.id) as [string, ...string[]]),
    proficiency: z.number(), level: z.number(), transferable: z.boolean(), quote: z.string(), source: z.string(),
  })),
});
export type RawExtraction = z.infer<typeof schema>;

const INSTRUCTIONS = `You extract hiring evidence from a resume. You never score or rank — you only report evidence.
Competencies (id: meaning): ${COMPETENCIES.map((c) => `${c.id}: ${c.name}`).join("; ")}.
This tool evaluates Product & UX designers only. Map evidence using these 8 design dimensions and their sub-skills: ${FTI_DIMENSIONS.map((d) => `${d.name} [competencies: ${d.comps.join(", ")}] = ${d.skills.join(", ")}`).join(" | ")}.
For each competency with evidence, return ONE entry: an exact verbatim quote copied character-for-character from the resume (8-200 chars), the resume section as source, proficiency 1-5, and evidence level:
1 Claimed (listed/stated only), 2 Applied (used in work), 3 Demonstrated (concrete example/project), 4 Impact (measurable outcome), 5 Transfer (applied successfully in a different domain).
Set transferable=true when the evidence comes from an adjacent role/domain rather than direct experience for this job. Omit competencies with no evidence — never invent.
requirements: if the recruiter gave must-haves, return them unchanged; otherwise extract up to 6 must-have requirements from the job description, essential=true only for certifications, licences, legal or safety requirements.
mandatory: for each requirement, met (directly evidenced), transferable (only adjacent evidence) or missing.
name/role/years/domain: candidate's name, most recent title, total years of experience, main industry. Use "" or 0 if unknown.`;

export async function extractEvidence(input: { resume: string; jobTitle: string; jobDescription: string; requirements: Requirement[] }): Promise<RawExtraction> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const runId = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1", apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch,
  });
  const prompt = `JOB TITLE: ${input.jobTitle}\n\nJOB DESCRIPTION:\n${input.jobDescription.slice(0, 8000)}\n\nRECRUITER MUST-HAVES: ${input.requirements.length ? input.requirements.map((r) => `${r.name}${r.essential ? " (essential)" : ""}`).join("; ") : "none given"}\n\nRESUME:\n${input.resume.slice(0, 24000)}`;
  let streamError: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: prompt }],
    output: Output.object({ schema }),
    onError: ({ error }) => { streamError = error; },
    providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
  });
  try {
    return await result.output;
  } catch (e) {
    const err = streamError ?? e;
    console.error("extractEvidence failed", err);
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 402) throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    if (status === 429) throw new Error("Too many requests right now — try again in a minute.");
    if (NoObjectGeneratedError.isInstance(e)) throw new Error("The AI couldn't read this resume. Try pasting plain text.");
    throw new Error("Resume reading failed. Please try again.");
  }
}
