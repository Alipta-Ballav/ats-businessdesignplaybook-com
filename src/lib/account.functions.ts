import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Erases the caller's own data and login. Payment receipts are kept for tax/accounting records. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const uid = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const t of ["scans", "resume_versions", "design_bookmarks", "pass_scans", "scan_credits"] as const) {
      const { error } = await supabaseAdmin.from(t).delete().eq("user_id", uid);
      if (error) { console.error("delete", t, error); throw new Error("Couldn't delete your data. Please try again."); }
    }
    await supabaseAdmin.from("applications").delete().eq("candidate_user_id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) { console.error("deleteUser", error); throw new Error("Couldn't delete your account. Please try again."); }
    return { ok: true };
  });
