import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only overview of sign-ups, payments and abandoned checkouts. */
export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ok) throw new Error("Admins only.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error("Couldn't load users.");
    const [{ data: pays }, { data: roles }, { data: scans }, { data: profiles }] =
      await Promise.all([
        supabaseAdmin
          .from("payments")
          .select(
            "id,user_id,plan,amount,status,gateway_order_id,gateway_payment_id,created_at,paid_at",
          )
          .order("created_at", { ascending: false }),
        supabaseAdmin.from("user_roles").select("user_id,role"),
        supabaseAdmin.from("scans").select("user_id"),
        supabaseAdmin.from("profiles").select("id,full_name"),
      ]);
    const email = new Map(list.users.map((u) => [u.id, u.email ?? ""]));
    const users = list.users
      .map((u) => {
        const mine = (pays ?? []).filter((p) => p.user_id === u.id);
        return {
          id: u.id,
          email: u.email ?? "",
          name: profiles?.find((p) => p.id === u.id)?.full_name ?? "",
          createdAt: u.created_at,
          confirmed: !!u.email_confirmed_at,
          lastSignIn: u.last_sign_in_at ?? null,
          roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
          scans: (scans ?? []).filter((s) => s.user_id === u.id).length,
          paid: mine.some((p) => p.status === "completed"),
          revenue: mine.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0),
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const payments = (pays ?? []).map((p) => ({
      ...p,
      email: email.get(p.user_id) ?? "(deleted user)",
    }));
    return { users, payments };
  });
