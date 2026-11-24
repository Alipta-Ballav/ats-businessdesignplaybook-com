import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

const INSTRUCTIONS = `You rewrite one resume bullet for a UX/product design professional.
Use ONLY facts present in the ORIGINAL line and the USER FACTS. Never add numbers, percentages, company names, tools, team sizes or outcomes that are not given.
Write one concise bullet (max 35 words), starting with a strong verb, structure: action -> constraint -> outcome. Return only the bullet text, no quotes or dash.`;

export async function rewriteBullet(input: { original: string; facts: string }): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  const runId = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch,
  });
  let streamError: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [
      {
        role: "user",
        content: `ORIGINAL: ${input.original || "(new bullet)"}\nUSER FACTS: ${input.facts || "(none — only sharpen the original wording)"}`,
      },
    ],
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    const t = (await result.text).trim().replace(/^[-•*"“]+\s*|["”]+$/g, "");
    if (!t) throw new Error("empty");
    return t;
  } catch (e) {
    const err = streamError ?? e;
    console.error("rewriteBullet failed", err);
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 402)
      throw new Error("AI credits are used up. Add credits in Settings → Plans & credits.");
    if (status === 429) throw new Error("Too many requests right now — try again in a minute.");
    throw new Error("AI suggestion failed. You can still edit manually.");
  }
}
