import { createServerFn } from "@tanstack/react-start";

/** AI rewrite: free for everyone (paywall sits on rescore + Word). Drafts from the original line + user facts only; the client re-checks for new facts. */
export const suggestRewrite = createServerFn({ method: "POST" })
  .inputValidator((d: { original: string; facts: string }) => {
    if (typeof d?.facts !== "string" || typeof d?.original !== "string") throw new Error("Invalid input.");
    if (!d.facts.trim() && !d.original.trim()) throw new Error("Add your true details first, then ask AI to phrase them.");
    if (d.original.length > 600 || d.facts.length > 1200) throw new Error("Text is too long.");
    return { original: d.original, facts: d.facts };
  })
  .handler(async ({ data }) => {
    const { rewriteBullet } = await import("./ai/rewrite.server");
    return { text: await rewriteBullet(data) };
  });
