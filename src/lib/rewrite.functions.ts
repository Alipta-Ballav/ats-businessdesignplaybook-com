import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** AI rewrite (Pro): drafts a bullet from the original line + user facts only. The client re-checks for new facts. */
export const suggestRewrite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { original: string; facts: string }) => {
    if (typeof d?.facts !== "string" || typeof d?.original !== "string") throw new Error("Invalid input.");
    if (!d.facts.trim() && !d.original.trim()) throw new Error("Add your true details first, then ask AI to phrase them.");
    if (typeof d.original !== "string" || d.original.length > 600 || d.facts.length > 1200) throw new Error("Text is too long.");
    return { original: d.original, facts: d.facts };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: admin } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!admin) {
      const { data: paid } = await supabase.from("payments").select("id").eq("user_id", userId).eq("status", "completed").limit(1);
      if (!paid?.length) throw new Error("AI suggestions are part of the ₹49 unlock.");
    }
    const { rewriteBullet } = await import("./ai/rewrite.server");
    return { text: await rewriteBullet(data) };
  });
